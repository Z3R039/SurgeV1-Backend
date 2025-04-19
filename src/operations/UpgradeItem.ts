import type { Context } from "hono";
import type { ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import { accountService, app, logger, profilesService, userService } from "..";
import { handleProfileSelection } from "./QueryProfile";
import MCPResponses from "../utilities/responses";
import ProfileHelper from "../utilities/ProfileHelper";

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

    let shouldUpdateProfile = false;
    const applyProfileChanges: object[] = [];

    const { targetItemId } = body;

    if (!targetItemId) {
      return c.json(errors.createError(400, c.req.url, "Missing targetItemId.", timestamp), 400);
    }

    if (typeof targetItemId !== "string") {
      return c.json(
        errors.createError(400, c.req.url, "targetItemId must be a string.", timestamp),
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

    const targetItemTemplateId = targetItem.templateId;

    if (!targetItemTemplateId) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to find templateId.", timestamp),
        400,
      );
    }

    const targetItemAttributes = targetItem.attributes;

    if (!targetItemAttributes) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to find attributes.", timestamp),
        400,
      );
    }

    profile.items[targetItemId].attributes.level! += 1;

    applyProfileChanges.push({
      changeType: "itemAttrChanged",
      itemId: targetItemId,
      attributeName: "level",
      attributeValue: profile.items[targetItemId].attributes.level,
    });

    const heroXp = ProfileHelper.getItemByTemplateId(profile, "AccountResource:HeroXP");

    if (heroXp.length === 0) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to find 'AccountResource:HeroXP'.", timestamp),
        400,
      );
    }

    const xpDeducation = profile.items[targetItemId].attributes.level! * 150;

    if (
      profile.items[targetItemId].attributes.level! >= 1 &&
      profile.items[targetItemId].attributes.level! <= 139
    ) {
      heroXp[0].value.quantity -= xpDeducation;
      applyProfileChanges.push({
        changeType: "itemQuantityChanged",
        itemId: "AccountResource:HeroXP",
        quantity: heroXp[0].value.quantity,
      });
      shouldUpdateProfile = true;
    }

    shouldUpdateProfile = true;

    if (shouldUpdateProfile) {
      profile.updatedAt = new Date().toISOString();
      profile.commandRevision++;
      profile.rvn++;

      await profilesService.update(user.accountId, profileId, profile);
    }

    applyProfileChanges.push({
      changeType: "fullProfileUpdate",
      profile,
    });

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`SetHomebaseName: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
