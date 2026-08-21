# Build context is the MONOREPO ROOT. See apps/api/Dockerfile for the same
# turbo prune pattern.
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS pruner
RUN npm install -g turbo@2
COPY . .
RUN turbo prune @repo/web --docker

FROM base AS builder
COPY --from=pruner /app/out/json/ .
RUN npm ci
COPY --from=pruner /app/out/full/ .

# Left empty on purpose: with no VITE_API_URL the client talks to its own origin
# (apps/web/src/lib/api.js -> "/api", src/lib/socket.js -> "/") and nginx proxies
# to the API replicas. Only set this if the API lives on another domain.
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npx turbo run build --filter=@repo/web

# ---- serve + load balance ----------------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/healthz || exit 1
