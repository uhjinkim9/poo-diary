import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("daily_bowel_status")
export class DailyBowelStatusEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 36, nullable: true })
  userId!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  mercuryUserId!: string | null;

  @Column({ type: "date" })
  statusDate!: string;

  @Column({ type: "boolean", default: false })
  noBowelMovement!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
