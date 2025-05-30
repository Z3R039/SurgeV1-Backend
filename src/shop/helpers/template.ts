import type {
  BattlePassEntry,
  CardPackEntry,
  CurrencyEntry,
  Entries,
  GiftInfo,
  Meta,
} from "../interfaces/Declarations";

export function createBattlePassEntryTemplate(): BattlePassEntry {
  return {
    offerId: "",
    devName: "",
    offerType: "",
    prices: [],
    categories: [],
    dailyLimit: -1,
    weeklyLimit: -1,
    monthlyLimit: -1,
    appStoreId: [],
    requirements: [],
    metaInfo: [],
    displayAssetPath: "",
    itemGrants: [],
    sortPriority: 1,
    catalogGroupPriority: 1,
    title: {},
    description: {},
    catalogGroup: "",
    shortDescription: "",
  };
}

export function createCurrencyEntryTemplate(): CurrencyEntry {
  return {
    offerId: "",
    devName: "",
    offerType: "",
    prices: [],
    categories: [],
    dailyLimit: -1,
    weeklyLimit: -1,
    monthlyLimit: -1,
    appStoreId: [],
    requirements: [],
    metaInfo: [],
    meta: {} as Meta,
    catalogGroup: "",
    catalogGroupPriority: 0,
    sortPriority: 0,
    title: "",
    shortDescription: "",
    description: "",
    displayAssetPath: "",
    itemGrants: [],
  };
}

export function createCardPackEntryTemplate(): CardPackEntry {
  return {
    offerId: "",
    devName: "",
    offerType: "",
    prices: [],
    categories: [],
    dailyLimit: -1,
    weeklyLimit: -1,
    monthlyLimit: -1,
    appStoreId: [],
    requirements: [],
    metaInfo: [],
    metaAssetInfo: {
      structName: "",
      payload: {
        chaseItems: [],
        packDefinition: "",
      },
    },
    catalogGroup: "",
    catalogGroupPriority: 0,
    sortPriority: 0,
    title: "",
    shortDescription: "",
    description: "",
    displayAssetPath: "",
    itemGrants: [],
  };
}

export function createItemEntryTemplate(): Entries {
  return {
    offerId: "",
    offerType: "",
    devName: "",
    itemGrants: [],
    requirements: [],
    categories: [],
    metaInfo: [],
    meta: {} as Meta,
    giftInfo: {} as GiftInfo,
    prices: [],
    bannerOverride: "",
    displayAssetPath: "",
    NewDisplayAssetPath: "",
    refundable: false,
    title: "",
    description: "",
    shortDescription: "",
    appStoreId: [],
    fulfillmentIds: [],
    dailyLimit: -1,
    weeklyLimit: -1,
    monthlyLimit: -1,
    sortPriority: 0,
    catalogGroupPriority: 0,
    filterWeight: 0,
  };
}

export function test() {
  return {};
}
