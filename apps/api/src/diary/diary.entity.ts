import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import type { BristolType, StoolColor } from "@poo-diary/shared";
import { MercuryUserEntity } from "../auth/auth.entities";

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

  @Column({ type: "varchar", length: 36, nullable: true })
  userId!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  mercuryUserId!: string | null;

  @ManyToOne(() => MercuryUserEntity, { nullable: true, onDelete: "RESTRICT" })
  @JoinColumn({ name: "mercuryUserId", referencedColumnName: "id" })
  mercuryUser!: MercuryUserEntity | null;

  @Column({ type: "simple-json", default: "[]" })
  foods!: string[];

  @Column({ type: "varchar", length: 200, nullable: true })
  mealNote!: string | null;

  @Column({ type: "smallint", nullable: true })
  menstrualDay!: number | null;

  @Column({ type: "boolean", default: false })
  hadEnoughSleep!: boolean;

  @Column({ type: "boolean", default: false })
  overate!: boolean;

  @Column({ type: "boolean", default: false })
  hadUrgency!: boolean;

  @Column({ type: "boolean", default: false })
  wasHardToHold!: boolean;

  @Column({ type: "boolean", default: false })
  hadToStrain!: boolean;

  @Column({ type: "boolean", default: false })
  feltIncomplete!: boolean;

  @Column({ type: "boolean", default: false })
  feltRelieved!: boolean;

  @Column({ type: "boolean", default: false })
  spentLongInToilet!: boolean;

  @Column({ type: "varchar", length: 300, nullable: true })
  memo!: string | null;

  @Column({ type: "timestamptz" })
  recordedAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
