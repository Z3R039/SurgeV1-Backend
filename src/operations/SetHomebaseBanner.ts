import type { Context } from "hono";
import type { ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import { accountService, config, logger, profilesService, questsService, userService } from "..";
import { handleProfileSelection } from "./QueryProfile";
import MCPResponses from "../utilities/responses";
import type { Quests } from "../tables/quests";
import {
  CampaignQuestManager,
  CampaignQuestType,
} from "../utilities/managers/CampaignQuestManager";
import { CampaignQuestBuilder } from "../utilities/quests/campaign/CampaignQuestBuilder";

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

    const { homebaseBannerIconId, homebaseBannerColorId } = body;

    const applyProfileChanges: object[] = [];

    if (!homebaseBannerColorId || !homebaseBannerIconId) {
      return c.json(
        errors.createError(
          400,
          c.req.url,
          "Missing homebaseBannerColorId or homebaseBannerIconId.",
          timestamp,
        ),
        400,
      );
    }

    let shouldUpdateProfile = false;

    if (profileId === "profile0") {
      profile.stats.attributes.homebase!.bannerColorId = homebaseBannerColorId;
      profile.stats.attributes.homebase!.bannerIconId = homebaseBannerIconId;

      applyProfileChanges.push({
        changeType: "statModified",
        name: "homebase",
        value: profile.stats.attributes.homebase,
      });

      shouldUpdateProfile = true;
    } else if (profileId === "common_public") {
      profile.stats.attributes.banner_icon = homebaseBannerIconId;
      profile.stats.attributes.banner_color = homebaseBannerColorId;

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
    }

    if (shouldUpdateProfile) {
      profile.updatedAt = new Date().toISOString();
      profile.commandRevision++;
      profile.rvn++;

      if (profileId === "common_public") {
        await profilesService.update(user.accountId, "common_public", profile);
      } else if (profileId === "profile0") {
        await profilesService.update(user.accountId, "profile0", profile);
      }
    }

    applyProfileChanges.push({
      changeType: "fullProfileUpdate",
      profile,
    });

    return c.json(MCPResponses.generate(profile, applyProfileChanges, profileId));
  } catch (error) {
    logger.error(`SetHomebaseBanner: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
