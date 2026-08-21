# Build context is the MONOREPO ROOT, not apps/api - the API needs @repo/db and
# the workspace lockfile. `turbo prune` carves out just the subtree this app
# needs, so a change in apps/web does not bust this image's layer cache.
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ---- prune: the @repo/api subtree + a pruned lockfile ------------------------
FROM base AS pruner
RUN npm install -g turbo@2
COPY . .
RUN turbo prune @repo/api --docker

# ---- install + build ---------------------------------------------------------
FROM base AS installer
# Manifests first: this layer only rebuilds when a package.json or the lockfile
# changes, not on every source edit.
COPY --from=pruner /app/out/json/ .
RUN npm ci
COPY --from=pruner /app/out/full/ .
# Builds @repo/db (prisma generate + tsc) before @repo/api, in dependency order.
RUN npx turbo run build --filter=@repo/api...

# ---- runtime -----------------------------------------------------------------
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=installer /app .

# UPLOADS_DIR and AUDIT_LOG_DIR point here in docker-compose.yml. Both are
# created in the image so the named volumes inherit node's ownership - a volume
# mounted onto a path the image does not have would land as root and the
# unprivileged process could not write to it.
RUN mkdir -p /data/uploads/videos /data/logs && chown -R node:node /data

USER node
EXPOSE 5001

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/api/dist/index.js"]
