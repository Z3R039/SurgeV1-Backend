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

  let body;
  try {
    body = await c.req.json();
  } catch (error) {
    return c.json({ error: "Body isn't valid JSON" }, 400);
  }

  try {
    const applyProfileChanges: object[] = [];
    let shouldUpdateProfile = false;

    const { sourceIndex, optNewNameForTarget, targetIndex } = await c.req.json();

    const isNewLoadout = sourceIndex === 0;
    let loadoutId: string;

    if (isNewLoadout) {
      loadoutId = uuid();
      const newLoadout = { ...profile.items["sandbox_loadout"] };

      newLoadout.attributes["locker_name"] = optNewNameForTarget;
      profile.items[loadoutId] = newLoadout;
      profile.stats.attributes.loadouts![targetIndex] = loadoutId;
    } else {
      loadoutId = profile.stats.attributes.loadouts![sourceIndex];

      if (!loadoutId) {
        return c.json(
          errors.createError(404, c.req.url, `Loadout ${sourceIndex} was not found.`, timestamp),
          404,
        );
      }

      profile.stats.attributes.active_loadout_index = sourceIndex;
      profile.stats.attributes.last_applied_loadout = loadoutId;
      profile.items["sandbox_loadout"].attributes.locker_slots_data =
        profile.items[loadoutId].attributes.locker_slots_data;
    }

    const loadouts = profile.stats.attributes.loadouts!;

    if (targetIndex >= profile.stats.attributes.loadouts!.length) {
      const newLoadoutId = uuid();

      const newLoadout = { ...profile.items["sandbox_loadout"] };
      newLoadout.attributes["locker_name"] = optNewNameForTarget;

      const lastAppliedLoadoutId = profile.stats.attributes.last_applied_loadout;
      if (!lastAppliedLoadoutId) {
        return c.json(
          errors.createError(404, c.req.url, `'last_applied_loadout' was not found.`, timestamp),
          404,
        );
      }

      newLoadout.attributes["locker_slots_data"] =
        profile.items[lastAppliedLoadoutId].attributes.locker_slots_data;

      profile.items[newLoadoutId] = newLoadout;
      loadouts.push(newLoadoutId);
      profile.stats.attributes.active_loadout_index = targetIndex;
      profile.stats.attributes.last_applied_loadout = newLoadoutId;

      profile.items["sandbox_loadout"].attributes["locker_slots_data"] =
        newLoadout.attributes["locker_slots_data"];

      applyProfileChanges.push({
        changeType: "itemAttrChanged",
        itemId: newLoadoutId,
        attributeName: "locker_slots_data",
        attributeValue: newLoadout.attributes["locker_slots_data"],
      });

      shouldUpdateProfile = true;
    }

    if (loadoutId) {
      applyProfileChanges.push({
        changeType: "itemAttrChanged",
        itemId: loadoutId,
        attributeName: "locker_slots_data",
        attributeValue: profile.items[loadoutId].attributes.locker_slots_data,
      });

      shouldUpdateProfile = true;
    }

    if (shouldUpdateProfile) {
      profile.rvn++;
      profile.commandRevision++;
      profile.updatedAt = new Date().toISOString();

      await profilesService.update(user.accountId, profileId, profile);
    }

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    return c.json(errors.createError(500, c.req.url, "Internal Server Error", timestamp), 500);
  }
}
