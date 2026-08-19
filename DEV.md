# 개발 환경 실행 가이드

## 사전 요구사항

- Node.js 20+
- pnpm 9+
- Docker Desktop

## 1. 의존성 설치

```bash
pnpm install
```

## 2. 환경 변수 설정

```bash
cp apps/api/.env.example apps/api/.env
```

`apps/api/.env`를 열어 DB 정보 확인 (기본값으로도 동작):

```env
PORT=3001
WEB_URL=http://localhost:3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=poo_diary
DB_SSL=false
```

## 3. 데이터베이스 실행

Docker Desktop이 실행 중인 상태에서:

```bash
docker compose up -d postgres
```

## 4. 개발 서버 실행

```bash
pnpm dev
```

| 서비스             | URL                            |
| ------------------ | ------------------------------ |
| 웹 (Next.js)       | http://localhost:3000          |
| API (NestJS)       | http://localhost:3001          |
| API 문서 (Swagger) | http://localhost:3001/api/docs |

## 종료

```bash
docker compose down
```
