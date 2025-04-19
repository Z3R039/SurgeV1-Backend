import { config, logger, questsService } from "../../..";
import type { IProfile } from "../../../../types/profilesdefs";
import { Quests } from "../../../tables/quests";
import type { QuestsService } from "../../../wrappers/database/QuestsService";
import { CampaignQuestManager, CampaignQuestType } from "../../managers/CampaignQuestManager";
import ProfileHelper from "../../ProfileHelper";
import type { SeasonInfo } from "../../uaparser";
import { CampaignQuestBuilder } from "./CampaignQuestBuilder";
import { type QuestItem } from "./CampaignQuestItem";
import { CampaignQuestService } from "./CampaignQuestService";

interface QuestStatus {
  state: QuestState;
  claimed: boolean;
  completed: boolean;
  templateId: string;
}

enum QuestState {
  Active = "Active",
  Completed = "Completed",
  Claimed = "Claimed",
}

export class CampaignQuestOrchestrator {
  constructor(private questsService: QuestsService) {}

  static async constructCampaignQuests(
    user: IProfile,
    uahelper: SeasonInfo,
    multiUpdates: object[],
  ): Promise<void> {
    if (uahelper.season !== config.currentSeason || user.profileId !== "campaign") return;

    const questTemplateId = "OutpostQuest_T1_L1";
    const existingQuest = await this.findOrCreateQuest(
      user.accountId,
      uahelper.season,
      questTemplateId,
      multiUpdates,
    );

    if (existingQuest) {
      await this.updateQuestProgress(user.accountId, existingQuest);
      await this.findOrCreateQuest(
        user.accountId,
        uahelper.season,
        "HomebaseOnboardingGrantSchematics",
        multiUpdates,
      );
      const questStatus = await this.getQuestStatus(user.accountId);

      await this.handleQuestCompletion(user.accountId, uahelper.season, multiUpdates, questStatus);
    }

    //  await this.addNewQuests(user.accountId, uahelper.season, multiUpdates);
  }

  private static async findOrCreateQuest(
    accountId: string,
    season: number,
    templateId: string,
    multiUpdates: object[],
  ): Promise<Quests | null> {
    const quest = await questsService.findQuestByTemplateId(
      accountId,
      season,
      `Quest:${templateId}`,
    );

    if (quest) {
      logger.info(`Quest already exists: ${templateId}`);
      return quest;
    }

    const newlyBuiltQuest = CampaignQuestBuilder.buildQuestByTemplateId(
      templateId,
      CampaignQuestType.ONBOARDING,
    );

    newlyBuiltQuest.attributes.quest_state = QuestState.Claimed;
    newlyBuiltQuest.attributes.last_state_change_time = new Date().toISOString();

    if (Object.keys(newlyBuiltQuest.attributes).some((key) => key.startsWith("completion_"))) {
      if (
        newlyBuiltQuest.attributes["completion_custom_deployoutpost"] &&
        newlyBuiltQuest.attributes["completion_custom_supplydropreceived"] &&
        newlyBuiltQuest.attributes["completion_complete_outpost_1_1"] > 0
      ) {
        return null;
      }

      if (newlyBuiltQuest.templateId === "Quest:OutpostQuest_T1_L1") {
        newlyBuiltQuest.attributes["completion_custom_deployoutpost"] = 1;
        newlyBuiltQuest.attributes["completion_custom_supplydropreceived"] = 1;
        newlyBuiltQuest.attributes["completion_complete_outpost_1_1"] = 1;

        multiUpdates.push(
          {
            changeType: "itemAttrChanged",
            itemId: newlyBuiltQuest.templateId,
            attributeName: "completion_custom_deployoutpost",
            attributeValue: 1,
          },
          {
            changeType: "itemAttrChanged",
            itemId: newlyBuiltQuest.templateId,
            attributeName: "completion_custom_supplydropreceived",
            attributeValue: 1,
          },
          {
            changeType: "itemAttrChanged",
            itemId: newlyBuiltQuest.templateId,
            attributeName: "completion_complete_outpost_1_1",
            attributeValue: 1,
          },
          {
            changeType: "itemAttrChanged",
            itemId: newlyBuiltQuest.templateId,
            attributeName: "last_state_change_time",
            attributeValue: newlyBuiltQuest.attributes.last_state_change_time,
          },
        );
      } else if (newlyBuiltQuest.templateId === "Quest:HomebaseOnboardingGrantSchematics") {
        newlyBuiltQuest.attributes["completion_questcomplete_outpostquest_t1_l1"] = 1;

        multiUpdates.push(
          {
            changeType: "itemAttrChanged",
            itemId: newlyBuiltQuest.templateId,
            attributeName: "completion_questcomplete_outpostquest_t1_l1",
            attributeValue: 1,
          },
          {
            changeType: "itemAttrChanged",
            itemId: newlyBuiltQuest.templateId,
            attributeName: "last_state_change_time",
            attributeValue: newlyBuiltQuest.attributes.last_state_change_time,
          },
        );
      } //else if (newlyBuiltQuest.templateId === "Quest:HomebaseOnboarding") {
      //   newlyBuiltQuest.attributes["completion_hbonboarding_completezone"] = 1;
      //   newlyBuiltQuest.attributes["completion_hbonboarding_watchsatellitecine"] = 1;

      //   multiUpdates.push(
      //     {
      //       changeType: "itemAttrChanged",
      //       itemId: newlyBuiltQuest.templateId,
      //       attributeName: "completion_hbonboarding_completezone",
      //       attributeValue: 1,
      //     },
      //     {
      //       changeType: "itemAttrChanged",
      //       itemId: newlyBuiltQuest.templateId,
      //       attributeName: "completion_hbonboarding_watchsatellitecine",
      //       attributeValue: 1,
      //     },
      //     {
      //       changeType: "itemAttrChanged",
      //       itemId: newlyBuiltQuest.templateId,
      //       attributeName: "last_state_change_time",
      //       attributeValue: newlyBuiltQuest.attributes.last_state_change_time,
      //     },
      //   );
      // }
    }

    const newQuest = await questsService.addQuest({
      accountId,
      profileId: "campaign",
      isDaily: false,
      templateId: newlyBuiltQuest.templateId,
      entity: { ...newlyBuiltQuest.attributes },
      season,
    });

    multiUpdates.push({
      changeType: "itemAdded",
      itemId: newlyBuiltQuest.templateId,
      item: newlyBuiltQuest,
    });

    logger.info(`Added new quest: ${newlyBuiltQuest.templateId}`);

    return newQuest;
  }

  private static async updateQuestProgress(accountId: string, quest: Quests): Promise<void> {
    const qt = CampaignQuestManager.listedQuests[CampaignQuestType.ONBOARDING].get(
      quest.templateId.replace("Quest:", ""),
    );

    if (!qt) {
      logger.error(`Quest not found: ${quest.templateId}`);
      return;
    }

    if (quest.entity.quest_state === "Claimed") {
      logger.info(`Quest already claimed: ${quest.templateId}`);
      return;
    }

    const objectives = qt.Properties.Objectives;
    objectives.forEach((obj) => {
      if (`completion_${obj.BackendName}` in quest.entity) {
        quest.entity[`completion_${obj.BackendName}`] = 1;
      }
    });

    quest.entity.quest_state = QuestState.Claimed;
    quest.entity.last_state_change_time = new Date().toISOString();

    await questsService.updateQuest(quest, accountId, config.currentSeason, quest.templateId);
  }

  private static async handleQuestCompletion(
    accountId: string,
    season: number,
    multiUpdates: object[],
    questStatus: QuestStatus[],
  ): Promise<void> {
    const stoneWoodQuestTimelineMapping: { [key: string]: string } = {
      "Homebase Storm Shield Defense 1": "OutpostQuest_T1_L1",
      "Constructor Leadership": "HeroQuest_ConstructorLeadership",
      "Before and After Science": "StonewoodQuest_CloseGate_D1",
      "Weakpoint Vision": "HomebaseQuest_WeakPointVision",
      "Unlock Squads": "HomebaseQuest_UnlockSquads",
      "(Hidden) EMT Worker (Unlock)": "HomebaseQuest_UnlockEMTWorker",
      "Ride The Lightning": "StonewoodQuest_LaunchBalloon_D1",
      "Homebase Storm Shield Defense 2": "OutpostQuest_T1_L2",
      "Hero Training - Stage 1": "HomebaseQuest_ResearchPurchase",
    };

    const completedQuest = questStatus.find(
      (quest) => quest.state === QuestState.Claimed || quest.state === QuestState.Completed,
    );

    if (completedQuest) {
      await this.grantNextQuest(accountId, season, multiUpdates, stoneWoodQuestTimelineMapping);
    }
  }

  private static async grantNextQuest(
    accountId: string,
    season: number,
    multiUpdates: object[],
    timelineMapping: { [key: string]: string },
  ): Promise<void> {
    logger.debug("Granting next quest in timeline..");

    const questStatus = await this.getQuestStatus(accountId);
    const claimedQuestIds = new Set(
      questStatus
        .filter((quest) => quest.state === QuestState.Claimed)
        .map((quest) => quest.templateId.replace("Quest:", "")),
    );

    for (const [currentQuestName, currentQuestId] of Object.entries(timelineMapping)) {
      const cleanQuestId = currentQuestId.replace("Quest:", "");

      if (claimedQuestIds.has(cleanQuestId)) {
        continue;
      }

      const existingQuest = await questsService.findQuestByTemplateId(
        accountId,
        season,
        `Quest:${currentQuestId}`,
      );

      if (existingQuest) {
        logger.info(
          `Quest already exists: ${currentQuestName} (Template ID: ${existingQuest.templateId})`,
        );
        break;
      }

      const nextQuest = CampaignQuestBuilder.buildQuestByTemplateId(
        cleanQuestId,
        CampaignQuestType.ONBOARDING,
      );

      logger.info(`Adding next quest: ${currentQuestName} (Template ID: ${nextQuest.templateId})`);

      multiUpdates.push({
        changeType: "itemAdded",
        itemId: nextQuest.templateId,
        item: nextQuest,
      });

      await CampaignQuestService.addQuest(accountId, nextQuest, season);
      break;
    }
  }

  private static async addNewQuests(
    accountId: string,
    season: number,
    multiUpdates: object[],
  ): Promise<void> {
    const existingQuestStatus = await this.getQuestStatus(accountId);
    const activeQuestIds = new Set(
      existingQuestStatus
        .filter((quest) => quest.state === QuestState.Active)
        .map((quest) => quest.templateId),
    );

    const allQuestTypes = await CampaignQuestBuilder.getAllQuestTypes([
      CampaignQuestType.ONBOARDING,
      CampaignQuestType.CHALLENGES,
      CampaignQuestType.ACHIEVEMENTS,
      CampaignQuestType.STONEWOOD,
    ]);

    const stoneWoodQuestTimelineMapping: { [key: string]: string } = {
      "Homebase Storm Shield Defense 1": "OutpostQuest_T1_L1",
      "Constructor Leadership": "HeroQuest_ConstructorLeadership",
      "Before and After Science": "StonewoodQuest_CloseGate_D1",
      "Weakpoint Vision": "HomebaseQuest_WeakPointVision",
      "Unlock Squads": "HomebaseQuest_UnlockSquads",
      "(Hidden) EMT Worker (Unlock)": "HomebaseQuest_UnlockEMTWorker",
      "Ride The Lightning": "StonewoodQuest_LaunchBalloon_D1",
      "Homebase Storm Shield Defense 2": "OutpostQuest_T1_L2",
      "Hero Training - Stage 1": "HomebaseQuest_ResearchPurchase",
    };

    const grantedTimelines: Set<string> = new Set();
    const questsToRemove: string[] = [];

    for (const questGroup of Object.values(allQuestTypes)) {
      let firstQuestForTimelineAdded = false;

      for (const questItem of questGroup) {
        const questName = questItem.Properties.DisplayName;
        const timelineQuestId = stoneWoodQuestTimelineMapping[questName];

        if (timelineQuestId) {
          const item = CampaignQuestBuilder.buildQuest(questItem);

          if (!grantedTimelines.has(timelineQuestId)) {
            if (!activeQuestIds.has(item.templateId)) {
              multiUpdates.push({
                changeType: "itemAdded",
                itemId: item.templateId,
                item,
              });

              await CampaignQuestService.addQuest(accountId, item, season);
              grantedTimelines.add(timelineQuestId);
              firstQuestForTimelineAdded = true;
            }

            if (firstQuestForTimelineAdded) {
              break;
            }
          } else if (activeQuestIds.has(item.templateId)) {
            questsToRemove.push(item.templateId);
          }
        }
      }
    }

    for (const questId of questsToRemove) {
      multiUpdates.push({
        changeType: "itemRemoved",
        itemId: questId,
      });

      await questsService.deleteQuestByTemplateId(accountId, season, questId);
    }
  }

  private static async getQuestStatus(accountId: string): Promise<QuestStatus[]> {
    try {
      const quests = await questsService.findAllQuestsByAccountId(accountId);

      return quests.map((quest) => {
        let state: QuestState;
        switch (quest.entity.quest_state) {
          case "Claimed":
            state = QuestState.Claimed;
            break;
          case "Completed":
            state = QuestState.Completed;
            break;
          default:
            state = QuestState.Active;
        }

        return {
          state,
          claimed: state === QuestState.Claimed,
          completed: state === QuestState.Completed,
          templateId: quest.templateId,
        };
      });
    } catch (error) {
      logger.error(`Error getting quest status for user ${accountId}: ${error}`);
      return [];
    }
  }
}
