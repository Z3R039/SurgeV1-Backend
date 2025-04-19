import fetch from "node-fetch";
import fs from "node:fs/promises";
import path from "node:path";
import { v4 as uuid } from "uuid";
import type { JSONResponse, CosmeticSet } from "./interfaces/FortniteAPI";
import { config, displayAssetsService, logger } from "..";
import { CosmeticTypes } from "./enums/CosmeticTypes";
import type {
  BattlePassEntry,
  BattlePassStorefront,
  CardPackEntry,
  CardPackStorefront,
  CurrencyEntry,
  CurrencyStorefront,
  Entries,
  Set,
  Shop,
  Storefronts,
} from "./interfaces/Declarations";
import { ShopHelper } from "./helpers/shophelper";
import {
  createBattlePassEntryTemplate,
  createCardPackEntryTemplate,
  createItemEntryTemplate,
} from "./helpers/template";
import { setDisplayAsset } from "./helpers/displayAssets";
import { getPrice } from "./helpers/itemprices";
import getRandomFullSetLength from "./functions/getRandomFullSetLength";
import { matchRegex } from "./functions/regex";
import { expiration } from "../utilities/timestamp";

export namespace ShopGenerator {
  export function createShop(): Shop {
    return {
      refreshIntervalHrs: 24,
      dailyPurchaseHrs: 24,
      expiration,
      storefronts: [],
    };
  }

  export const items: Record<string, JSONResponse> = {};
  export const sets: Record<string, Set> = {};
  export const shop = createShop();

  export async function generate() {
    try {
      const [request, displayAssets] = await Promise.all([
        fetch("https://fortnite-api.com/v2/cosmetics/br?responseFlags=4").then((res) =>
          res.json(),
        ) as any,
        displayAssetsService.getAssets(),
      ]);

      const response = request.data as JSONResponse[];
      const cosmeticTypes: Record<string, CosmeticTypes> = {};

      response.map(async (json) => {
        if (
          !json.introduction ||
          json.introduction.backendValue > config.currentSeason ||
          json.introduction.backendValue === 0 ||
          json.set === null ||
          !json.set ||
          !json.shopHistory
        )
          return;

        if (json.shopHistory === null || json.shopHistory.length === 0) return;

        const itemType = json.type && typeof json.type === "object" ? json.type.backendValue : null;

        if (itemType && cosmeticTypes[itemType] !== undefined) {
          json.type.backendValue = cosmeticTypes[itemType];
        }

        if (!itemType) return;

        if (json.set && !sets[json.set.backendValue]) {
          sets[json.set.backendValue] = {
            value: json.set.value,
            text: json.set.text,
            definition: [],
          };
        }

        sets[json.set.backendValue].definition.push(json);
        items[json.id] = json;
      });

      for (const asset of Object.values(displayAssets)) {
        const assetParts = asset.value.split("_").slice(1);
        const itemKey = assetParts.join("_");
        let item: JSONResponse | undefined = items[itemKey];

        if (!item && assetParts[0].includes("CID")) {
          const match = matchRegex(itemKey);

          if (match) {
            item = Object.values(items).find((item) =>
              item.type.backendValue.includes("AthenaCharacter"),
            );
          }
        }

        if (item) {
          item.NewDisplayAssetPath = asset.value;
        }
      }

      Object.values(items)
        .filter(
          (item) => item.type.backendValue.includes("AthenaBackpack") && item.itemPreviewHeroPath,
        )
        .forEach((item) => {
          const cosmeticId = item.itemPreviewHeroPath.split("/").at(-1);
          if (!cosmeticId) return;
          const cosmetic = items[cosmeticId];
          if (cosmetic) {
            cosmetic.backpack = item;
          }
        });

      const [
        daily,
        weekly,
        battlepass,
        cardpack,
        cardpackStoreGameplay,
        cardpackStorePreroll,
        currencyStorefront,
      ] = [
        ShopHelper.createStorefront("BRDailyStorefront"),
        ShopHelper.createStorefront("BRWeeklyStorefront"),
        ShopHelper.createBattlePassStorefront(shop, `BRSeason${config.currentSeason}`),
        ShopHelper.createCardPackStorefront(shop, "CardPackStore"),
        ShopHelper.createCardPackStorefront(shop, "CardPackStoreGameplay"),
        ShopHelper.createCardPackStorefront(shop, "CardPackStorePreroll"),
        ShopHelper.createCurrencyStorefront(shop, "CurrencyStorefront"),
      ];

      await Promise.allSettled([
        loadBattlePassData(battlepass),
        loadCardPackData(cardpack, cardpackStoreGameplay, cardpackStorePreroll),
        loadCurrencyData(currencyStorefront),
      ]);

      fillDailyStorefront(daily);
      fillWeeklyStorefront(weekly);

      [
        daily,
        weekly,
        battlepass,
        cardpack,
        cardpackStoreGameplay,
        cardpackStorePreroll,
        currencyStorefront,
      ].forEach((section) => ShopHelper.push(shop, section as any));
    } catch (error) {
      logger.error(`Failed to generate shop: ${error}`);
    }
  }

  async function loadBattlePassData(battlepass: BattlePassStorefront) {
    try {
      const BRSeasonJSON = await Bun.file(
        path.join(__dirname, "..", "memory", "storefront", `BRSeason${config.currentSeason}.json`),
      ).json();

      BRSeasonJSON.catalogEntries.forEach((entryData: BattlePassEntry) =>
        battlepass.catalogEntries.push(entryData),
      );
    } catch (error) {
      logger.error(`Failed to load battlepass data: ${error}`);
    }
  }

  async function loadCardPackData(
    cardpack: CardPackStorefront,
    cardpackStoreGameplay: CardPackStorefront,
    cardpackStorePreroll: CardPackStorefront,
  ) {
    try {
      const [cardPackOffers, gameplayOffers, prerollOffers] = await Promise.all([
        Bun.file(
          path.join(__dirname, "..", "memory", "storefront", "stw", "cardpackOffers.json"),
        ).json(),
        Bun.file(
          path.join(__dirname, "..", "memory", "storefront", "stw", "CardPackStoreGameplay.json"),
        ).json(),
        Bun.file(
          path.join(__dirname, "..", "memory", "storefront", "stw", "CardPackStorePreroll.json"),
        ).json(),
      ]);

      cardPackOffers.forEach((offer: CardPackEntry) => cardpack.catalogEntries.push(offer));
      gameplayOffers.forEach((offer: CardPackEntry) =>
        cardpackStoreGameplay.catalogEntries.push(offer),
      );
      prerollOffers.forEach((offer: CardPackEntry) =>
        cardpackStorePreroll.catalogEntries.push(offer),
      );
    } catch (error) {
      logger.error(`Failed to load cardpack data: ${error}`);
    }
  }

  async function loadCurrencyData(currencyStorefront: CurrencyStorefront) {
    try {
      const currencyJSON = await Bun.file(
        path.join(__dirname, "..", "memory", "storefront", "both", "CurrencyStorefront.json"),
      ).json();

      currencyJSON.forEach((offer: CurrencyEntry) => currencyStorefront.catalogEntries.push(offer));
    } catch (error) {
      logger.error(`Failed to load currency data: ${error}`);
    }
  }

  function fillDailyStorefront(daily: Storefronts) {
    let characters = 0;
    let dances = 0;
    const addedItemIds = new Set<string>();

    while (daily.catalogEntries.length < 6) {
      const keys = Object.keys(items);

      if (keys.length === 0) continue;

      let randomKey: string;
      let randomItem: any;

      do {
        randomKey = keys[Math.floor(Math.random() * keys.length)];
        randomItem = items[randomKey];
      } while (
        randomItem.type.backendValue === "AthenaBackpack" ||
        randomItem.type.backendValue === "AthenaSkyDiveContrail" ||
        randomItem.type.backendValue === "AthenaMusicPack" ||
        randomItem.type.backendValue === "AthenaToy" ||
        addedItemIds.has(randomItem.id)
      );

      if (randomItem.type.backendValue === "AthenaCharacter" && characters < 2) {
        characters++;
      } else if (randomItem.type.backendValue === "AthenaDance" && dances < 2) {
        dances++;
      } else if (randomItem.type.backendValue === "AthenaCharacter" && characters >= 2) {
        continue;
      }

      const entry = createItemEntry(randomItem, "Daily");
      if (!entry) continue;

      daily.catalogEntries.push(entry);
      addedItemIds.add(randomItem.id);

      if (characters === 2 && dances === 2 && daily.catalogEntries.length >= 6) break;
    }
  }

  function fillWeeklyStorefront(weekly: Storefronts) {
    let minimumWeeklyItems: number = 2;

    if (config.currentSeason >= 1 && config.currentSeason <= 8) minimumWeeklyItems = 2;
    else if (config.currentSeason >= 9 && config.currentSeason <= 13) minimumWeeklyItems = 3;
    else minimumWeeklyItems = 5;

    while (getRandomFullSetLength(weekly.catalogEntries) < minimumWeeklyItems) {
      const keys = Object.keys(sets);

      if (keys.length === 0) continue;

      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const randomSet = sets[randomKey];

      for (const item of randomSet.definition) {
        const entry = createItemEntry(item, "Featured");

        if (!entry) continue;
        weekly.catalogEntries.push(entry);
      }
    }
  }

  function createItemEntry(item: JSONResponse, sectionId: string) {
    if (sectionId === "Featured") {
      const entry = createItemEntryTemplate();
      entry.offerId = `v2:/${uuid()}`;
      entry.offerType = "StaticPrice";

      if (!item.displayAssetPath) item.displayAssetPath = setDisplayAsset(`DA_Daily_${item.id}`);
      else if (!item.NewDisplayAssetPath) item.NewDisplayAssetPath = "";

      entry.displayAssetPath = item.displayAssetPath.includes("DA_Daily")
        ? item.displayAssetPath
        : setDisplayAsset(`DA_Daily_${item.id}`);
      entry.NewDisplayAssetPath = item.NewDisplayAssetPath;

      entry.metaInfo.push({ key: "DisplayAssetPath", value: entry.displayAssetPath });
      entry.metaInfo.push({
        key: "NewDisplayAssetPath",
        value: entry.NewDisplayAssetPath,
      });
      entry.metaInfo.push({ key: "TileSize", value: "Normal" });
      entry.metaInfo.push({ key: "SectionId", value: "Featured" });

      entry.meta.NewDisplayAssetPath = entry.NewDisplayAssetPath;
      entry.meta.displayAssetPath = entry.displayAssetPath;
      entry.meta.SectionId = "Featured";
      entry.meta.TileSize = "Normal";

      entry.requirements.push({
        requirementType: "DenyOnItemOwnership",
        requiredId: `${item.type.backendValue}:${item.id}`,
        minQuantity: 1,
      });

      entry.refundable = true;
      entry.giftInfo.bIsEnabled = true;
      entry.giftInfo.forcedGiftBoxTemplateId = "";
      entry.giftInfo.purchaseRequirements = entry.requirements;
      entry.giftInfo.giftRecordIds = [];

      entry.categories.push(item.set.backendValue);

      const price = getPrice(item);

      if (!price) return;

      entry.prices.push({
        currencySubType: "Currency",
        currencyType: "MtxCurrency",
        dynamicRegularPrice: -1,
        saleExpiration: "9999-12-31T23:59:59.999Z",
        basePrice: price,
        regularPrice: price,
        finalPrice: price,
      });
      entry.devName = `[VIRTUAL] 1x ${item.type.backendValue}:${item.id} for ${price} MtxCurrency`;

      entry.itemGrants.push({
        templateId: `${item.type.backendValue}:${item.id}`,
        quantity: 1,
      });

      if (item.backpack) {
        entry.itemGrants.push({
          templateId: `${item.backpack.type.backendValue}:${item.backpack.id}`,
          quantity: 1,
        });

        entry.requirements.push({
          requirementType: "DenyOnItemOwnership",
          requiredId: `${item.backpack.type.backendValue}:${item.backpack.id}`,
          minQuantity: 1,
        });
      }

      return entry;
    } else if (sectionId === "Daily") {
      const entry = createItemEntryTemplate();

      entry.offerId = `:/${uuid()}`;
      entry.offerType = "StaticPrice";

      entry.metaInfo.push({ key: "TileSize", value: "Small" });
      entry.metaInfo.push({ key: "SectionId", value: "Daily" });

      entry.meta.SectionId = "Daily";
      entry.meta.TileSize = "Small";

      entry.requirements.push({
        requirementType: "DenyOnItemOwnership",
        requiredId: `${item.type.backendValue}:${item.id}`,
        minQuantity: 1,
      });

      entry.refundable = true;
      entry.giftInfo.bIsEnabled = true;
      entry.giftInfo.forcedGiftBoxTemplateId = "";
      entry.giftInfo.purchaseRequirements = entry.requirements;
      entry.giftInfo.giftRecordIds = [];

      const price = getPrice(item);

      if (!price) return;

      entry.prices.push({
        currencySubType: "Currency",
        currencyType: "MtxCurrency",
        dynamicRegularPrice: -1,
        saleExpiration: "9999-12-31T23:59:59.999Z",
        basePrice: price,
        regularPrice: price,
        finalPrice: price,
      });
      entry.devName = `[VIRTUAL] 1x ${item.type.backendValue}:${item.id} for ${price} MtxCurrency`;

      entry.itemGrants.push({
        templateId: `${item.type.backendValue}:${item.id}`,
        quantity: 1,
      });

      if (item.backpack) {
        entry.itemGrants.push({
          templateId: `${item.backpack.type.backendValue}:${item.backpack.id}`,
          quantity: 1,
        });

        entry.requirements.push({
          requirementType: "DenyOnItemOwnership",
          requiredId: `${item.backpack.type.backendValue}:${item.backpack.id}`,
          minQuantity: 1,
        });
      }

      return entry;
    }
  }
}
