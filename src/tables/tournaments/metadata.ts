import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { EventWindow, type IEvent } from "./window";
import { Event } from "./event";

@Entity("tournament_metadata")
export class EventMetadata {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  roundType!: string;

  @Column()
  thresholdToAdvanceDivision!: number;

  @Column()
  divisionRank!: number;

  @Column("text", { array: true, default: [] })
  trackedStats!: string[];

  @Column({ default: 0 })
  minimumAccountLevel!: number;

  @ManyToOne(() => EventWindow, (eventWindow) => eventWindow.metadata, { onDelete: "CASCADE" })
  eventWindow!: EventWindow;

  @ManyToOne(() => Event, (event) => event.metadata, { onDelete: "CASCADE" })
  event!: IEvent;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
