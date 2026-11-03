import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("push_subscription")
@Index("uq_push_subscription_endpoint", ["endpoint"], { unique: true })
export class PushSubscriptionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 36, nullable: true })
  userId!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  mercuryUserId!: string | null;

  @Column({ type: "text" })
  endpoint!: string;

  @Column({ type: "text" })
  p256dh!: string;

  @Column({ type: "text" })
  auth!: string;

  @Column({ type: "timestamptz", nullable: true })
  expirationTime!: Date | null;

  @Column({ type: "boolean", default: true })
  enabled!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}

@Entity("notification_preference")
@Index("uq_notification_preference_legacy", ["userId"], {
  unique: true,
  where: '"userId" IS NOT NULL AND "mercuryUserId" IS NULL',
})
@Index("uq_notification_preference_mercury", ["mercuryUserId"], {
  unique: true,
  where: '"mercuryUserId" IS NOT NULL',
})
export class NotificationPreferenceEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 36, nullable: true })
  userId!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  mercuryUserId!: string | null;

  @Column({ type: "boolean", default: false })
  morningEnabled!: boolean;

  @Column({ type: "smallint", default: 8 })
  morningHour!: number;

  @Column({ type: "boolean", default: false })
  inactivityEnabled!: boolean;

  @Column({ type: "smallint", default: 3 })
  inactivityDays!: number;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}

@Entity("notification_delivery")
@Index("uq_notification_delivery_idempotency", ["idempotencyKey"], {
  unique: true,
})
export class NotificationDeliveryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 36, nullable: true })
  userId!: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  mercuryUserId!: string | null;

  @Column({ type: "varchar", length: 50 })
  notificationType!: string;

  @Column({ type: "varchar", length: 255 })
  idempotencyKey!: string;

  @Column({ type: "varchar", length: 20 })
  status!: "sent" | "failed" | "skipped";

  @Column({ type: "smallint", default: 0 })
  subscriptionCount!: number;

  @Column({ type: "varchar", length: 500, nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
