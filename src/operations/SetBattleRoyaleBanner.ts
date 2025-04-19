import type { Context } from "hono";
import { logger, profilesService, userService } from "..";
import errors from "../utilities/errors";
import ProfileHelper from "../utilities/ProfileHelper";
import { Profiles } from "../tables/profiles";
import MCPResponses, { type ProfileId } from "../utilities/responses";
import { handleProfileSelection } from "./QueryProfile";

export default async function SetBattleRoyaleBanner(c: Context) {
  const timestamp = new Date().toISOString();

  try {
    const accountId = c.req.param("accountId");
    const profileId = c.req.query("profileId") as ProfileId;

    const [user, athena, profile] = await Promise.all([
      userService.findUserByAccountId(accountId),
      ProfileHelper.getProfile(accountId, "athena"),
      handleProfileSelection(profileId, accountId),
    ]);

    if (!user || !profile || !athena) {
      return c.json(
        errors.createError(400, c.req.url, "User, Profile, or Athena not found.", timestamp),
      );
    }

    let body;
    try {
      body = await c.req.json();
    } catch (error) {
      return c.json(errors.createError(400, c.req.url, "Body isn't valid JSON.", timestamp), 400);
    }

    const { homebaseBannerIconId, homebaseBannerColorId } = body;
    const applyProfileChanges: object[] = [];

    let shouldUpdateProfile = false;

    const activeLoadoutId =
      profile.stats.attributes.loadouts![profile.stats.attributes.active_loadout_index!];

    if (!activeLoadoutId) {
      return c.json(
        errors.createError(400, c.req.url, "'active_loadout_index' is undefined.", timestamp),
        400,
      );
    }

    if (homebaseBannerIconId === null && homebaseBannerColorId === null) {
      return c.json(
        errors.createError(
          400,
          c.req.url,
          "Both 'homebaseBannerIconId' and 'homebaseBannerColorId' are null.",
          timestamp,
        ),
        400,
      );
    }

    profile.stats.attributes.banner_icon = homebaseBannerIconId;
    profile.stats.attributes.banner_color = homebaseBannerColorId;

    profile.items[activeLoadoutId].attributes.banner_icon_template = homebaseBannerIconId;
    profile.items[activeLoadoutId].attributes.banner_color_template = homebaseBannerColorId;

    applyProfileChanges.push({
      changeType: "statModified",
      name: "banner_icon",
      value: profile.stats.attributes.banner_icon,
    });
    applyProfileChanges.push({
      changeType: "statModified",
      name: "banner_color",
      value: profile.stats.attributes.banner_color,
    });

    shouldUpdateProfile = true;

    if (shouldUpdateProfile) {
      athena.rvn += 1;
      athena.commandRevision += 1;
      athena.updatedAt = timestamp;

      await profilesService.update(user.accountId, "athena", athena);
    }

    return c.json(MCPResponses.generate(athena, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`SetBattleRoyaleBanner: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp));
  }
}
