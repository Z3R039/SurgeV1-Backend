import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum ServerStatus {
  ONLINE = "online",
  OFFLINE = "offline",
  MAINTENANCE = "maintenance",
}

@Entity()
export class ServerOptions {
  @Column()
  matchId!: string;

  @Column()
  region!: string;

  @Column()
  userAgent!: string;

  @Column()
  playlist!: string;
}

@Entity()
@Index(["identifier"], { unique: true })
export class Servers {
  @PrimaryGeneratedColumn("uuid")
  sessionId!: string;

  @Column({
    type: "enum",
    enum: ServerStatus,
    default: ServerStatus.OFFLINE,
  })
  status!: ServerStatus;

  @Column({ type: "int" })
  version!: number;

  @Column()
  identifier!: string;

  @Column()
  address!: string;

  @Column({ type: "int" })
  port!: number;

  @Column("text", { array: true })
  queue!: string[];

  @Column((type) => ServerOptions)
  options!: ServerOptions;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt!: Date;
}
