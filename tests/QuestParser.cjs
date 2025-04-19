const fs = require("fs").promises;
const path = require("path");

const questFolderPath = path.join(__dirname, "quests");
const bundleFilePath = path.join(__dirname, "bundles", "TestQuestBundle.json");

const SoIDontLoseMyMind = "QuestBundle_S6_Cumulative";

(async () => {
  const fullQuests = [];
  const rewards = [];
  const response = [];

  let isBattlepassRequired = true;
  let hasExtra = false;

  try {
    const QuestBundle = require(bundleFilePath);

    const files = await fs.readdir(questFolderPath);

    for (const file of files) {
      if (path.extname(file) === ".json") {
        const filePath = path.join(questFolderPath, file);
        const SingleQuest = require(filePath);

        SingleQuest.forEach((single) => {
          const { Properties } = single;
          const { Objectives, Rewards, HiddenRewards } = Properties;

          if (Rewards) {
            Rewards.forEach((reward) => {
              rewards.push({
                TemplateId: `${reward.ItemPrimaryAssetId.PrimaryAssetType.Name}:${reward.ItemPrimaryAssetId.PrimaryAssetName}`,
                Quantity: reward.Quantity,
              });
            });
          }

          if (HiddenRewards) {
            HiddenRewards.forEach((reward) => {
              if (reward.TemplateId.includes("Quest")) {
                fullQuests.push({
                  TemplateId: reward.TemplateId,
                  Quantity: reward.Quantity,
                });
              }

              rewards.push({
                TemplateId: reward.TemplateId,
                Quantity: reward.Quantity,
              });
            });
          }

          const objectives = Objectives.map((obj) => ({
            BackendName: obj.BackendName,
            Count: obj.Count,
            Stage: obj.Stage,
          }));

          const options = {
            bRequiresVIP: isBattlepassRequired,
            hasExtra,
          };

          response.push({
            TemplateId: `Quest:${single.Name}`,
            Options: options,
            Rewards: rewards,
            Objectives: objectives,
          });
        });
      }
    }

    QuestBundle.Objects = QuestBundle.Objects.concat(response);

    await fs.writeFile(bundleFilePath, JSON.stringify(QuestBundle, null, 2));

    console.log("Quest bundle updated successfully.");
  } catch (err) {
    console.error("Error processing quest files:", err);
  }
})();
