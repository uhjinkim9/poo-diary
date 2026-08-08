FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# ── 전체 의존성 설치 + 빌드 ──────────────────────────────
FROM base AS build
WORKDIR /app
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm --filter @poo-diary/api build
# pnpm deploy: 프로덕션 의존성만 추출한 독립 폴더 생성
RUN pnpm --filter @poo-diary/api --prod deploy /prod/api

# ── 프로덕션 이미지 ──────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /prod/api/node_modules ./node_modules
COPY --from=build /prod/api/dist ./dist

EXPOSE 3001
CMD ["node", "dist/main.js"]
