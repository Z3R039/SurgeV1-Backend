import path from "node:path";
import fs from "node:fs/promises";
import { logger, profilesService, questsService } from "../..";
import Config from "../../wrappers/Env.wrapper";
import { handleProfileSelection } from "../../operations/QueryProfile";
import type { BattlepassQuestDef, DailyQuestDef, DailyQuestObjectives } from "./QuestManager";

// Same format from fmodel
export enum CampaignQuestType {
  REPEATABLE = "repeatable",
  ONBOARDING = "onboarding",
  CHALLENGES = "challenges",
  ACHIEVEMENTS = "achievements",
  STONEWOOD = "stonewood",
}

const config = new Config().getConfig();
const baseFolder = path.join(
  __dirname,
  "..",
  "..",
  "memory",
  "season",
  "quests",
  "Campaign",
  `Season${config.currentSeason}`,
);

export namespace CampaignQuestManager {
  export const listedQuests: Record<CampaignQuestType, Map<string, DailyQuestDef>> = {
    [CampaignQuestType.REPEATABLE]: new Map(),
    [CampaignQuestType.ONBOARDING]: new Map(),
    [CampaignQuestType.CHALLENGES]: new Map(),
    [CampaignQuestType.ACHIEVEMENTS]: new Map(),
    [CampaignQuestType.STONEWOOD]: new Map(),
  };

  async function readAllQuests(folder: string): Promise<void> {
    const files = await fs.readdir(folder);

    const fileReadPromises = files.map(async (file) => {
      const filePath = path.join(folder, file);

      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        await readAllQuests(filePath);
      } else if (file.endsWith(".json")) {
        try {
          const content = await fs.readFile(filePath, "utf-8");
          const quest = JSON.parse(content) as DailyQuestDef[];

          const type = folder.includes("repeatable")
            ? CampaignQuestType.REPEATABLE
            : folder.includes("onboarding")
            ? CampaignQuestType.ONBOARDING
            : folder.includes("challenges")
            ? CampaignQuestType.CHALLENGES
            : folder.includes("achievements")
            ? CampaignQuestType.ACHIEVEMENTS
            : folder.includes("stonewood")
            ? CampaignQuestType.STONEWOOD
            : undefined;

          if (type) {
            for (const allQuests of quest) {
              if (!listedQuests[type].has(allQuests.Name)) {
                listedQuests[type].set(allQuests.Name, allQuests);
              }
            }
          }
        } catch (error) {
          logger.error(`Error parsing Quest ${file}: ${error}`);
        }
      }
    });

    await Promise.all(fileReadPromises);
  }

  export async function initQuests(): Promise<void> {
    try {
      await readAllQuests(baseFolder);
      logger.startup("Initialized Campaign Quests.");
    } catch (error) {
      logger.error(`Error initializing quests: ${error}`);
    }
  }

  export async function isQuestUsed(quest: DailyQuestDef, accountId: string): Promise<boolean> {
    try {
      const storage = await questsService.findQuestByTemplateId(
        accountId,
        config.currentSeason,
        quest.Name,
      );

      const profile = await profilesService.findByAccountId(accountId);
      if (!profile) {
        return false;
      }

      const profileQuests = await handleProfileSelection("campaign", accountId);
      if (!profileQuests || !profileQuests.items) {
        return false;
      }

      return !!storage;
    } catch (error) {
      logger.error(`Error checking if quest is used: ${error}`);
      return false;
    }
  }

  export async function getRandomQuests(accountId: string): Promise<DailyQuestDef[]> {
    const quests = Array.from(listedQuests[CampaignQuestType.REPEATABLE].values());

    if (quests.length === 0) {
      return [];
    }

    const availableQuests = await Promise.all(
      quests.map(async (quest) => ({
        quest,
        isUsed: await isQuestUsed(quest, accountId),
      })),
    );

    const unusedQuests = availableQuests.filter(({ isUsed }) => !isUsed).map(({ quest }) => quest);

    if (unusedQuests.length === 0) {
      return [];
    }

    const shuffledFiles = unusedQuests.sort(() => 0.5 - Math.random());

    const numQuests = Math.min(3, shuffledFiles.length);
    const randomQuests = shuffledFiles.slice(0, numQuests);

    return randomQuests.map((quest) => quest);
  }

  export async function getRandomQuest(accountId: string): Promise<DailyQuestDef[]> {
    const quests = Array.from(listedQuests[CampaignQuestType.REPEATABLE].values());

    if (quests.length === 0) {
      return [];
    }

    const availableQuests = await Promise.all(
      quests.map(async (quest) => ({
        quest,
        isUsed: await isQuestUsed(quest, accountId),
      })),
    );

    const unusedQuests = availableQuests.filter(({ isUsed }) => !isUsed).map(({ quest }) => quest);

    if (unusedQuests.length === 0) {
      return [];
    }

    const shuffledFiles = unusedQuests.sort(() => 0.5 - Math.random());

    const numQuests = Math.min(1, shuffledFiles.length);
    const randomQuests = shuffledFiles.slice(0, numQuests);

    return randomQuests.map((quest) => quest);
  }

  export function buildBase(name: string, objectives: DailyQuestObjectives[]) {
    return {
      sent_new_notification: false,
      ObjectiveState: objectives.map((obj) => ({
        Name: `completion_${obj.BackendName}`,
        Value: 0,
      })),
      creation_time: new Date().toISOString(),
      level: -1,
      item_seen: false,
      playlists: [],
      challenge_bundle_id: "",
      xp_reward_scalar: 1,
      challenge_linked_quest_given: "",
      quest_pool: "",
      quest_state: "Active",
      bucket: "",
      last_state_change_time: new Date().toISOString(),
      challenge_linked_quest_parent: "",
      max_level_bonus: 0,
      xp: 0,
      quest_rarity: "uncommon",
      favorite: false,
    };
  }
}
