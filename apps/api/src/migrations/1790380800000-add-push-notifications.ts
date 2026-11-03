import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPushNotifications1790380800000 implements MigrationInterface {
  name = "AddPushNotifications1790380800000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "legacy_device_user" ADD COLUMN IF NOT EXISTS "lastActiveAt" timestamptz NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mercury_user" ADD COLUMN IF NOT EXISTS "lastActiveAt" timestamptz NULL`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "push_subscription" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" varchar(36) NULL,
        "mercuryUserId" varchar(255) NULL,
        "endpoint" text NOT NULL,
        "p256dh" text NOT NULL,
        "auth" text NOT NULL,
        "expirationTime" timestamptz NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_push_subscription_mercury_user"
          FOREIGN KEY ("mercuryUserId")
          REFERENCES "mercury_user"("mercury_user_id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_push_subscription_endpoint" ON "push_subscription" ("endpoint")`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_preference" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" varchar(36) NULL,
        "mercuryUserId" varchar(255) NULL,
        "morningEnabled" boolean NOT NULL DEFAULT false,
        "morningHour" smallint NOT NULL DEFAULT 8,
        "inactivityEnabled" boolean NOT NULL DEFAULT false,
        "inactivityDays" smallint NOT NULL DEFAULT 3,
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_notification_preference_mercury_user"
          FOREIGN KEY ("mercuryUserId")
          REFERENCES "mercury_user"("mercury_user_id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_notification_preference_legacy"
      ON "notification_preference" ("userId")
      WHERE "userId" IS NOT NULL AND "mercuryUserId" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_notification_preference_mercury"
      ON "notification_preference" ("mercuryUserId")
      WHERE "mercuryUserId" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_delivery" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" varchar(36) NULL,
        "mercuryUserId" varchar(255) NULL,
        "notificationType" varchar(50) NOT NULL,
        "idempotencyKey" varchar(255) NOT NULL,
        "status" varchar(20) NOT NULL,
        "subscriptionCount" smallint NOT NULL DEFAULT 0,
        "lastError" varchar(500) NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_notification_delivery_mercury_user"
          FOREIGN KEY ("mercuryUserId")
          REFERENCES "mercury_user"("mercury_user_id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "uq_notification_delivery_idempotency" ON "notification_delivery" ("idempotencyKey")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_delivery"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_preference"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "push_subscription"`);
    await queryRunner.query(`ALTER TABLE "mercury_user" DROP COLUMN IF EXISTS "lastActiveAt"`);
    await queryRunner.query(`ALTER TABLE "legacy_device_user" DROP COLUMN IF EXISTS "lastActiveAt"`);
  }
}
