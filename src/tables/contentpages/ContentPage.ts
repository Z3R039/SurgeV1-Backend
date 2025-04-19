import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

export class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  _title!: string;

  @Column()
  _activeDate!: Date;

  @Column()
  lastModified!: Date;

  @Column()
  _locale!: string;

  @Column()
  _noIndex!: boolean;
}

@Entity()
export class CommonMessageBase {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true })
  image!: string;

  @Column()
  hidden!: boolean;

  @Column()
  title!: string;

  @Column()
  body!: string;

  @Column()
  spotlight!: boolean;

  @Column()
  _type!: string;

  @Column()
  subgame!: string;
}

@Entity()
export class SubgameSelectData extends BaseEntity {
  @Column()
  templateName!: string;

  @OneToOne(() => CommonMessageBase)
  @JoinColumn()
  saveTheWorldUnowned!: CommonMessageBase;

  @OneToOne(() => CommonMessageBase)
  @JoinColumn()
  battleRoyale!: CommonMessageBase;

  @OneToOne(() => CommonMessageBase)
  @JoinColumn()
  creative!: CommonMessageBase;

  @OneToOne(() => CommonMessageBase)
  @JoinColumn()
  saveTheWorld!: CommonMessageBase;
}

@Entity()
export class SaveTheWorldNews extends BaseEntity {
  @OneToMany(() => CommonMessageBase, (message) => message.id)
  messages!: CommonMessageBase[];
}

@Entity()
export class SubgameInfo extends BaseEntity {
  @OneToMany(() => SubgameDetail, (detail) => detail.id)
  details!: SubgameDetail[];
}

@Entity()
export class SubgameDetail {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  subgame!: string;

  @Column()
  image!: string;

  @Column()
  color!: string;

  @Column("simple-json")
  description!: Record<string, string>;

  @Column("simple-json")
  title!: Record<string, string>;

  @ManyToOne(() => SubgameInfo, (info) => info.details)
  subgameInfo!: SubgameInfo;
}

@Entity()
export class TournamentInfo extends BaseEntity {
  @OneToMany(() => TournamentDetail, (detail) => detail.id)
  tournaments!: TournamentDetail[];
}

@Entity()
export class TournamentDetail {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  loadingScreenImage!: string;

  @Column()
  titleColor!: string;

  @Column()
  backgroundRightColor!: string;

  @Column()
  backgroundTextColor!: string;

  @Column()
  _type!: string;

  @Column()
  tournamentDisplayId!: string;

  @Column()
  highlightColor!: string;

  @Column()
  primaryColor!: string;

  @Column()
  titleLine1!: string;

  @Column()
  shadowColor!: string;

  @Column()
  backgroundLeftColor!: string;

  @Column()
  posterFadeColor!: string;

  @Column()
  secondaryColor!: string;

  @Column()
  playlistTileImage!: string;

  @Column()
  baseColor!: string;
}

@Entity()
export class PlaylistInfo extends BaseEntity {
  @Column({ type: "simple-json" })
  playlist_info!: {
    _type: string;
    playlists: PlaylistDetail[];
  };

  @Column()
  frontend_matchmaking_header_style!: string;
}

@Entity()
export class PlaylistDetail {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  playlistName!: string;

  @Column()
  image!: string;

  @Column()
  hidden!: boolean;

  @Column()
  _type!: string;

  @Column()
  displayName!: string;
}

interface IDynamicBackground {
  stage: string;
  _type: string;
  key: string;
  backgroundimage?: string;
}

@Entity()
export class DynamicBackground extends BaseEntity {
  @Column({ type: "simple-json" })
  backgrounds!: {
    backgrounds: IDynamicBackground[];
    _type: string;
  };
}

@Entity()
export class NewsBase {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "simple-array" })
  platform_messages!: NewsPlatformMessage[];

  @Column()
  _type!: string;

  @Column({ type: "simple-array" })
  messages!: NewsMessage[];
}

@Entity()
export class NewsMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  image!: string;

  @Column()
  hidden!: boolean;

  @Column()
  _type!: string;

  @Column()
  messagetype!: string;

  @Column()
  title!: string;

  @Column()
  body!: string;

  @Column()
  spotlight!: boolean;
}

@Entity()
export class BattleRoyaleNews extends BaseEntity {
  @Column()
  style!: string;

  @Column()
  header!: string;

  @Column()
  alwaysShow!: boolean;

  @Column({ type: "simple-json" })
  news!: NewsBase;
}

@Entity()
export class NewsPlatformMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  hidden!: boolean;

  @Column()
  _type!: string;

  @Column({ type: "simple-json" })
  message!: CommonMessageBase;

  @Column()
  platform!: string;
}

@Entity()
export class PlatformMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  image!: string;

  @Column()
  hidden!: boolean;

  @Column()
  _type!: string;

  @Column()
  subgame!: string;

  @Column()
  title!: string;

  @Column()
  body!: string;

  @Column()
  spotlight!: boolean;
}
