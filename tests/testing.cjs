const bitch = require("./ff.json");
const fs = require("fs");
const path = require("path");

const huh = bitch.filter((data) => data.Name.includes("AthenaSeasonItemEntryReward_"));

const tfff = new Map();

huh.map((dick) => {
  const idk =
    dick.Properties.BattlePassOffer.RewardItem.ItemDefinition.AssetPathName.split(
      ".",
    )[1].toLowerCase();

  const templateMappings = {
    season19_: "ChallengeBundleSchedule",
    eid: "AthenaDance",
    emoji: "AthenaDance",
    spid: "AthenaDance",
    toy: "AthenaDance",
    vtid: "CosmeticVariantToken",
    mtxgiveaway: "Currency",
    athenaseasonalxp: "AccountResource",
    glider: "AthenaGlider",
    cid: "AthenaCharacter",
    athenaseason: "Token",
    athenanextseason: "Token",
    wrap: "AthenaItemWrap",
    pickaxe: "AthenaPickaxe",
    lsid: "AthenaLoadingScreen",
    trails: "AthenaSkyDiveContrail",
    musicpack: "AthenaMusicPack",
    bid: "AthenaBackpack",
    petcarrier: "AthenaBackpack",
    brs19: "HomebaseBannerIcon",
    quest_: "Quest",
    iatid: "ItemAccessToken",
    athena_s19: "Token",
    season9_: "ChallengeBundleSchedule",
  };

  let TemplateId = "";

  const test =
    dick.Properties.BattlePassOffer.RewardItem.ItemDefinition.AssetPathName.split(
      ".",
    )[1].toLowerCase();

  let quantity = 1;

  if (dick.Properties.BattlePassOffer.RewardItem.Quantity) {
    quantity = dick.Properties.BattlePassOffer.RewardItem.Quantity;
  }

  for (const key in templateMappings) {
    // console.log(test);
    if (test.includes(key)) {
      TemplateId = `${templateMappings[key]}:${test}`;
      break;
    }
  }
  if (TemplateId === "") {
    console.log(`Missing template mapping for ${test}`);
  }

  tfff.set(dick.Properties.BattlePassOffer.OfferId, `${TemplateId}:${quantity}`);
});

const idk = [];

for (const [key, value] of tfff) {
  idk.push(`${key}:${value}`);
}

fs.writeFileSync(path.join(__dirname, "dick.json"), JSON.stringify(idk, null, 2));
