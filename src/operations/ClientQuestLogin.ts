import type { Context } from "hono";
import type { ProfileId } from "../utilities/responses";
import uaparser from "../utilities/uaparser";
import errors from "../utilities/errors";
import {
  accountService,
  config,
  itemStorageService,
  logger,
  profilesService,
  questsService,
  userService,
} from "..";
import ProfileHelper from "../utilities/ProfileHelper";
import { QuestManager } from "../utilities/managers/QuestManager";
import MCPResponses from "../utilities/responses";
import { User } from "../tables/user";
import { v4 as uuid } from "uuid";
import { handleProfileSelection } from "./QueryProfile";
import { SendMessageToId } from "../sockets/xmpp/utilities/SendMessageToId";
import RefreshAccount from "../utilities/refresh";
import { BattlepassQuestGranter } from "../utilities/quests/BattlepassQuestGranter";
import type { IProfile, ItemValue, Lootlist, StatsAttributes } from "../../types/profilesdefs";
import type { QuestAttributesDefinition, QuestDictionary } from "../../types/questdefs";
import type { Quests } from "../tables/quests";
import {
  CampaignQuestManager,
  CampaignQuestType,
} from "../utilities/managers/CampaignQuestManager";
import { CampaignQuestOrchestrator } from "../utilities/quests/campaign/CampaignQuestOrchestrator";

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;
  const useragent = c.req.header("User-Agent");
  const timestamp = new Date().toISOString();
  const currentDate = new Date().toISOString().slice(0, 10);

  if (!useragent || !accountId || !rvn || !profileId) {
    return c.json(
      errors.createError(400, c.req.url, "Missing required parameters.", timestamp),
      400,
    );
  }

  try {
    const [user, account] = await Promise.all([
      userService.findUserByAccountId(accountId),
      accountService.findUserByAccountId(accountId),
    ]);

    if (!user || !account) {
      return c.json(
        errors.createError(404, c.req.url, "User or account not found.", timestamp),
        404,
      );
    }

    const profile = await handleProfileSelection(profileId, user.accountId);
    if (!profile && profileId !== "athena" && profileId !== "common_core") {
      return c.json(
        errors.createError(404, c.req.url, `Profile ${profileId} was not found.`, timestamp),
        404,
      );
    }
    if (!profile) {
      return c.json(
        errors.createError(404, c.req.url, `Profile ${profileId} was not found.`, timestamp),
        404,
      );
    }

    const common_core = await ProfileHelper.getProfile(user.accountId, "common_core");
    if (!common_core) {
      return c.json(
        errors.createError(404, c.req.url, `Profile 'common_core' not found.`, timestamp),
        404,
      );
    }

    const uahelper = uaparser(useragent);
    if (!uahelper) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
        400,
      );
    }

    const [storage] = await Promise.all([questsService.findAllQuestsByAccountId(user.accountId)]);

    if (!storage) {
      return c.json(
        errors.createError(404, c.req.url, "ItemStore 'quests' not found.", timestamp),
        404,
      );
    }

    if (user.banned) {
      return c.json(errors.createError(403, c.req.url, "You are banned.", timestamp), 403);
    }

    let shouldUpdateProfile = false;
    let shouldUpdateCampaignProfile = false;
    const multiUpdates: object[] = [];

    if (profileId === "campaign") {
      const { quest_manager: questManager, campaign_stats: campaignStats } =
        profile.stats.attributes;

      if (!questManager || !campaignStats) {
        return c.json(errors.createError(400, c.req.url, "Invalid Profile", timestamp), 400);
      }

      if (uahelper.season === config.currentSeason) {
        const { dailyLoginInterval, dailyQuestRerolls, questPoolStats } = questManager;

        if (!questPoolStats) {
          return c.json(errors.createError(400, c.req.url, "Invalid Profile", timestamp), 400);
        }

        if (
          dailyLoginInterval !== currentDate &&
          questPoolStats.dailyLoginInterval !== currentDate
        ) {
          questManager.dailyLoginInterval = currentDate;
          questPoolStats.dailyLoginInterval = currentDate;
          questManager.dailyQuestRerolls = (dailyQuestRerolls || 0) + 1;

          multiUpdates.push({
            changeType: "statModified",
            name: "quest_manager",
            value: {
              dailyLoginInterval: currentDate,
              dailyQuestRerolls: questManager.dailyQuestRerolls,
            },
          });

          const dailyQuests = await CampaignQuestManager.getRandomQuests(user.accountId);

          dailyQuests.map(async (dailyQuest) => {
            const item = {
              templateId: `Quest:${dailyQuest.Name}`,
              attributes: {
                creation_time: new Date().toISOString(),
                level: -1,
                item_seen: false,
                playlists: [],
                sent_new_notification: true,
                challenge_bundle_id: "",
                xp_reward_scalar: 1,
                challenge_linked_quest_given: "",
                quest_pool: "",
                quest_state: "Active",
                bucket: "",
                last_state_change_time: new Date().toISOString(),
                challenge_linked_quest_parent: "",
                max_level_bonus: 0,
                xp: 0,
                quest_rarity: "uncommon",
                favorite: false,
                [`completion_${dailyQuest.Properties.Objectives[0].BackendName}`]: 0,
              },
              quantity: 1,
            };

            multiUpdates.push({
              changeType: "itemAdded",
              itemId: `Quest:${dailyQuest.Name}`,
              item: item,
            });

            await questsService.deleteQuestsByAccountIdAndProfile(user.accountId, "campaign");

            await questsService.addQuest({
              accountId: user.accountId,
              profileId: "campaign",
              isDaily: true,
              templateId: `Quest:${dailyQuest.Name}`,
              entity: {
                creation_time: new Date().toISOString(),
                level: -1,
                item_seen: false,
                playlists: [],
                sent_new_notification: true,
                challenge_bundle_id: "",
                xp_reward_scalar: 1,
                challenge_linked_quest_given: "",
                quest_pool: "",
                quest_state: "Active",
                bucket: "",
                last_state_change_time: new Date().toISOString(),
                challenge_linked_quest_parent: "",
                max_level_bonus: 0,
                xp: 0,
                quest_rarity: "uncommon",
                favorite: false,
                [`completion_${dailyQuest.Properties.Objectives[0].BackendName}`]: 0,
              },
              season: uahelper.season,
            });
          });

          shouldUpdateCampaignProfile = true;
        }

        await CampaignQuestOrchestrator.constructCampaignQuests(profile, uahelper, multiUpdates);
        shouldUpdateCampaignProfile = true;
      }
    }

    if (profileId === "athena") {
      const { past_seasons: pastSeasons, quest_manager: questManager } = profile.stats.attributes;

      if (!questManager) {
        return c.json(errors.createError(400, c.req.url, "Invalid Profile", timestamp), 400);
      }

      const { dailyLoginInterval, dailyQuestRerolls } = questManager;
      const currentSeason = config.currentSeason;

      if (pastSeasons) {
        for (const pastSeason of pastSeasons) {
          if (pastSeason.seasonNumber === currentSeason && dailyLoginInterval !== currentDate) {
            questManager.dailyLoginInterval = currentDate;
            questManager.dailyQuestRerolls = (dailyQuestRerolls || 0) + 1;

            multiUpdates.push({
              changeType: "statModified",
              name: "quest_manager",
              value: {
                dailyLoginInterval: currentDate,
                dailyQuestRerolls: questManager.dailyQuestRerolls,
              },
            });

            const dailyQuests = await QuestManager.getRandomQuests(user.accountId);

            dailyQuests.map(async (dailyQuest) => {
              const item = {
                templateId: `Quest:${dailyQuest.Name}`,
                attributes: {
                  creation_time: new Date().toISOString(),
                  level: -1,
                  item_seen: false,
                  playlists: [],
                  sent_new_notification: true,
                  challenge_bundle_id: "",
                  xp_reward_scalar: 1,
                  challenge_linked_quest_given: "",
                  quest_pool: "",
                  quest_state: "Active",
                  bucket: "",
                  last_state_change_time: new Date().toISOString(),
                  challenge_linked_quest_parent: "",
                  max_level_bonus: 0,
                  xp: 0,
                  quest_rarity: "uncommon",
                  favorite: false,
                  [`completion_${dailyQuest.Properties.Objectives[0].BackendName}`]: 0,
                },
                quantity: 1,
              };

              multiUpdates.push({
                changeType: "itemAdded",
                itemId: `Quest:${dailyQuest.Name}`,
                item: item,
              });

              await questsService.deleteAllDailyQuestsByAccountId(user.accountId, "athena");
              multiUpdates.push(...ProfileHelper.removeDailyQuests(profile));

              await questsService.addQuest({
                accountId: user.accountId,
                profileId: "athena",
                isDaily: true,
                templateId: `Quest:${dailyQuest.Name}`,
                entity: {
                  creation_time: new Date().toISOString(),
                  level: -1,
                  item_seen: false,
                  playlists: [],
                  sent_new_notification: true,
                  challenge_bundle_id: "",
                  xp_reward_scalar: 1,
                  challenge_linked_quest_given: "",
                  quest_pool: "",
                  quest_state: "Active",
                  bucket: "",
                  last_state_change_time: new Date().toISOString(),
                  challenge_linked_quest_parent: "",
                  max_level_bonus: 0,
                  xp: 0,
                  quest_rarity: "uncommon",
                  favorite: false,
                  [`completion_${dailyQuest.Properties.Objectives[0].BackendName}`]: 0,
                },
                season: uahelper.season,
              });
            });

            shouldUpdateProfile = true;
          }

          if (uahelper.season === config.currentSeason && profileId === "athena") {
            const weeklyQuests = Array.from(QuestManager.listedWeeklyQuests) || [];

            if (weeklyQuests.length === 0) return;

            const grantedBundles = new Set<string>();
            const grantedQuestInstanceIds = new Set<string>();
            let challengeBundleScheduleId = "";

            for (const quest of weeklyQuests) {
              const bundleName = `ChallengeBundle:${quest.Name}`;
              grantedBundles.add(bundleName);
              challengeBundleScheduleId = quest.ChallengeBundleSchedule;

              for (const questBundle of quest.Objects) {
                if (questBundle.Options.bRequiresVIP && !pastSeason.purchasedVIP) continue;

                const questExists = await questsService.findQuestByTemplateId(
                  accountId,
                  config.currentSeason,
                  questBundle.Name,
                );

                if (questExists) {
                  continue;
                }

                const objectiveStates = Object.fromEntries(
                  questBundle.Objectives.map(({ BackendName, Stage }) => [
                    `completion_${BackendName}`,
                    Stage,
                  ]),
                );

                const itemResponse = {
                  templateId: questBundle.Name,
                  attributes: {
                    creation_time: new Date().toISOString(),
                    level: -1,
                    item_seen: false,
                    playlists: [],
                    sent_new_notification: true,
                    challenge_bundle_id: bundleName,
                    xp_reward_scalar: 1,
                    quest_state: "Active",
                    last_state_change_time: new Date().toISOString(),
                    quest_rarity: "uncommon",
                    favorite: false,
                    ...objectiveStates,
                  },
                  quantity: 1,
                };

                grantedQuestInstanceIds.add(questBundle.Name);
                profile.items[questBundle.Name] = itemResponse;
                multiUpdates.push({
                  changeType: "itemAdded",
                  itemId: questBundle.Name,
                  item: itemResponse,
                });
              }
            }

            const scheduleItemResponse = {
              templateId: challengeBundleScheduleId,
              attributes: {
                unlock_epoch: new Date().toISOString(),
                max_level_bonus: 0,
                level: 1,
                item_seen: false,
                xp: 0,
                favorite: false,
                granted_bundles: Array.from(grantedBundles),
              },
              quantity: 1,
            };

            profile.items[challengeBundleScheduleId] = scheduleItemResponse;
            multiUpdates.push({
              changeType: "itemAdded",
              itemId: challengeBundleScheduleId,
              item: scheduleItemResponse,
            });

            grantedBundles.forEach((bundle) => {
              const bundleItemResponse = {
                templateId: bundle,
                attributes: {
                  has_unlock_by_completion: false,
                  num_quests_completed: 0,
                  level: 0,
                  grantedquestinstanceids: Array.from(grantedQuestInstanceIds),
                  item_seen: false,
                  max_allowed_bundle_level: 0,
                  num_granted_bundle_quests: grantedQuestInstanceIds.size,
                  max_level_bonus: 0,
                  challenge_bundle_schedule_id: challengeBundleScheduleId,
                  num_progress_quests_completed: 0,
                  xp: 0,
                  favorite: false,
                },
                quantity: 1,
              };

              profile.items[bundle] = bundleItemResponse;
              multiUpdates.push({
                changeType: "itemAdded",
                itemId: bundle,
                item: bundleItemResponse,
              });
            });

            try {
              await profilesService.updateMultiple([{ accountId, type: "athena", data: profile }]);
              await questsService.addQuests(
                Array.from(grantedQuestInstanceIds).map((id) => ({
                  accountId,
                  profileId: "athena",
                  templateId: id,
                  entity: profile.items[id].attributes,
                  isDaily: false,
                  season: config.currentSeason,
                })),
              );
            } catch (error) {
              logger.error(`Error updating profile or adding quests: ${error}`);
            }
          }

          // const dailyQuests = await questsService.findAllDailyQuestsByAccountId(
          //   user.accountId,
          //   "athena",
          // );

          // logger.debug(`Daily Quests: ${dailyQuests.length}`);

          // if (dailyQuests.length > 3) {
          //   let deletedCount = 0;

          //   for (const quest of dailyQuests) {
          //     if (quest.entity.quest_state === "Active") {
          //       await questsService.deleteQuestByTemplateId(
          //         user.accountId,
          //         uahelper.season,
          //         quest.templateId,
          //       );

          //       deletedCount++;
          //     }

          //     if (deletedCount >= 3) break;
          //   }
          // }
        }
      }
    }

    if (shouldUpdateProfile) {
      profile.rvn++;
      profile.commandRevision++;
      profile.updatedAt = new Date().toISOString();

      common_core.rvn++;
      common_core.commandRevision++;
      common_core.updatedAt = new Date().toISOString();

      await profilesService.update(user.accountId, "athena", profile);
      await profilesService.update(user.accountId, "common_core", common_core);
    }

    if (shouldUpdateCampaignProfile) {
      profile.rvn++;
      profile.commandRevision++;
      profile.updatedAt = new Date().toISOString();

      await profilesService.update(user.accountId, "campaign", profile);
    }

    if (multiUpdates.length === 0) {
      multiUpdates.push({
        changeType: "fullProfileUpdate",
        profile,
      });
    }

    return c.json(MCPResponses.generate(profile, multiUpdates, profileId));
  } catch (error) {
    logger.error(`ClientQuestLogin: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
