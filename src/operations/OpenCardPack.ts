import type { Context } from "hono";
import { logger, profilesService, userService } from "..";
import type { ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import { handleProfileSelection } from "../operations/QueryProfile";
import MCPResponses from "../utilities/responses";
import path from "node:path";
import uaparser from "../utilities/uaparser";
import { v4 as uuid } from "uuid";
import { CardPackHelper } from "../utilities/cardpack/CardPackHelper";
import getMultipleRandom from "../utilities/cardpack/getMultipleRandom";

export default async function (c: Context) {
  const timestamp = new Date().toISOString();
  const cardpackRewards: string[] = await Bun.file(
    path.join(__dirname, "..", "memory", "campaign", "cardpackRewards.json"),
  ).json();

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

    const { cardPackItemId, selectionIdx } = body;

    if (!cardPackItemId) {
      return c.json(errors.createError(400, c.req.url, "'cardPackItemId' is missing.", timestamp));
    }

    if (typeof selectionIdx !== "number") {
      return c.json(
        errors.createError(400, c.req.url, "'selectionIdx' is not a number.", timestamp),
      );
    }

    const cardPackItem = profile.items[cardPackItemId];
    if (!cardPackItem) {
      return c.json(
        errors.createError(400, c.req.url, "'cardPackItemId' is not a valid item.", timestamp),
      );
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
    const notifications: object[] = [];

    let shouldUpdateProfile = false;

    const randomLlama = CardPackHelper.getRandomLlama();

    const lootResult = getMultipleRandom(cardpackRewards, randomLlama.itemsQuantity).map((loot) => {
      return {
        templateId: loot,
        attributes: {
          alteration_base_rarities: [],
          refund_legacy_item: false,
          legacy_alterations: [],
          max_level_bonus: 0,
          refundable: false,
          item_seen: false,
          alterations: [],
          favorite: false,
          level: 1,
          xp: 0,
        },
        quantity: 1,
      };
    });

    const [backendType, packItemId] = cardPackItem.templateId.split(":");

    if (backendType !== "CardPack") {
      return c.json(
        errors.createError(400, c.req.url, "'backendType' is not a valid item.", timestamp),
      );
    }

    if (!packItemId) {
      return c.json(
        errors.createError(400, c.req.url, "'packItemId' is not a valid item.", timestamp),
      );
    }

    for (const loot of lootResult) {
      const randomCardPackId = uuid();

      profile.items[randomCardPackId] = loot;
      applyProfileChanges.push({
        changeType: "itemAdded",
        itemId: randomCardPackId,
        item: loot,
      });

      if (cardPackItem.quantity <= 1) {
        delete profile.items[cardPackItemId];
        applyProfileChanges.push({
          changeType: "itemRemoved",
          itemId: cardPackItemId,
        });
      } else {
        if (!profile.items[cardPackItemId]) {
          return c.json(
            errors.createError(400, c.req.url, "'cardPackItemId' is not a valid item.", timestamp),
          );
        }

        profile.items[cardPackItemId].quantity -= 1;

        applyProfileChanges.push({
          changeType: "itemQuantityChanged",
          itemId: cardPackItemId,
          quantity: profile.items[cardPackItemId].quantity,
        });
      }

      notifications.push({
        type: "cardPackResult",
        lootGranted: {
          tierGroupName: backendType,
          lootGranted: lootResult.map((loot) => ({
            itemGuid: randomCardPackId,
            attributes: loot.attributes,
            itemProfile: profileId,
            itemType: loot.templateId,
            quantity: 1,
          })),
        },
        displayLevel: randomLlama.rarity,
        primary: true,
      });

      shouldUpdateProfile = true;
    }

    if (shouldUpdateProfile) {
      profile.rvn += 1;
      profile.commandRevision += 1;
      profile.updatedAt = new Date().toISOString();

      await profilesService.update(user.accountId, profileId, profile);
    }

    return c.json(
      MCPResponses.generateBasic(profile, applyProfileChanges, profileId, notifications),
    );
  } catch (error) {
    logger.error(`OpenCardPack: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp));
  }
}
