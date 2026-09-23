import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddBowelExperienceAndDailyStatus1790208000000
  implements MigrationInterface
{
  name = "AddBowelExperienceAndDailyStatus1790208000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of [
      "hadUrgency",
      "wasHardToHold",
      "hadToStrain",
      "feltIncomplete",
      "feltRelieved",
      "spentLongInToilet",
    ]) {
      await queryRunner.query(
        `ALTER TABLE "diary_entry" ADD COLUMN IF NOT EXISTS "${column}" boolean NOT NULL DEFAULT false`,
      );
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "daily_bowel_status" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" varchar(36) NULL,
        "mercuryUserId" varchar(255) NULL,
        "statusDate" date NOT NULL,
        "noBowelMovement" boolean NOT NULL DEFAULT false,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_daily_bowel_status_mercury_user"
          FOREIGN KEY ("mercuryUserId")
          REFERENCES "mercury_user"("mercury_user_id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_daily_bowel_status_legacy_date"
      ON "daily_bowel_status" ("userId", "statusDate")
      WHERE "userId" IS NOT NULL AND "mercuryUserId" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_daily_bowel_status_mercury_date"
      ON "daily_bowel_status" ("mercuryUserId", "statusDate")
      WHERE "mercuryUserId" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_bowel_status"`);
    for (const column of [
      "spentLongInToilet",
      "feltRelieved",
      "feltIncomplete",
      "hadToStrain",
      "wasHardToHold",
      "hadUrgency",
    ]) {
      await queryRunner.query(
        `ALTER TABLE "diary_entry" DROP COLUMN IF EXISTS "${column}"`,
      );
    }
  }
}
