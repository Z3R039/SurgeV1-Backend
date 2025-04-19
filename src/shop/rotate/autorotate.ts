import { itemStorageService, logger } from "../..";
import cron from "node-cron";
import { ShopGenerator } from "../shop";
import { ShopHelper } from "../helpers/shophelper";

logger.startup("Starting AutoRotate");

cron.schedule("0 0 * * *", async () => {
  logger.info("Rotating Shop");

  await ShopGenerator.generate();

  const shopData = ShopHelper.getCurrentShop();
  const addedItems = await itemStorageService.addItems([{ data: shopData, type: "storefront" }]);

  if (!addedItems) return false;

  logger.info("Shop Rotation Complete");
});
