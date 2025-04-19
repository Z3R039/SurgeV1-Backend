import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export default class Sessions {
  @Column()
  sessionId!: string;

  @Column()
  lastUpdated!: string;

  @Column("int")
  serverPort!: number;

  @PrimaryGeneratedColumn("uuid")
  ownerId!: string;

  @Column()
  ownerName!: string;

  @Column()
  serverName!: string;

  @Column("int")
  maxPublicPlayers!: number;

  @Column("int")
  maxPrivatePlayers!: number;

  @Column({ type: "boolean", default: false })
  shouldAdvertise!: boolean;

  @Column({ type: "boolean", default: true })
  allowJoinInProgress!: boolean;

  @Column({ type: "boolean", default: true })
  isDedicated!: boolean;

  @Column({ type: "boolean", default: false })
  usesStats!: boolean;

  @Column({ type: "boolean", default: true })
  allowInvites!: boolean;

  @Column({ type: "boolean", default: false })
  usesPresence!: boolean;

  @Column({ type: "boolean", default: true })
  allowJoinViaPresence!: boolean;

  @Column({ type: "boolean", default: false })
  allowJoinViaPresenceFriendsOnly!: boolean;

  @Column()
  buildUniqueId!: string;

  @Column("jsonb")
  attributes!: {
    REGION_s: string;
    HOTFIXVERSION_i: number;
    MATCHMAKINGPOOL_s: string;
    STORMSHIELDDEFENSETYPE_i: number;
    GAMEMODE_s: string;
    SESSIONKEY_s: string;
    PLAYLISTID_i: number;
    BEACONPORT_i: number;
  };

  @Column("int")
  openPrivatePlayers!: number;

  @Column("int")
  openPublicPlayers!: number;

  @Column({ type: "int", default: 0 })
  sortWeight!: number;

  @Column({ type: "boolean", default: false })
  started!: boolean;

  @Column("simple-array")
  publicPlayers!: string[];

  @Column("simple-array")
  privatePlayers!: string[];
}
