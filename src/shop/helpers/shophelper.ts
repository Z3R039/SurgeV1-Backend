import type {
  BattlePassStorefront,
  CardPackEntry,
  CardPackStorefront,
  CurrencyEntry,
  CurrencyStorefront,
  Entries,
  ItemGrants,
  Shop,
  StorefrontNames,
  Storefronts,
} from "../interfaces/Declarations";
import { v4 as uuid } from "uuid";
import { createBattlePassEntryTemplate, createCurrencyEntryTemplate } from "./template";
import { ShopGenerator } from "../shop";

// https://stackoverflow.com/a/2901298
function formatNumber(num: number): string {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export namespace ShopHelper {
  export function createStorefront(sectionName: string): Storefronts {
    return {
      name: sectionName,
      catalogEntries: [],
    };
  }

  export function newCurrencyOffer(
    originalOffer: number,
    extraBonus: number,
    imageUrl: string,
    priority: number,
    currencyStorefront: CurrencyStorefront,
  ): CurrencyEntry {
    const offer = createCurrencyEntryTemplate();
    const formattedPrice = formatNumber(originalOffer);

    offer.meta.IconSize = "Small";
    offer.meta.CurrencyAnalyticsName = `MtxPack${originalOffer}`;
    offer.meta.OriginalOffer = originalOffer.toString();
    offer.meta.ExtraBonus = extraBonus;
    offer.meta.FeaturedImageUrl = imageUrl;
    offer.meta.Priority = priority;

    offer.title = `${formattedPrice} V-Bucks`;
    offer.description = `Buy ${formattedPrice} Fortnite V-Bucks that can be spent in Battle Royale, Creative, and Save the World modes. Note: Not all items purchased may be available in Save the World mode.`;

    offer.itemGrants.push({
      templateId: "Currency:MtxPurchased",
      quantity: originalOffer,
    });

    offer.sortPriority = priority;

    currencyStorefront.catalogEntries.push(offer);

    return offer;
  }

  export function push(shop: Shop, storefront: Storefronts) {
    shop.storefronts.push(storefront);
  }

  export function getCurrentShop(): Shop {
    return ShopGenerator.shop;
  }

  export function createCardPackStorefront(shop: Shop, sectionName: string): CardPackStorefront {
    return {
      name: sectionName,
      catalogEntries: [],
    };
  }

  export function createCurrencyStorefront(shop: Shop, sectionName: string): CurrencyStorefront {
    return {
      name: sectionName,
      catalogEntries: [],
    };
  }

  export function createCardPackOffers(offers: CardPackEntry[]): CardPackEntry[] {
    return offers;
  }

  export function createBattlePassStorefront(
    shop: Shop,
    sectionName: string,
  ): BattlePassStorefront {
    return {
      name: sectionName,
      catalogEntries: [],
    };
  }
}
