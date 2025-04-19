import { questsService } from "../../..";
import type { QuestItem } from "./CampaignQuestItem";

export class CampaignQuestService {
  static async addQuest(
    userAccountId: string,
    questItem: QuestItem,
    season: number,
  ): Promise<void> {
    await questsService.addQuest({
      accountId: userAccountId,
      profileId: "campaign",
      isDaily: false,
      templateId: questItem.templateId,
      entity: {
        ...questItem.attributes,
      },
      season: season,
    });
  }
}
