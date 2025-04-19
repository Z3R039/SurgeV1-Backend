import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import type { Permission } from "../../types/permissionsdefs";


export interface FortniteReceipts {
  appStore: string;
  appStoreId: string;
  receiptId: string;
  receiptInfo: string;
}

@Entity()
export class Account extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 256, nullable: false, unique: true })
  accountId!: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  discordId!: string;


  @Column({ type: "jsonb", nullable: false, default: [] })
  permissions!: Permission[];

  @Column({ nullable: false, default: 0 })
  arenaHype!: number;
}
