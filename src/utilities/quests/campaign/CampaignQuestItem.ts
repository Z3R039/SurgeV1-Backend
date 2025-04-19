export interface QuestAttributes {
  creation_time: string;
  quest_state: string;
  last_state_change_time: string;
  level: number;
  quest_rarity: string;
  xp_reward_scalar: number;
  sent_new_notification: boolean;
  [key: string]: any;
}

export interface QuestItem {
  templateId: string;
  attributes: QuestAttributes;
  quantity: number;
}
