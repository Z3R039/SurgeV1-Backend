import type { Repository } from "typeorm";
import type { LauncherUpdates } from "../../tables/launcherupdates";
import type Database from "../Database.wrapper";
import { logger } from "../..";
import { compareVersions } from "compare-versions";

export default class LauncherUpdatesService {
  private launcherUpdatesRepository!: Repository<LauncherUpdates>;

  constructor(private database: Database) {
    this.launcherUpdatesRepository = database.getRepository("launcher_updates");
  }

  async create(launcherUpdates: Partial<LauncherUpdates>): Promise<LauncherUpdates | undefined> {
    try {
      const newEntity = this.launcherUpdatesRepository.create(launcherUpdates);
      return await this.launcherUpdatesRepository.save(newEntity);
    } catch (error) {
      logger.error(`Failed to create launcher updates: ${error}`);
      return undefined;
    }
  }

  async findByDate(date: string): Promise<LauncherUpdates | null> {
    try {
      return await this.launcherUpdatesRepository.findOne({ where: { date } });
    } catch (error) {
      logger.error(`Failed to find launcher updates by date: ${error}`);
      return null;
    }
  }

  async findByLatestVersion(version: string): Promise<LauncherUpdates | null> {
    try {
      return await this.launcherUpdatesRepository.findOne({ where: { version } });
    } catch (error) {
      logger.error(`Failed to find launcher updates by latest version: ${error}`);
      return null;
    }
  }

  async findNewestVersion(): Promise<LauncherUpdates | null> {
    try {
      const allUpdates = await this.launcherUpdatesRepository.find();
      if (allUpdates.length === 0) {
        return null;
      }

      const sortedUpdates = allUpdates.sort((a, b) => compareVersions(b.version, a.version));

      return sortedUpdates[0];
    } catch (error) {
      logger.error(
        `LauncherUpdatesService - findNewestVersion - Failed to find the newest version: ${error}`,
      );
      return null;
    }
  }

  async findAll(): Promise<LauncherUpdates[]> {
    try {
      return await this.launcherUpdatesRepository.find();
    } catch (error) {
      logger.error(`Failed to find all launcher updates: ${error}`);
      return [];
    }
  }

  async deleteByDate(date: string): Promise<void> {
    try {
      await this.launcherUpdatesRepository.delete({ date });
    } catch (error) {
      logger.error(`Failed to delete launcher updates: ${error}`);
    }
  }
}
