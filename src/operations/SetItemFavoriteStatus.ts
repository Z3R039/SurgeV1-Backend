import type { Context } from "hono";
import errors from "../utilities/errors";
import ProfileHelper from "../utilities/ProfileHelper";
import { accountService, app, profilesService, userService } from "..";
import type { ProfileId } from "../utilities/responses";
import MCPResponses from "../utilities/responses";
import { handleProfileSelection } from "./QueryProfile";

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

  const applyProfileChanges: object[] = [];

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

  const { targetItemId, bFavorite } = body;

  let shouldUpdateProfile = false;

  if (typeof targetItemId !== "string") {
    return c.json(
      errors.createError(400, c.req.url, "targetItemId must be a string.", timestamp),
      400,
    );
  }

  if (typeof bFavorite !== "boolean") {
    return c.json(
      errors.createError(400, c.req.url, "bFavorite must be a boolean.", timestamp),
      400,
    );
  }

  const targetItem = profile.items[targetItemId];

  if (!targetItem) {
    return c.json(
      errors.createError(400, c.req.url, `Failed to find item '${targetItemId}'.`, timestamp),
      400,
    );
  }

  if (!profile.items[targetItemId].attributes.favorite) {
    profile.items[targetItemId].attributes.favorite = bFavorite;

    // applyProfileChanges.push({
    //   changeType: "itemAdded",
    //   itemId: targetItemId,
    //   item: profile.items[targetItemId],
    // });

    applyProfileChanges.push({
      changeType: "itemAttrChanged",
      itemId: targetItemId,
      attributeName: "favorite",
      attributeValue: profile.items[targetItemId].attributes.favorite,
    });

    shouldUpdateProfile = true;
  }

  profile.items[targetItemId].attributes.favorite = bFavorite;

  applyProfileChanges.push({
    changeType: "itemAttrChanged",
    itemId: targetItemId,
    attributeName: "favorite",
    attributeValue: profile.items[targetItemId].attributes.favorite,
  });

  if (shouldUpdateProfile) {
    profile.rvn += 1;
    profile.commandRevision += 1;
    profile.updatedAt = new Date().toISOString();

    await profilesService.update(user.accountId, profileId, profile);
  }

  return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
}
