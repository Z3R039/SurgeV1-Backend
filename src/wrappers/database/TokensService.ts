import { Repository } from "typeorm";
import { Tokens } from "../../tables/tokens";
import Database from "../Database.wrapper";
import { logger } from "../..";

export default class TokensService {
  private tokensRepository: Repository<Tokens>;

  constructor(private database: Database) {
    this.tokensRepository = this.database.getRepository("tokens");
  }
  public async create(token: Partial<Tokens>, accountId: string): Promise<Tokens | null> {
    try {
      if (!accountId || !token) {
        logger.error("Invalid input: accountId or token is missing");
        return null;
      }

      const savedToken = await this.tokensRepository.upsert(
        {
          accountId,
          ...token,
        },
        {
          conflictPaths: ["accountId", "type"],
        },
      );

      return savedToken.generatedMaps[0] as Tokens;
    } catch (error) {
      logger.error(`Error creating/updating token: ${error}`);
      return null;
    }
  }

  public async deleteAll(): Promise<void> {
    try {
      await this.tokensRepository.clear();
      logger.info("All tokens deleted successfully");
    } catch (error) {
      logger.error(`Error deleting tokens: ${error}`);
    }
  }

  public async deleteByToken(token: string): Promise<void> {
    try {
      const tokenToDelete = await this.tokensRepository.findOne({
        where: { token },
      });
      if (!tokenToDelete) return;
      await this.tokensRepository.remove(tokenToDelete);
    } catch (error) {
      logger.error(`Error deleting token: ${error}`);
    }
  }

  public async deleteByType(accountId: string, type: string): Promise<void> {
    try {
      const tokenToDelete = await this.tokensRepository.findOne({
        where: { type, accountId },
      });
      if (!tokenToDelete) return;
      await this.tokensRepository.remove(tokenToDelete);
    } catch (error) {
      logger.error(`Error deleting token: ${error}`);
    }
  }

  public async getTokenByTypeAndAccountId(type: string, accountId: string) {
    try {
      const token = await this.tokensRepository
        .createQueryBuilder("tokens")
        .where("tokens.type = :type", { type })
        .andWhere("tokens.accountId = :accountId", { accountId })
        .getOne();
      return token;
    } catch (error) {
      logger.error(`Error finding token: ${error}`);
      return null;
    }
  }

  public async getToken(token: string) {
    try {
      const tokenData = await this.tokensRepository
        .createQueryBuilder("tokens")
        .where("tokens.token = :token", { token })
        .getOne();
      return tokenData;
    } catch (error) {
      logger.error(`Error finding token: ${error}`);
      return null;
    }
  }
}
