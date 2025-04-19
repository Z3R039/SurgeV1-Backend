import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("quest_rewards")
export class QuestRewards extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 256, nullable: false })
  QuestTemplateId!: string;

  @Column({ type: "varchar", length: 256, nullable: false })
  TemplateId!: string;

  @Column({ type: "integer", nullable: false })
  Quantity!: number;

  @Column({ type: "boolean", nullable: false, default: false })
  Hidden!: boolean;

  @Column({ type: "boolean", nullable: false, default: false })
  Selectable!: boolean;
}
