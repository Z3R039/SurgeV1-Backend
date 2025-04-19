import type { Context } from "hono";
import { logger, profilesService, userService } from "..";
import type { ProfileId } from "../utilities/responses";
import errors from "../utilities/errors";
import { handleProfileSelection } from "./QueryProfile";
import MCPResponses from "../utilities/responses";
import path from "node:path";
import uaparser from "../utilities/uaparser";
import { v4 as uuid } from "uuid";

interface DailyRewards {
  itemType: string;
  quantity: number;
}

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

    const body = await c.req.json();

    if (!body) {
      return c.json(errors.createError(400, c.req.url, "Invalid body..", timestamp), 400);
    }

    const dailyLoginRewards = (await Bun.file(
      path.join(__dirname, "..", "memory", "dailyRewards", "DailyRewards.json"),
    ).json()) as DailyRewards[];

    const dailyRewards = profile.stats?.attributes?.daily_rewards;
    if (!dailyRewards) {
      return c.json(errors.createError(400, c.req.url, "'daily_rewards' is missing.", timestamp));
    }

    const common_core = await handleProfileSelection("common_core", user.accountId);
    if (!common_core) {
      return c.json(errors.createError(400, c.req.url, "Failed to find common_core.", timestamp));
    }

    const useragent = c.req.header("User-Agent");
    if (!useragent) {
      return c.json(
        errors.createError(400, c.req.url, "'User-Agent' header is missing.", timestamp),
        400,
      );
    }
    const uahelper = uaparser(useragent);
    if (!uahelper) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to parse User-Agent.", timestamp),
        400,
      );
    }

    const lastClaimDate = new Date(dailyRewards.lastClaimDate);
    const daysSinceLastClaim = (Date.now() - lastClaimDate.getTime()) / (1000 * 3600 * 24);

    const notifications: object[] = [];
    const applyProfileChanges: object[] = [];
    let shouldUpdateProfile = false;

    if (daysSinceLastClaim >= 1) {
      dailyRewards.nextDefaultReward++;
      dailyRewards.totalDaysLoggedIn++;
      dailyRewards.additionalSchedules.founderspackdailyrewardtoken.rewardsClaimed++;
      dailyRewards.lastClaimDate = new Date().toISOString();

      const rewardIndices = [
        Math.min(dailyRewards.totalDaysLoggedIn, 336),
        Math.min(dailyRewards.totalDaysLoggedIn + 1, 336),
      ];

      const currentRewards = rewardIndices
        .map((index) => dailyLoginRewards[index])
        .filter((reward) => reward);

      applyProfileChanges.push({
        changeType: "statModified",
        name: "daily_rewards",
        value: dailyRewards,
      });

      if (uahelper.season < 7) {
        notifications.push({
          type: "daily_rewards",
          primary: true,
          items: currentRewards,
        });
      }

      currentRewards.forEach((currentReward) => {
        let rewardUpdated = false;
        const loweredItemType = currentReward.itemType.toLowerCase();

        switch (true) {
          case loweredItemType.startsWith("cardpack"):
            const randomCardPackId = uuid();

            profile.items[randomCardPackId] = {
              templateId: currentReward.itemType,
              attributes: {
                is_loot_tier_overridden: false,
                max_level_bonus: 0,
                level: 1,
                pack_source: "Schedule",
                item_seen: false,
                xp: 0,
                favorite: false,
                override_loot_tier: 0,
              },
              quantity: currentReward.quantity,
            };

            applyProfileChanges.push({
              changeType: "itemAdded",
              itemId: randomCardPackId,
              item: profile.items[randomCardPackId],
            });

            break;
          case loweredItemType.startsWith("accountresource"):
            for (const [key, item] of Object.entries(profile.items)) {
              if (item.templateId === currentReward.itemType) {
                item.quantity += currentReward.quantity;

                profile.items[key] = item;

                applyProfileChanges.push({
                  changeType: "itemQuantityChanged",
                  itemId: currentReward.itemType,
                  quantity: item.quantity,
                });

                shouldUpdateProfile = true;

                break;
              } else {
                const randomItemId = uuid();
                profile.items[randomItemId] = {
                  templateId: currentReward.itemType,
                  attributes: {
                    item_seen: false,
                    level: 1,
                    favorite: false,
                  },
                  quantity: currentReward.quantity,
                };

                applyProfileChanges.push({
                  changeType: "itemAdded",
                  itemId: randomItemId,
                  item: profile.items[randomItemId],
                });

                shouldUpdateProfile = true;

                break;
              }
            }
            break;
          case loweredItemType.startsWith("currency"):
            common_core.items["Currency:MtxPurchased"].quantity += currentReward.quantity;
            applyProfileChanges.push({
              changeType: "itemQuantityChanged",
              itemId: "Currency:MtxPurchased",
              quantity: common_core.items["Currency:MtxPurchased"].quantity,
            });
            break;
          case loweredItemType.startsWith("conversioncontrol") ||
            loweredItemType.startsWith("consumableaccountitem"):
            for (const [key, item] of Object.entries(profile.items)) {
              if (item.templateId === currentReward.itemType) {
                item.quantity += currentReward.quantity;

                profile.items[key] = item;

                applyProfileChanges.push({
                  changeType: "itemQuantityChanged",
                  itemId: currentReward.itemType,
                  quantity: item.quantity,
                });

                shouldUpdateProfile = true;

                break;
              } else {
                const randomItemId = uuid();
                profile.items[randomItemId] = {
                  templateId: currentReward.itemType,
                  attributes: {
                    item_seen: false,
                    level: 1,
                    favorite: false,
                  },
                  quantity: currentReward.quantity,
                };

                applyProfileChanges.push({
                  changeType: "itemAdded",
                  itemId: randomItemId,
                  item: profile.items[randomItemId],
                });

                shouldUpdateProfile = true;
              }
            }

            break;

          default:
            logger.warn(`Unknown item type: ${currentReward.itemType}`);
            break;
        }
      });
    }

    if (shouldUpdateProfile) {
      profile.rvn += 1;
      profile.commandRevision += 1;
      profile.updatedAt = new Date().toISOString();

      await profilesService.update(user.accountId, profileId, profile);
      await profilesService.update(user.accountId, "common_core", common_core);
    }

    if (applyProfileChanges.length === 0) {
      applyProfileChanges.push({
        changeType: "fullProfileUpdate",
        profile,
      });
    }

    return c.json(
      MCPResponses.generateClaimLoginRewards(profile, applyProfileChanges, notifications),
    );
  } catch (error) {
    logger.error(`ClaimLoginReward: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal Server Error.", timestamp));
  }
}
