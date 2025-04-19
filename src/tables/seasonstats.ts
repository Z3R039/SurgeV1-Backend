import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export interface SeasononalStats {
  wins: number;
  kills: number;
  matchesplayed: number;
  top25: number;
  top10: number;
  top6: number;
  top12: number;
  top5: number;
  top3: number;
  top1: number;
}

export interface Stats {
  solos: SeasononalStats;
  duos: SeasononalStats;
  squads: SeasononalStats;
  ltm: SeasononalStats;
}

@Entity()
export class SeasonStats extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 256, nullable: true, unique: true })
  accountId!: string;

  @Column({ type: "jsonb", nullable: false, default: {} })
  solos!: SeasononalStats;

  @Column({ type: "jsonb", nullable: false, default: {} })
  duos!: SeasononalStats;

  @Column({ type: "jsonb", nullable: false, default: {} })
  squads!: SeasononalStats;

  @Column({ type: "jsonb", nullable: false, default: {} })
  ltm!: SeasononalStats;
}
