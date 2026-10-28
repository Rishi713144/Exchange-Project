FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /usr/src/app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ ./apps/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install

RUN pnpm -r --filter matching-engine run build

FROM base AS final
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/apps/matching-engine/dist ./apps/matching-engine/dist
COPY --from=build /usr/src/app/apps/matching-engine/package.json ./apps/matching-engine/
COPY --from=build /usr/src/app/apps/matching-engine/node_modules ./apps/matching-engine/node_modules
COPY --from=build /usr/src/app/pnpm-workspace.yaml pnpm-workspace.yaml
COPY --from=build /usr/src/app/package.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules

# Engine might use snapshots
VOLUME [ "/usr/src/app/snapshots" ]

CMD [ "sh", "-c", "WITH_SNAPSHOT=true node apps/matching-engine/dist/index.js" ]
