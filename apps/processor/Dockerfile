FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /usr/src/app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ ./apps/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install

RUN pnpm -r --filter processor run build

FROM base AS final
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/apps/processor/dist ./apps/processor/dist
COPY --from=build /usr/src/app/apps/processor/package.json ./apps/processor/
COPY --from=build /usr/src/app/apps/processor/node_modules ./apps/processor/node_modules
COPY --from=build /usr/src/app/pnpm-workspace.yaml pnpm-workspace.yaml
COPY --from=build /usr/src/app/package.json ./
COPY --from=build /usr/src/app/node_modules ./node_modules

CMD [ "node", "apps/processor/dist/index.js" ]
