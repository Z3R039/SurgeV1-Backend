import type { Context } from "hono";
import { userService, accountService, logger, profilesService, questsService, config } from "..";
import errors from "../utilities/errors";
import type { ProfileId } from "../utilities/responses";
import ProfileHelper from "../utilities/ProfileHelper";
import MCPResponses from "../utilities/responses";
import uaparser from "../utilities/uaparser";
import { LRUCache } from "lru-cache";
import type { IProfile, ItemValue } from "../../types/profilesdefs";
import { type QuestDictionary, type QuestItem } from "../../types/questdefs";
import { v4 as uuid } from "uuid";
import PlatformManager from "../utilities/managers/PlatformManager";

export const profileCache = new LRUCache<string, { data: IProfile; timestamp: number }>({
  max: 1000,
  ttl: 1000 * 60 * 1,
});

type AllowedProfileTypes =
  | "athena"
  | "common_core"
  | "profile0"
  | "common_public"
  | "campaign"
  | "metadata"
  | "theater0"
  | "collection_book_people0"
  | "collection_book_schematics0"
  | "outpost0"
  | "creative"
  | "collections"
  | "id"
  | "hasId"
  | "reload";

const profileTypes = new Map<ProfileId, AllowedProfileTypes>([
  ["athena", "athena"],
  ["profile0", "profile0"],
  ["common_core", "common_core"],
  ["common_public", "common_public"],
  ["campaign", "campaign"],
  ["metadata", "metadata"],
  ["theater0", "theater0"],
  ["creative", "creative"],
  ["collections", "collections"],
  ["collection_book_people0", "collection_book_people0"],
  ["collection_book_schematics0", "collection_book_schematics0"],
  ["outpost0", "outpost0"],
]);

export async function handleProfileSelection(
  profileId: ProfileId,
  accountId: string,
): Promise<IProfile | null> {
  const profileType = profileTypes.get(profileId);

  if (!profileType) {
    logger.error(`Invalid Profile Type: ${profileId}`);
    return null;
  }

  const cacheKey = `${accountId}:${profileId}`;
  const cachedEntry = profileCache.get(cacheKey);

  if (cachedEntry) {
    return cachedEntry.data;
  }

  const profile = await ProfileHelper.getProfile(accountId, profileType);

  if (!profile) {
    return null;
  }

  profileCache.set(cacheKey, { data: profile, timestamp: Date.now() });

  return profile;
}

export default async function (c: Context) {
  const { url } = c.req;
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;
  const useragent = c.req.header("User-Agent");

  const timestamp = new Date().toISOString();
  if (!useragent)
    return c.json(errors.createError(400, url, "Missing 'User-Agent'.", timestamp), 400);

  const uahelper = uaparser(useragent);
  if (!uahelper)
    return c.json(errors.createError(400, url, "Invalid 'User-Agent'.", timestamp), 400);

  if (!accountId || !rvn || !profileId)
    return c.json(errors.createError(400, url, "Missing parameters.", timestamp), 400);

  try {
    const [user, account] = await Promise.all([
      userService.findUserByAccountId(accountId),
      accountService.findUserByAccountId(accountId),
    ]);

    if (!user || !account)
      return c.json(errors.createError(404, url, "User or account not found.", timestamp), 404);

    const profile = await handleProfileSelection(profileId, user.accountId);
    if (!profile)
      return c.json(
        errors.createError(404, url, `Profile '${profileId}' not found.`, timestamp),
        404,
      );

    const {
      stats: { attributes },
    } = profile;
    let past_seasons = attributes.past_seasons || [];
    let campaign_stats = attributes.campaign_stats || [];

    if (profileId === "athena") {
      attributes.season_num = uahelper.season;

      const currentSeasonIndex = past_seasons.findIndex(
        (season) => season.seasonNumber === uahelper.season,
      );
      if (currentSeasonIndex !== -1) {
        const currentSeason = past_seasons[currentSeasonIndex];

        const allQuests = await questsService.findAllQuestsByAccountIdAndProfile(
          user.accountId,
          "athena",
        );

        for (const quest of allQuests) {
          if (quest.season !== config.currentSeason && !quest.isDaily) {
            await questsService.deleteQuestByTemplateId(
              user.accountId,
              uahelper.season,
              quest.templateId,
            );
          }
        }

        Object.assign(attributes, {
          ...currentSeason,
          season: {
            numWins: currentSeason.numWins,
            numLowBracket: currentSeason.numLowBracket,
            numHighBracket: currentSeason.numHighBracket,
          },
        });

        profile.items = {
          ...(
            await questsService.findAllQuestsByAccountIdAndProfile(user.accountId, "athena")
          ).reduce<QuestDictionary>(
            (acc, item) => ({
              ...acc,
              [item.templateId]: {
                attributes: item.entity,
                templateId: item.templateId,
                quantity: 1,
              },
            }),
            {},
          ),
          ...profile.items,
        };
      } else {
        past_seasons.push({
          seasonNumber: uahelper.season,
          numWins: 0,
          numHighBracket: 0,
          numLowBracket: 0,
          seasonXp: 0,
          seasonLevel: 1,
          bookXp: 0,
          bookLevel: 1,
          purchasedVIP: false,
          numRoyalRoyales: 0,
          survivorTier: 0,
          survivorPrestige: 0,
        });

        Object.assign(attributes, {
          xp: 0,
          level: 1,
          book_purchased: false,
          book_level: 1,
          book_xp: 0,
        });
      }

      attributes.past_seasons = past_seasons;
      await profilesService.update(user.accountId, "athena", profile);
    }

    if (profileId === "common_core") {
      attributes.permissions = attributes.permissions || [];
      account.permissions.forEach((permission) => {
        if (!attributes.permissions!.includes(permission.resource))
          attributes.permissions!.push(permission.resource);
      });

      const clientPlatform = PlatformManager.getClientPlatformByUserAgent(c);

      const platform = PlatformManager.getPlatform(clientPlatform as string);

      profile.stats.attributes.current_mtx_platform = platform;
      profile.items["Currency:MtxPurchased"].attributes.platform = platform;

      await profilesService.update(user.accountId, "common_core", profile);
    }

    if (profileId === "campaign" && parseInt(rvn) !== -1) {
      Object.assign(profile, {
        updatedAt: timestamp,
        rvn: profile.rvn + 1,
        commandRevision: profile.commandRevision + 1,
      });

      attributes.season_num = uahelper.season;

      const currentSeasonIndex = campaign_stats.findIndex(
        (season) => season.season === uahelper.season,
      );

      if (currentSeasonIndex !== -1) {
        const currentSeason = campaign_stats[currentSeasonIndex];

        const allQuests = await questsService.findAllQuestsByAccountIdAndProfile(
          user.accountId,
          "campaign",
        );

        for (const quest of allQuests.filter((quest) => quest.season !== config.currentSeason)) {
          await questsService.deleteQuestByTemplateId(
            user.accountId,
            uahelper.season,
            quest.templateId,
          );

          logger.info(`Deleted quest: ${quest.templateId}`);
        }

        Object.assign(attributes, currentSeason);

        const newQuestId = uuid();

        const existingQuests = profile.items || {};

        const questDictionary = (
          await questsService.findAllQuestsByAccountIdAndProfile(user.accountId, "campaign")
        ).reduce<QuestDictionary>((acc, item) => {
          const templateId = item.templateId;

          if (existingQuests[templateId]) {
            existingQuests[templateId].attributes = {
              ...existingQuests[templateId].attributes,
              ...item.entity,
            };
          } else {
            acc[templateId] = {
              itemId: templateId,
              attributes: item.entity,
              templateId: item.templateId,
              quantity: 1,
            };
          }

          return acc;
        }, existingQuests);

        await profilesService.update(user.accountId, "campaign", profile);
      } else {
        campaign_stats.push({
          season: uahelper.season,
        });
      }

      attributes.campaign_stats = campaign_stats;

      await profilesService.update(user.accountId, "campaign", profile);
    }

    return c.json(
      MCPResponses.generate(profile, [{ changeType: "fullProfileUpdate", profile }], profileId),
    );
  } catch (error) {
    logger.error(`Error in QueryProfile: ${error}`);
    return c.json(errors.createError(500, url, "Internal server error.", timestamp), 500);
  }
}
