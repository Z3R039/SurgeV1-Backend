import type { IProfile } from "../../../types/profilesdefs";

type MultiUpdate = {
  changeType: string;
  itemId: string;
  item: any;
};

type Notification = {
  itemType: string;
  itemGuid: string;
  quantity: number;
};

type BoostTypes = "season_match_boost" | "season_friend_match_boost";

export namespace ItemGrantingHandler {
  export function handleAthenaItem(itemId: string, quantity: number, athena: IProfile): void {
    athena.items[itemId] = {
      quantity,
      attributes: {
        favorite: false,
        item_seen: false,
        level: 1,
        max_level_bonus: 0,
        rnd_sel_cnt: 0,
        variants: [],
        xp: 0,
      },
      templateId: itemId,
    };
  }

  export function handleBoostType(boostType: BoostTypes, quantity: number, athena: IProfile): void {
    athena.stats.attributes![boostType]! = (athena.stats.attributes![boostType]! || 0) + quantity;
  }

  export function addBannerOrHomebaseItem(itemId: string, common_core: IProfile): void {
    common_core.items[itemId] = {
      quantity: 1,
      attributes: {
        favorite: false,
        item_seen: false,
        level: 1,
        max_level_bonus: 0,
        rnd_sel_cnt: 0,
        variants: [],
        xp: 0,
      },
      templateId: itemId,
    };
  }
}
