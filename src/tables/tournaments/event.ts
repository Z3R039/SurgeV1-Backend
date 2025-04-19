import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { EventWindow } from "./window";
import { EventMetadata } from "./metadata";

@Entity("tournament_events")
export class Event {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "timestamp" })
  announcementTime!: Date;

  @Column({ nullable: true })
  appId!: string;

  @Column({ type: "timestamp" })
  beginTime!: Date;

  @Column()
  displayDataId!: string;

  @Column({ type: "timestamp" })
  endTime!: Date;

  @Column({ nullable: true })
  environment!: string;

  @Column()
  eventGroup!: string;

  @Column()
  eventId!: string;

  @Column()
  gameId!: string;

  @Column({ nullable: true })
  link!: string;

  @OneToMany(() => EventWindow, (eventWindow) => eventWindow.event, { cascade: true })
  eventWindows!: EventWindow[];

  @Column("jsonb", { default: {} })
  platformMappings!: Record<string, any>;

  @Column("text", { array: true })
  platforms!: string[];

  @Column("jsonb", { default: {} })
  regionMappings!: Record<string, any>;

  @Column("text", { array: true })
  regions!: string[];

  @OneToMany(() => EventMetadata, (metadata) => metadata.event, { cascade: true })
  metadata!: EventMetadata[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
