import type { Context } from "hono";
import errors from "../utilities/errors";
import {
  accountService,
  config,
  itemStorageService,
  logger,
  profilesService,
  userService,
} from "..";
import ProfileHelper from "../utilities/ProfileHelper";
import CreateProfileItem from "../utilities/CreateProfileItem";
import { Profiles } from "../tables/profiles";
import MCPResponses, { type ProfileId } from "../utilities/responses";
import uaparser from "../utilities/uaparser";
import type {
  BattlePassEntry,
  CardPackEntry,
  Entries,
  ItemGrants,
} from "../shop/interfaces/Declarations";
import { v4 as uuid } from "uuid";
import { BattlepassManager, type Rewards } from "../utilities/managers/BattlepassManager";
import { LevelsManager } from "../utilities/managers/LevelsManager";
import ProfilesService from "../wrappers/database/ProfilesService";
import type { Lootlist, Variants } from "../../types/profilesdefs";
import { QuestManager, QuestType, type Objectives } from "../utilities/managers/QuestManager";
import { object } from "zod";
import RefreshAccount from "../utilities/refresh";
import { handleProfileSelection } from "./QueryProfile";
import { BattlepassQuestGranter } from "../utilities/quests/BattlepassQuestGranter";
import { RewardsManager } from "../utilities/managers/RewardsManager";
import { ItemGrantingHandler } from "../utilities/granting/ItemGrantingHandler";

export default async function (c: Context) {
  const accountId = c.req.param("accountId");
  const rvn = c.req.query("rvn");
  const profileId = c.req.query("profileId") as ProfileId;
  const timestamp = new Date().toISOString();

  if (!accountId || !rvn || !profileId) {
    return c.json(errors.createError(400, c.req.url, "Missing query parameters.", timestamp), 400);
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

    const [common_core, athena, campaign] = await Promise.all([
      handleProfileSelection("common_core", user.accountId),
      handleProfileSelection("athena", user.accountId),
      handleProfileSelection("campaign", user.accountId),
    ]);

    if (!common_core || !athena || !campaign) {
      return c.json(
        errors.createError(404, c.req.url, `Profile ${profileId} or athena not found.`, timestamp),
        404,
      );
    }

    const body = await c.req.json();
    let { currency, offerId, purchaseQuantity } = body;

    const notifications: object[] = [];
    const multiUpdates: object[] = [];
    let applyProfileChanges: object[] = [];
    let shouldUpdateCampaignProfile = false;
    let shouldUpdateProfile = false;

    let owned = false;

    const currentShop = await itemStorageService.getItemByType("storefront");

    if (!currentShop || !currentShop.data || !currentShop.data.storefronts) {
      return c.json(
        errors.createError(400, c.req.url, "Failed to get storefront.", timestamp),
        400,
      );
    }

    if (offerId === "B9B0CE758A5049F898773C1A47A69ED4") {
      return c.json(
        errors.createError(
          400,
          c.req.url,
          "Purchasing this item is currently disabled.",
          timestamp,
        ),
        400,
      );
    }

    if (offerId === "1F6B613D4B7BAD47D8A93CAEED2C4996") {
      const in_app_purchases = common_core.stats.attributes.in_app_purchases;
      const itemId = "82ADCC874CFC2D47927208BAE871CF2B";

      if (!in_app_purchases) {
        return c.json(
          errors.createError(400, c.req.url, "'in_app_purchases' is missing.", timestamp),
          400,
        );
      }

      const purchases = in_app_purchases?.fulfillmentCounts;

      if ("82ADCC874CFC2D47927208BAE871CF2B" in purchases) {
        return c.json(
          errors.createError(400, c.req.url, "You already own this item.", timestamp),
          400,
        );
      }

      if (profileId === "profile0" || profileId === "common_core") {
        for (const key in campaign.items) {
          const item = campaign.items[key];
          const completionPack = item.attributes.completion_purchase_card_pack;

          if (completionPack && typeof completionPack === "number") {
            const completion = ProfileHelper.getItemByAttribute(
              campaign,
              "completion_purchase_card_pack",
              "number",
            );

            if (!completion) {
              return c.json(
                errors.createError(400, c.req.url, "Failed to find completion item.", timestamp),
                400,
              );
            }

            const completionItem = completion[0];

            applyProfileChanges.push(
              {
                changeType: "itemAttrChanged",
                itemId: completionItem.key,
                attributeName: "completion_purchase_card_pack",
                attributeValue: 1,
              },
              {
                changeType: "itemAttrChanged",
                itemId: completionItem.key,
                attributeName: "completion_open_card_pack",
                attributeValue: 1,
              },
              {
                changeType: "itemAttrChanged",
                itemId: completionItem.key,
                attributeName: "quest_state",
                attributeValue: "Claimed",
              },
            );
          }

          purchases[itemId] = 1;
          applyProfileChanges.push({
            changeType: "statModified",
            name: "in_app_purchases",
            value: purchases,
          });
        }
      }
    }

    if (offerId.includes(":/")) {
      let currentActiveStorefront = null;
      for (const section of currentShop.data.storefronts) {
        const found = section.catalogEntries.find((entry: Entries) => entry.offerId === offerId);
        if (found) {
          currentActiveStorefront = found;
          break;
        }
      }

      if (!currentActiveStorefront) {
        return c.json(
          errors.createError(
            400,
            c.req.url,
            "Failed to get item from the current shop.",
            timestamp,
          ),
          400,
        );
      }

      if (purchaseQuantity < 1) {
        return c.json(
          errors.createError(400, c.req.url, "'purchaseQuantity' is less than 1.", timestamp),
          400,
        );
      }

      if (
        !owned &&
        currentActiveStorefront.prices[0].finalPrice >
          common_core.items["Currency:MtxPurchased"].quantity
      ) {
        return c.json(
          errors.createError(400, c.req.url, `You can not afford this item.`, timestamp),
          400,
        );
      }

      const alreadyOwned = currentActiveStorefront.itemGrants.some(
        (item: ItemGrants) => athena.items[item.templateId],
      );
      if (alreadyOwned) {
        return c.json(
          errors.createError(400, c.req.url, "You already own this item.", timestamp),
          400,
        );
      }

      const itemQuantitiesByTemplateId = new Map();
      const itemProfilesByTemplateId = new Map();

      for (const grant of currentActiveStorefront.itemGrants) {
        if (itemQuantitiesByTemplateId.has(grant.templateId)) {
          itemQuantitiesByTemplateId.set(
            grant.templateId,
            itemQuantitiesByTemplateId.get(grant.templateId) + grant.quantity,
          );
        } else {
          itemQuantitiesByTemplateId.set(grant.templateId, grant.quantity);
        }
        if (!itemProfilesByTemplateId.has(grant.templateId)) {
          itemProfilesByTemplateId.set(grant.templateId, "athena");
        }
      }

      itemQuantitiesByTemplateId.forEach((quantity, templateId) => {
        // @ts-ignore
        athena.items[templateId] = CreateProfileItem(templateId, quantity);

        multiUpdates.push({
          changeType: "itemAdded",
          itemId: templateId,
          item: athena.items[templateId],
        });

        notifications.push({
          itemType: templateId,
          itemGuid: templateId,
          itemProfile: "athena",
          quantity,
        });
      });

      common_core.items["Currency:MtxPurchased"].quantity -=
        currentActiveStorefront.prices[0].finalPrice;

      multiUpdates.push({
        changeType: "itemQuantityChanged",
        itemId: "Currency:MtxPurchased",
        quantity: common_core.items["Currency:MtxPurchased"].quantity,
      });

      const purchase = {
        purchaseId: uuid(),
        offerId: `v2:/${offerId}`,
        purchaseDate: new Date().toISOString(),
        undoTimeout: "9999-12-12T00:00:00.000Z",
        freeRefundEligible: false,
        fulfillments: [],
        lootResult: Object.keys(itemQuantitiesByTemplateId).map((templateId) => ({
          itemType: templateId,
          itemGuid: templateId,
          itemProfile: "athena",
          quantity: itemQuantitiesByTemplateId.get(templateId),
        })),
        totalMtxPaid: currentActiveStorefront.prices[0].finalPrice,
        metadata: {},
        gameContext: "",
      };

      common_core.stats.attributes.mtx_purchase_history!.purchases.push(purchase);
      owned = true;
      shouldUpdateProfile = true;
    } else if (offerId && currency === "MtxCurrency" && profileId === "common_core") {
      const storefrontBattlepass = await BattlepassManager.GetStorefrontBattlepass(uahelper.season);

      let battlepassCatalogEntry: BattlePassEntry | undefined;

      const isValidOffer = storefrontBattlepass.catalogEntries.some((entry) => {
        if (entry.offerId === offerId) {
          battlepassCatalogEntry = entry;
          return true;
        }

        return false;
      });

      if (!isValidOffer || !battlepassCatalogEntry) {
        return c.json(
          errors.createError(404, c.req.url, `Invalid offerId '${offerId}'`, timestamp),
          404,
        );
      }
      for (const pastSeason of athena.stats.attributes.past_seasons!) {
        const currency = common_core.items["Currency:MtxPurchased"];
        const finalPrice = battlepassCatalogEntry.prices[0]?.finalPrice;

        if (typeof finalPrice !== "number" || finalPrice <= 0) {
          return c.json(
            errors.createError(400, c.req.url, "Invalid or missing final price.", timestamp),
            400,
          );
        }

        let originalBookLevel = pastSeason.bookLevel;

        const isBattlepass =
          battlepassCatalogEntry.devName === `BR.Season${config.currentSeason}.BattlePass.01`;
        const isSingleTier =
          battlepassCatalogEntry.devName === `BR.Season${config.currentSeason}.SingleTier.01`;
        const isBattleBundle =
          battlepassCatalogEntry.devName === `BR.Season${config.currentSeason}.BattleBundle.01`;

        if (!pastSeason.purchasedVIP && isSingleTier) {
          return c.json(
            errors.createError(400, c.req.url, "You have not purchased the battlepass.", timestamp),
            400,
          );
        }

        if (currency.quantity < finalPrice) {
          return c.json(
            errors.createError(400, c.req.url, "You cannot afford this item.", timestamp),
            400,
          );
        }

        currency.quantity -= finalPrice;

        applyProfileChanges.push({
          changeType: "itemQuantityChanged",
          itemId: "Currency:MtxPurchased",
          quantity: currency.quantity,
        });

        pastSeason.purchasedVIP = true;
        multiUpdates.push({
          changeType: "statModified",
          name: "book_purchased",
          value: pastSeason.purchasedVIP,
        });

        if (isSingleTier) {
          const purchasequantity = Math.max(purchaseQuantity || 1, 1);
          pastSeason.bookLevel = Math.min(pastSeason.bookLevel + purchasequantity, 100);
          pastSeason.seasonLevel = Math.min(pastSeason.seasonLevel + purchasequantity, 100);
        } else if (isBattlepass) {
          const tierCount = isBattleBundle ? 25 : 1;
          const rewards = await BattlepassManager.GetSeasonPaidRewards();

          const filteredRewards = rewards.filter(({ Tier }) => Tier <= tierCount);

          for (const { TemplateId: item, Quantity: quantity } of filteredRewards) {
            const itemLower = item.toLowerCase();

            if (itemLower.startsWith("athena")) {
              ItemGrantingHandler.handleAthenaItem(item, quantity, athena);
            } else if (itemLower.startsWith("token:athenaseasonxpboost")) {
              ItemGrantingHandler.handleBoostType("season_match_boost", quantity, athena);

              multiUpdates.push({
                changeType: "statModified",
                itemId: "season_match_boost",
                item: athena.stats.attributes.season_match_boost,
              });
            } else if (itemLower.startsWith("token:athenaseasonfriendxpboost")) {
              ItemGrantingHandler.handleBoostType("season_friend_match_boost", quantity, athena);

              multiUpdates.push({
                changeType: "statModified",
                itemId: "season_match_boost",
                item: athena.stats.attributes.season_match_boost,
              });
            } else if (
              itemLower.startsWith("bannertoken") ||
              itemLower.startsWith("homebasebanner")
            ) {
              ItemGrantingHandler.addBannerOrHomebaseItem(item, common_core);
              multiUpdates.push({
                changeType: "itemAdded",
                itemId: item,
                item: common_core.items[item],
              });
            } else if (itemLower.startsWith("ChallengeBundleSchedule")) {
              logger.debug(item);

              const granter = await BattlepassQuestGranter.grant(
                user.accountId,
                user.username,
                item,
              );

              if (!granter || !granter.multiUpdates)
                return c.json(
                  errors.createError(400, c.req.url, "Failed to grant quests.", timestamp),
                  400,
                );

              multiUpdates.push(granter.multiUpdates);
            }

            multiUpdates.push({
              changeType: "itemAdded",
              itemId: item,
              item: athena.items[item],
            });

            notifications.push({
              itemType: item,
              itemGuid: item,
              quantity: quantity,
            });

            pastSeason.bookLevel = tierCount;
          }
        }

        // Updates the season level of the user if the seaso n is greater than 10.
        if (uahelper.season >= 11) {
          LevelsManager.update(pastSeason, uahelper.season);
        }

        const freeTier = await BattlepassManager.GetSeasonFreeRewards();
        const paidTier = await BattlepassManager.GetSeasonPaidRewards();

        if (!freeTier || !paidTier) return;

        for (let i = originalBookLevel; i < pastSeason.bookLevel; i++) {
          const tierToMatch = isBattleBundle ? i : i + 1;

          const paidTierRewards = paidTier.filter((tier) => tier.Tier === tierToMatch);
          const freeTierRewards = freeTier.filter((tier) => tier.Tier === tierToMatch);

          if (paidTierRewards.length === 0 && freeTierRewards.length === 0) continue;

          for (const rewards of paidTierRewards || freeTierRewards) {
            switch (true) {
              case rewards.TemplateId.startsWith("BannerToken"):
              case rewards.TemplateId.startsWith("HomebaseBanner:"):
              case rewards.TemplateId.startsWith("HomebaseBannerIcon:"):
                ItemGrantingHandler.addBannerOrHomebaseItem(rewards.TemplateId, common_core);

                multiUpdates.push({
                  changeType: "itemAdded",
                  itemId: rewards.TemplateId,
                  item: common_core.items[rewards.TemplateId],
                });
                break;
              case rewards.TemplateId.startsWith("Athena"):
                ItemGrantingHandler.handleAthenaItem(rewards.TemplateId, rewards.Quantity, athena);

                multiUpdates.push({
                  changeType: "itemAdded",
                  itemId: rewards.TemplateId,
                  item: athena.items[rewards.TemplateId],
                });
                break;
              case rewards.TemplateId.startsWith("Token:"):
                if (rewards.TemplateId.includes("athenaseasonxpboost")) {
                  ItemGrantingHandler.handleBoostType(
                    "season_match_boost",
                    rewards.Quantity,
                    athena,
                  );

                  multiUpdates.push({
                    changeType: "statModified",
                    itemId: "season_match_boost",
                    item: athena.stats.attributes.season_match_boost,
                  });
                } else if (rewards.TemplateId.includes("athenaseasonfriendxpboost")) {
                  ItemGrantingHandler.handleBoostType(
                    "season_friend_match_boost",
                    rewards.Quantity,
                    athena,
                  );

                  multiUpdates.push({
                    changeType: "statModified",
                    itemId: "season_match_boost",
                    item: athena.stats.attributes.season_match_boost,
                  });
                }
                break;
              case rewards.TemplateId.startsWith("Currency:"):
                currency.quantity += rewards.Quantity;
                break;
              case rewards.TemplateId.startsWith("ChallengeBundleSchedule:"):
                const granter = await BattlepassQuestGranter.grant(
                  user.accountId,
                  user.username,
                  rewards.TemplateId,
                );

                if (!granter || !granter.multiUpdates) continue;

                multiUpdates.push(granter.multiUpdates);
                break;
              case rewards.TemplateId.startsWith("CosmeticVariantToken"):
                const tokens = await BattlepassManager.GetCosmeticVariantTokenReward();

                logger.debug(`Attempting to find rewards for TemplateId: ${rewards.TemplateId}`);

                const vtidMapping: { [key: string]: string } = {
                  vtid_033_petcarrier_dog_styleb: "VTID_033_PetCarrier_Dog_StyleB",
                  vtid_035_petcarrier_dragon_styleb: "VTID_035_PetCarrier_Dragon_StyleB",
                  vtid_034_petcarrier_dog_stylec: "VTID_034_PetCarrier_Dog_StyleC",
                  vtid_036_petcarrier_dragon_stylec: "VTID_036_PetCarrier_Dragon_StyleC",
                };

                const reward =
                  tokens[vtidMapping[rewards.TemplateId.replace("CosmeticVariantToken:", "")]];
                if (!reward) {
                  continue;
                }

                logger.debug(`Successfully found rewards for TemplateId: ${rewards.TemplateId}`);

                let parts = reward.templateId.split(":");
                parts[1] = parts[1].toLowerCase();

                let templateId = parts.join(":");

                const Item = athena.items[templateId];
                if (!Item) continue;

                const newVariant = athena.items[templateId]?.attributes?.variants ?? [];

                const existingVariant = newVariant.find(
                  (variant) => variant.channel === reward.channel,
                );

                if (existingVariant) {
                  existingVariant.owned.push(reward.value);
                } else {
                  newVariant.push({
                    channel: reward.channel,
                    active: reward.value,
                    owned: [reward.value],
                  });
                }

                applyProfileChanges.push({
                  changeType: "itemAttrChanged",
                  itemId: reward.templateId,
                  attributeName: "variants",
                  attributeValue: newVariant,
                });

                break;

              default:
                logger.warn(`Missing reward: ${rewards.TemplateId} at tier ${rewards.Tier}`);
            }

            multiUpdates.push({
              changeType: "itemAdded",
              itemId: rewards.TemplateId,
              item: athena.items[rewards.TemplateId],
            });

            notifications.push({
              itemType: rewards.TemplateId,
              itemGuid: rewards.TemplateId,
              quantity: rewards.Quantity,
            });
          }
        }

        const randomGiftBoxId = uuid();
        const giftBoxTemplateId =
          uahelper.season >= 5 ? "GiftBox:gb_battlepasspurchased" : "GiftBox:gb_battlepass";

        common_core.items[randomGiftBoxId] = {
          templateId: giftBoxTemplateId,
          attributes: {
            max_level_bonus: 0,
            fromAccountId: "Server",
            lootList: notifications,
          },
          quantity: 1,
        };

        applyProfileChanges.push({
          changeType: "itemAdded",
          itemId: randomGiftBoxId,
          item: {
            templateId: giftBoxTemplateId,
            attributes: {
              max_level_bonus: 0,
              fromAccountId: "Server",
              lootList: notifications,
            },
            quantity: 1,
          },
        });

        multiUpdates.push({
          changeType: "statModified",
          name: "book_level",
          value: pastSeason.bookLevel,
        });

        multiUpdates.push({
          changeType: "statModified",
          name: "level",
          value: pastSeason.seasonLevel,
        });

        multiUpdates.push({
          changeType: "itemQuantityChanged",
          itemId: "Currency:MtxPurchased",
          quantity: currency.quantity,
        });

        shouldUpdateProfile = true;
      }
    }

    if (shouldUpdateProfile) {
      athena.rvn += 1;
      athena.commandRevision += 1;
      athena.updatedAt = new Date().toISOString();

      common_core.rvn += 1;
      common_core.commandRevision += 1;
      common_core.updatedAt = new Date().toISOString();

      await profilesService.updateMultiple([
        {
          accountId: user.accountId,
          type: "athena",
          data: athena,
        },
        {
          accountId: user.accountId,
          type: "common_core",
          data: common_core,
        },
      ]);
    }

    if (shouldUpdateCampaignProfile) {
      campaign.rvn += 1;
      campaign.commandRevision += 1;
      campaign.updatedAt = new Date().toISOString();

      await profilesService.update(user.accountId, "campaign", campaign);
    }

    const profileRevision = uahelper.buildUpdate >= "12.20" ? athena.commandRevision : athena.rvn;
    const queryRevision = parseInt(rvn) || 0;

    applyProfileChanges =
      queryRevision !== profileRevision
        ? [{ changeType: "fullProfileUpdate", profile: common_core }]
        : [];

    return c.json(
      MCPResponses.generatePurchaseResponse(
        common_core,
        athena,
        applyProfileChanges,
        multiUpdates,
        notifications,
        profileId,
      ),
    );
  } catch (error) {
    logger.error(`PurchaseCatalogEntry: ${error}`);
    return c.json(errors.createError(500, c.req.url, "Internal server error.", timestamp), 500);
  }
}
