import path from "node:path";
import { displayAssetsService, logger } from "../..";

export default async function () {
  const displayAssets = await Bun.file(
    path.join(__dirname, "..", "..", "memory", "displayAssets.json"),
  ).json();

  const displayAssetsKeys = Object.keys(displayAssets);

  const existingAssets = await displayAssetsService.getAssets();

  if (existingAssets.length > 0) return;

  for (const key of displayAssetsKeys) {
    await displayAssetsService.addAssets({
      key,
      value: displayAssets[key],
    });
  }
}
