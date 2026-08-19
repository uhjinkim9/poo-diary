import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { BristolType, StoolColor } from "@poo-diary/shared";

@Entity("diary_entry")
export class DiaryEntryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "smallint" })
  bristolType!: BristolType;

  @Column({ type: "varchar", length: 20 })
  color!: StoolColor;

  @Column({ type: "boolean", default: false })
  hasPain!: boolean;

  @Column({ type: "smallint", nullable: true })
  painLevel!: number | null;

  @Column({ type: "varchar", length: 36, default: "anonymous" })
  userId!: string;

  @Column({ type: "simple-json", default: "[]" })
  foods!: string[];

  @Column({ type: "varchar", length: 200, nullable: true })
  mealNote!: string | null;

  @Column({ type: "varchar", length: 300, nullable: true })
  memo!: string | null;

  @Column({ type: "timestamptz" })
  recordedAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
