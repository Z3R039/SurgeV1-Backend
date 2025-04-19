import type { Context } from "hono";
import type { ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import { accountService, app, logger, profilesService, userService } from "..";
import { handleProfileSelection } from "./QueryProfile";
import MCPResponses from "../utilities/responses";

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;
  const useragent = c.req.header("User-Agent");
  const timestamp = new Date().toISOString();

  if (!useragent) {
    return c.json(
      errors.createError(400, c.req.url, "header 'User-Agent' is missing.", timestamp),
      400,
    );
  }

  if (!accountId || !rvn || !profileId) {
    return c.json(errors.createError(400, c.req.url, "Missing query parameters.", timestamp), 400);
  }

  try {
    const [user, account] = await Promise.all([
      userService.findUserByAccountId(accountId),
      accountService.findUserByAccountId(accountId),
    ]);

    if (!user || !account) {
      return c.json(
        errors.createError(404, c.req.url, "Failed to find user or account.", timestamp),
        404,
      );
    }

    const profile = await handleProfileSelection("campaign", user.accountId);

    if (!profile) {
      return c.json(
        errors.createError(404, c.req.url, `Profile '${profileId}' not found.`, timestamp),
        404,
      );
    }

    const body = await c.req.json();

    if (!body) {
      return c.json(errors.createError(400, c.req.url, "Missing body.", timestamp), 400);
    }

    const applyProfileChanges: object[] = [];

    const { advance } = body;

    if (!advance) {
      return c.json(errors.createError(400, c.req.url, "Missing 'advice' field.", timestamp), 400);
    }

    let shouldUpdateProfile = false;

    const profileQuests = Object.entries(profile.items).filter(([_, item]) =>
      item.templateId.startsWith("Quest:"),
    );

    advance.forEach((quest: { statName: string; count: number }) => {
      const questItem = profileQuests.find(
        ([_, item]) => typeof item.attributes[`completion_${quest.statName}`] === "number",
      );

      if (!questItem) return;

      const [itemId, item] = questItem;
      const currentCompletionValue = item.attributes[`completion_${quest.statName}`] as number;
      const newCompletionValue = currentCompletionValue + quest.count;

      applyProfileChanges.push({
        changeType: "itemAttrChanged",
        itemId,
        attributeName: `completion_${quest.statName}`,
        attributeValue: newCompletionValue,
      });

      if (
        item.templateId === "Quest:homebaseonboarding" &&
        quest.statName.toLowerCase() === "hbonboarding_namehomebase"
      ) {
        profile.items[itemId].attributes.quest_state = "Claimed";
        profile.items[itemId].attributes.last_state_change_time = new Date().toISOString();

        applyProfileChanges.push(
          {
            changeType: "itemAttrChanged",
            itemId,
            attributeName: "quest_state",
            attributeValue: "Claimed",
          },
          {
            changeType: "itemAttrChanged",
            itemId,
            attributeName: "last_state_change_time",
            attributeValue: profile.items[itemId].attributes.last_state_change_time,
          },
        );
      }

      shouldUpdateProfile = true;
    });

    if (shouldUpdateProfile) {
      profile.updatedAt = new Date().toISOString();
      profile.commandRevision++;
      profile.rvn++;

      await profilesService.update(user.accountId, "campaign", profile);
    }

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`UpdateQuestClientObjectives: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
