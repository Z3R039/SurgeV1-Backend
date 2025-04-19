import type { Context } from "hono";
import { logger, profilesService, userService } from "..";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import ProfileHelper from "../utilities/ProfileHelper";
import MCPResponses from "../utilities/responses";
import { handleProfileSelection } from "./QueryProfile";
import { handle } from "hono/cloudflare-pages";

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

    let body;
    try {
      body = await c.req.json();
    } catch (error) {
      return c.json(errors.createError(400, c.req.url, "Body isn't valid JSON.", timestamp), 400);
    }

    const { itemIds } = body;

    if (!itemIds) {
      return c.json(errors.createError(400, c.req.url, "'itemIds' is missing.", timestamp));
    }

    const applyProfileChanges: object[] = [];
    let shouldUpdateProfile = false;

    for (const itemId of itemIds as string[]) {
      profile.items[itemId].attributes.item_seen = true;
      applyProfileChanges.push({
        changeType: "itemAttrChanged",
        itemId,
        attributeName: "item_seen",
        attributeValue: profile.items[itemId].attributes.item_seen,
      });

      shouldUpdateProfile = true;
    }

    if (shouldUpdateProfile) {
      profile.rvn += 1;
      profile.commandRevision += 1;
      profile.updatedAt = new Date().toISOString();

      await profilesService.update(user.accountId, profileId, profile);
    }

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`MarkItemSeen: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp));
  }
}
