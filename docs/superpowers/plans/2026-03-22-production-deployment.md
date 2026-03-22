# Production Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the Bens Seguros monorepo for production deployment on Vercel (frontend) + Hostinger VPS (backend with Docker Compose).

**Architecture:** Two Docker images (bens-server, bens-chat) built via multi-stage Dockerfiles, orchestrated by docker-compose.prod.yml with Nginx reverse proxy, Cloudflare SSL. CI/CD via GitHub Actions with quality gates, SHA-based tagging, and automatic rollback.

**Tech Stack:** Docker, Docker Compose, Nginx, GitHub Actions, Cloudflare, Prisma Migrate, pnpm monorepo, tsup

**Spec:** `docs/superpowers/specs/2026-03-22-production-deployment-design.md`

---

## File Map

### Files to Create

- `.dockerignore` — Exclude unnecessary files from Docker build context
- `scripts/backup.sh` — Automated PostgreSQL + MongoDB backup to R2
- `scripts/mongo-init-replica.sh` — MongoDB replica set initialization
- `nginx/prod.conf` — Production Nginx config with SSL and subdomains (keeps `nginx/default.conf` for dev)

### Files to Modify

- `apps/worker/tsup.config.ts` — Rename entry from `index` to `worker`
- `apps/chat-worker/tsup.config.ts` — Rename entry from `index` to `worker`
- `Dockerfile.server` — Build worker, copy both dists, add health check, fix Prisma paths
- `Dockerfile.chat` — Fix paths for new worker entry, add health check
- `docker-compose.prod.yml` — Full rewrite with health checks, auth, logging, resource limits
- `.github/workflows/deploy-server.yml` — Add quality gates, SHA tagging, Prisma migrate, rollback
- `.github/workflows/deploy-chat.yml` — Add quality gates, SHA tagging, rollback

### Files Unchanged

- `Dockerfile.server` deps/prod-deps stages — Package list is correct
- `apps/server/tsup.config.ts` — Entry `server` is already correct
- `apps/chat-server/tsup.config.ts` — Entry `index` is correct, compose already matches
- `.github/workflows/ci.yml` — PR validation unchanged
- `packages/db/prisma/schema.prisma` — Schema unchanged

---

## Task 1: Fix Worker tsup Entry Points

**Files:**

- Modify: `apps/worker/tsup.config.ts`
- Modify: `apps/chat-worker/tsup.config.ts`

**Why:** Current tsup outputs `dist/index.js` but docker-compose expects `dist/worker.js`. The server app uses `entry: { server: 'src/server.ts' }` which outputs `dist/server.js` — workers must follow same pattern.

- [ ] **Step 1: Update worker tsup config**

In `apps/worker/tsup.config.ts`, change entry from `{ index: 'src/index.ts' }` to `{ worker: 'src/index.ts' }`:

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { worker: 'src/index.ts' },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: ['@repo/core', '@repo/db', '@repo/env'],
  external: [
    'bullmq',
    'ioredis',
    '@prisma/client',
    'prisma',
    'pino',
    'tsyringe',
    'reflect-metadata',
    'zod',
  ],
})
```

- [ ] **Step 2: Update chat-worker tsup config**

In `apps/chat-worker/tsup.config.ts`, change entry from `{ index: 'src/index.ts' }` to `{ worker: 'src/index.ts' }`:

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { worker: 'src/index.ts' },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: ['@repo/db-chat', '@repo/env', '@repo/shared', '@repo/ai'],
  external: [
    'bullmq',
    'ioredis',
    'mongoose',
    'baileys',
    'pino',
    'zod',
    'reflect-metadata',
  ],
})
```

- [ ] **Step 3: Verify builds produce correct filenames**

```bash
cd /home/artur/projects
pnpm --filter worker build && ls -la apps/worker/dist/
pnpm --filter chat-worker build && ls -la apps/chat-worker/dist/
```

Expected: `dist/worker.js` and `dist/worker.js.map` in both apps. No `dist/index.js`.

- [ ] **Step 4: Update worker package.json start script**

Check `apps/worker/package.json` — if `start` script references `dist/index.js`, update to `dist/worker.js`. Same for `apps/chat-worker/package.json`.

- [ ] **Step 5: Commit**

```bash
git add apps/worker/tsup.config.ts apps/chat-worker/tsup.config.ts apps/worker/package.json apps/chat-worker/package.json
git commit -m "fix: rename worker tsup entries to output dist/worker.js"
```

---

## Task 2: Create .dockerignore

**Files:**

- Create: `.dockerignore`

**Why:** Without .dockerignore, Docker copies ~2GB of node_modules, .git, etc. into build context. With it, context drops to ~50MB, making builds 40x faster.

- [ ] **Step 1: Create .dockerignore**

```
node_modules
.git
.next
.turbo
.tsbuildinfo
dist
generated
e2e
baileys-sessions
_reference
.env
.env.*
.vscode
.superpowers
.code-review-graph
.playwright-mcp
*.md
qa-*.png
task*.png
```

Note: `*.md` excludes docs/README files. `pnpm-workspace.yaml` is `.yaml` so it's not affected.

- [ ] **Step 2: Verify Docker context size**

```bash
cd /home/artur/projects
docker build --no-cache --progress=plain -f Dockerfile.server . 2>&1 | head -5
```

Look for "transferring context" — should be <100MB, not >1GB.

- [ ] **Step 3: Commit**

```bash
git add .dockerignore
git commit -m "chore: add .dockerignore to reduce build context"
```

---

## Task 3: Rewrite Dockerfile.server

**Files:**

- Modify: `Dockerfile.server`

**Why:** Current Dockerfile only builds server app, never builds or copies worker. Also missing health check, and Prisma generated client path needs verification.

- [ ] **Step 1: Rewrite Dockerfile.server**

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# --- DEPS ---
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/shared/package.json packages/shared/
COPY packages/auth/package.json packages/auth/
COPY config/typescript-config/package.json config/typescript-config/
RUN pnpm install --frozen-lockfile

# --- BUILD ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY . .

# Prisma generate
RUN cd packages/db && pnpm exec prisma generate

# Build both apps
RUN cd apps/server && pnpm build
RUN cd apps/worker && pnpm build

# --- PRODUCTION DEPS ---
FROM base AS prod-deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/worker/package.json apps/worker/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile --prod

# --- RUNNER ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Production dependencies (includes @prisma/client with WASM engine)
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/server/node_modules ./apps/server/node_modules

# Prisma generated client (Prisma 7 uses WASM, no native .prisma binaries)
COPY --from=builder /app/packages/db/generated ./packages/db/generated
COPY --from=builder /app/packages/db/prisma ./prisma

# Bundled app code
COPY --from=builder /app/apps/server/dist ./server/dist
COPY --from=builder /app/apps/worker/dist ./worker/dist

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

EXPOSE 3001
CMD ["node", "server/dist/server.js"]
```

Key changes from current:

- Added worker build (`RUN cd apps/worker && pnpm build`)
- Added worker dist copy (`COPY ... ./worker/dist`)
- Changed server dist path from `./dist` to `./server/dist`
- Removed `node_modules/.prisma` copy (Prisma 7 uses WASM inside `@prisma/client`, no separate `.prisma` dir)
- Added `packages/db/generated` copy (custom Prisma output path)
- Added `HEALTHCHECK` with `start-period=30s`
- Removed separate worker `node_modules` copy (pnpm hoists deps to root, worker shares root `node_modules`)

- [ ] **Step 2: Build and verify the image**

```bash
cd /home/artur/projects
docker build -f Dockerfile.server -t bens-server:test .
```

Expected: Build succeeds. All 4 stages complete.

- [ ] **Step 3: Verify files exist in the image**

```bash
docker run --rm bens-server:test ls -la server/dist/
docker run --rm bens-server:test ls -la worker/dist/
docker run --rm bens-server:test ls -la node_modules/.prisma/ 2>/dev/null || echo "Check packages/db/generated instead"
docker run --rm bens-server:test ls -la packages/db/generated/ 2>/dev/null || echo "No generated dir"
```

Expected: `server/dist/server.js`, `worker/dist/worker.js` exist. At least one of the Prisma paths contains engine files.

- [ ] **Step 4: Test server starts (dry run)**

```bash
docker run --rm -e NODE_ENV=production -e DATABASE_URL=fake -e REDIS_URL=fake bens-server:test node -e "console.log('Module loads OK')"
```

This verifies the Node.js runtime works. Full startup requires databases.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile.server
git commit -m "fix: Dockerfile.server builds worker, fixes paths, adds health check"
```

---

## Task 4: Rewrite Dockerfile.chat

**Files:**

- Modify: `Dockerfile.chat`

**Why:** Chat worker entry point now outputs `worker.js` (Task 1). Need to update paths to match server pattern and add health check.

- [ ] **Step 1: Rewrite Dockerfile.chat**

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/chat-server/package.json apps/chat-server/
COPY apps/chat-worker/package.json apps/chat-worker/
COPY packages/db-chat/package.json packages/db-chat/
COPY packages/env/package.json packages/env/
COPY packages/shared/package.json packages/shared/
COPY packages/ai/package.json packages/ai/
COPY config/typescript-config/package.json config/typescript-config/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN cd apps/chat-server && pnpm build
RUN cd apps/chat-worker && pnpm build

FROM base AS prod-deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/chat-server/package.json apps/chat-server/
COPY apps/chat-worker/package.json apps/chat-worker/
RUN pnpm install --frozen-lockfile --prod

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/chat-server/dist ./chat-server/dist
COPY --from=builder /app/apps/chat-worker/dist ./chat-worker/dist

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3002/health || exit 1

EXPOSE 3002
CMD ["node", "chat-server/dist/index.js"]
```

Changes from current:

- Added `HEALTHCHECK` with `start-period=30s`
- Paths already match (chat-server/dist, chat-worker/dist) — no change needed there

- [ ] **Step 2: Build and verify**

```bash
docker build -f Dockerfile.chat -t bens-chat:test .
docker run --rm bens-chat:test ls -la chat-server/dist/
docker run --rm bens-chat:test ls -la chat-worker/dist/
```

Expected: `chat-server/dist/index.js` and `chat-worker/dist/worker.js` exist.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile.chat
git commit -m "fix: Dockerfile.chat adds health check with start-period"
```

---

## Task 5: Rewrite docker-compose.prod.yml

**Files:**

- Modify: `docker-compose.prod.yml`

**Why:** Current compose has wrong commands, no health checks, no MongoDB auth, no resource limits, no log rotation. Full rewrite per spec.

- [ ] **Step 1: Rewrite docker-compose.prod.yml**

```yaml
services:
  # --- REVERSE PROXY ---
  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      server:
        condition: service_healthy
      chat-server:
        condition: service_healthy
    restart: always
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
    deploy:
      resources:
        limits:
          memory: 128M

  # --- ERP API ---
  server:
    image: ${DOCKERHUB_USERNAME}/bens-server:${TAG:-latest}
    command: ['node', 'server/dist/server.js']
    env_file: .env
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:3001/health']
      interval: 30s
      timeout: 5s
      start_period: 30s
      retries: 3
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
    deploy:
      resources:
        limits:
          memory: 512M

  # --- ERP WORKER ---
  worker:
    image: ${DOCKERHUB_USERNAME}/bens-server:${TAG:-latest}
    command: ['node', 'worker/dist/worker.js']
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
    deploy:
      resources:
        limits:
          memory: 512M

  # --- CHAT API + SOCKET.IO ---
  chat-server:
    image: ${DOCKERHUB_USERNAME}/bens-chat:${TAG:-latest}
    command: ['node', 'chat-server/dist/index.js']
    env_file: .env
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:3002/health']
      interval: 30s
      timeout: 5s
      start_period: 30s
      retries: 3
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
    deploy:
      resources:
        limits:
          memory: 512M

  # --- CHAT WORKER ---
  chat-worker:
    image: ${DOCKERHUB_USERNAME}/bens-chat:${TAG:-latest}
    command: ['node', 'chat-worker/dist/worker.js']
    env_file: .env
    volumes:
      - baileys-sessions:/app/baileys-sessions
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: always
    logging:
      driver: json-file
      options:
        max-size: '10m'
        max-file: '3'
    deploy:
      resources:
        limits:
          memory: 512M

  # --- DATABASES ---
  postgres:
    image: postgres:18-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${DB_USER}']
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G

  mongodb:
    image: mongo:8
    command: ['--replSet', 'rs0', '--bind_ip_all', '--auth']
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodata:/data/db
      - ./scripts/mongo-init-replica.sh:/docker-entrypoint-initdb.d/init.sh:ro
    healthcheck:
      test:
        [
          'CMD',
          'mongosh',
          '-u',
          '${MONGO_USER}',
          '-p',
          '${MONGO_PASSWORD}',
          '--authenticationDatabase',
          'admin',
          '--eval',
          "db.adminCommand('ping')",
        ]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    deploy:
      resources:
        limits:
          memory: 1G

  redis:
    image: redis:8-alpine
    command:
      [
        'redis-server',
        '--requirepass',
        '${REDIS_PASSWORD}',
        '--maxmemory',
        '256mb',
        '--maxmemory-policy',
        'noeviction',
      ]
    volumes:
      - redisdata:/data
    healthcheck:
      test: ['CMD', 'redis-cli', '-a', '${REDIS_PASSWORD}', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    deploy:
      resources:
        limits:
          memory: 384M

volumes:
  pgdata:
  mongodata:
  redisdata:
  baileys-sessions:

networks:
  default:
    name: bens-network
```

- [ ] **Step 2: Validate compose syntax**

```bash
cd /home/artur/projects
docker compose -f docker-compose.prod.yml config --quiet
```

Expected: No errors. If `${TAG}` or other vars cause issues, that's expected (they come from .env at runtime).

- [ ] **Step 3: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "feat: rewrite docker-compose.prod.yml with health checks, auth, logging"
```

---

## Task 6: Create Production Nginx Config

**Files:**

- Create: `nginx/prod.conf`

**Why:** Current `nginx/default.conf` is for dev (HTTP only, `api.localhost`). Production needs SSL with Cloudflare origin certs and separate server blocks per subdomain. Keep dev config unchanged.

- [ ] **Step 1: Create nginx/prod.conf**

```nginx
# api.bensseg.com → ERP server
server {
    listen 443 ssl;
    server_name api.bensseg.com;

    ssl_certificate     /etc/nginx/certs/cloudflare-origin.pem;
    ssl_certificate_key /etc/nginx/certs/cloudflare-origin-key.pem;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    location / {
        proxy_pass http://server:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /bull-board {
        proxy_pass http://server:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# chat.bensseg.com → Chat server + Socket.IO
server {
    listen 443 ssl;
    server_name chat.bensseg.com;

    ssl_certificate     /etc/nginx/certs/cloudflare-origin.pem;
    ssl_certificate_key /etc/nginx/certs/cloudflare-origin-key.pem;

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    location / {
        proxy_pass http://chat-server:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO — WebSocket upgrade required
    location /socket.io/ {
        proxy_pass http://chat-server:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}

# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name api.bensseg.com chat.bensseg.com;
    return 301 https://$host$request_uri;
}
```

- [ ] **Step 2: Verify Nginx config syntax**

```bash
docker run --rm -v $(pwd)/nginx/prod.conf:/etc/nginx/conf.d/default.conf:ro nginx:alpine nginx -t
```

Expected: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

Note: SSL cert files won't exist during test, but `-t` only checks syntax not file existence. If it fails on missing certs, that's expected — verify only syntax errors.

- [ ] **Step 3: Commit**

```bash
git add nginx/prod.conf
git commit -m "feat: add production Nginx config with Cloudflare SSL and subdomains"
```

---

## Task 7: Create Helper Scripts

**Files:**

- Create: `scripts/backup.sh`
- Create: `scripts/mongo-init-replica.sh`

- [ ] **Step 1: Create scripts directory and backup script**

Create `scripts/backup.sh`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/bens-seguros/backups"
DATE=$(date +%Y-%m-%d_%H-%M)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

# Source env vars for credentials
source /opt/bens-seguros/.env

# PostgreSQL
docker compose -f /opt/bens-seguros/docker-compose.prod.yml \
  exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" \
  | gzip > "$BACKUP_DIR/postgres_${DATE}.sql.gz"

# Verify PostgreSQL backup is not empty
if [ ! -s "$BACKUP_DIR/postgres_${DATE}.sql.gz" ]; then
  echo "ERROR: PostgreSQL backup is empty!" >&2
  exit 1
fi

# MongoDB
docker compose -f /opt/bens-seguros/docker-compose.prod.yml \
  exec -T mongodb mongodump --archive \
  -u "$MONGO_USER" -p "$MONGO_PASSWORD" --authenticationDatabase admin \
  | gzip > "$BACKUP_DIR/mongo_${DATE}.archive.gz"

# Verify MongoDB backup is not empty
if [ ! -s "$BACKUP_DIR/mongo_${DATE}.archive.gz" ]; then
  echo "ERROR: MongoDB backup is empty!" >&2
  exit 1
fi

# Upload to Cloudflare R2
if command -v rclone &> /dev/null; then
  rclone copy "$BACKUP_DIR" r2:bens-backups/${DATE}/ || {
    echo "WARNING: R2 upload failed!" >&2
  }
fi

# Clean old local backups (only after successful backup)
find "$BACKUP_DIR" -type f -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completed: postgres + mongo"
```

- [ ] **Step 2: Create MongoDB replica set init script**

Create `scripts/mongo-init-replica.sh`:

```bash
#!/bin/bash
# This script runs inside the MongoDB container on first start
# It initializes the replica set required by Mongoose change streams

sleep 5

mongosh -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin <<EOF
try {
  rs.status();
  print("Replica set already initialized");
} catch (e) {
  rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }] });
  print("Replica set initialized successfully");
}
EOF
```

- [ ] **Step 3: Make scripts executable and commit**

```bash
chmod +x scripts/backup.sh scripts/mongo-init-replica.sh
git add scripts/
git commit -m "feat: add backup and MongoDB init scripts"
```

---

## Task 8: Rewrite CI/CD Workflows

**Files:**

- Modify: `.github/workflows/deploy-server.yml`
- Modify: `.github/workflows/deploy-chat.yml`

**Why:** Current workflows have no quality gates before deploy, no Prisma migrations, no health check verification, and no rollback mechanism.

- [ ] **Step 1: Rewrite deploy-server.yml**

```yaml
name: Deploy Server

on:
  push:
    branches: [main]
    paths:
      - 'apps/server/**'
      - 'apps/worker/**'
      - 'packages/core/**'
      - 'packages/db/**'
      - 'packages/auth/**'
      - 'packages/env/**'
      - 'packages/shared/**'
      - 'Dockerfile.server'
  workflow_dispatch:

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test

  build-and-push:
    needs: quality-gates
    runs-on: ubuntu-latest
    outputs:
      sha_short: ${{ steps.vars.outputs.sha_short }}
    steps:
      - uses: actions/checkout@v4
      - id: vars
        run: echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: Dockerfile.server
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/bens-server:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/bens-server:${{ steps.vars.outputs.sha_short }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/bens-seguros
            SHA_SHORT=${{ needs.build-and-push.outputs.sha_short }}

            # Save current running tag for rollback
            PREV_TAG=$(cat .current-tag 2>/dev/null || echo "none")

            # Pull new images using SHA tag
            export TAG=${SHA_SHORT}
            docker compose -f docker-compose.prod.yml pull server worker

            # Run database migrations
            docker compose -f docker-compose.prod.yml run --rm server \
              npx prisma migrate deploy --schema=./prisma/schema.prisma

            # Deploy with new images
            docker compose -f docker-compose.prod.yml up -d server worker

            # Wait for health checks (start_period=30s + margin)
            sleep 40

            # Verify server is healthy
            HEALTHY=$(docker compose -f docker-compose.prod.yml ps server --format json | grep -c '"healthy"' || true)
            if [ "$HEALTHY" -lt 1 ]; then
              echo "Health check failed! Rolling back to ${PREV_TAG}..."
              if [ "$PREV_TAG" != "none" ]; then
                export TAG=${PREV_TAG}
                docker compose -f docker-compose.prod.yml up -d server worker
              fi
              exit 1
            fi

            # Save successful tag for future rollbacks
            echo "${SHA_SHORT}" > .current-tag
            echo "Deploy successful! Tag: ${SHA_SHORT}"
```

- [ ] **Step 2: Rewrite deploy-chat.yml**

```yaml
name: Deploy Chat

on:
  push:
    branches: [main]
    paths:
      - 'apps/chat-server/**'
      - 'apps/chat-worker/**'
      - 'packages/db-chat/**'
      - 'packages/ai/**'
      - 'packages/env/**'
      - 'packages/shared/**'
      - 'Dockerfile.chat'
  workflow_dispatch:

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test

  build-and-push:
    needs: quality-gates
    runs-on: ubuntu-latest
    outputs:
      sha_short: ${{ steps.vars.outputs.sha_short }}
    steps:
      - uses: actions/checkout@v4
      - id: vars
        run: echo "sha_short=$(git rev-parse --short HEAD)" >> $GITHUB_OUTPUT
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: Dockerfile.chat
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/bens-chat:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/bens-chat:${{ steps.vars.outputs.sha_short }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/bens-seguros
            SHA_SHORT=${{ needs.build-and-push.outputs.sha_short }}

            PREV_TAG=$(cat .current-chat-tag 2>/dev/null || echo "none")

            export TAG=${SHA_SHORT}
            docker compose -f docker-compose.prod.yml pull chat-server chat-worker

            docker compose -f docker-compose.prod.yml up -d chat-server chat-worker

            sleep 40

            HEALTHY=$(docker compose -f docker-compose.prod.yml ps chat-server --format json | grep -c '"healthy"' || true)
            if [ "$HEALTHY" -lt 1 ]; then
              echo "Health check failed! Rolling back to ${PREV_TAG}..."
              if [ "$PREV_TAG" != "none" ]; then
                export TAG=${PREV_TAG}
                docker compose -f docker-compose.prod.yml up -d chat-server chat-worker
              fi
              exit 1
            fi

            echo "${SHA_SHORT}" > .current-chat-tag
            echo "Deploy successful! Tag: ${SHA_SHORT}"
```

- [ ] **Step 3: Validate YAML syntax**

```bash
cd /home/artur/projects
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-server.yml'))"
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-chat.yml'))"
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-server.yml .github/workflows/deploy-chat.yml
git commit -m "feat: CI/CD with quality gates, Prisma migrate, SHA rollback"
```

---

## Task 9: Create .env.example for Production

**Files:**

- Create: `.env.example.prod`

**Why:** Document all required production env vars with descriptions. This file is committed to git as reference — actual `.env` lives only on the VPS.

- [ ] **Step 1: Create .env.example.prod**

```bash
# ============================================
# Bens Seguros — Production Environment
# Copy to /opt/bens-seguros/.env on VPS
# Generate secrets with: openssl rand -base64 32
# ============================================

# === APP ===
NODE_ENV=production
FRONTEND_URL=https://app.bensseg.com
API_URL=https://api.bensseg.com
CHAT_SERVER_URL=https://chat.bensseg.com

# === DATABASES (hosts are Docker container names) ===
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
MONGODB_URL=mongodb://${MONGO_USER}:${MONGO_PASSWORD}@mongodb:27017/bens-chat?replicaSet=rs0&authSource=admin
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# === DATABASE CREDENTIALS ===
DB_USER=bens_prod
DB_PASSWORD=
DB_NAME=bens_seguros
MONGO_USER=bens_mongo
MONGO_PASSWORD=
REDIS_PASSWORD=

# === AUTH ===
AUTH_SECRET=
SOCKET_JWT_SECRET=

# === STORAGE (Cloudflare R2) ===
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=bens-seguros
R2_PUBLIC_URL=

# === DOCKER ===
DOCKERHUB_USERNAME=
TAG=latest

# === OPTIONAL (uncomment when ready) ===
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
# RESEND_API_KEY=
# SENTRY_DSN=
# ENCRYPTION_KEY=
# META_WHATSAPP_TOKEN=
# META_WHATSAPP_VERIFY_TOKEN=
# META_WHATSAPP_PHONE_NUMBER_ID=
```

- [ ] **Step 2: Commit**

```bash
git add .env.example.prod
git commit -m "docs: add production .env template"
```

---

## Task 10: Full Build Verification

**Why:** End-to-end verification that all changes work together before pushing.

- [ ] **Step 1: Run monorepo quality gates locally**

```bash
cd /home/artur/projects
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

All 4 must pass. If `pnpm build` fails for worker (due to entry rename), check that package.json start scripts were updated in Task 1.

- [ ] **Step 2: Build both Docker images**

```bash
docker build -f Dockerfile.server -t bens-server:verify .
docker build -f Dockerfile.chat -t bens-chat:verify .
```

Both must succeed.

- [ ] **Step 3: Verify Docker image contents**

```bash
# Server image
docker run --rm bens-server:verify ls server/dist/server.js
docker run --rm bens-server:verify ls worker/dist/worker.js

# Chat image
docker run --rm bens-chat:verify ls chat-server/dist/index.js
docker run --rm bens-chat:verify ls chat-worker/dist/worker.js
```

All 4 files must exist.

- [ ] **Step 4: Test compose config parses**

```bash
TAG=verify DOCKERHUB_USERNAME=test DB_USER=test DB_PASSWORD=test DB_NAME=test MONGO_USER=test MONGO_PASSWORD=test REDIS_PASSWORD=test docker compose -f docker-compose.prod.yml config --quiet
```

Expected: No errors.

- [ ] **Step 5: Clean up test images**

```bash
docker rmi bens-server:test bens-server:verify bens-chat:test bens-chat:verify 2>/dev/null || true
```

- [ ] **Step 6: Final commit (if any remaining changes)**

```bash
git status
# If any unstaged changes, add and commit appropriately
```

---

## Task 11: Baseline Prisma Migrations

**Files:**

- Create: `packages/db/prisma/migrations/` directory with baseline migration

**Why:** Project uses `prisma db push` in dev. Production needs `prisma migrate deploy`. Must create baseline migration that represents the current schema without modifying the database.

**IMPORTANT:** This task should run AFTER the production database is created and seeded. If the production database doesn't exist yet, run this task during first deploy. The steps here prepare the migration files locally.

- [ ] **Step 1: Generate baseline migration**

```bash
cd /home/artur/projects/packages/db
npx prisma migrate dev --name baseline --create-only
```

This creates the migration SQL file WITHOUT applying it. Review the generated SQL to ensure it matches the current schema.

- [ ] **Step 2: Verify migration file**

```bash
ls packages/db/prisma/migrations/
cat packages/db/prisma/migrations/*/migration.sql | head -50
```

Expected: A `YYYYMMDDHHMMSS_baseline/migration.sql` file with CREATE TABLE statements for all models.

- [ ] **Step 3: Commit**

```bash
git add packages/db/prisma/migrations/
git commit -m "feat: add Prisma baseline migration for production"
```

---

## Summary

| Task | Description                     | Files Changed                   | Risk   |
| ---- | ------------------------------- | ------------------------------- | ------ |
| 1    | Fix worker tsup entries         | 2 tsup configs + 2 package.json | Low    |
| 2    | Create .dockerignore            | 1 new file                      | None   |
| 3    | Rewrite Dockerfile.server       | 1 file                          | Medium |
| 4    | Rewrite Dockerfile.chat         | 1 file                          | Low    |
| 5    | Rewrite docker-compose.prod.yml | 1 file                          | Medium |
| 6    | Create prod Nginx config        | 1 new file                      | Low    |
| 7    | Create helper scripts           | 2 new files                     | None   |
| 8    | Rewrite CI/CD workflows         | 2 files                         | Medium |
| 9    | Create .env.example.prod        | 1 new file                      | None   |
| 10   | Full build verification         | 0 files (verification)          | None   |
| 11   | Baseline Prisma migrations      | 1 new dir                       | Medium |

**Execution order:** Tasks 1-9 can be done in order. Task 10 is verification. Task 11 depends on having a running PostgreSQL (can be done with local dev DB).

**Total files changed:** 8 modified + 5 created = 13 files
