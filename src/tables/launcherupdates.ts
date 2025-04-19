import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "launcher_updates" })
export class LauncherUpdates {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 255 })
  date!: string;

  @Column({ type: "varchar", length: 255 })
  previousVersion!: string;

  @Column({ type: "varchar", length: 255 })
  version!: string;

  @Column({ type: "varchar", length: 255 })
  whatsNewText!: string;

  @Column({ type: "jsonb", default: [] })
  changelog!: string[];
}
