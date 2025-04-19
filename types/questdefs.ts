import type { Objectives } from "../src/utilities/managers/QuestManager";

export interface QuestItem {
  templateId: string;
  attributes: {
    [key: string]: any;
    ObjectiveState: Objectives[];
  };
}

interface QuestAttributes {
  attributes: any;
  templateId: string;
  itemId?: string;
  quantity: number;
}

export interface QuestDictionary {
  [key: string]: QuestAttributes;
}

export interface QuestAttributesDefinition {
  creation_time: string;
  level: number;
  item_seen: boolean;
  playlists: never[];
  sent_new_notification: boolean;
  challenge_bundle_id: string;
  xp_reward_scalar: number;
  challenge_linked_quest_given: string;
  quest_pool: string;
  quest_state: string;
  bucket: string;
  last_state_change_time: string;
  challenge_linked_quest_parent: string;
  max_level_bonus: number;
  xp: number;
  quest_rarity: string;
  favorite: boolean;
  [key: string]: string | number | boolean | never[];
}
