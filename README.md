# 💩 Poo Diary

나의 배변 활동을 기록하고 건강을 관리하는 PWA 앱.

## 기술 스택

| 레이어    | 기술                                     |
| --------- | ---------------------------------------- |
| Frontend  | Next.js 15 (App Router) + React Query v5 |
| PWA       | next-pwa + Web App Manifest              |
| Backend   | NestJS 10 + Fastify                      |
| 공유 타입 | `@poo-diary/shared` (workspace 패키지)   |
| 모노레포  | pnpm workspaces + Turborepo              |
| 스타일    | Tailwind CSS                             |

## 프로젝트 구조

```
poo-diary/
├── apps/
│   ├── web/          # Next.js PWA (port 3000)
│   └── api/          # NestJS REST API (port 3001)
├── packages/
│   └── shared/       # 공유 타입/상수 (DiaryEntry, BristolType 등)
├── turbo.json
└── pnpm-workspace.yaml
```

## 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 개발 서버 (전체)

```bash
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Swagger: http://localhost:3001/api/docs

### 3. 개별 실행

```bash
# 웹만
pnpm --filter @poo-diary/web dev

# API만
pnpm --filter @poo-diary/api dev
```

## 주요 기능

- **배변 기록**: 브리스톨 척도(1~7), 색상, 통증 여부, 메모 입력
- **기록 목록**: 시간 역순 정렬, 빠른 열람
- **통계** (예정): 주간/월간 배변 패턴 차트
- **PWA**: 홈 화면 추가, 오프라인 지원

## 데이터 저장 (PostgreSQL + TypeORM)

**TypeORM `synchronize: true`** 로 앱 기동 시 자동 스키마 생성 (개발 환경).  
운영 환경에서는 `synchronize: false` 후 마이그레이션으로 관리하세요.

### 로컬 DB 실행 (Docker)

```bash
docker compose up -d
```

### 환경 변수 (`apps/api/.env`)

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=poo_diary
DB_SSL=false
```

## 브리스톨 대변 형태 척도

| 타입  | 설명                           |
| ----- | ------------------------------ |
| 1     | 딱딱한 덩어리 (심한 변비)      |
| 2     | 소시지형 (변비)                |
| 3     | 표면 갈라진 소시지형 (정상)    |
| **4** | **부드러운 소시지형 (이상적)** |
| 5     | 부드러운 덩어리 (약한 설사)    |
| 6     | 흐물흐물한 형태 (설사)         |
| 7     | 물처럼 완전한 액체 (심한 설사) |
