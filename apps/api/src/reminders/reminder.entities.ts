import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity("discord_reminder_setting")
@Index("uq_discord_reminder_setting_legacy", ["userId"], { unique: true, where: '"userId" IS NOT NULL AND "mercuryUserId" IS NULL' })
@Index("uq_discord_reminder_setting_mercury", ["mercuryUserId"], { unique: true, where: '"mercuryUserId" IS NOT NULL' })
export class DiscordReminderSettingEntity {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "varchar", length: 36, nullable: true }) userId!: string | null;
  @Column({ type: "varchar", length: 255, nullable: true }) mercuryUserId!: string | null;
  @Column({ type: "text", nullable: true }) webhookCiphertext!: string | null;
  @Column({ type: "varchar", length: 24, nullable: true }) webhookIv!: string | null;
  @Column({ type: "varchar", length: 24, nullable: true }) webhookAuthTag!: string | null;
  @Column({ type: "boolean", default: false }) menstrualEnabled!: boolean;
  @Column({ type: "boolean", default: false }) bowelCheerEnabled!: boolean;
  @CreateDateColumn({ type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updatedAt!: Date;
}

@Entity("discord_reminder_delivery")
@Index("uq_discord_reminder_delivery", ["idempotencyKey"], { unique: true })
export class DiscordReminderDeliveryEntity {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ type: "varchar", length: 36, nullable: true }) userId!: string | null;
  @Column({ type: "varchar", length: 255, nullable: true }) mercuryUserId!: string | null;
  @Column({ type: "varchar", length: 50 }) reminderType!: string;
  @Column({ type: "varchar", length: 255 }) idempotencyKey!: string;
  @Column({ type: "varchar", length: 20 }) status!: "sent" | "failed" | "skipped";
  @Column({ type: "varchar", length: 500, nullable: true }) lastError!: string | null;
  @CreateDateColumn({ type: "timestamptz" }) createdAt!: Date;
}
