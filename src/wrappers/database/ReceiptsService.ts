import type { Repository } from "typeorm";
import type { Receipts } from "../../tables/receipts";
import type Database from "../Database.wrapper";
import type { FortniteReceipts } from "../../tables/account";

export default class ReceiptsService {
  private receiptsRepository: Repository<Receipts>;

  constructor(private database: Database) {
    this.receiptsRepository = database.getRepository("receipts");
  }

  public async findByAccountId(accountId: string): Promise<Receipts | null> {
    const receipts = await this.receiptsRepository
      .createQueryBuilder("receipts")
      .where("receipts.accountId = :accountId", { accountId })
      .getOne();

    return receipts || null;
  }

  public async create(accountId: string, receipts: FortniteReceipts[]): Promise<Receipts> {
    const receiptsEntity = this.receiptsRepository.create();

    if (!receipts) {
      throw new Error("Receipts must be an array of objects.");
    }

    receiptsEntity.accountId = accountId;
    receiptsEntity.receipts = receipts;

    return await this.receiptsRepository.save(receiptsEntity);
  }

  public async update(accountId: string, receipts: FortniteReceipts[]): Promise<Receipts> {
    const receiptsEntity = await this.findByAccountId(accountId);

    if (!receiptsEntity) {
      throw new Error("Receipts not found.");
    }

    receiptsEntity.receipts = receipts;

    return await this.receiptsRepository.save(receiptsEntity);
  }

  public async delete(accountId: string): Promise<Receipts> {
    const receiptsEntity = await this.findByAccountId(accountId);

    if (!receiptsEntity) {
      throw new Error("Receipts not found.");
    }
    await this.receiptsRepository.delete({ accountId: receiptsEntity.accountId });

    return receiptsEntity;
  }
}
