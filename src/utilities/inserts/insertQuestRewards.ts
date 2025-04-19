import path from "node:path";
import { logger, questRewardsService } from "../..";

export default async function () {
  const questRewards = await Bun.file(
    path.join(__dirname, "..", "..", "memory", "questRewards.json"),
  ).json();

  for (const questReward of questRewards) {
    for (const row in questReward.Rows) {
      const reward = questReward.Rows[row];

      if (reward.TemplateId.includes("WorldItem:")) {
        const exists = await questRewardsService.findByTemplateId(reward.TemplateId);

        if (!exists) {
          await questRewardsService.create(reward);
        }
      }

      const existingQuestReward = await questRewardsService.findQuestByTemplateIdAndQuestTemplateId(
        reward.TemplateId,
        reward.QuestTemplateId,
      );

      if (!existingQuestReward) {
        await questRewardsService.create(reward);
      }
    }
  }
}
