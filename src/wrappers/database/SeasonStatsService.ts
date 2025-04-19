import type { Repository } from "typeorm";
import type { SeasononalStats, SeasonStats, Stats } from "../../tables/seasonstats";
import type Database from "../Database.wrapper";
import { logger } from "../..";

export default class SeasonStatsService {
  private seasonStatsRepository: Repository<SeasonStats>;

  constructor(private database: Database) {
    this.seasonStatsRepository = this.database.getRepository("season_stats");
  }

  public async create(seasonStats: Partial<SeasonStats>): Promise<SeasonStats> {
    const newSeasonStats = this.seasonStatsRepository.create(seasonStats);
    return await this.seasonStatsRepository.save(newSeasonStats);
  }

  public async findByAccountId(accountId: string): Promise<SeasonStats | null> {
    try {
      const seasonStats = await this.seasonStatsRepository
        .createQueryBuilder("stats")
        .where("stats.accountId = :accountId", { accountId })
        .getOne();

      return seasonStats;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error finding season stats: ${error.message}`);
      } else {
        logger.error(`Unexpected error: ${error}`);
      }
      return null;
    }
  }

  async findStatByAccountId(accountId: string, stat: keyof Stats): Promise<SeasononalStats | null> {
    try {
      const seasonStats = await this.seasonStatsRepository
        .createQueryBuilder("stats")
        .where("stats.accountId = :accountId", { accountId })
        .getOne();

      if (!seasonStats) return null;

      return seasonStats[stat] || null;
    } catch (error) {
      logger.error(`Error finding season stat: ${error}`);
      return null;
    }
  }

  public async update(
    accountId: string,
    seasonStats: Partial<SeasononalStats>,
  ): Promise<SeasonStats | null> {
    try {
      const existingStats = await this.seasonStatsRepository.findOne({ where: { accountId } });

      if (!existingStats) {
        logger.warn(`No season stats found for accountId: ${accountId}`);
        return null;
      }

      Object.assign(existingStats, seasonStats);

      return await this.seasonStatsRepository.save(existingStats);
    } catch (error) {
      logger.error(`Error updating season stats: ${error}`);
      return null;
    }
  }

  public async delete(accountId: string): Promise<boolean> {
    try {
      const seasonStats = await this.seasonStatsRepository.findOne({ where: { accountId } });
      if (!seasonStats) return false;

      const result = await this.seasonStatsRepository.delete({ accountId });
      return result.affected === 1;
    } catch (error) {
      logger.error(`Error deleting season stats: ${error}`);
      return false;
    }
  }

  public async findTopAccounts(playlist: string, limit: number): Promise<SeasonStats[]> {
    try {
      return await this.seasonStatsRepository
        .createQueryBuilder("seasonStats")
        .where(`-'${playlist}'->>'wins' IS NOT NULL`)
        .orderBy(`-'${playlist}'->>'wins'`, "DESC")
        .limit(limit)
        .getMany();
    } catch (error) {
      logger.error(`Error finding top accounts: ${error}`);
      return [];
    }
  }
}
