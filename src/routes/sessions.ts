import {
  accountService,
  app,
  config,
  logger,
  profilesService,
  questsService,
  seasonStatsService,
  serversService,
  userService,
} from "..";
import { Validation } from "../middleware/validation";
import { Profiles } from "../tables/profiles";
import errors from "../utilities/errors";
import { LevelsManager } from "../utilities/managers/LevelsManager";
import { RewardsManager } from "../utilities/managers/RewardsManager";
import ProfileHelper from "../utilities/ProfileHelper";
import { v4 as uuid } from "uuid";
import MCPResponses from "../utilities/responses";
import { BattlepassManager } from "../utilities/managers/BattlepassManager";
import { SendMessageToId } from "../sockets/xmpp/utilities/SendMessageToId";
import { handleProfileSelection } from "../operations/QueryProfile";
import RefreshAccount from "../utilities/refresh";
import type { Lootlist } from "../../types/profilesdefs";
import { z } from "zod";
import { QuestManager, QuestType } from "../utilities/managers/QuestManager";

const applyMatchStatsSchema = z.object({
  username: z.string(),
  sessionId: z.string().uuid("Invalid sessionId format. Expected UUID."),
  matchType: z.enum(["vbucks", "levels", "quest"], {
    errorMap: () => ({ message: "matchType must be either 'vbucks', 'levels', or 'quest'" }),
  }),
  stats: z.union([
    z.object({
      eliminations: z.number().int().min(0, "Eliminations must be a non-negative integer"),
      // 100 - 1
      placement: z.number().int().min(0, "Placement must be a non-negative integer"),
      isVictory: z.boolean(),
      gamemode: z.enum(["solos", "duos", "squads", "ltm"], {
        errorMap: () => ({ message: "gamemode must be one of 'solos', 'duos', 'squads', 'ltm'" }),
      }),
    }),
    z.object({
      totalXp: z.number().int().min(0, "Total XP must be a non-negative integer"),
    }),
    z.object({
      quest: z.object({
        questId: z.string(),
        updates: z.object({
          BackendName: z.string(),
          Count: z.number().int().min(0, "Completion must be a non-negative integer"),
        }),
      }),
    }),
  ]),
});

export default function () {
  app.post("/gamesessions/setStatus", Validation.verifyBasicToken, async (c) => {
    let body;
    const timestamp = new Date().toISOString();

    try {
      body = await c.req.json();
    } catch (error) {
      return c.json(errors.createError(400, c.req.url, "Body isn't valid JSON", timestamp), 400);
    }

    const { status, sessionId } = body;

    try {
      const existingServer = await serversService.getServerBySessionId(sessionId);

      if (!existingServer)
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Failed to set server status to '${status}'`,
            timestamp,
          ),
          400,
        );

      existingServer.status = status;
      await serversService.updateServerQueue(
        existingServer.identifier,
        existingServer.options.region,
        existingServer.port,
        existingServer.queue,
      );

      return c.json({ message: `Successfully set server status to '${status}'` });
    } catch (error) {
      return c.json(
        errors.createError(500, c.req.url, "Failed to set server status.", timestamp),
        500,
      );
    }
  });

  app.post(
    "/gamesessions/stats/operations/ApplyMatchStats",
    Validation.verifyBasicToken,
    async (c) => {
      const timestamp = new Date().toISOString();
      const body = await c.req.json();

      if (!body) {
        return c.json(errors.createError(400, c.req.url, "Invalid body.", timestamp), 400);
      }

      const parseResult = applyMatchStatsSchema.safeParse(body);

      if (!parseResult.success) {
        const validationError = parseResult.error.format();
        return c.json(
          errors.createError(
            400,
            c.req.url,
            `Invalid body. ${JSON.stringify(validationError)}`,
            timestamp,
          ),
          400,
        );
      }

      const { username, sessionId, matchType, stats } = parseResult.data;

      try {
        const [user, server] = await Promise.all([
          userService.findUserByUsername(username),
          serversService.getServerBySessionId(sessionId),
        ]);

        if (!user) {
          return c.json(errors.createError(404, c.req.url, "User not found!", timestamp), 404);
        }

        if (!server) {
          return c.json(errors.createError(404, c.req.url, "Server not found.", timestamp), 404);
        }

        const [common_core, athena] = await Promise.all([
          handleProfileSelection("common_core", user.accountId),
          handleProfileSelection("athena", user.accountId),
        ]);

        if (!common_core || !athena) {
          return c.json(errors.createError(404, c.req.url, "Profile not found!", timestamp), 404);
        }

        let changes: object[] = [];

        if (matchType === "vbucks" && "eliminations" in stats) {
          const { eliminations, isVictory, placement, gamemode } = stats;

          const lootList: Lootlist[] = [];

          let currency = eliminations * 50;
          if (isVictory) {
            currency += 200;
          }

          for (const pastSeason of athena.stats.attributes!.past_seasons!) {
            if (pastSeason.seasonNumber === config.currentSeason) {
              pastSeason.numWins += isVictory ? 1 : 0;

              const [seasonStats] = await Promise.all([
                seasonStatsService.findStatByAccountId(user.accountId, gamemode),
              ]);

              if (!seasonStats) {
                return c.json(
                  errors.createError(404, c.req.url, "Season stats not found.", timestamp),
                  404,
                );
              }

              // Update the top placements from, 25, 10, 6, 12, 5, 3, 1.
              switch (placement) {
                case 25:
                  seasonStats.top25 += 1;
                  break;
                case 10:
                  seasonStats.top10 += 1;
                  break;
                case 6:
                  seasonStats.top6 += 1;
                  break;
                case 12:
                  seasonStats.top12 += 1;
                  break;
                case 5:
                  seasonStats.top5 += 1;
                  break;
                case 3:
                  seasonStats.top3 += 1;
                  break;
                case 1:
                  seasonStats.top1 += 1;

                  const lootList: Lootlist[] = [];

                  const reward = "AthenaGlider:Umbrella_Season_06";

                  const existingReward = athena.items[reward];

                  if (!existingReward) {
                    lootList.push({
                      itemType: reward,
                      itemGuid: reward,
                      itemProfile: "athena",
                      quantity: 1,
                    });

                    changes.push({
                      itemType: reward,
                      itemGuid: reward,
                      quantity: 1,
                    });

                    athena.items[reward] = {
                      templateId: reward,
                      attributes: {
                        max_level_bonus: 0,
                        level: 1,
                        item_seen: false,
                        xp: 0,
                        variants: [],
                        favorite: false,
                      },
                      quantity: 1,
                    };

                    const exsistingTheUmbrellaReward = athena.items["AthenaGlider:Solo_Umbrella"];

                    if (!exsistingTheUmbrellaReward) {
                      changes.push({
                        itemType: "AthenaGlider:Solo_Umbrella",
                        itemGuid: "AthenaGlider:Solo_Umbrella",
                        quantity: 1,
                      });

                      lootList.push({
                        itemType: "AthenaGlider:Solo_Umbrella",
                        itemGuid: "AthenaGlider:Solo_Umbrella",
                        itemProfile: "athena",
                        quantity: 1,
                      });

                      athena.items["AthenaGlider:Solo_Umbrella"] = {
                        templateId: "AthenaGlider:Solo_Umbrella",
                        attributes: {
                          max_level_bonus: 0,
                          level: 1,
                          item_seen: false,
                          xp: 0,
                          variants: [],
                          favorite: false,
                        },
                        quantity: 1,
                      };
                    }
                  }

                  if (lootList.length > 0) {
                    changes.push({
                      itemType: reward,
                      itemGuid: reward,
                      quantity: 1,
                    });

                    const giftBoxItemTemplate = {
                      templateId: "GiftBox:GB_SeasonFirstWin",
                      attributes: {
                        max_level_bonus: 0,
                        fromAccountId: "Server",
                        lootList,
                      },
                      quantity: 1,
                    };

                    common_core.items[giftBoxItemTemplate.templateId] = giftBoxItemTemplate;
                    common_core.stats.attributes.gifts!.push(giftBoxItemTemplate);
                  }

                  break;
              }

              seasonStats.wins += isVictory ? 1 : 0;
              seasonStats.kills += eliminations;
              seasonStats.matchesplayed += 1;

              // Grant vbucs from top 10 onwards.
              if (seasonStats.top10 >= 10) {
                currency += 10;
              }

              switch (gamemode) {
                case "solos":
                  await seasonStatsService.update(user.accountId, seasonStats);
                  break;
                case "duos":
                  await seasonStatsService.update(user.accountId, seasonStats);

                  break;
                case "squads":
                  await seasonStatsService.update(user.accountId, seasonStats);

                  break;
                case "ltm":
                  await seasonStatsService.update(user.accountId, seasonStats);

                  break;
              }

              lootList.push({
                itemType: "Currency:MtxPurchased",
                itemGuid: "Currency:MtxPurchased",
                itemProfile: "common_core",
                quantity: currency,
              });

              changes.push({
                itemType: "Currency:MtxPurchased",
                itemGuid: "Currency:MtxPurchased",
                quantity: currency,
              });

              common_core.items["GiftBox:GB_MakeGood"] = {
                templateId: "GiftBox:GB_MakeGood",
                attributes: {
                  max_level_bonus: 0,
                  fromAccountId: "Server",
                  lootList,
                },
                quantity: 1,
              };

              common_core.items["Currency:MtxPurchased"].quantity += currency;
              changes.push({ amountGained: currency, stats: seasonStats });
              break;
            }
          }
        } else if (matchType === "levels" && "totalXp" in stats) {
          const { totalXp } = stats;
          const { attributes } = athena.stats;

          for (const pastSeason of attributes.past_seasons!) {
            if (pastSeason.seasonNumber === config.currentSeason) {
              pastSeason.seasonXp += totalXp;

              if (isNaN(attributes.level!)) attributes.level = 1;
              if (isNaN(attributes.xp!)) attributes.xp = 0;

              const updater = await RewardsManager.addGrant(
                pastSeason,
                user.accountId,
                user.username,
              );

              if (updater) {
                updater.items.forEach(async (val) => {
                  common_core.stats.attributes.gifts!.push({
                    templateId: "GiftBox:gb_battlepass",
                    attributes: {
                      lootList: updater.items.map((item) => ({
                        itemType: item.templateId,
                        itemGuid: item.templateId,
                        itemProfile: item.type,
                        quantity: item.quantity,
                      })),
                    },
                    quantity: 1,
                  });
                });

                attributes.level = updater.pastSeasons.seasonLevel;
                attributes.book_level = updater.pastSeasons.bookLevel;
                attributes.xp! += updater.pastSeasons.seasonXp;
                attributes.accountLevel! += 1;
                attributes.last_xp_interaction = new Date().toISOString();

                changes.push({
                  level: attributes.level,
                  book_level: attributes.book_level,
                  xp: attributes.xp,
                  last_xp_interaction: attributes.last_xp_interaction,
                });
              }
            }
          }
        } else if (matchType === "quest" && "quest" in stats) {
          const { questId, updates } = stats.quest;

          const quest = Array.from(QuestManager.listedWeeklyQuests).find((q) => q.Name === questId);

          const dbQuest = await questsService.findQuestByTemplateId(
            user.accountId,
            config.currentSeason,
            questId,
          );

          if (!dbQuest) {
            return c.json(errors.createError(404, c.req.url, "Quest not found.", timestamp), 404);
          }

          if (quest && dbQuest.entity.quest_state !== "Completed") {
            for (const objectives of quest.Objects) {
              const objectiveStates = objectives.Objectives.reduce(
                (acc, { Count }) => ({ ...acc, Count }),
                { Count: 0 },
              );

              for (const pastSeason of athena.stats.attributes.past_seasons!) {
                const state =
                  pastSeason.seasonXp >= objectiveStates.Count
                    ? "Completed"
                    : dbQuest.entity.quest_state;

                dbQuest.entity[`completion_${objectives.Name}`] = Math.min(
                  pastSeason.seasonXp,
                  objectiveStates.Count,
                );
                dbQuest.entity.quest_state = state;

                await questsService.updateQuest(
                  dbQuest,
                  user.accountId,
                  config.currentSeason,
                  questId,
                );

                if (state === "Completed") {
                  const challengeBundleScheduleId = `ChallengeBundle:${quest.Name}`;

                  const bundleInDb = await questsService.findQuestByTemplateId(
                    user.accountId,
                    config.currentSeason,
                    challengeBundleScheduleId,
                  );

                  if (!bundleInDb) {
                    return c.json(
                      errors.createError(404, c.req.url, "Bundle not found.", timestamp),
                      404,
                    );
                  }

                  bundleInDb.entity.num_quests_completed += 1;
                  bundleInDb.entity.num_progress_quests_completed += 1;
                  bundleInDb.entity.last_state_change_time = new Date().toISOString();

                  await questsService.updateQuest(
                    bundleInDb,
                    user.accountId,
                    config.currentSeason,
                    challengeBundleScheduleId,
                  );
                }
              }
            }
          }
          if (updates) {
            const questInDb = await questsService.findQuestByTemplateId(
              user.accountId,
              config.currentSeason,
              updates.BackendName,
            );

            if (!questInDb) {
              return c.json(errors.createError(404, c.req.url, "Quest not found.", timestamp), 404);
            }

            if (questInDb.entity.quest_state === "Completed") return;

            const dailyQuest = Array.from(
              QuestManager.listedQuests[QuestType.REPEATABLE].values(),
            ).find((val) => val.Name === updates.BackendName.replace("Quest:", ""));
            if (!dailyQuest) {
              return c.json(errors.createError(404, c.req.url, "Quest not found.", timestamp), 404);
            }

            const objectiveStates = dailyQuest.Properties.Objectives.reduce(
              (acc, { Count, BackendName }) => ({ ...acc, [BackendName]: Count }),
              { Count: 0, BackendName: "" },
            );

            let completionValue =
              questInDb.entity[`completion_${objectiveStates.BackendName}`] ?? 0;
            if (completionValue < objectiveStates.Count) {
              completionValue += updates.Count;

              await questsService.updateQuest(
                questInDb,
                user.accountId,
                config.currentSeason,
                updates.BackendName,
              );
            }

            if (completionValue >= objectiveStates.Count) {
              for (const pastSeason of athena.stats.attributes.past_seasons!) {
                const { book_xp = 0, book_level = 1 } = athena.stats.attributes;

                const updatedStats = LevelsManager.updateXpAndLevel(book_xp, book_level, 5);
                athena.stats.attributes.book_xp = updatedStats.bookXp;
                athena.stats.attributes.book_level = updatedStats.bookLevel;

                pastSeason.seasonXp += 500;

                await questsService.deleteQuestByTemplateId(
                  user.accountId,
                  config.currentSeason,
                  updates.BackendName,
                );
              }
            }
          }
        }

        await profilesService.updateMultiple([
          { accountId: user.accountId, type: "athena", data: athena },
          { accountId: user.accountId, type: "common_core", data: common_core },
        ]);

        await RefreshAccount(user.accountId, user.username);

        return c.json(
          MCPResponses.generate(
            matchType === "vbucks" ? common_core : athena,
            changes,
            matchType === "vbucks" ? "common_core" : "athena",
          ),
        );
      } catch (error) {
        logger.error(`Error applying match stats: ${error}`);
        return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
      }
    },
  );
}
