FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /usr/src/app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/liquidity-manager/package.json ./apps/liquidity-manager/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

COPY apps/liquidity-manager ./apps/liquidity-manager
RUN pnpm --filter liquidity-manager build

FROM base AS final
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/apps/liquidity-manager/dist ./dist
COPY --from=build /usr/src/app/apps/liquidity-manager/package.json ./package.json
COPY --from=build /usr/src/app/node_modules ./node_modules

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3004/ || exit 1
CMD [ "node", "dist/index.js" ]
