import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import type { FastifyRequest } from "fastify";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify,
} from "crypto";
import type { JsonWebKey } from "crypto";
import { DataSource, Repository } from "typeorm";
import { DiaryEntryEntity } from "../diary/diary.entity";
import {
  AccountLinkEntity,
  AccountAuditLogEntity,
  AppSessionEntity,
  LegacyDeviceUserEntity,
  MercuryUserEntity,
  OidcAuthTransactionEntity,
} from "./auth.entities";
import type { AuthPrincipal } from "./auth.types";
import { createPkcePair, safeInternalPath } from "./auth.utils";
import { MercuryIdentityService } from "./mercury-identity.service";

interface OidcMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  end_session_endpoint: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  expires_in: number;
  refresh_expires_in?: number;
}

interface TokenClaims {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  preferred_username?: string;
  azp?: string;
  realm_access?: { roles?: string[] };
  resource_access?: Record<string, { roles?: string[] }>;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const DEVICE_TTL_SECONDS = 60 * 60 * 24 * 365;
const AUTH_TRANSACTION_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class AuthService {
  private metadataCache?: Promise<OidcMetadata>;
  private jwksCache?: { expiresAt: number; keys: JsonWebKey[] };

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly mercuryIdentity: MercuryIdentityService,
    @InjectRepository(LegacyDeviceUserEntity)
    private readonly legacyUsers: Repository<LegacyDeviceUserEntity>,
    @InjectRepository(MercuryUserEntity)
    private readonly mercuryUsers: Repository<MercuryUserEntity>,
    @InjectRepository(AccountLinkEntity)
    private readonly accountLinks: Repository<AccountLinkEntity>,
    @InjectRepository(AccountAuditLogEntity)
    private readonly auditLogs: Repository<AccountAuditLogEntity>,
    @InjectRepository(OidcAuthTransactionEntity)
    private readonly authTransactions: Repository<OidcAuthTransactionEntity>,
    @InjectRepository(AppSessionEntity)
    private readonly sessions: Repository<AppSessionEntity>,
  ) {}

  get cookieNames() {
    const secure = this.config.get<string>("NODE_ENV") === "production";
    return {
      secure,
      session: secure ? "__Host-poo_diary_session" : "poo_diary_session",
      device: secure ? "__Host-poo_diary_device" : "poo_diary_device",
      transaction: secure ? "__Host-poo_diary_oidc" : "poo_diary_oidc",
      ssoHint: "poo_diary_sso_hint",
      logout: "poo_diary_logout",
      attempt: "poo_diary_sso_attempt",
    };
  }

  private get issuer(): string {
    return this.config
      .get<string>(
        "OIDC_ISSUER",
        "https://accounts.mercury-lab.uk/realms/mercury",
      )
      .replace(/\/$/, "");
  }

  private get clientId(): string {
    return this.config.get<string>("OIDC_CLIENT_ID", "poo-diary-web");
  }

  private get appBaseUrl(): string {
    return this.config
      .get<string>("APP_BASE_URL", "http://localhost:3000")
      .replace(/\/$/, "");
  }

  private get callbackUrl(): string {
    return this.config.get<string>(
      "OIDC_REDIRECT_URI",
      `${this.appBaseUrl}/api/auth/callback/keycloak`,
    );
  }

  private get postLogoutRedirectUrl(): string {
    return this.config.get<string>(
      "OIDC_POST_LOGOUT_REDIRECT_URI",
      `${this.appBaseUrl}/`,
    );
  }

  private hash(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private randomUrlSafe(bytes = 32): string {
    return randomBytes(bytes).toString("base64url");
  }

  private cookie(
    name: string,
    value: string,
    options: { maxAge?: number; httpOnly?: boolean } = {},
  ): string {
    const parts = [
      `${name}=${encodeURIComponent(value)}`,
      "Path=/",
      "SameSite=Lax",
    ];
    if (options.httpOnly !== false) parts.push("HttpOnly");
    if (this.cookieNames.secure) parts.push("Secure");
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    return parts.join("; ");
  }

  clearCookie(name: string): string {
    return this.cookie(name, "", { maxAge: 0 });
  }

  parseCookies(request: FastifyRequest): Record<string, string> {
    const raw = request.headers.cookie ?? "";
    return Object.fromEntries(
      raw
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const index = part.indexOf("=");
          if (index <= 0) return ["", ""];
          let value = part.slice(index + 1);
          try {
            value = decodeURIComponent(value);
          } catch {
            // 잘못 인코딩된 쿠키는 원문으로 두고 각 검증 단계에서 거부한다.
          }
          return [part.slice(0, index), value];
        })
        .filter(([name]) => Boolean(name)),
    );
  }

  private deviceSecret(): string {
    const value = this.config.get<string>("DEVICE_SESSION_SECRET");
    if (!value || value.length < 32) {
      throw new ServiceUnavailableException(
        "DEVICE_SESSION_SECRET must contain at least 32 characters",
      );
    }
    return value;
  }

  private encryptionKey(): Buffer {
    const encoded = this.config.get<string>("OIDC_SESSION_ENCRYPTION_KEY");
    if (!encoded) {
      throw new ServiceUnavailableException(
        "OIDC_SESSION_ENCRYPTION_KEY is required",
      );
    }
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32) {
      throw new ServiceUnavailableException(
        "OIDC_SESSION_ENCRYPTION_KEY must be a base64-encoded 32-byte key",
      );
    }
    return key;
  }

  private encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    return [iv, cipher.getAuthTag(), ciphertext]
      .map((part) => part.toString("base64url"))
      .join(".");
  }

  private decrypt(value: string): string {
    const [iv, tag, ciphertext] = value
      .split(".")
      .map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", this.encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
  }

  private signDeviceSession(deviceUserId: string): string {
    const payload = Buffer.from(
      JSON.stringify({
        deviceUserId,
        exp: Math.floor(Date.now() / 1000) + DEVICE_TTL_SECONDS,
      }),
    ).toString("base64url");
    const signature = createHmac("sha256", this.deviceSecret())
      .update(payload)
      .digest("base64url");
    return `${payload}.${signature}`;
  }

  private verifyDeviceSession(token?: string): string | null {
    if (!token) return null;
    const [payload, suppliedSignature] = token.split(".");
    if (!payload || !suppliedSignature) return null;
    const expected = createHmac("sha256", this.deviceSecret())
      .update(payload)
      .digest();
    const supplied = Buffer.from(suppliedSignature, "base64url");
    if (
      expected.length !== supplied.length ||
      !timingSafeEqual(expected, supplied)
    ) {
      return null;
    }
    try {
      const parsed = JSON.parse(
        Buffer.from(payload, "base64url").toString("utf8"),
      ) as {
        deviceUserId: string;
        exp: number;
      };
      return parsed.exp > Date.now() / 1000 ? parsed.deviceUserId : null;
    } catch {
      return null;
    }
  }

  async establishDeviceSession(deviceUserId: string): Promise<string> {
    const linked = await this.accountLinks.findOne({
      where: { legacyDeviceUserId: deviceUserId },
    });
    if (
      linked?.linkStatus === "LINKED" &&
      linked.migrationStatus === "COMPLETED"
    ) {
      throw new ConflictException(
        "이미 Mercury 계정으로 이전된 기기 사용자입니다.",
      );
    }
    await this.dataSource.query(
      `INSERT INTO "legacy_device_user" ("id", "loginEnabled", "lastVerifiedAt")
       VALUES ($1, true, now()) ON CONFLICT ("id") DO NOTHING`,
      [deviceUserId],
    );
    const legacy = await this.legacyUsers.findOne({
      where: { id: deviceUserId },
    });
    if (!legacy?.loginEnabled) throw new UnauthorizedException();
    legacy.lastVerifiedAt = new Date();
    await this.legacyUsers.save(legacy);
    return this.cookie(
      this.cookieNames.device,
      this.signDeviceSession(deviceUserId),
      {
        maxAge: DEVICE_TTL_SECONDS,
      },
    );
  }

  private async metadata(): Promise<OidcMetadata> {
    if (!this.metadataCache) {
      this.metadataCache = fetch(
        `${this.issuer}/.well-known/openid-configuration`,
      )
        .then(async (response) => {
          if (!response.ok)
            throw new Error(`OIDC discovery failed: ${response.status}`);
          return (await response.json()) as OidcMetadata;
        })
        .catch((error) => {
          this.metadataCache = undefined;
          throw error;
        });
    }
    return this.metadataCache;
  }

  private async jwks(): Promise<JsonWebKey[]> {
    if (this.jwksCache && this.jwksCache.expiresAt > Date.now()) {
      return this.jwksCache.keys;
    }
    const metadata = await this.metadata();
    const response = await fetch(metadata.jwks_uri);
    if (!response.ok)
      throw new UnauthorizedException("OIDC signing keys unavailable");
    const { keys } = (await response.json()) as { keys: JsonWebKey[] };
    this.jwksCache = { keys, expiresAt: Date.now() + 5 * 60 * 1000 };
    return keys;
  }

  private async verifyJwt(
    token: string,
    audience: string,
    expectedNonce?: string,
  ): Promise<TokenClaims> {
    const parts = token.split(".");
    if (parts.length !== 3)
      throw new UnauthorizedException("Malformed OIDC token");
    const header = JSON.parse(
      Buffer.from(parts[0], "base64url").toString("utf8"),
    ) as {
      alg?: string;
      kid?: string;
    };
    if (header.alg !== "RS256" || !header.kid) {
      throw new UnauthorizedException("Unsupported OIDC token algorithm");
    }
    const jwk = (await this.jwks()).find((key) => key.kid === header.kid);
    if (!jwk) {
      this.jwksCache = undefined;
      throw new UnauthorizedException("Unknown OIDC signing key");
    }
    const valid = verify(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      createPublicKey({ key: jwk, format: "jwk" }),
      Buffer.from(parts[2], "base64url"),
    );
    if (!valid) throw new UnauthorizedException("Invalid OIDC token signature");

    const claims = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    ) as TokenClaims;
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (claims.iss !== this.issuer)
      throw new UnauthorizedException(
        `OIDC token issuer is invalid (expected=${this.issuer}, actual=${claims.iss ?? "missing"})`,
      );
    if (!audiences.includes(audience))
      throw new UnauthorizedException(
        `OIDC token audience is invalid (expected=${audience}, actual=${audiences.filter(Boolean).join(",") || "missing"})`,
      );
    if (claims.exp <= Math.floor(Date.now() / 1000))
      throw new UnauthorizedException("OIDC token is expired");
    if (!claims.sub)
      throw new UnauthorizedException("OIDC token subject is missing");
    if (expectedNonce !== undefined && claims.nonce !== expectedNonce)
      throw new UnauthorizedException("OIDC token nonce is invalid");
    if (
      expectedNonce !== undefined &&
      audiences.length > 1 &&
      claims.azp !== audience
    ) {
      throw new UnauthorizedException("OIDC authorized party is invalid");
    }
    return claims;
  }

  private safeReturnTo(value?: string): string {
    return safeInternalPath(value);
  }

  async beginLogin(
    request: FastifyRequest,
    returnTo?: string,
    silent = false,
    fresh = false,
  ): Promise<{ location: string; cookies: string[] }> {
    const cookies = this.parseCookies(request);
    const legacyDeviceUserId = fresh
      ? null
      : this.verifyDeviceSession(cookies[this.cookieNames.device]);
    const state = this.randomUrlSafe();
    const { verifier, challenge } = createPkcePair();
    const nonce = this.randomUrlSafe();
    const transaction = await this.authTransactions.save(
      this.authTransactions.create({
        stateHash: this.hash(state),
        nonce,
        codeVerifier: verifier,
        returnTo: this.safeReturnTo(returnTo),
        legacyDeviceUserId,
        expiresAt: new Date(Date.now() + AUTH_TRANSACTION_TTL_MS),
      }),
    );
    const metadata = await this.metadata();
    const url = new URL(metadata.authorization_endpoint);
    url.searchParams.set("client_id", this.clientId);
    url.searchParams.set("redirect_uri", this.callbackUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      "openid profile email roles mercury-api-audience",
    );
    url.searchParams.set("state", state);
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    if (silent) url.searchParams.set("prompt", "none");
    return {
      location: url.toString(),
      cookies: [
        this.cookie(this.cookieNames.transaction, transaction.id, {
          maxAge: AUTH_TRANSACTION_TTL_MS / 1000,
        }),
        ...(silent
          ? [
              this.cookie(this.cookieNames.attempt, "1", {
                maxAge: 60,
                httpOnly: false,
              }),
            ]
          : []),
        ...(fresh ? [this.clearCookie(this.cookieNames.device)] : []),
      ],
    };
  }

  async beginAccountLink(
    request: FastifyRequest,
    returnTo?: string,
  ): Promise<{ location: string; cookies: string[] }> {
    const cookies = this.parseCookies(request);
    const deviceUserId = this.verifyDeviceSession(
      cookies[this.cookieNames.device],
    );
    if (!deviceUserId) {
      throw new UnauthorizedException("유효한 기존 기기 세션이 필요합니다.");
    }
    const legacy = await this.legacyUsers.findOne({
      where: { id: deviceUserId },
    });
    if (!legacy?.loginEnabled) {
      throw new ConflictException(
        "이미 연결되었거나 사용할 수 없는 기기 계정입니다.",
      );
    }
    return this.beginLogin(request, returnTo, false);
  }

  private async exchangeToken(params: URLSearchParams): Promise<TokenResponse> {
    const metadata = await this.metadata();
    params.set("client_id", this.clientId);
    const clientSecret = this.config.get<string>("OIDC_CLIENT_SECRET");
    if (clientSecret) params.set("client_secret", clientSecret);
    const response = await fetch(metadata.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params,
    });
    if (!response.ok) {
      throw new UnauthorizedException(
        `OIDC token exchange failed (${response.status})`,
      );
    }
    return (await response.json()) as TokenResponse;
  }

  private async syncMercuryUser(claims: TokenClaims): Promise<void> {
    await this.mercuryUsers.upsert(
      {
        id: claims.sub,
        email: claims.email ?? null,
        displayName: claims.name ?? claims.preferred_username ?? null,
        roles: [
          ...(claims.realm_access?.roles ?? []),
          ...(claims.resource_access?.[this.clientId]?.roles ?? []),
        ],
      },
      ["id"],
    );
  }

  private requirePlatformRole(claims: TokenClaims): void {
    const roles = claims.realm_access?.roles ?? [];
    if (
      !roles.some((role) => role === "mercury-user" || role === "mercury-admin")
    ) {
      throw new ForbiddenException("Mercury Lab 사용자 권한이 필요합니다.");
    }
  }

  private async linkLegacyUser(
    mercuryUserId: string,
    legacyDeviceUserId: string | null,
    observedEmail: string | null,
  ): Promise<void> {
    if (!legacyDeviceUserId) return;
    let linkId: string | undefined;
    try {
      const prepared = await this.dataSource.transaction(async (manager) => {
        const legacyRepo = manager.getRepository(LegacyDeviceUserEntity);
        const mercuryRepo = manager.getRepository(MercuryUserEntity);
        const linkRepo = manager.getRepository(AccountLinkEntity);
        const legacy = await legacyRepo.findOne({
          where: { id: legacyDeviceUserId },
          lock: { mode: "pessimistic_write" },
        });
        const mercury = await mercuryRepo.findOne({
          where: { id: mercuryUserId },
          lock: { mode: "pessimistic_write" },
        });
        if (!legacy || !mercury) {
          throw new UnauthorizedException("계정 소유권을 확인할 수 없습니다.");
        }
        const existingByLegacy = await linkRepo.findOne({
          where: { legacyDeviceUserId },
        });
        const existingByMercury = await linkRepo.findOne({
          where: { mercuryUserId },
        });
        if (
          (existingByLegacy &&
            existingByLegacy.mercuryUserId !== mercuryUserId) ||
          (existingByMercury &&
            existingByMercury.legacyDeviceUserId !== legacyDeviceUserId)
        ) {
          throw new ConflictException("이미 다른 계정과 연결되어 있습니다.");
        }
        const existing = existingByLegacy ?? existingByMercury;
        if (
          existing?.linkStatus === "LINKED" &&
          existing.migrationStatus === "COMPLETED"
        ) {
          return { id: existing.id, completed: true };
        }
        const now = new Date();
        const link = existing
          ? await linkRepo.save({
              ...existing,
              observedEmail,
              linkStatus: "LINKING",
              migrationStatus: "PENDING",
              lastVerifiedAt: now,
              lastError: null,
            })
          : await linkRepo.save(
              linkRepo.create({
                mercuryUserId,
                legacyDeviceUserId,
                observedEmail,
                linkStatus: "LINKING",
                migrationStatus: "PENDING",
                linkedAt: now,
                migratedAt: null,
                lastVerifiedAt: now,
                lastError: null,
              }),
            );
        return { id: link.id, completed: false };
      });

      const preparedLinkId = prepared.id;
      linkId = preparedLinkId;
      if (prepared.completed) return;

      await this.mercuryIdentity.linkExistingAccount(
        mercuryUserId,
        legacyDeviceUserId,
        preparedLinkId,
      );

      await this.dataSource.transaction(async (manager) => {
        const legacyRepo = manager.getRepository(LegacyDeviceUserEntity);
        const linkRepo = manager.getRepository(AccountLinkEntity);
        const auditRepo = manager.getRepository(AccountAuditLogEntity);
        const link = await linkRepo.findOne({
          where: { id: preparedLinkId },
          lock: { mode: "pessimistic_write" },
        });
        if (
          !link ||
          link.mercuryUserId !== mercuryUserId ||
          link.legacyDeviceUserId !== legacyDeviceUserId
        ) {
          throw new ConflictException("계정 연결 상태가 변경되었습니다.");
        }
        const now = new Date();
        await manager
          .createQueryBuilder()
          .update(DiaryEntryEntity)
          .set({ mercuryUserId })
          .where('"userId" = :legacyDeviceUserId', { legacyDeviceUserId })
          .andWhere('"mercuryUserId" IS NULL')
          .execute();
        await linkRepo.update(
          { id: link.id },
          {
            linkStatus: "LINKED",
            migrationStatus: "COMPLETED",
            migratedAt: now,
            lastVerifiedAt: now,
            lastError: null,
          },
        );
        await legacyRepo.update(
          { id: legacyDeviceUserId },
          { loginEnabled: false, lastVerifiedAt: now },
        );
        await auditRepo.save(
          auditRepo.create({
            eventType: "account_linked",
            mercuryUserId,
            legacyDeviceUserId,
            status: "success",
            detail: {
              migrationStatus: "COMPLETED",
              identityIdempotencyKey: link.id,
            },
          }),
        );
      });
    } catch (error) {
      if (linkId) {
        await this.accountLinks
          .update(
            { id: linkId },
            {
              linkStatus: "FAILED",
              migrationStatus: "PENDING",
              lastError: "identity_or_local_commit_failed",
            },
          )
          .catch(() => undefined);
      }
      await this.auditLogs
        .save(
          this.auditLogs.create({
            eventType: "account_link_failed",
            mercuryUserId,
            legacyDeviceUserId,
            status: "failed",
            detail: {
              reason:
                typeof error === "object" && error && "code" in error
                  ? String(error.code)
                  : "validation_failed",
            },
          }),
        )
        .catch(() => undefined);
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "23505"
      ) {
        throw new ConflictException("이미 다른 계정과 연결되어 있습니다.");
      }
      throw error;
    }
  }

  private async createSession(tokens: TokenResponse, claims: TokenClaims) {
    const rawId = this.randomUrlSafe(48);
    const now = Date.now();
    await this.sessions.save(
      this.sessions.create({
        idHash: this.hash(rawId),
        mercuryUserId: claims.sub,
        accessTokenEncrypted: this.encrypt(tokens.access_token),
        refreshTokenEncrypted: this.encrypt(tokens.refresh_token),
        idTokenEncrypted: tokens.id_token
          ? this.encrypt(tokens.id_token)
          : null,
        accessTokenExpiresAt: new Date(now + tokens.expires_in * 1000),
        expiresAt: new Date(
          now +
            Math.min(
              tokens.refresh_expires_in ?? SESSION_TTL_SECONDS,
              SESSION_TTL_SECONDS,
            ) *
              1000,
        ),
        lastSeenAt: new Date(now),
      }),
    );
    return rawId;
  }

  async completeLogin(
    request: FastifyRequest,
    code: string,
    state: string,
  ): Promise<{ location: string; cookies: string[] }> {
    const cookies = this.parseCookies(request);
    const transactionId = cookies[this.cookieNames.transaction];
    if (!transactionId)
      throw new BadRequestException("Missing OIDC transaction");
    const transaction = await this.authTransactions.findOne({
      where: { id: transactionId },
    });
    if (
      !transaction ||
      transaction.expiresAt.getTime() <= Date.now() ||
      this.hash(state) !== transaction.stateHash
    ) {
      throw new BadRequestException("Expired or invalid OIDC state");
    }
    await this.authTransactions.delete({ id: transaction.id });
    const tokens = await this.exchangeToken(
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.callbackUrl,
        code_verifier: transaction.codeVerifier,
      }),
    );
    if (!tokens.id_token || !tokens.refresh_token) {
      throw new UnauthorizedException(
        "OIDC response did not include required tokens",
      );
    }
    const idClaims = await this.verifyJwt(
      tokens.id_token,
      this.clientId,
      transaction.nonce,
    );
    const accessClaims = await this.verifyJwt(
      tokens.access_token,
      "mercury-api",
    );
    if (accessClaims.sub !== idClaims.sub) {
      throw new UnauthorizedException("OIDC token subjects do not match");
    }
    if (idClaims.email_verified !== true) {
      throw new UnauthorizedException(
        "이메일 인증이 완료된 Mercury 계정이 필요합니다.",
      );
    }
    this.requirePlatformRole(accessClaims);
    await this.mercuryIdentity.sync(tokens.access_token);
    await this.syncMercuryUser({
      ...idClaims,
      realm_access: accessClaims.realm_access,
      resource_access: accessClaims.resource_access,
    });

    const callbackDeviceId = this.verifyDeviceSession(
      cookies[this.cookieNames.device],
    );
    const verifiedLegacyId =
      callbackDeviceId && callbackDeviceId === transaction.legacyDeviceUserId
        ? callbackDeviceId
        : null;
    await this.linkLegacyUser(
      idClaims.sub,
      verifiedLegacyId,
      idClaims.email ?? null,
    );
    const sessionId = await this.createSession(tokens, idClaims);
    return {
      location: `/auth/oidc/complete?returnUrl=${encodeURIComponent(
        transaction.returnTo,
      )}`,
      cookies: [
        this.cookie(this.cookieNames.session, sessionId, {
          maxAge: SESSION_TTL_SECONDS,
        }),
        this.cookie(this.cookieNames.ssoHint, "1", {
          maxAge: DEVICE_TTL_SECONDS,
          httpOnly: false,
        }),
        this.clearCookie(this.cookieNames.transaction),
        this.clearCookie(this.cookieNames.attempt),
        ...(verifiedLegacyId
          ? [this.clearCookie(this.cookieNames.device)]
          : []),
      ],
    };
  }

  private refreshSession(idHash: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(AppSessionEntity);
      const session = await repo.findOne({
        where: { idHash },
        lock: { mode: "pessimistic_write" },
      });
      if (!session || session.expiresAt.getTime() <= Date.now()) return false;
      if (session.accessTokenExpiresAt.getTime() > Date.now() + 30_000)
        return true;
      try {
        const tokens = await this.exchangeToken(
          new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: this.decrypt(session.refreshTokenEncrypted),
          }),
        );
        const claims = await this.verifyJwt(tokens.access_token, "mercury-api");
        if (claims.sub !== session.mercuryUserId) return false;
        this.requirePlatformRole(claims);
        session.accessTokenEncrypted = this.encrypt(tokens.access_token);
        session.refreshTokenEncrypted = this.encrypt(tokens.refresh_token);
        if (tokens.id_token)
          session.idTokenEncrypted = this.encrypt(tokens.id_token);
        session.accessTokenExpiresAt = new Date(
          Date.now() + tokens.expires_in * 1000,
        );
        session.lastSeenAt = new Date();
        await repo.save(session);
        return true;
      } catch {
        await repo.delete({ idHash });
        return false;
      }
    });
  }

  async resolvePrincipal(
    request: FastifyRequest,
  ): Promise<AuthPrincipal | null> {
    const cookies = this.parseCookies(request);
    const rawSessionId = cookies[this.cookieNames.session];
    if (rawSessionId) {
      const session = await this.sessions.findOne({
        where: { idHash: this.hash(rawSessionId) },
      });
      if (session && session.expiresAt.getTime() > Date.now()) {
        if (
          session.accessTokenExpiresAt.getTime() > Date.now() + 30_000 ||
          (await this.refreshSession(session.idHash))
        ) {
          await this.sessions.update(
            { idHash: session.idHash },
            { lastSeenAt: new Date() },
          );
          return { kind: "mercury", mercuryUserId: session.mercuryUserId };
        }
      }
    }

    const signedDeviceId = this.verifyDeviceSession(
      cookies[this.cookieNames.device],
    );
    const headerDeviceId = request.headers["x-user-id"];
    const deviceUserId =
      signedDeviceId ??
      (typeof headerDeviceId === "string" &&
      /^[0-9a-f-]{36}$/i.test(headerDeviceId)
        ? headerDeviceId
        : null);
    if (!deviceUserId) return null;
    const link = await this.accountLinks.findOne({
      where: { legacyDeviceUserId: deviceUserId },
    });
    if (link?.linkStatus === "LINKED" && link.migrationStatus === "COMPLETED") {
      return null;
    }
    const legacy = await this.legacyUsers.findOne({
      where: { id: deviceUserId },
    });
    if (legacy && !legacy.loginEnabled) return null;
    return { kind: "legacy", legacyDeviceUserId: deviceUserId };
  }

  async status(request: FastifyRequest) {
    const principal = await this.resolvePrincipal(request);
    const cookies = this.parseCookies(request);
    const headerDeviceId = request.headers["x-user-id"];
    const deviceUserId =
      this.verifyDeviceSession(cookies[this.cookieNames.device]) ??
      (typeof headerDeviceId === "string" &&
      /^[0-9a-f-]{36}$/i.test(headerDeviceId)
        ? headerDeviceId
        : null);
    const deviceLink = deviceUserId
      ? await this.accountLinks.findOne({
          where: { legacyDeviceUserId: deviceUserId },
        })
      : null;
    const linkedDevice =
      deviceLink?.linkStatus === "LINKED" &&
      deviceLink.migrationStatus === "COMPLETED";
    return {
      authenticated: Boolean(principal),
      mode: principal?.kind ?? "none",
      mercuryUserId:
        principal?.kind === "mercury" ? principal.mercuryUserId : undefined,
      canLink: principal?.kind === "legacy",
      linkedDevice,
      migrationMode: this.config.get<string>("OIDC_MIGRATION_MODE", "prompt"),
      reminderDays: Math.max(
        1,
        this.config.get<number>("OIDC_REMINDER_DAYS", 3),
      ),
      shouldAttemptSso:
        !principal &&
        cookies[this.cookieNames.ssoHint] === "1" &&
        cookies[this.cookieNames.logout] !== "1" &&
        cookies[this.cookieNames.attempt] !== "1",
    };
  }

  async currentUser(request: FastifyRequest) {
    const principal = await this.resolvePrincipal(request);
    if (!principal) throw new UnauthorizedException("로그인이 필요합니다.");
    if (principal.kind === "legacy") {
      return {
        mode: "legacy" as const,
        localUserId: principal.legacyDeviceUserId,
      };
    }
    const user = await this.mercuryUsers.findOne({
      where: { id: principal.mercuryUserId },
    });
    if (!user)
      throw new UnauthorizedException("사용자 정보를 찾을 수 없습니다.");
    return {
      mode: "mercury" as const,
      sub: user.id,
      email: user.email,
      name: user.displayName,
      roles: user.roles,
    };
  }

  async logout(
    request: FastifyRequest,
  ): Promise<{ location: string; cookies: string[] }> {
    const cookies = this.parseCookies(request);
    const rawSessionId = cookies[this.cookieNames.session];
    let idTokenHint: string | undefined;
    if (rawSessionId) {
      try {
        const session = await this.sessions.findOne({
          where: { idHash: this.hash(rawSessionId) },
        });
        if (session) {
          try {
            if (session.idTokenEncrypted) {
              idTokenHint = this.decrypt(session.idTokenEncrypted);
            }
          } catch {
            idTokenHint = undefined;
          }
          await this.sessions.delete({ idHash: session.idHash });
        }
      } catch {
        idTokenHint = undefined;
      }
    }
    let location = this.postLogoutRedirectUrl;
    try {
      const metadata = await this.metadata();
      const logout = new URL(metadata.end_session_endpoint);
      logout.searchParams.set("client_id", this.clientId);
      logout.searchParams.set(
        "post_logout_redirect_uri",
        this.postLogoutRedirectUrl,
      );
      if (idTokenHint) logout.searchParams.set("id_token_hint", idTokenHint);
      location = logout.toString();
    } catch {
      // 로컬 세션 및 쿠키 삭제는 OIDC 서버 장애와 무관하게 완료한다.
    }
    return {
      location,
      cookies: [
        this.clearCookie(this.cookieNames.session),
        this.clearCookie(this.cookieNames.device),
        this.clearCookie(this.cookieNames.transaction),
        this.clearCookie(this.cookieNames.attempt),
        this.clearCookie(this.cookieNames.ssoHint),
        this.cookie(this.cookieNames.logout, "1", {
          maxAge: 300,
          httpOnly: false,
        }),
      ],
    };
  }
}
