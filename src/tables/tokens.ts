import { BaseEntity, Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

export enum TokenTypes {
  AccessToken = "accesstoken",
  RefreshToken = "refreshtoken",
  ClientToken = "clientoken",
}

@Entity()
@Unique(["accountId", "type"])
export class Tokens extends BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  accountId!: string;

  @Column()
  type!: string;

  @Column()
  token!: string;

  @Column()
  clientId!: string;

  @Column()
  grant!: string;
}
