# syntax=docker/dockerfile:1.21

FROM node:24.14.0-alpine AS base
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
#install curl for entrypoint script
ENV NODE_ENV=production

COPY --from=prepare /app/out/json/ .
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile

COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/backend/scripts ./apps/backend/scripts

# Copy and set up entrypoint script
COPY apps/backend/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
