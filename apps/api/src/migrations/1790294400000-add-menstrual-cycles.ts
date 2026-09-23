import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMenstrualCycles1790294400000 implements MigrationInterface {
  name = "AddMenstrualCycles1790294400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menstrual_cycle" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" varchar(36) NULL,
        "mercuryUserId" varchar(255) NULL,
        "startedAt" date NOT NULL,
        "endedAt" date NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "fk_menstrual_cycle_mercury_user"
          FOREIGN KEY ("mercuryUserId")
          REFERENCES "mercury_user"("mercury_user_id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_menstrual_cycle_legacy_start"
      ON "menstrual_cycle" ("userId", "startedAt")
      WHERE "userId" IS NOT NULL AND "mercuryUserId" IS NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_menstrual_cycle_mercury_start"
      ON "menstrual_cycle" ("mercuryUserId", "startedAt")
      WHERE "mercuryUserId" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "menstrual_cycle"`);
  }
}
