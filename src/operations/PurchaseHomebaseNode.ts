import type { Context } from "hono";
import { logger, profilesService, questsService, userService } from "..";
import type { ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import { handleProfileSelection } from "./QueryProfile";
import MCPResponses from "../utilities/responses";
import path from "node:path";
import uaparser from "../utilities/uaparser";
import { v4 as uuid } from "uuid";
import ProfileHelper from "../utilities/ProfileHelper";

export default async function (c: Context) {
  const timestamp = new Date().toISOString();

  try {
    const accountId = c.req.param("accountId");
    const profileId = c.req.query("profileId") as ProfileId;

    const [user] = await Promise.all([userService.findUserByAccountId(accountId)]);

    if (!user) {
      return c.json(errors.createError(400, c.req.url, "User not found.", timestamp));
    }

    const profile = await handleProfileSelection(profileId, user.accountId);

    if (!profile) {
      return c.json(
        errors.createError(400, c.req.url, `Profile '${profileId}' not found.`, timestamp),
      );
    }

    const body = await c.req.json();

    if (!body) {
      return c.json(errors.createError(400, c.req.url, "Invalid body..", timestamp), 400);
    }

    const common_core = await handleProfileSelection("common_core", user.accountId);
    if (!common_core) {
      return c.json(errors.createError(400, c.req.url, "Failed to find common_core.", timestamp));
    }

    const useragent = c.req.header("User-Agent");
    if (!useragent) {
      return c.json(
        errors.createError(400, c.req.url, "'User-Agent' header is missing.", timestamp),
        400,
      );
    }
    const uahelper = uaparser(useragent);
    if (!uahelper) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
        400,
      );
    }

    const applyProfileChanges: object[] = [];

    let shouldUpdateProfile = false;

    const { nodeId } = body;

    if (nodeId) {
      const profileNodeId = uuid();
      profile.items[profileNodeId] = {
        templateId: `HomebaseNode:${nodeId}`,
        attributes: {
          item_seen: false,
          level: 1,
          favorite: false,
        },
        quantity: 1,
      };

      applyProfileChanges.push({
        changeType: "itemAdded",
        itemId: profileNodeId,
        item: profile.items[profileNodeId],
      });

      const item = ProfileHelper.getItemByTemplateId(profile, "Token:homebasepoints");

      if (!item) {
        return c.json(
          errors.createError(
            400,
            c.req.url,
            "Failed to find item 'Token:homebasepoints'.",
            timestamp,
          ),
        );
      }

      // t1_research_6114fc651

      // Map node IDs to attributes
      const nodeMapping: { [key: string]: string } = {
        T1_Main_8D2C3C4D0: "completion_unlock_skill_tree_constructor_leadership",
        T1_Main_8991222D1: "completion_unlock_skill_tree_ninja_leadership",
        T1_Main_566BFEA11: "completion_unlock_skill_tree_outlander_leadership",
        T1_Main_BA01A2361: "completion_unlock_skill_tree_weakpointvision",
        T1_Main_7064C2440: "completion_unlock_skill_tree_squads",
        T1_Main_FABC7C290: "completion_unlock_skill_tree_research",
        T1_Research_6114FC651: "completion_unlock_skill_tree_researchfortitude",
      };

      const node = nodeMapping[nodeId];
      if (!node) {
        return c.json(
          errors.createError(400, c.req.url, `Failed to find node '${nodeId}'.`, timestamp),
        );
      }

      const profileItem = await questsService.findQuestByAttribute(user.accountId, node, 0);

      if (!profileItem) {
        return c.json(
          errors.createError(400, c.req.url, `Failed to find attribute '${node}'.`, timestamp),
          400,
        );
      }

      for (const quest of profileItem) {
        quest.entity.quest_state = "Claimed";
        quest.entity[node] = 1;
        quest.entity.last_state_change_time = new Date().toISOString();

        applyProfileChanges.push(
          {
            changeType: "itemAttrChanged",
            itemId: quest.templateId,
            attributeName: "quest_state",
            attributeValue: "Claimed",
          },
          {
            changeType: "itemAttrChanged",
            itemId: quest.templateId,
            attributeName: "last_state_change_time",
            attributeValue: quest.entity.last_state_change_time,
          },
          {
            changeType: "itemAttrChanged",
            itemId: quest.templateId,
            attributeName: node,
            attributeValue: 1,
          },
        );

        await questsService.updateQuest(quest, user.accountId, uahelper.season, quest.templateId);
        shouldUpdateProfile = true;
      }

      for (const token of item) {
        token.value.quantity -= 1;

        applyProfileChanges.push({
          changeType: "itemQuantityChanged",
          itemId: token.key,
          quantity: token.value.quantity,
        });

        shouldUpdateProfile = true;
        break;
      }

      shouldUpdateProfile = true;
    }

    console.log(applyProfileChanges);

    if (shouldUpdateProfile) {
      profile.rvn += 1;
      profile.commandRevision += 1;
      profile.updatedAt = new Date().toISOString();

      await profilesService.update(user.accountId, profileId, profile);
    }

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`PurchaseHomebaseNode: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp));
  }
}
