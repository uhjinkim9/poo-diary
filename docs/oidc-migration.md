# Mercury Lab OIDC 점진 전환

## 기존 구조 분석

- 브라우저가 `localStorage`의 `poo-user-id` UUID를 모든 API 요청의 `x-user-id` 헤더에 넣었다.
- 서버 사용자 Entity와 인증 Guard가 없었으며, 헤더 값이 있으면 곧바로 기록 소유자로 신뢰했다.
- 닉네임과 기기 ID는 각각 `poo-user-name`, `poo-user-id`로 로컬 저장소에 저장됐다.
- `diary_entry.userId`가 유일한 소유권 필드였고 외래키는 없었다.
- 쿠키 기반 세션, Access/Refresh Token 저장소, 중앙 계정 연결 정보가 없었다.

## 변경된 인증 경계

1. 기존 UUID는 `/api/auth/device-session`에서 서버 서명 HttpOnly 쿠키로 승격한다.
2. 미연결 사용자는 기존 `x-user-id` 호환 경로를 계속 사용할 수 있다.
3. OIDC는 Authorization Code + PKCE(S256)를 사용한다.
4. state, nonce, verifier는 10분 만료 서버 DB transaction에 보관한다.
5. callback 시 transaction 쿠키와 기존 서명 device 쿠키가 모두 일치할 때만 기존 데이터를 연결한다.
6. 브라우저에는 불투명 앱 세션 ID만 저장한다. OIDC 토큰은 서버 DB에 AES-256-GCM으로 암호화한다.
7. Access Token 만료 전 서버가 Refresh Token으로 갱신한다.
8. 명시적 로그아웃은 앱 세션 삭제 후 Keycloak RP-Initiated Logout으로 이어진다.

기존 로컬 UUID는 삭제하지 않는다. 연결 후에는 출처 추적 값으로 남지만 인증 수단으로는 거부된다.

## Keycloak 클라이언트 설정

- Client ID: `poo-diary-web`
- Standard flow: 활성화
- PKCE method: `S256`
- Valid redirect URI: `https://poo-diary.mercury-lab.uk/api/auth/callback/keycloak` 한 개를 정확히 등록
- Valid post logout redirect URI: `https://poo-diary.mercury-lab.uk`
- Web origin: `https://poo-diary.mercury-lab.uk`
- 요청 scope: `openid profile email roles mercury-api-audience`
- `mercury-api-audience` client scope의 Audience mapper가 Access Token `aud`에 `mercury-api`를 추가해야 한다.
- 사용자 키는 이메일이 아니라 변경되지 않는 `sub`이다.
- ID Token의 `email_verified=true`와 Access Token realm role의 `mercury-user` 또는 `mercury-admin`을 요구한다.

## 인증 endpoint

- `GET /api/auth/oidc/login`: 일반 OIDC 로그인 시작
- `GET /api/auth/callback/keycloak`: Keycloak callback
- `POST /api/auth/refresh`: HttpOnly 앱 세션 검증 및 필요 시 서버 refresh
- `POST /api/auth/logout`: 로컬 세션 삭제 후 Keycloak logout
- `GET /api/users/me`: 현재 legacy 또는 Mercury 사용자 조회
- `POST /api/auth/oidc/link-account`: 검증된 기기 세션으로 기존 계정 연결 시작
- `POST /api/auth/oidc/relink-account`: 임시 로컬 사용자가 없는 현재 모델에서는 안전한 409 반환
- `/auth/oidc/complete`: callback 후 Web 상태 복구 및 내부 return URL 이동

서버 BFF인 만큼 confidential client 사용을 권장한다. 이 경우 `OIDC_CLIENT_SECRET`을 Secret에 추가한다. public client로 운영해도 PKCE 검증은 적용된다.

## Kubernetes Secret

기존 DB Secret은 유지하고 별도 Secret을 만든다.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: poo-diary-oidc
  namespace: poo-diary
type: Opaque
stringData:
  MERCURY_IDENTITY_ACCOUNT_LINK_PATH: "/v1/service-accounts/link"
  MERCURY_IDENTITY_API_URL: "http://mercury-lab-identity-api.mercury-lab-identity.svc.cluster.local:3001"
  MERCURY_IDENTITY_CLIENT_ID: "poo-diary-api"
  MERCURY_IDENTITY_CLIENT_SECRET: "Keycloak service client secret"
  OIDC_CLIENT_ID: "poo-diary-web"
  OIDC_ISSUER: "https://accounts.mercury-lab.uk/realms/mercury"
  OIDC_POST_LOGOUT_REDIRECT_URI: "https://poo-diary.mercury-lab.uk/"
  OIDC_REDIRECT_URI: "https://poo-diary.mercury-lab.uk/api/auth/callback/keycloak"
  DEVICE_SESSION_SECRET: "충분히 긴 무작위 문자열"
  OIDC_SESSION_ENCRYPTION_KEY: "32바이트 키의 base64 값"
```

키 생성 예시:

```bash
openssl rand -base64 48
openssl rand -base64 32
```

`DEVICE_SESSION_SECRET`은 기존 device ID를 생성하는 값이 아니다. 기존 UUID는 계속 브라우저 `localStorage`에 보존되고, 이 Secret은 전환 이후 서버가 해당 UUID에 대해 발급하는 HttpOnly 디바이스 세션 쿠키의 위변조 방지 서명에만 사용한다. 운영에서는 한 번 생성한 값을 안정적으로 보관하고 임의로 교체하지 않는다.

- 미연결 사용자의 서명 쿠키가 만료되거나 Secret이 교체돼도 기존 UUID로 새 쿠키를 발급받을 수 있다.
- 이미 연결된 사용자는 Mercury 앱 세션을 사용하므로 device 쿠키에 의존하지 않는다.
- OIDC 연결 도중 Secret을 바꾸면 callback의 기존 기기 세션 검증이 실패하므로 배포 중 교체하지 않는다.

## 데이터 마이그레이션과 보호 장치

- migration은 기존 UUID 형식 `diary_entry.userId`를 `legacy_device_user`에 선등록한다.
- `account_link.legacy_device_user_id` unique 제약으로 한 기기 사용자가 여러 중앙 계정에 연결되지 않는다.
- `account_link.mercury_user_id` unique 제약으로 하나의 Mercury 계정이 여러 기존 사용자에 연결되지 않는다.
- `(mercury_user_id, legacy_device_user_id)` unique 제약으로 같은 연결이 중복 생성되지 않는다.
- 링크 생성, 기록의 `mercuryUserId` 설정, legacy 로그인 비활성화는 단일 DB transaction이다.
- 소유권 갱신은 `mercuryUserId IS NULL`인 행만 대상으로 하므로 재실행해도 안전하다.
- 기존 `userId`는 마이그레이션 후에도 삭제하거나 덮어쓰지 않는다.
- 연결 전 사용자는 계속 legacy 방식으로 기록을 조회하고 작성할 수 있다.
- 성공·실패·멱등 재확인은 `account_audit_log`에 증분 기록한다. DB unique violation 중 PostgreSQL `23505`만 충돌 응답으로 변환한다.

## 단계별 전환 정책

API 환경변수만 변경해 배포 단계를 조절할 수 있다.

- `OIDC_MIGRATION_MODE=off`: 다이얼로그를 표시하지 않는다.
- `OIDC_MIGRATION_MODE=prompt`: `나중에 하기`가 있는 비차단 안내를 표시한다.
- `OIDC_MIGRATION_MODE=required`: 충분한 전환 기간 이후 `나중에 하기`를 제거한다.
- `OIDC_REMINDER_DAYS=3`: 비차단 단계의 재안내 간격이다.

## 로그인 유지 시간

- `OIDC_APP_SESSION_DAYS=30`: 푸다이어리의 HttpOnly 세션 쿠키와 서버 세션 상한이다(허용 범위 1~90일).
- Keycloak Realm의 `SSO Session Idle`은 사용자가 다시 방문하기 전까지 허용할 비활성 시간보다 길게 설정한다. 자주 사용하는 개인 서비스라면 7일을 시작값으로 두고 운영 상황에 맞춰 조정할 수 있다.
- `SSO Session Max`와 Client Session Idle/Max도 앱 세션 상한과 모순되지 않게 확인한다. Keycloak 세션이 만료되거나 폐기되면 푸다이어리의 30일 앱 세션이 남아 있어도 재로그인이 필요하다.

기존 구현은 최초 토큰 응답의 `refresh_expires_in`을 앱 세션 만료 시각으로 고정했다. 이 값은 토큰 갱신 시 연장될 수 있으므로, 현재 구현은 앱 세션 상한을 별도로 유지하고 액세스 토큰 만료 시 Keycloak 갱신을 시도한다.

현재 Helm 기본값은 `prompt`, 3일이다. 미연결 legacy 세션에만 안내하며 중앙 앱 세션이 유효하면 OIDC 이동 없이 진입한다.

## 중앙 Identity 역방향 연결

OIDC callback은 앱 세션을 발급하기 전에 설정된 `MERCURY_IDENTITY_API_URL`의 `POST /v1/users/me/sync`를 사용자 Access Token으로 호출한다. URL이 비어 있거나 동기화가 실패하면 로컬 로그인 세션을 발급하지 않는다.

기존 계정 연결은 `poo-diary-api` confidential service client의 Client Credentials 토큰으로 `MERCURY_IDENTITY_ACCOUNT_LINK_PATH`를 호출한다. 요청은 `serviceCode=poo-diary`, 검증된 legacy ID, Mercury `sub`를 포함한다.

- payload: `serviceCode=poo-diary`, 검증된 `legacyUserId`, Mercury `sub`인 `userId`
- idempotency key: 로컬 `account_link.id`
- 같은 매핑 재요청은 성공으로 처리
- 외부 호출 전에 로컬 링크를 `LINKING/PENDING`으로 저장하고, 중앙 성공/로컬 실패 시 같은 멱등 키로 재시도
- 중앙에서 다른 매핑을 반환하는 경우에만 충돌 처리하고 기존 소유권은 변경하지 않음

## 권장 배포 순서

1. 운영 DB snapshot/backup을 생성한다.
2. Keycloak callback, logout URI, audience mapper를 먼저 설정한다.
3. `poo-diary-oidc` Secret을 생성한다.
4. API 한 개 replica로 migration을 먼저 실행하거나 배포 Job으로 migration을 수행한다.
5. API를 배포하고 `/api/auth/status`와 legacy 기록 조회를 확인한다.
6. Web을 배포해 계정 연결 CTA를 노출한다.
7. 연결 테스트 계정으로 기록 수, 링크 상태, 중앙 로그인 재접속을 확인한다.

현재 chart는 `DB_MIGRATIONS_RUN=true`이다. 여러 API replica가 동시에 시작되는 환경에서는 migration 전용 Job으로 분리한 후 이 값을 `false`로 바꾸는 것이 안전하다.

## 롤백 전략

### 연결 사용자가 아직 없는 경우

Web과 API 이미지를 이전 버전으로 되돌리고 migration의 `down`을 실행할 수 있다.

### 연결 또는 중앙 계정 신규 기록이 생성된 경우

스키마를 즉시 내리지 않는다. 먼저 다음 순서로 기능만 롤백한다.

1. Web에서 OIDC CTA와 자동 SSO를 비활성화한다.
2. API는 새 스키마를 유지한 채 legacy와 Mercury 읽기를 지원하는 현재 버전을 유지한다.
3. `account_link`, `diary_entry.userId`, `diary_entry.mercuryUserId`를 백업한다.
4. 중앙 계정으로 새로 생성되어 `userId IS NULL`인 기록에 대한 귀속 정책을 결정한다.
5. 필요한 경우 검증된 legacy ID로 데이터를 재귀속한 뒤에만 down migration을 수행한다.

연결 후 곧바로 down migration을 수행하면 중앙 계정으로 새로 작성된 기록에는 복원할 legacy ID가 없어질 수 있으므로 금지한다.
