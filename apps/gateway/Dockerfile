FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@10.28.0

FROM base AS build
WORKDIR /usr/src/app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ ./apps/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm --filter gateway build

FROM base AS final
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=build /usr/src/app /usr/src/app

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/api/v1/tickers').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD [ "node", "apps/gateway/dist/index.js" ]
