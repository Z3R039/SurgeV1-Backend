import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("displayassets")
export class DisplayAssets extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 256, nullable: false })
  key!: string;

  @Column({ type: "varchar", length: 256, nullable: false })
  value!: string;
}
