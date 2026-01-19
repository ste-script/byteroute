# syntax=docker/dockerfile:1.7

FROM node:24-alpine AS base
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

FROM base AS prepare
COPY . .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm dlx turbo@^2.7.5 prune @byteroute/backend --docker

FROM base AS build
COPY --from=prepare /app/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
RUN pnpm turbo run build --filter=@byteroute/backend...

FROM base AS runner
ENV NODE_ENV=production

COPY --from=prepare /app/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

EXPOSE 3000
CMD ["node", "apps/backend/dist/index.js"]
