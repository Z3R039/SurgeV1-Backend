import type { Context } from "hono";
import type { ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import { accountService, app, logger, profilesService, userService } from "..";
import MCPResponses from "../utilities/responses";
import { v4 as uuid } from "uuid";
import { handleProfileSelection } from "./QueryProfile";
import { SendMessageToId } from "../sockets/xmpp/utilities/SendMessageToId";

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;

  const timestamp = new Date().toISOString();

  if (!accountId || !rvn || !profileId) {
    return c.json(errors.createError(400, c.req.url, "Missing query parameters.", timestamp), 400);
  }

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

  const profile = await handleProfileSelection(profileId, user.accountId);

  if (!profile && profileId !== "athena" && profileId !== "common_core")
    return c.json(
      errors.createError(404, c.req.url, `Profile ${profileId} was not found.`, timestamp),
      404,
    );

  if (!profile)
    return c.json(
      errors.createError(404, c.req.url, `Profile '${profileId}' not found.`, timestamp),
      404,
    );

  const athena = await handleProfileSelection("athena", user.accountId);

  if (!athena)
    return c.json(
      errors.createError(404, c.req.url, `Profile 'athena' not found.`, timestamp),
      404,
    );

  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    return c.json({ error: "Body isn't valid JSON" }, 400);
  }

  const applyProfileChanges: object[] = [];
  let shouldUpdateProfile = false;

  logger.debug(
    `MfaEnabled: ${profile.stats.attributes.mfa_enabled} MfaRewardClaimed: ${athena.stats.attributes.mfa_reward_claimed}`,
  );

  if (!profile.stats.attributes.mfa_enabled && !athena.stats.attributes.mfa_reward_claimed) {
    profile.stats.attributes.mfa_enabled = true;

    const reward = "AthenaDance:EID_BoogieDown";

    if (!athena.items[reward]) {
      const item = {
        templateId: reward,
        attributes: {
          level: 1,
          item_seen: false,
          max_level_bonus: 0,
          rnd_sel_cnt: 0,
          xp: 0,
        },
        quantity: 1,
      };

      athena.items[reward] = item;

      applyProfileChanges.push({
        changeType: "itemAdded",
        itemId: reward,
        item,
      });

      const randomGiftBoxId = uuid();

      const giftBoxTemplate = {
        templateId: "GiftBox:gb_mfareward",
        attributes: {
          lootList: [
            {
              itemType: reward,
              itemGuid: reward,
              itemProfile: "athena",
              quantity: 1,
            },
          ],
        },
        quantity: 1,
      };

      profile.items[randomGiftBoxId] = giftBoxTemplate;
      profile.stats.attributes.gifts!.push(giftBoxTemplate);

      applyProfileChanges.push({
        changeType: "itemAdded",
        itemId: randomGiftBoxId,
        item: giftBoxTemplate,
      });

      athena.stats.attributes.mfa_reward_claimed = true;

      SendMessageToId(
        JSON.stringify({
          type: "com.epicgames.gift.received",
          payload: {},
          timestamp: new Date().toISOString(),
        }),
        user.accountId,
      );

      applyProfileChanges.push({
        changeType: "statModified",
        name: "mfa_enabled",
        value: true,
      });

      applyProfileChanges.push({
        changeType: "statModified",
        name: "mfa_reward_claimed",
        value: true,
      });
      shouldUpdateProfile = true;
    }
  }

  if (shouldUpdateProfile) {
    profile.rvn++;
    profile.commandRevision++;
    profile.updatedAt = new Date().toISOString();

    athena.rvn++;
    athena.commandRevision++;
    athena.updatedAt = new Date().toISOString();

    await profilesService.update(user.accountId, "athena", athena);
    await profilesService.update(user.accountId, "common_core", profile);
  }

  return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
}
