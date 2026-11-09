import type { MigrationInterface, QueryRunner } from "typeorm";

export class ReplacePushWithDiscordReminders1790467200000 implements MigrationInterface {
  name = "ReplacePushWithDiscordReminders1790467200000";
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_delivery"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_preference"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "push_subscription"`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "discord_reminder_setting" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" varchar(36) NULL, "mercuryUserId" varchar(255) NULL, "webhookCiphertext" text NULL, "webhookIv" varchar(24) NULL, "webhookAuthTag" varchar(24) NULL, "menstrualEnabled" boolean NOT NULL DEFAULT false, "bowelCheerEnabled" boolean NOT NULL DEFAULT false, "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "fk_discord_reminder_setting_mercury_user" FOREIGN KEY ("mercuryUserId") REFERENCES "mercury_user"("mercury_user_id") ON DELETE CASCADE)`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_discord_reminder_setting_legacy" ON "discord_reminder_setting" ("userId") WHERE "userId" IS NOT NULL AND "mercuryUserId" IS NULL`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_discord_reminder_setting_mercury" ON "discord_reminder_setting" ("mercuryUserId") WHERE "mercuryUserId" IS NOT NULL`);
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "discord_reminder_delivery" ("id" uuid PRIMARY KEY DEFAULT gen_random_uuid(), "userId" varchar(36) NULL, "mercuryUserId" varchar(255) NULL, "reminderType" varchar(50) NOT NULL, "idempotencyKey" varchar(255) NOT NULL, "status" varchar(20) NOT NULL, "lastError" varchar(500) NULL, "createdAt" timestamptz NOT NULL DEFAULT now())`);
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_discord_reminder_delivery" ON "discord_reminder_delivery" ("idempotencyKey")`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "discord_reminder_delivery"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "discord_reminder_setting"`);
  }
}
