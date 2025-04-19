const fs = require("fs");
const path = require("path");

const questFolderPath = path.join(__dirname, "quests");

function parseQuest(input) {
  return input.map((quest) => {
    const properties = quest.Properties || {};

    let SeasonXP = 0;

    if (properties.Rewards) {
      for (const index in properties.Rewards) {
        const reward = properties.Rewards[index];

        console.log(reward);
      }
    }

    const rewards = properties.Rewards
      ? properties.Rewards
      : properties.RewardsTable
      ? [properties.RewardsTable]
      : [];

    return {
      Type: quest.Type,
      Name: quest.Name,
      Class: quest.Class,
      Properties: {
        DisplayName: properties.DisplayName?.LocalizedString || "",
        Description: properties.Description?.LocalizedString || "",
        SeasonXP: SeasonXP,
        Objectives: properties.Objectives
          ? properties.Objectives.map((obj) => ({
              BackendName: obj.BackendName,
              ObjectiveState: obj.ObjectiveStatHandle?.RowName || "",
              ItemEvent: obj.ItemEvent,
              ItemReference: obj.ItemReference?.AssetPathName || "",
              ItemTemplateIdOverride: obj.ItemTemplateIdOverride,
              Description: obj.Description?.LocalizedString || "",
              HudShortDescription: obj.HudShortDescription?.LocalizedString || "",
              Count: obj.Count,
              Stage: obj.Stage,
              bHidden: obj.bHidden,
            }))
          : [],
      },
    };
  });
}

fs.readdir(questFolderPath, (err, files) => {
  if (err) {
    return console.error("Unable to read directory: ", err);
  }

  files = files.filter((file) => file.endsWith(".json"));

  files.forEach((file) => {
    const filePath = path.join(questFolderPath, file);

    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        return console.error("Unable to read file: ", err);
      }

      try {
        const jsonData = JSON.parse(data);
        const transformedData = parseQuest(jsonData);

        fs.writeFile(
          path.join(questFolderPath, `${file}`),
          JSON.stringify(transformedData, null, 2),
          "utf8",
          (err) => {
            if (err) {
              return console.error("Unable to write file: ", err);
            }
          },
        );
      } catch (e) {
        console.error("Error parsing JSON data: ", e);
      }
    });
  });
});
