import { config, logger } from "../..";
import { handleProfileSelection } from "../../operations/QueryProfile";
import { ItemGrantingHandler } from "../granting/ItemGrantingHandler";
import { BattlepassQuestGranter } from "../quests/BattlepassQuestGranter";
import { BattlepassManager } from "./BattlepassManager";
import { LevelsManager, type PastSeasons } from "./LevelsManager";

type Types =
  | "athena"
  | "common_core"
  | "athenaseasonxpboost"
  | "athenaseasonfriendxpboost"
  | "challengebundleschedule";

interface ItemOut {
  templateId: string;
  type: Types;
  attributes: Attributes;
  quantity: number;
}

interface Attributes {
  max_level_bonus: number;
  level: number;
  item_seen: boolean;
  xp: number;
  variants: object[];
  favorite: boolean;
}

export namespace RewardsManager {
  export async function addGrant(pastSeason: PastSeasons, accountId: string, username: string) {
    let originalBookLevel = pastSeason.bookLevel;

    const updater = await LevelsManager.update(pastSeason, config.currentSeason);

    if (!updater) return;

    pastSeason = updater.pastSeasons;

    const items: ItemOut[] = [];

    const freeTier = await BattlepassManager.GetSeasonFreeRewards();
    const paidTier = await BattlepassManager.GetSeasonPaidRewards();

    const athena = await handleProfileSelection("athena", accountId);
    const common_core = await handleProfileSelection("common_core", accountId);

    if (!athena || !common_core) return;

    if (!freeTier || !paidTier) return;

    for (let i = originalBookLevel; i < pastSeason.bookLevel; i++) {
      const paidTierRewards = paidTier.filter((tier) => tier.Tier === i + 1);
      const freeTierRewards = freeTier.filter((tier) => tier.Tier === i + 1);

      const currency = common_core.items["Currency:MtxPurchased"];

      if (paidTierRewards.length === 0 && freeTierRewards.length === 0) continue;

      for (const rewards of freeTierRewards || paidTierRewards) {
        switch (true) {
          case rewards.TemplateId.startsWith("BannerToken"):
          case rewards.TemplateId.startsWith("HomebaseBanner:"):
          case rewards.TemplateId.startsWith("HomebaseBannerIcon:"):
            ItemGrantingHandler.addBannerOrHomebaseItem(rewards.TemplateId, common_core);

            items.push({
              templateId: rewards.TemplateId,
              type: "common_core",
              attributes: {
                max_level_bonus: 0,
                level: 1,
                item_seen: false,
                xp: 0,
                variants: [],
                favorite: false,
              },
              quantity: rewards.Quantity,
            });
            break;
          case rewards.TemplateId.startsWith("Athena"):
            ItemGrantingHandler.handleAthenaItem(rewards.TemplateId, rewards.Quantity, athena);

            items.push({
              templateId: rewards.TemplateId,
              type: "athena",
              attributes: {
                max_level_bonus: 0,
                level: 1,
                item_seen: false,
                xp: 0,
                variants: [],
                favorite: false,
              },
              quantity: rewards.Quantity,
            });
            break;
          case rewards.TemplateId.startsWith("Token:"):
            if (rewards.TemplateId.includes("athenaseasonxpboost")) {
              ItemGrantingHandler.handleBoostType("season_match_boost", rewards.Quantity, athena);

              items.push({
                templateId: rewards.TemplateId,
                type: "athenaseasonxpboost",
                attributes: {
                  max_level_bonus: 0,
                  level: 1,
                  item_seen: false,
                  xp: 0,
                  variants: [],
                  favorite: false,
                },
                quantity: rewards.Quantity,
              });
            } else if (rewards.TemplateId.includes("athenaseasonfriendxpboost")) {
              ItemGrantingHandler.handleBoostType(
                "season_friend_match_boost",
                rewards.Quantity,
                athena,
              );

              items.push({
                templateId: rewards.TemplateId,
                type: "athenaseasonfriendxpboost",
                attributes: {
                  max_level_bonus: 0,
                  level: 1,
                  item_seen: false,
                  xp: 0,
                  variants: [],
                  favorite: false,
                },
                quantity: rewards.Quantity,
              });
            }
            break;
          case rewards.TemplateId.startsWith("Currency:"):
            currency.quantity += rewards.Quantity;
            break;
          case rewards.TemplateId.startsWith("ChallengeBundleSchedule:"):
            const granter = await BattlepassQuestGranter.grant(
              accountId,
              username,
              rewards.TemplateId,
            );

            if (!granter || !granter.multiUpdates) continue;

            items.push({
              templateId: rewards.TemplateId,
              type: "challengebundleschedule",
              attributes: granter.multiUpdates[0].item,
              quantity: 1,
            });
            break;

          default:
            logger.warn(`Missing reward: ${rewards.TemplateId} at tier ${rewards.Tier}`);
        }
      }
    }

    return {
      pastSeasons: pastSeason,
      items,
      canGrantItems: updater.canGrantItems,
    };
  }
}
