FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.28.0

FROM base AS build
WORKDIR /usr/src/app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ ./apps/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter broadcaster build

FROM base AS final
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=build /usr/src/app /usr/src/app

EXPOSE 3001
CMD [ "node", "apps/broadcaster/dist/index.js" ]
