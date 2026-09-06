import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddMercuryIdentity1725321600000 implements MigrationInterface {
  name = "AddMercuryIdentity1725321600000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "legacy_device_user" (
        "id" uuid PRIMARY KEY,
        "loginEnabled" boolean NOT NULL DEFAULT true,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "lastVerifiedAt" timestamptz NULL
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "mercury_user" (
        "mercury_user_id" varchar(255) PRIMARY KEY,
        "email" varchar(320) NULL,
        "displayName" varchar(200) NULL,
        "roles" text NOT NULL DEFAULT '[]',
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "account_link" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "mercury_user_id" varchar(255) NOT NULL REFERENCES "mercury_user"("mercury_user_id") ON DELETE RESTRICT,
        "legacy_device_user_id" uuid NOT NULL REFERENCES "legacy_device_user"("id") ON DELETE RESTRICT,
        "observed_email" varchar(320) NULL,
        "link_status" varchar(20) NOT NULL DEFAULT 'PENDING',
        "migration_status" varchar(20) NOT NULL DEFAULT 'NOT_STARTED',
        "linked_at" timestamptz NOT NULL,
        "migrated_at" timestamptz NULL,
        "last_verified_at" timestamptz NOT NULL,
        "last_error" varchar(500) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "uq_account_link_legacy" UNIQUE ("legacy_device_user_id"),
        CONSTRAINT "uq_account_link_pair" UNIQUE ("mercury_user_id", "legacy_device_user_id"),
        CONSTRAINT "ck_account_link_status" CHECK ("link_status" IN ('PENDING', 'LINKING', 'LINKED', 'FAILED')),
        CONSTRAINT "ck_account_migration_status" CHECK ("migration_status" IN ('NOT_STARTED', 'PENDING', 'COMPLETED', 'FAILED'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "oidc_auth_transaction" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "stateHash" varchar(64) NOT NULL,
        "nonce" varchar(128) NOT NULL,
        "codeVerifier" varchar(128) NOT NULL,
        "returnTo" varchar(500) NOT NULL DEFAULT '/profile',
        "legacyDeviceUserId" uuid NULL,
        "expiresAt" timestamptz NOT NULL
      )
    `);
    await queryRunner.query(
      `COMMENT ON COLUMN "account_link"."mercury_user_id" IS 'Keycloak의 변경 불가능한 sub claim'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "account_link"."legacy_device_user_id" IS '연결 전 푸다이어리 기기 사용자 ID'`,
    );
    await queryRunner.query(
      `COMMENT ON COLUMN "account_link"."observed_email" IS '표시 및 감사 용도이며 연결 식별자로 사용하지 않음'`,
    );
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "app_session" (
        "idHash" varchar(64) PRIMARY KEY,
        "mercury_user_id" varchar(255) NOT NULL REFERENCES "mercury_user"("mercury_user_id") ON DELETE CASCADE,
        "accessTokenEncrypted" text NOT NULL,
        "refreshTokenEncrypted" text NOT NULL,
        "idTokenEncrypted" text NULL,
        "accessTokenExpiresAt" timestamptz NOT NULL,
        "expiresAt" timestamptz NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "lastSeenAt" timestamptz NOT NULL
      )
    `);
    await queryRunner.query(
      `ALTER TABLE "diary_entry" ADD COLUMN IF NOT EXISTS "mercuryUserId" varchar(255) NULL`,
    );
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "diary_entry"
          ADD CONSTRAINT "fk_diary_entry_mercury_user"
          FOREIGN KEY ("mercuryUserId")
          REFERENCES "mercury_user"("mercury_user_id")
          ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(
      `ALTER TABLE "diary_entry" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "diary_entry" ALTER COLUMN "userId" DROP DEFAULT`,
    );
    await queryRunner.query(`
      INSERT INTO "legacy_device_user" ("id", "loginEnabled", "lastVerifiedAt")
      SELECT DISTINCT "userId"::uuid, true, now()
      FROM "diary_entry"
      WHERE "userId" IS NOT NULL
        AND "userId" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      ON CONFLICT ("id") DO NOTHING
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_diary_entry_mercury_user" ON "diary_entry" ("mercuryUserId", "recordedAt" DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_diary_entry_legacy_user" ON "diary_entry" ("userId", "recordedAt" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_diary_entry_mercury_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_diary_entry_legacy_user"`);
    await queryRunner.query(
      `ALTER TABLE "diary_entry" DROP CONSTRAINT IF EXISTS "fk_diary_entry_mercury_user"`,
    );
    await queryRunner.query(`ALTER TABLE "diary_entry" DROP COLUMN IF EXISTS "mercuryUserId"`);
    await queryRunner.query(
      `ALTER TABLE "diary_entry" ALTER COLUMN "userId" SET DEFAULT 'anonymous'`,
    );
    await queryRunner.query(`ALTER TABLE "diary_entry" ALTER COLUMN "userId" SET NOT NULL`);
    await queryRunner.query(`DROP TABLE IF EXISTS "app_session"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "oidc_auth_transaction"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "account_link"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mercury_user"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "legacy_device_user"`);
  }
}
