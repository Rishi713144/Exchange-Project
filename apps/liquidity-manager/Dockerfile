FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /usr/src/app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ ./apps/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install

RUN pnpm --filter liquidity-manager build

FROM base AS final
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/apps/liquidity-manager/dist ./apps/liquidity-manager/dist
COPY --from=build /usr/src/app/apps/liquidity-manager/package.json ./apps/liquidity-manager/
COPY --from=build /usr/src/app/apps/liquidity-manager/node_modules ./apps/liquidity-manager/node_modules
COPY --from=build /usr/src/app/pnpm-workspace.yaml pnpm-workspace.yaml
COPY --from=build /usr/src/app/package.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules

CMD [ "node", "apps/liquidity-manager/dist/index.js" ]
