
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS build
WORKDIR /usr/src/app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ ./apps/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install

RUN pnpm --filter client-app build

FROM base AS final
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copy Next.js build output and necessary files
COPY --from=build /usr/src/app/apps/client-app/package.json ./apps/client-app/
COPY --from=build /usr/src/app/apps/client-app/.next ./apps/client-app/.next
COPY --from=build /usr/src/app/node_modules ./node_modules

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1
CMD [ "pnpm", "--filter", "client-app", "next", "start" ]
