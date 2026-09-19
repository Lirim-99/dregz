# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run db:generate -w @dregz/api
RUN npm run build -w @dregz/api
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_URL=http://127.0.0.1:4000
ENV DOCKER_BUILD=1
RUN npm run build -w @dregz/web
RUN mkdir -p apps/web/.next/standalone/apps/web/.next \
  && cp -r apps/web/public apps/web/.next/standalone/apps/web/public \
  && cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATA_DIR=/data
ENV UPLOAD_DIR=/data/uploads
ENV DATABASE_URL=file:/data/dregz.db
ENV API_PORT=4000
ENV API_URL=http://127.0.0.1:4000
ENV PORT=3000
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /data/uploads

COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/apps/web/package.json ./apps/web/
COPY --from=build /app/apps/web/.next/standalone ./apps/web/.next/standalone
COPY --from=build /app/scripts ./scripts

# Drop source that isn't needed at runtime (keep prisma + dist)
RUN rm -rf apps/api/src apps/api/test apps/api/*.md

EXPOSE 3000
VOLUME ["/data"]
CMD ["node", "scripts/start-prod.mjs"]
