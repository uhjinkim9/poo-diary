import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

export type LinkStatus = "PENDING" | "LINKING" | "LINKED" | "FAILED";
export type MigrationStatus =
  | "NOT_STARTED"
  | "PENDING"
  | "COMPLETED"
  | "FAILED";

@Entity("legacy_device_user")
export class LegacyDeviceUserEntity {
  @PrimaryColumn({ type: "uuid" })
  id!: string;

  @Column({ type: "boolean", default: true })
  loginEnabled!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @Column({ type: "timestamptz", nullable: true })
  lastVerifiedAt!: Date | null;
}

@Entity("mercury_user")
export class MercuryUserEntity {
  @PrimaryColumn({ name: "mercury_user_id", type: "varchar", length: 255 })
  id!: string;

  @Column({ type: "varchar", length: 320, nullable: true })
  email!: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  displayName!: string | null;

  @Column({ type: "simple-json", default: "[]" })
  roles!: string[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}

@Entity("account_link")
@Index("uq_account_link_legacy", ["legacyDeviceUserId"], { unique: true })
@Index("uq_account_link_mercury", ["mercuryUserId"], { unique: true })
@Index("uq_account_link_pair", ["mercuryUserId", "legacyDeviceUserId"], {
  unique: true,
})
export class AccountLinkEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({
    name: "mercury_user_id",
    type: "varchar",
    length: 255,
    comment: "Keycloak의 변경 불가능한 sub claim",
  })
  mercuryUserId!: string;

  @Column({
    name: "legacy_device_user_id",
    type: "uuid",
    comment: "연결 전 푸다이어리 기기 사용자 ID",
  })
  legacyDeviceUserId!: string;

  @Column({
    name: "observed_email",
    type: "varchar",
    length: 320,
    nullable: true,
    comment: "연결 당시 표시·감사용 이메일이며 식별자로 사용하지 않음",
  })
  observedEmail!: string | null;

  @Column({ name: "link_status", type: "varchar", length: 20, default: "PENDING" })
  linkStatus!: LinkStatus;

  @ManyToOne(() => MercuryUserEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "mercury_user_id", referencedColumnName: "id" })
  mercuryUser!: MercuryUserEntity;

  @ManyToOne(() => LegacyDeviceUserEntity, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "legacy_device_user_id", referencedColumnName: "id" })
  legacyDeviceUser!: LegacyDeviceUserEntity;

  @Column({
    name: "migration_status",
    type: "varchar",
    length: 20,
    default: "NOT_STARTED",
  })
  migrationStatus!: MigrationStatus;

  @Column({ name: "linked_at", type: "timestamptz" })
  linkedAt!: Date;

  @Column({ name: "migrated_at", type: "timestamptz", nullable: true })
  migratedAt!: Date | null;

  @Column({ name: "last_verified_at", type: "timestamptz" })
  lastVerifiedAt!: Date;

  @Column({ name: "last_error", type: "varchar", length: 500, nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

@Entity("oidc_auth_transaction")
export class OidcAuthTransactionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 64 })
  stateHash!: string;

  @Column({ type: "varchar", length: 128 })
  nonce!: string;

  @Column({ type: "varchar", length: 128 })
  codeVerifier!: string;

  @Column({ type: "varchar", length: 500, default: "/profile" })
  returnTo!: string;

  @Column({ type: "uuid", nullable: true })
  legacyDeviceUserId!: string | null;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;
}

@Entity("app_session")
export class AppSessionEntity {
  @PrimaryColumn({ type: "varchar", length: 64 })
  idHash!: string;

  @Column({ name: "mercury_user_id", type: "varchar", length: 255 })
  mercuryUserId!: string;

  @ManyToOne(() => MercuryUserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "mercury_user_id", referencedColumnName: "id" })
  mercuryUser!: MercuryUserEntity;

  @Column({ type: "text" })
  accessTokenEncrypted!: string;

  @Column({ type: "text" })
  refreshTokenEncrypted!: string;

  @Column({ type: "text", nullable: true })
  idTokenEncrypted!: string | null;

  @Column({ type: "timestamptz" })
  accessTokenExpiresAt!: Date;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @Column({ type: "timestamptz" })
  lastSeenAt!: Date;
}

@Entity("account_audit_log")
export class AccountAuditLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 50 })
  eventType!: string;

  @Column({ name: "mercury_user_id", type: "varchar", length: 255, nullable: true })
  mercuryUserId!: string | null;

  @Column({ name: "legacy_device_user_id", type: "uuid", nullable: true })
  legacyDeviceUserId!: string | null;

  @Column({ type: "varchar", length: 20 })
  status!: "success" | "failed";

  @Column({ type: "simple-json", nullable: true })
  detail!: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
