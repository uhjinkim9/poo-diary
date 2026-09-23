import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("menstrual_cycle")
export class MenstrualCycleEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 36, nullable: true })
  userId!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  mercuryUserId!: string | null;

  @Column({ type: "date" })
  startedAt!: string;

  @Column({ type: "date", nullable: true })
  endedAt!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
