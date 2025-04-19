import { DeleteResult, Repository } from "typeorm";
import { Quests } from "../../tables/quests";
import type Database from "../Database.wrapper";
import { logger } from "../..";
import type { IProfile } from "../../../types/profilesdefs";

export class QuestsService {
  private questsRepository: Repository<Quests>;

  constructor(private database: Database) {
    this.questsRepository = this.database.getRepository("quests");
  }

  async addQuest(data: {
    accountId: string;
    profileId: string;
    templateId: string;
    entity: object;
    isDaily: boolean;
    season: number;
  }): Promise<Quests> {
    const quest = this.questsRepository.create(data);

    return await this.questsRepository.save(quest);
  }

  async attributeIncludes(accountId: string, include: string): Promise<Quests[]> {
    const quests = await this.findAllQuestsByAccountId(accountId);

    if (!quests) return [];

    return quests.filter((quest) =>
      Object.keys(quest.entity).some((key) => key.startsWith(include)),
    );
  }

  async findQuestByQuestState(
    accountId: string,
    season: number,
    questState: string,
  ): Promise<Quests[] | null> {
    try {
      return await this.questsRepository.find({
        where: { accountId, season, entity: { quest_state: questState } },
      });
    } catch (error) {
      logger.error(`Error finding quests: ${error}`);
      return null;
    }
  }

  async deleteQuestsByAccountId(accountId: string): Promise<boolean> {
    const del = await this.questsRepository
      .createQueryBuilder()
      .delete()
      .from(Quests)
      .where("accountId = :accountId", { accountId })
      .execute();

    if (!del) return false;

    return true;
  }

  async deleteQuestsByAccountIdAndProfile(accountId: string, profileId: string): Promise<boolean> {
    const del = await this.questsRepository
      .createQueryBuilder()
      .delete()
      .from(Quests)
      .where("accountId = :accountId", { accountId })
      .andWhere("profileId = :profileId", { profileId })
      .execute();

    if (!del) return false;

    return true;
  }

  async findAllDailyQuestsByAccountId(accountId: string, profileId: string): Promise<Quests[]> {
    return await this.questsRepository.find({ where: { accountId, isDaily: true, profileId } });
  }

  async deleteQuestByTemplateId(
    accountId: string,
    season: number,
    templateId: string,
  ): Promise<boolean> {
    const del = await this.questsRepository
      .createQueryBuilder()
      .delete()
      .from(Quests)
      .where("accountId = :accountId", { accountId })
      .andWhere("season = :season", { season })
      .andWhere("templateId = :templateId", { templateId })
      .execute();

    if (!del) return false;

    return true;
  }

  async addQuests(
    quests: {
      accountId: string;
      profileId: string;
      templateId: string;
      entity: object;
      isDaily: boolean;
      season: number;
    }[],
  ): Promise<Quests[]> {
    const newQuests = this.questsRepository.create(quests);
    return await this.questsRepository.save(newQuests);
  }

  async deleteQuests(ids: number[]): Promise<void> {
    await this.questsRepository.delete(ids);
  }

  async findQuestByTemplateId(
    accountId: string,
    season: number,
    templateId: string,
  ): Promise<Quests | null> {
    return await this.questsRepository.findOneBy({ templateId, season, accountId });
  }

  async updateQuest(
    updateData: Partial<Quests>,
    accountId: string,
    season: number,
    templateId: string,
  ): Promise<void> {
    if (!updateData || !Object.keys(updateData).length) {
      throw new Error("No update data provided.");
    }

    try {
      const quest = await this.questsRepository.findOne({
        where: { accountId, season, templateId },
      });

      if (!quest) {
        throw new Error(`Quest not found: ${templateId}`);
      }

      await this.questsRepository.merge(quest, updateData);
      await this.questsRepository.save(quest);
    } catch (error) {
      logger.error(
        `Failed to update quest: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async findAllQuests(take: number = 10, skip: number = 0): Promise<Quests[]> {
    return await this.questsRepository.find({ take, skip });
  }

  async findAllQuestsByAccountId(accountId: string): Promise<Quests[]> {
    return await this.questsRepository.find({ where: { accountId } });
  }

  async findAllQuestsByAccountIdAndProfile(
    accountId: string,
    profileId: string,
  ): Promise<Quests[]> {
    return await this.questsRepository.find({ where: { accountId, profileId } });
  }

  async deleteAllDailyQuestsByAccountId(accountId: string, profileId: string): Promise<void> {
    await this.questsRepository.delete({ accountId, isDaily: true, profileId });
  }

  async findQuestByAttribute(accountId: string, key: string, value: number): Promise<Quests[]> {
    const quests = await this.findAllQuestsByAccountId(accountId);

    if (!quests) return [];

    return quests.filter((quest) => quest.entity[key] === value);
  }
}
