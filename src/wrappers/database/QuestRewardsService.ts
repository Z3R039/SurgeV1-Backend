import type { Repository } from "typeorm";
import type { QuestRewards } from "../../tables/questrewards";
import type Database from "../Database.wrapper";
import { logger } from "../..";

export default class QuestRewardsService {
  private questRewardsRepoistory: Repository<QuestRewards>;
  private allQuestRewardsCache: QuestRewards[] | null = null;

  constructor(private database: Database) {
    this.questRewardsRepoistory = database.getRepository("quest_rewards");
  }

  async create(questRewards: Partial<QuestRewards>): Promise<QuestRewards> {
    try {
      const newQuestRewards = this.questRewardsRepoistory.create(questRewards);
      return await this.questRewardsRepoistory.save(newQuestRewards);
    } catch (error) {
      logger.error(`Error creating quest rewards ${error}`);
      throw error;
    }
  }

  async getAll(): Promise<QuestRewards[]> {
    if (this.allQuestRewardsCache) {
      return this.allQuestRewardsCache;
    }

    try {
      this.allQuestRewardsCache = await this.questRewardsRepoistory.find();
      return this.allQuestRewardsCache;
    } catch (error) {
      logger.error(`Error getting all quest rewards: ${error}`);
      throw error;
    }
  }

  async getBatch(offset: number, batchSize: number): Promise<QuestRewards[]> {
    try {
      if (this.allQuestRewardsCache) {
        return this.allQuestRewardsCache.slice(offset, offset + batchSize);
      }

      return await this.questRewardsRepoistory.find({
        skip: offset,
        take: batchSize,
      });
    } catch (error) {
      logger.error(`Error getting quest rewards batch: ${error}`);
      throw error;
    }
  }

  async findQuestByTemplateIdAndQuestTemplateId(
    templateId: string,
    questTemplateId: string,
  ): Promise<QuestRewards | null> {
    try {
      return await this.questRewardsRepoistory.findOne({
        where: { TemplateId: templateId, QuestTemplateId: questTemplateId },
      });
    } catch (error) {
      logger.error(`Error finding quest rewards ${error}`);
      return null;
    }
  }

  async update(questRewards: Partial<QuestRewards>): Promise<QuestRewards> {
    try {
      const updatedQuestRewards = this.questRewardsRepoistory.create(questRewards);
      return await this.questRewardsRepoistory.save(updatedQuestRewards);
    } catch (error) {
      logger.error(`Error updating quest rewards ${error}`);
      throw error;
    }
  }

  async findByQuestTemplateId(questTemplateId: string): Promise<QuestRewards | null> {
    try {
      const questRewards = await this.questRewardsRepoistory.findOne({
        where: { QuestTemplateId: questTemplateId },
      });

      if (!questRewards) return null;

      return questRewards;
    } catch (error) {
      logger.error(`Error finding quest rewards ${error}`);
      return null;
    }
  }

  async findByTemplateId(templateId: string): Promise<QuestRewards | null> {
    try {
      const questRewards = await this.questRewardsRepoistory.findOne({
        where: { TemplateId: templateId },
      });

      if (!questRewards) return null;

      return questRewards;
    } catch (error) {
      logger.error(`Error finding quest rewards ${error}`);
      return null;
    }
  }

  async deleteByQuestTemplateId(questTemplateId: string): Promise<boolean> {
    try {
      const result = await this.questRewardsRepoistory.delete({
        QuestTemplateId: questTemplateId,
      });
      if (!result.affected) return false;
      return result.affected === 1;
    } catch (error) {
      logger.error(`Error deleting quest rewards ${error}`);
      throw error;
    }
  }
}
