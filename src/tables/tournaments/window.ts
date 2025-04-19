import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Event } from "./event";
import type { EventMetadata } from "./metadata";

export interface IEvent {
  id: string;
  announcementTime: Date;
  appId: string;
  beginTime: Date;
  displayDataId: string;
  endTime: Date;
  environment: string;
  eventGroup: string;
  eventId: string;
  gameId: string;
  link: string;
  eventWindows: EventWindow[];
  platformMappings: Record<string, any>;
  platforms: string[];
  regionMappings: Record<string, any>;
  regions: string[];
  metadata: EventMetadata[];
  createdAt: Date;
  updatedAt: Date;
}

@Entity("tournament_windows")
export class EventWindow {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "timestamp" })
  beginTime!: Date;

  @Column("text", { array: true, default: [] })
  additionalRequirements!: string[];

  @Column("jsonb", { default: [] })
  blackoutPeriods!: string[];

  @Column({ default: false })
  canLiveSpectate!: boolean;

  @Column({ type: "timestamp" })
  countdownBeginTime!: Date;

  @Column({ type: "timestamp" })
  endTime!: Date;

  @Column()
  eventTemplateId!: string;

  @Column()
  eventWindowId!: string;

  @Column({ default: false })
  isTBD!: boolean;

  @Column("jsonb", { default: {} })
  metadata!: EventMetadata;

  @Column()
  payoutDelay!: number;

  @Column("text", { array: true, default: [] })
  requireAllTokens!: string[];

  @Column("text", { array: true, default: [] })
  requireAllTokensCaller!: string[];

  @Column("text", { array: true, default: [] })
  requireAnyTokens!: string[];

  @Column("text", { array: true, default: [] })
  requireAnyTokensCaller!: string[];

  @Column("text", { array: true, default: [] })
  requireNoneTokensCaller!: string[];

  @Column()
  round!: number;

  @Column("jsonb", { default: [] })
  scoreLocations!: string[];

  @Column()
  teammateEligibility!: string;

  @Column()
  visibility!: string;

  @ManyToOne(
    () => {
      const { Event } = require("./event");
      return Event;
    },
    (event: Event) => event.eventWindows,
    { onDelete: "CASCADE" },
  )
  event!: IEvent;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
