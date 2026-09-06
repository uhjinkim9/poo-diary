import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddAccountAuditLogs1788624000000 implements MigrationInterface {
  name = "AddAccountAuditLogs1788624000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "account_link"
       ADD CONSTRAINT "uq_account_link_mercury" UNIQUE ("mercury_user_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "account_audit_log" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "eventType" varchar(50) NOT NULL,
        "mercury_user_id" varchar(255) NULL,
        "legacy_device_user_id" uuid NULL,
        "status" varchar(20) NOT NULL,
        "detail" text NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "ck_account_audit_log_status" CHECK ("status" IN ('success', 'failed'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_account_audit_log_subject" ON "account_audit_log" ("mercury_user_id", "createdAt" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "account_audit_log"`);
    await queryRunner.query(
      `ALTER TABLE "account_link" DROP CONSTRAINT IF EXISTS "uq_account_link_mercury"`,
    );
  }
}
