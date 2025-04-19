import { CampaignQuestManager, CampaignQuestType } from "../../managers/CampaignQuestManager";
import type { DailyQuestDef } from "../../managers/QuestManager";
import type { QuestItem } from "./CampaignQuestItem";

export class CampaignQuestBuilder {
  /**
   * Creates a QuestItem object based on the given DailyQuestDef.
   * This method supports dynamic quest attributes and objectives.
   *
   * @param quest The quest definition to create a QuestItem from.
   * @param tier (optional) The tier of the quest for multi-stage quests.
   * @returns A QuestItem object that represents the quest in the user's profile.
   */
  static createItem(quest: DailyQuestDef, tier: number = 1): QuestItem {
    const questItem: QuestItem = {
      templateId: `Quest:${quest.Name}`,
      attributes: {
        creation_time: new Date().toISOString(),
        quest_state: "Active",
        last_state_change_time: new Date().toISOString(),
        level: tier,
        quest_rarity: this.getQuestRarity(tier),
        xp_reward_scalar: this.getXpRewardScalar(tier),
        sent_new_notification: true,
      },
      quantity: 1,
    };

    for (const objective of quest.Properties.Objectives) {
      questItem.attributes[`completion_${objective.BackendName}`] = 0;
    }

    return questItem;
  }

  static buildQuestByTemplateId(templateId: string, type: CampaignQuestType): QuestItem {
    const quest = CampaignQuestManager.listedQuests[type].get(templateId);
    if (!quest) throw new Error(`Quest not found (buildQuestByTemplateId): ${templateId}`);

    return this.buildQuest(quest);
  }

  static buildQuest(quest: DailyQuestDef): QuestItem {
    const questItem: QuestItem = {
      templateId: `Quest:${quest.Name}`,
      attributes: {
        creation_time: new Date().toISOString(),
        quest_state: "Active",
        last_state_change_time: new Date().toISOString(),
        level: -1,
        quest_rarity: this.getQuestRarity(-1),
        xp_reward_scalar: this.getXpRewardScalar(-1),
        sent_new_notification: true,
      },
      quantity: 1,
    };

    for (const objective of quest.Properties.Objectives) {
      questItem.attributes[`completion_${objective.BackendName}`] = 0;
    }

    return questItem;
  }

  /**
   * Gets all quests of a specific type (e.g., Stonewood, Onboarding).
   *
   * @param questType The type of quests to retrieve.
   * @returns An array of DailyQuestDef objects.
   */
  static getQuestsByType(questType: CampaignQuestType): DailyQuestDef[] {
    return Array.from(CampaignQuestManager.listedQuests[questType].values());
  }

  /**
   * Gets Stonewood quests.
   * @returns An array of DailyQuestDef objects for Stonewood quests.
   */
  static getStonewoodQuests(): DailyQuestDef[] {
    return this.getQuestsByType(CampaignQuestType.STONEWOOD);
  }

  /**
   * Gets Onboarding quests.
   * @returns An array of DailyQuestDef objects for Onboarding quests.
   */
  static getOnboardingQuests(): DailyQuestDef[] {
    return this.getQuestsByType(CampaignQuestType.ONBOARDING);
  }

  /**
   * Gets Challenge quests.
   * @returns An array of DailyQuestDef objects for Challenge quests.
   */
  static getChallengeQuests(): DailyQuestDef[] {
    return this.getQuestsByType(CampaignQuestType.CHALLENGES);
  }

  /**
   * Gets Achievement quests.
   * @returns An array of DailyQuestDef objects for Achievement quests.
   */
  static getAchievementQuests(): DailyQuestDef[] {
    return this.getQuestsByType(CampaignQuestType.ACHIEVEMENTS);
  }

  /**
   * Calculates quest rarity based on its tier.
   * For multi-tiered quests, higher tiers may have higher rarity.
   *
   * @param tier The quest tier.
   * @returns The rarity of the quest (e.g., "uncommon", "rare").
   */
  private static getQuestRarity(tier: number): string {
    if (tier <= 1) return "uncommon";
    if (tier === 2) return "rare";
    return "epic";
  }

  /**
   * Adjusts XP reward scaling based on quest tier.
   *
   * @param tier The quest tier.
   * @returns The XP reward scalar.
   */
  private static getXpRewardScalar(tier: number): number {
    if (tier <= 1) return 1;
    if (tier === 2) return 1.5;
    return 2;
  }

  /**
   * Gets all quest types and their corresponding quests.
   * This is a more flexible method to fetch quests for a user in bulk.
   *
   * @param questTypes The array of quest types to retrieve.
   * @returns An array of DailyQuestDef for each quest type requested.
   */
  static getAllQuestTypes(
    questTypes: CampaignQuestType[],
  ): Record<CampaignQuestType, DailyQuestDef[]> {
    const quests: Record<CampaignQuestType, DailyQuestDef[]> = {
      [CampaignQuestType.REPEATABLE]: [],
      [CampaignQuestType.ONBOARDING]: [],
      [CampaignQuestType.CHALLENGES]: [],
      [CampaignQuestType.ACHIEVEMENTS]: [],
      [CampaignQuestType.STONEWOOD]: [],
    };

    for (const type of questTypes) {
      quests[type] = this.getQuestsByType(type);
    }

    return quests;
  }

  /**
   * Dynamically builds quests for a specific group (e.g., Stonewood, Onboarding).
   * This can be extended to support dynamic difficulty scaling or stages.
   *
   * @param questGroup The group of quests to build (e.g., Stonewood quests).
   * @returns An array of QuestItem objects representing the built quests.
   */
  static buildQuestsForGroup(questGroup: DailyQuestDef[]): QuestItem[] {
    const questItems: QuestItem[] = [];

    for (const quest of questGroup) {
      const questItem = this.createItem(quest);
      questItems.push(questItem);
    }

    return questItems;
  }
}
