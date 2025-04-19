import type { Repository } from "typeorm";
import type { DisplayAssets } from "../../tables/displayassets";
import type Database from "../Database.wrapper";
import { logger } from "../..";

export default class DisplayAssetsService {
  private displayAssetsRepository: Repository<DisplayAssets>;

  constructor(private database: Database) {
    this.displayAssetsRepository = database.getRepository("displayassets");
  }

  async addAssets(assets: Partial<DisplayAssets>): Promise<DisplayAssets | null> {
    try {
      const newDisplayAssets = this.displayAssetsRepository.create(assets);
      return await this.displayAssetsRepository.save(newDisplayAssets);
    } catch (error) {
      logger.error(`Error adding display assets: ${error}`);
      return null;
    }
  }

  async getAssets(): Promise<DisplayAssets[]> {
    try {
      return await this.displayAssetsRepository.find();
    } catch (error) {
      logger.error(`Error getting display assets: ${error}`);
      return [];
    }
  }

  async getAssetByKey(key: string): Promise<string | null> {
    try {
      const items = await this.displayAssetsRepository.find();
      for (const item of items) {
        if (item.key === key) {
          return item.value;
        }
      }
      return null;
    } catch (error) {
      logger.error(`Error getting display asset by key: ${error}`);
      return null;
    }
  }
}
