import { config, logger, questsService } from "../..";
import type { ItemValue } from "../../../types/profilesdefs";
import { handleProfileSelection } from "../../operations/QueryProfile";
import type { PastSeasons } from "../managers/LevelsManager";
import { QuestManager, type Objectives } from "../managers/QuestManager";
import RefreshAccount from "../refresh";

export namespace BattlepassQuestGranter {
  export async function grant(accountId: string, username: string, templateId: string) {
    const battlepassQuests = QuestManager.listedBattlepassQuests;

    if (!battlepassQuests) {
      return { multiUpdates: [] };
    }

    const filteredMatchingQuest = Array.from(battlepassQuests).filter(
      (q) => q.ChallengeBundleSchedule === templateId,
    );

    if (filteredMatchingQuest.length === 0) {
      return { multiUpdates: [] };
    }

    const profile = await handleProfileSelection("common_core", accountId);

    if (!profile) {
      return { multiUpdates: [] };
    }

    const updates: Array<{
      changeType: "itemAdded" | "itemRemoved";
      itemId: string;
      item?: any;
    }> = [];

    const newChallengeBundles = [];
    const newQuests: {
      accountId: string;
      profileId: string;
      templateId: string;
      entity: object;
      isDaily: boolean;
      season: number;
    }[] = [];
    const profileItemsToUpdate: {
      [key: string]: {
        templateId: string;
        attributes: Partial<ItemValue>;
        quantity: number;
      };
    } = {};

    for (const questData of filteredMatchingQuest) {
      const bundleScheduleId = questData.ChallengeBundleSchedule;
      const bundleId = questData.Name;
      const grantedBundleNames = questData.Objects.map((object) => object.Name);

      const bundleScheduleAttributes = {
        unlock_epoch: new Date().toISOString(),
        max_level_bonus: 0,
        level: 1,
        item_seen: true,
        xp: 0,
        favorite: false,
        granted_bundles: grantedBundleNames,
      };

      const bundleAttributes = {
        has_unlock_by_completion: false,
        num_quests_completed: 0,
        level: 0,
        grantedquestinstanceids: grantedBundleNames,
        item_seen: true,
        max_allowed_bundle_level: 0,
        num_granted_bundle_quests: grantedBundleNames.length,
        max_level_bonus: 0,
        challenge_bundle_schedule_id: bundleScheduleId,
        num_progress_quests_completed: 0,
        xp: 0,
        favorite: false,
      };

      const processQuestsPromises = questData.Objects.map(async (object) => {
        const questTemplateId = object.Name;

        const existingQuest = await questsService.findQuestByTemplateId(
          accountId,
          config.currentSeason,
          questTemplateId,
        );

        if (!existingQuest) {
          const objectiveProgress = object.Objectives.reduce(
            (progress: { [key: string]: number }, { BackendName }) => {
              progress[`completion_${BackendName}`] = 0;
              return progress;
            },
            {},
          );

          const newQuestData = {
            accountId: accountId,
            profileId: "athena",
            templateId: questTemplateId,
            isDaily: false,
            entity: {
              creation_time: new Date().toISOString(),
              level: 1,
              item_seen: true,
              sent_new_notification: true,
              challenge_bundle_id: bundleId,
              xp_reward_scalar: 1,
              quest_state: "Active",
              last_state_change_time: new Date().toISOString(),
              max_level_bonus: 0,
              xp: 0,
              favorite: false,
              ...objectiveProgress,
            },
            season: config.currentSeason,
          };

          newQuests.push(newQuestData);

          profileItemsToUpdate[questTemplateId] = {
            templateId: questTemplateId,
            attributes: newQuestData.entity,
            quantity: 1,
          };

          updates.push({
            changeType: "itemAdded",
            itemId: questTemplateId,
            item: profileItemsToUpdate[questTemplateId],
          });
        }
      });

      await Promise.all(processQuestsPromises);

      if (bundleId) {
        const existingBundle = await questsService.findQuestByTemplateId(
          accountId,
          config.currentSeason,
          bundleId,
        );

        if (!existingBundle) {
          newChallengeBundles.push(
            {
              accountId: accountId,
              profileId: "athena",
              templateId: `ChallengeBundle:${bundleId}`,
              entity: bundleAttributes,
              isDaily: false,
              season: config.currentSeason,
            },
            {
              accountId: accountId,
              profileId: "athena",
              templateId: bundleScheduleId,
              entity: bundleScheduleAttributes,
              isDaily: false,
              season: config.currentSeason,
            },
          );

          profileItemsToUpdate[`ChallengeBundle:${bundleId}`] = {
            templateId: `ChallengeBundle:${bundleId}`,
            attributes: bundleAttributes,
            quantity: 1,
          };

          profileItemsToUpdate[bundleScheduleId] = {
            templateId: bundleScheduleId,
            attributes: bundleScheduleAttributes,
            quantity: 1,
          };
        }
      }

      if (newQuests.length > 0) {
        await questsService.addQuests(newQuests);
      }

      if (newChallengeBundles.length > 0) {
        await questsService.addQuests(newChallengeBundles);
      }

      profile.items = { ...profile.items, ...profileItemsToUpdate };
    }

    try {
      await RefreshAccount(accountId, username);
    } catch (error) {
      logger.error(`Error refreshing account: ${error}`);
    }

    return { multiUpdates: updates };
  }
}
