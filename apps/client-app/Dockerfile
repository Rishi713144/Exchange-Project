
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
COPY --from=build /usr/src/app/apps/client-app/next.config.mjs ./apps/client-app/
COPY --from=build /usr/src/app/apps/client-app/.next ./apps/client-app/.next
COPY --from=build /usr/src/app/apps/client-app/node_modules ./apps/client-app/node_modules
COPY --from=build /usr/src/app/node_modules ./node_modules

WORKDIR /usr/src/app/apps/client-app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD [ "node", "node_modules/next/dist/bin/next", "start" ]
