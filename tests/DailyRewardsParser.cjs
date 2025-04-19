const rewards = require("./rewards.json");
const fs = require("fs");

const dailyRewards = [];

for (const reward of rewards) {
  for (const rows in reward.Rows) {
    const row = reward.Rows[rows];

    let splitTemplateId = row.ItemDefinition.AssetPathName.split("/");
    let parsedTemplateId = splitTemplateId[splitTemplateId.length - 1].split(".")[0];

    let templateId;

    switch (true) {
      case row.ItemDefinition.AssetPathName.includes("PersistentResources"):
        templateId = `AccountResource:${parsedTemplateId}`;
        break;
      case row.ItemDefinition.AssetPathName.includes("Currency"):
        templateId = `MtxCurrency:${parsedTemplateId}`;
        break;
      case row.ItemDefinition.AssetPathName.includes("CardPacks"):
        templateId = `CardPack:${parsedTemplateId}`;
        break;
      case row.ItemDefinition.AssetPathName.includes("AccountConsumables"):
        templateId = `ConsumableAccountItem:${parsedTemplateId}`;
        break;
      case row.ItemDefinition.AssetPathName.includes("ConversionControl"):
        templateId = `ConversionControl:${parsedTemplateId}`;
        break;

      default:
        console.log(row.ItemDefinition.AssetPathName);
    }

    dailyRewards.push({
      itemType: templateId,
      quantity: row.ItemCount,
    });
  }
}
fs.writeFileSync("DailyRewards.json", JSON.stringify(dailyRewards, null, 2));
