import { BaseEntity, PrimaryGeneratedColumn, Entity, Column } from "typeorm";
import type { FortniteReceipts } from "./account";

@Entity()
export class Receipts extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 256, nullable: false, unique: true })
  accountId!: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  receipts!: FortniteReceipts[];
}
