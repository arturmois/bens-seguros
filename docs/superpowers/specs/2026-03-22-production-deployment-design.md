# Production Deployment Design — Bens Seguros

**Date:** 2026-03-22
**Status:** Approved
**Author:** Artur + Claude

---

## 1. Overview

Production deployment strategy for Bens Seguros multi-tenant SaaS ERP. Frontend on Vercel, backend on Hostinger VPS with Docker Compose orchestration, CI/CD via GitHub Actions + Docker Hub.

### Infrastructure Summary

| Component                  | Host       | Domain             |
| -------------------------- | ---------- | ------------------ |
| Frontend (Next.js)         | Vercel     | `app.bensseg.com`  |
| ERP API (Fastify)          | VPS Docker | `api.bensseg.com`  |
| Chat API + Socket.IO       | VPS Docker | `chat.bensseg.com` |
| PostgreSQL, MongoDB, Redis | VPS Docker | Internal only      |

### VPS Specs

- Hostinger KVM 2: 2 vCPU, 8GB RAM, 100GB NVMe, 8TB bandwidth
- Domain: `bensseg.com` (Hostinger)
- OS: Ubuntu 22.04+ (or Hostinger default)

---

## 2. Architecture Diagram

```
                    ┌──────────────┐
                    │  Cloudflare  │
                    │  DNS + Proxy │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     app.bensseg.com  api.bensseg.com  chat.bensseg.com
              │            │            │
              ▼            │            │
        ┌──────────┐       │            │
        │  Vercel  │       │            │
        │ (Next.js)│       │            │
        └──────────┘       ▼            ▼
                    ┌─────────────────────────┐
                    │    VPS Hostinger KVM 2   │
                    │  ┌───────────────────┐   │
                    │  │      Nginx        │   │
                    │  │  (reverse proxy)  │   │
                    │  └─────┬───────┬─────┘   │
                    │        │       │         │
                    │   :3001│  :3002│         │
                    │   ┌────┘  ┌────┘         │
                    │   ▼       ▼              │
                    │ ┌──────┐ ┌───────────┐   │
                    │ │server│ │chat-server│   │
                    │ └──┬───┘ └─────┬─────┘   │
                    │    │           │         │
                    │ ┌──┴───┐ ┌─────┴─────┐   │
                    │ │worker│ │chat-worker│   │
                    │ └──┬───┘ └─────┬─────┘   │
                    │    │           │         │
                    │    ▼           ▼         │
                    │ ┌───────┐ ┌───────┐ ┌───┐│
                    │ │Postgres│ │MongoDB│ │Redis││
                    │ │ :5432  │ │:27017 │ │:6379││
                    │ └───────┘ └───────┘ └───┘│
                    └─────────────────────────┘
```

**Port mapping (internal Docker network only):**

| Container   | Port           | Accessed by              |
| ----------- | -------------- | ------------------------ |
| nginx       | 80, 443 → host | Cloudflare               |
| server      | 3001           | nginx, worker            |
| worker      | — (no port)    | consumes Redis queues    |
| chat-server | 3002           | nginx                    |
| chat-worker | — (no port)    | consumes Redis queues    |
| postgres    | 5432           | server, worker           |
| mongodb     | 27017          | chat-server, chat-worker |
| redis       | 6379           | all 4 apps               |

Only Nginx exposes ports to host (80/443). All other containers communicate via Docker internal network.

---

## 3. Docker Images & Multi-stage Builds

### Image Strategy: 2 images, 4 containers

| Image             | Containers                | Registry   |
| ----------------- | ------------------------- | ---------- |
| `bens-server:tag` | server + worker           | Docker Hub |
| `bens-chat:tag`   | chat-server + chat-worker | Docker Hub |

### Multi-stage Build (4 stages)

```
Stage 1: base       → node:22-alpine + pnpm + corepack
Stage 2: deps       → pnpm install --frozen-lockfile (all deps)
Stage 3: builder    → pnpm build (tsup bundle) + prisma generate
Stage 4: runner     → node:22-alpine + dist/ + prod node_modules only
```

### Critical Fixes Required (from current Dockerfiles)

**Fix 1: Worker not built in Dockerfile.server**
Current Dockerfile only builds `apps/server`. Must add:

```dockerfile
RUN cd apps/worker && pnpm build
COPY --from=builder /app/apps/worker/dist ./worker/dist
```

**Fix 2: Entry point mismatch**
Workers tsup outputs `dist/index.js` but compose expects `dist/worker.js`. Fix tsup configs:

```typescript
// apps/worker/tsup.config.ts
entry: {
  worker: 'src/index.ts'
} // outputs dist/worker.js

// apps/chat-worker/tsup.config.ts
entry: {
  worker: 'src/index.ts'
} // outputs dist/worker.js
```

**Fix 3: Add .dockerignore**

```
node_modules
.git
.next
e2e
baileys-sessions
*.md
.env*
.vscode
.turbo
```

**Fix 4: Add health checks**

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1
```

### Package Bundling Strategy

Packages export source directly (no build step). tsup bundles them inline:

| Package       | Bundled by tsup (noExternal) | Notes                            |
| ------------- | ---------------------------- | -------------------------------- |
| @repo/core    | server, worker               | DDD use cases                    |
| @repo/db      | server, worker               | Includes Prisma client in bundle |
| @repo/auth    | server                       | Better Auth + CASL               |
| @repo/env     | all apps                     | t3-env validation                |
| @repo/shared  | server, chat-server          | DTOs, types                      |
| @repo/db-chat | chat-server, chat-worker     | Mongoose models                  |
| @repo/ai      | chat-worker                  | Vercel AI SDK                    |

External dependencies (from node_modules in runner):

- fastify, @fastify/\*, @prisma/client, prisma, bullmq, ioredis
- socket.io, @socket.io/\*, mongoose, baileys, pino, zod
- better-auth, @casl/\*, tsyringe, reflect-metadata

**Decision: Keep Prisma bundled (B3)**
Prisma client is bundled into server.js and worker index.js (~10MB duplication). Acceptable for now — optimize when needed.

### Final Dockerfile Structure

```
Dockerfile.server (2 apps, 1 image)
├── base:       node:22-alpine + pnpm
├── deps:       pnpm install --frozen-lockfile
├── builder:    prisma generate + build server + build worker
├── prod-deps:  pnpm install --frozen-lockfile --prod
└── runner:     server/dist/ + worker/dist/ + node_modules + prisma client
    ├── HEALTHCHECK: wget localhost:3001/health
    ├── CMD default: node server/dist/server.js
    └── CMD worker:  node worker/dist/worker.js (via compose override)

Dockerfile.chat (2 apps, 1 image)
├── base:       node:22-alpine + pnpm
├── deps:       pnpm install --frozen-lockfile
├── builder:    build chat-server + build chat-worker
├── prod-deps:  pnpm install --frozen-lockfile --prod
└── runner:     chat-server/dist/ + chat-worker/dist/ + node_modules
    ├── HEALTHCHECK: wget localhost:3002/health
    ├── CMD default: node chat-server/dist/index.js
    └── CMD worker:  node chat-worker/dist/worker.js (via compose override)
    └── VOLUME: /app/baileys-sessions (WhatsApp auth persistence)
```

---

## 4. Docker Compose Production

```yaml
services:
  # --- REVERSE PROXY ---
  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/certs:/etc/nginx/certs:ro
    depends_on:
      server: { condition: service_healthy }
      chat-server: { condition: service_healthy }
    restart: always
    deploy:
      resources:
        limits: { memory: 128M }

  # --- ERP API ---
  server:
    image: ${DOCKERHUB_USERNAME}/bens-server:${TAG:-latest}
    command: ['node', 'server/dist/server.js']
    env_file: .env
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:3001/health']
      interval: 30s
      timeout: 5s
      retries: 3
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    restart: always
    deploy:
      resources:
        limits: { memory: 512M }

  # --- ERP WORKER ---
  worker:
    image: ${DOCKERHUB_USERNAME}/bens-server:${TAG:-latest}
    command: ['node', 'worker/dist/worker.js']
    env_file: .env
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    restart: always
    deploy:
      resources:
        limits: { memory: 512M }

  # --- CHAT API + SOCKET.IO ---
  chat-server:
    image: ${DOCKERHUB_USERNAME}/bens-chat:${TAG:-latest}
    command: ['node', 'chat-server/dist/index.js']
    env_file: .env
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://localhost:3002/health']
      interval: 30s
      timeout: 5s
      retries: 3
    depends_on:
      mongodb: { condition: service_healthy }
      redis: { condition: service_healthy }
    restart: always
    deploy:
      resources:
        limits: { memory: 512M }

  # --- CHAT WORKER ---
  chat-worker:
    image: ${DOCKERHUB_USERNAME}/bens-chat:${TAG:-latest}
    command: ['node', 'chat-worker/dist/worker.js']
    env_file: .env
    volumes:
      - baileys-sessions:/app/baileys-sessions
    depends_on:
      mongodb: { condition: service_healthy }
      redis: { condition: service_healthy }
    restart: always
    deploy:
      resources:
        limits: { memory: 512M }

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
        limits: { memory: 1G }

  mongodb:
    image: mongo:8
    command: ['--replSet', 'rs0', '--bind_ip_all']
    volumes:
      - mongodata:/data/db
      - ./scripts/mongo-init-replica.sh:/docker-entrypoint-initdb.d/init.sh:ro
    healthcheck:
      test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: always
    deploy:
      resources:
        limits: { memory: 1G }

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
        'allkeys-lru',
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
        limits: { memory: 384M }

volumes:
  pgdata:
  mongodata:
  redisdata:
  baileys-sessions:

networks:
  default:
    name: bens-network
```

### RAM Distribution (8GB total)

| Container        | Limit      | Estimated real usage |
| ---------------- | ---------- | -------------------- |
| OS + Docker      | —          | ~500MB               |
| nginx            | 128MB      | ~20MB                |
| server           | 512MB      | ~150MB               |
| worker           | 512MB      | ~100MB               |
| chat-server      | 512MB      | ~150MB               |
| chat-worker      | 512MB      | ~150MB               |
| postgres         | 1GB        | ~300MB               |
| mongodb          | 1GB        | ~400MB               |
| redis            | 384MB      | ~50MB                |
| **Total limits** | **4.5GB**  | **~1.8GB real**      |
| **Free**         | **~3.5GB** | **~6.2GB real**      |

---

## 5. Nginx & Cloudflare SSL

### Cloudflare Configuration

- **SSL/TLS mode:** Full (Strict)
- **Origin Certificate:** Generate in Cloudflare dashboard (15-year validity)
- **WebSockets:** Enabled (required for Socket.IO)

**DNS Records:**

| Type  | Name   | Target                 | Proxy       |
| ----- | ------ | ---------------------- | ----------- |
| A     | `api`  | VPS IP                 | ON (orange) |
| A     | `chat` | VPS IP                 | ON (orange) |
| CNAME | `app`  | `cname.vercel-dns.com` | OFF (gray)  |

`app.bensseg.com` proxy OFF because Vercel manages its own TLS.

### Nginx Configuration

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
    }
}

# chat.bensseg.com → Chat server + Socket.IO
server {
    listen 443 ssl;
    server_name chat.bensseg.com;

    ssl_certificate     /etc/nginx/certs/cloudflare-origin.pem;
    ssl_certificate_key /etc/nginx/certs/cloudflare-origin-key.pem;

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

### Cloudflare Setup Tutorial (Step-by-step)

**Step 1: Add site to Cloudflare**

1. Go to https://dash.cloudflare.com → "Add a site"
2. Enter `bensseg.com`
3. Select Free plan
4. Cloudflare will scan existing DNS records

**Step 2: Change nameservers at Hostinger**

1. Cloudflare shows 2 nameservers (e.g., `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
2. Go to Hostinger → Domains → `bensseg.com` → DNS/Nameservers
3. Change nameservers to the Cloudflare ones
4. Wait 1-24h for propagation

**Step 3: Configure DNS records**

1. In Cloudflare DNS → Add records:
   - Type: A | Name: `api` | Content: `<VPS_IP>` | Proxy: ON
   - Type: A | Name: `chat` | Content: `<VPS_IP>` | Proxy: ON
   - Type: CNAME | Name: `app` | Content: `cname.vercel-dns.com` | Proxy: OFF

**Step 4: Set SSL mode**

1. Cloudflare → SSL/TLS → Overview
2. Set mode to "Full (Strict)"

**Step 5: Generate Origin Certificate**

1. Cloudflare → SSL/TLS → Origin Server
2. Click "Create Certificate"
3. Keep defaults (RSA 2048, 15 years, covers `*.bensseg.com` and `bensseg.com`)
4. Copy certificate → save as `cloudflare-origin.pem`
5. Copy private key → save as `cloudflare-origin-key.pem`
6. Upload both to VPS: `/opt/bens-seguros/nginx/certs/`

**Step 6: Enable WebSockets**

1. Cloudflare → Network
2. Toggle "WebSockets" ON

**Step 7: Recommended Cloudflare settings**

1. SSL/TLS → Edge Certificates → "Always Use HTTPS" ON
2. SSL/TLS → Edge Certificates → "Minimum TLS Version" → TLS 1.2
3. Speed → Optimization → "Auto Minify" → check JS, CSS, HTML
4. Security → Settings → "Security Level" → Medium
5. Caching → Configuration → "Browser Cache TTL" → 4 hours

---

## 6. CI/CD Pipeline (GitHub Actions)

### Workflow Triggers

```
Push to main
    ├── paths: apps/server/**, apps/worker/**, packages/core/**,
    │          packages/db/**, packages/auth/**, packages/env/**,
    │          packages/shared/**, Dockerfile.server
    │   └──→ deploy-server.yml
    │
    ├── paths: apps/chat-server/**, apps/chat-worker/**, packages/db-chat/**,
    │          packages/ai/**, packages/env/**, packages/shared/**,
    │          Dockerfile.chat
    │   └──→ deploy-chat.yml
    │
    └── paths: apps/web/**
        └──→ Vercel auto-deploy (no workflow needed)
```

### deploy-server.yml

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

jobs:
  build-and-push:
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

            # Pull new images
            docker compose -f docker-compose.prod.yml pull server worker

            # Run database migrations
            docker compose -f docker-compose.prod.yml run --rm server \
              npx prisma migrate deploy --schema=./prisma/schema.prisma

            # Deploy with new images
            docker compose -f docker-compose.prod.yml up -d server worker

            # Wait for health checks
            sleep 15

            # Verify containers are healthy
            HEALTHY=$(docker compose -f docker-compose.prod.yml ps --format json | grep -c '"healthy"')
            if [ "$HEALTHY" -lt 1 ]; then
              echo "Health check failed! Rolling back..."
              docker compose -f docker-compose.prod.yml up -d \
                --pull=never server worker
              exit 1
            fi

            echo "Deploy successful!"
```

### deploy-chat.yml

Same pattern as deploy-server, without Prisma migrate step. Triggers on chat-related paths.

### GitHub Secrets Required

| Secret               | Value                   |
| -------------------- | ----------------------- |
| `DOCKERHUB_USERNAME` | Docker Hub username     |
| `DOCKERHUB_TOKEN`    | Docker Hub access token |
| `VPS_HOST`           | VPS IP address          |
| `VPS_USER`           | SSH user (`deploy`)     |
| `VPS_SSH_KEY`        | Ed25519 private key     |

---

## 7. Database Migrations & Backup

### Prisma Migration Strategy

**Transition from `db push` to `migrate`:**

```bash
# 1. Generate baseline (snapshot of current schema)
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > baseline.sql

# 2. Create first migration
npx prisma migrate dev --name baseline

# 3. Mark as applied on production database (baselining)
npx prisma migrate resolve --applied "YYYYMMDD_baseline"

# 4. From now on, all changes via:
npx prisma migrate dev --name description   # local
npx prisma migrate deploy                    # production (via CI)
```

**Production flow (in CI):**

```bash
docker compose run --rm server npx prisma migrate deploy
```

Runs BEFORE `docker compose up -d`. If migration fails, deploy stops — old containers keep running.

**MongoDB:** No migrations needed. Mongoose is schema-on-write.

### Backup Strategy

**Script: `/opt/bens-seguros/scripts/backup.sh`**

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/opt/bens-seguros/backups"
DATE=$(date +%Y-%m-%d_%H-%M)
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

# PostgreSQL
docker compose -f /opt/bens-seguros/docker-compose.prod.yml \
  exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" \
  | gzip > "$BACKUP_DIR/postgres_${DATE}.sql.gz"

# MongoDB
docker compose -f /opt/bens-seguros/docker-compose.prod.yml \
  exec -T mongodb mongodump --archive \
  | gzip > "$BACKUP_DIR/mongo_${DATE}.archive.gz"

# Upload to Cloudflare R2
if command -v rclone &> /dev/null; then
  rclone copy "$BACKUP_DIR" r2:bens-backups/${DATE}/
fi

# Clean old local backups
find "$BACKUP_DIR" -type f -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completed: postgres + mongo"
```

**Cron schedule:**

```cron
0 3 * * * /opt/bens-seguros/scripts/backup.sh >> /var/log/bens-backup.log 2>&1
```

**Retention:**

| Location                         | Retention | Purpose           |
| -------------------------------- | --------- | ----------------- |
| VPS `/opt/bens-seguros/backups/` | 7 days    | Fast restore      |
| Cloudflare R2 `bens-backups/`    | 30 days   | Disaster recovery |

**Restore commands:**

```bash
# PostgreSQL
gunzip -c postgres_YYYY-MM-DD.sql.gz | \
  docker compose exec -T postgres psql -U $DB_USER $DB_NAME

# MongoDB
gunzip -c mongo_YYYY-MM-DD.archive.gz | \
  docker compose exec -T mongodb mongorestore --archive
```

---

## 8. Environment & Secrets Management

### VPS .env file (`/opt/bens-seguros/.env`)

```bash
# === APP ===
NODE_ENV=production
FRONTEND_URL=https://app.bensseg.com
API_URL=https://api.bensseg.com
CHAT_SERVER_URL=https://chat.bensseg.com

# === DATABASES ===
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
MONGODB_URL=mongodb://mongodb:27017/bens-chat?replicaSet=rs0
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379

# === DATABASE CREDENTIALS ===
DB_USER=bens_prod
DB_PASSWORD=<generated-strong-password>
DB_NAME=bens_seguros
REDIS_PASSWORD=<generated-strong-password>

# === AUTH ===
AUTH_SECRET=<min-32-chars-generated>
SOCKET_JWT_SECRET=<min-16-chars-generated>
BETTER_AUTH_URL=https://api.bensseg.com

# === STORAGE (Cloudflare R2) ===
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=<account-id>
R2_ACCESS_KEY_ID=<access-key>
R2_SECRET_ACCESS_KEY=<secret-key>
R2_BUCKET_NAME=bens-seguros
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# === DOCKER ===
DOCKERHUB_USERNAME=<username>
TAG=latest

# === OPTIONAL ===
# ANTHROPIC_API_KEY=sk-ant-...
# OPENAI_API_KEY=sk-...
# RESEND_API_KEY=re_...
# SENTRY_DSN=https://...@sentry.io/...
# ENCRYPTION_KEY=<min-32-chars>
```

**Security:**

- Database hosts are Docker container names (`postgres`, `mongodb`, `redis`) — not `localhost`
- Passwords generated with: `openssl rand -base64 32`
- `.env` never goes to git
- Permissions: `chmod 600 .env`

### GitHub Actions Secrets (CI only)

| Secret               | Usage               |
| -------------------- | ------------------- |
| `DOCKERHUB_USERNAME` | Docker Hub login    |
| `DOCKERHUB_TOKEN`    | Docker Hub auth     |
| `VPS_HOST`           | VPS IP for SSH      |
| `VPS_USER`           | SSH user (`deploy`) |
| `VPS_SSH_KEY`        | Ed25519 private key |

Never put database passwords, AUTH_SECRET, or API keys in GitHub Secrets. Those stay only in VPS `.env`.

### Vercel Environment Variables

| Variable                      | Value                      | Scope      |
| ----------------------------- | -------------------------- | ---------- |
| `NEXT_PUBLIC_API_URL`         | `https://api.bensseg.com`  | Production |
| `NEXT_PUBLIC_CHAT_SERVER_URL` | `https://chat.bensseg.com` | Production |

### VPS Security Setup

```bash
# Dedicated deploy user (not root)
adduser deploy --disabled-password
usermod -aG docker deploy

# Directory permissions
chown -R deploy:deploy /opt/bens-seguros
chmod 600 /opt/bens-seguros/.env

# SSH key-only auth
# /etc/ssh/sshd_config:
#   PasswordAuthentication no
#   PubkeyAuthentication yes
```

---

## 9. Frontend Deployment (Vercel)

### Project Configuration

```
Vercel Dashboard
├── Import Git Repository → GitHub repo
├── Root Directory: apps/web
├── Framework Preset: Next.js (auto-detected)
├── Build Settings:
│   ├── Build Command: cd ../.. && pnpm turbo build --filter=web
│   ├── Install Command: pnpm install
│   └── Output Directory: .next (default)
├── Node.js Version: 22.x
└── Environment Variables:
    ├── NEXT_PUBLIC_API_URL = https://api.bensseg.com
    └── NEXT_PUBLIC_CHAT_SERVER_URL = https://chat.bensseg.com
```

**Why `cd ../..`?** Vercel sets root to `apps/web`, but Turborepo needs the monorepo root to resolve package dependencies.

### Custom Domain

```
Vercel → Project Settings → Domains
├── app.bensseg.com (primary)
└── bensseg.com (redirect → app.bensseg.com, optional)
```

### Auto-deploy

- **Trigger:** Push to `main` affecting `apps/web/**` or consumed packages
- **Preview deploys:** Each PR gets a preview URL automatically
- **Ignored Build Step (optional):**
  ```bash
  npx turbo-ignore web
  ```
  Skips build if no relevant files changed.

---

## 10. Monitoring

### Sentry (Error Tracking)

Already integrated in the codebase. Configure `SENTRY_DSN` in `.env` to activate.

### UptimeRobot (Uptime Monitoring)

Free tier — set up monitors for:

| Monitor     | URL                               | Check interval | Alert          |
| ----------- | --------------------------------- | -------------- | -------------- |
| API Health  | `https://api.bensseg.com/health`  | 5 min          | Email/Telegram |
| Chat Health | `https://chat.bensseg.com/health` | 5 min          | Email/Telegram |
| Frontend    | `https://app.bensseg.com`         | 5 min          | Email/Telegram |

---

## 11. VPS Initial Setup Tutorial

### Step 1: SSH into VPS

```bash
ssh root@<VPS_IP>
```

### Step 2: System update and Docker installation

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify
docker --version
docker compose version
```

### Step 3: Create deploy user

```bash
adduser deploy --disabled-password
usermod -aG docker deploy

# Setup SSH key for deploy user
mkdir -p /home/deploy/.ssh
# Add your public key:
echo "ssh-ed25519 AAAA... your-key" >> /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# Disable password auth
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

### Step 4: Create project directory

```bash
mkdir -p /opt/bens-seguros/nginx/certs
mkdir -p /opt/bens-seguros/scripts
mkdir -p /opt/bens-seguros/backups
chown -R deploy:deploy /opt/bens-seguros
```

### Step 5: Upload files to VPS

From your local machine:

```bash
# Upload compose and nginx config
scp docker-compose.prod.yml deploy@<VPS_IP>:/opt/bens-seguros/
scp nginx/default.conf deploy@<VPS_IP>:/opt/bens-seguros/nginx/
scp scripts/mongo-init-replica.sh deploy@<VPS_IP>:/opt/bens-seguros/scripts/
scp scripts/backup.sh deploy@<VPS_IP>:/opt/bens-seguros/scripts/

# Upload Cloudflare origin certificates
scp nginx/certs/cloudflare-origin.pem deploy@<VPS_IP>:/opt/bens-seguros/nginx/certs/
scp nginx/certs/cloudflare-origin-key.pem deploy@<VPS_IP>:/opt/bens-seguros/nginx/certs/
```

### Step 6: Create .env file on VPS

```bash
ssh deploy@<VPS_IP>
cd /opt/bens-seguros

# Generate passwords
echo "DB_PASSWORD: $(openssl rand -base64 32)"
echo "REDIS_PASSWORD: $(openssl rand -base64 32)"
echo "AUTH_SECRET: $(openssl rand -base64 32)"
echo "SOCKET_JWT_SECRET: $(openssl rand -base64 24)"

# Create .env with generated values
nano .env
# (paste the template from Section 8, fill in generated values)

chmod 600 .env
```

### Step 7: Initialize MongoDB replica set

```bash
# Start MongoDB first
docker compose -f docker-compose.prod.yml up -d mongodb

# Wait for it to be ready
sleep 10

# Initialize replica set
docker compose -f docker-compose.prod.yml exec mongodb mongosh --eval '
  rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }] })
'
```

### Step 8: Start all services

```bash
cd /opt/bens-seguros

# Pull images
docker compose -f docker-compose.prod.yml pull

# Start databases first
docker compose -f docker-compose.prod.yml up -d postgres mongodb redis

# Wait for health checks
sleep 15

# Run Prisma migrations
docker compose -f docker-compose.prod.yml run --rm server \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

# Start all app containers
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
```

### Step 9: Setup backup cron

```bash
chmod +x /opt/bens-seguros/scripts/backup.sh

# Add cron job (as deploy user)
crontab -e
# Add line:
# 0 3 * * * /opt/bens-seguros/scripts/backup.sh >> /var/log/bens-backup.log 2>&1
```

### Step 10: Configure GitHub Actions secrets

In GitHub repo → Settings → Secrets and variables → Actions:

1. `DOCKERHUB_USERNAME` → your Docker Hub username
2. `DOCKERHUB_TOKEN` → Docker Hub access token (generate at hub.docker.com/settings/security)
3. `VPS_HOST` → VPS IP address
4. `VPS_USER` → `deploy`
5. `VPS_SSH_KEY` → content of your Ed25519 private key

### Step 11: Configure Vercel

1. Go to https://vercel.com → Import project from GitHub
2. Select your repository
3. Set Root Directory: `apps/web`
4. Set Build Command: `cd ../.. && pnpm turbo build --filter=web`
5. Set Install Command: `pnpm install`
6. Add environment variables:
   - `NEXT_PUBLIC_API_URL` = `https://api.bensseg.com`
   - `NEXT_PUBLIC_CHAT_SERVER_URL` = `https://chat.bensseg.com`
7. Deploy
8. Go to Settings → Domains → Add `app.bensseg.com`

### Step 12: Setup UptimeRobot

1. Go to https://uptimerobot.com → Sign up (free)
2. Add monitors:
   - HTTP(s) | `https://api.bensseg.com/health` | 5 min
   - HTTP(s) | `https://chat.bensseg.com/health` | 5 min
   - HTTP(s) | `https://app.bensseg.com` | 5 min
3. Configure alert contacts (email, Telegram, etc.)

---

## 12. Decisions Summary

| #   | Decision        | Choice                            | Rationale                                        |
| --- | --------------- | --------------------------------- | ------------------------------------------------ |
| 1   | VPS             | Hostinger KVM 2                   | 2vCPU, 8GB, 100GB NVMe — sufficient for 1 client |
| 2   | Domain          | bensseg.com                       | Already owned at Hostinger                       |
| 3   | Databases       | All Docker                        | Simple for 1 client, portable                    |
| 4   | SSL             | Cloudflare Full (Strict)          | Free, DDoS protection, hides VPS IP              |
| 5   | Subdomains      | api / chat / app                  | Clean separation, independent scaling            |
| 6   | Backup          | Daily pg_dump + mongodump → R2    | 7 days local, 30 days R2                         |
| 7   | Containers      | 4 apps + 3 DBs + nginx + redis    | Full stack, ~1.8GB RAM real                      |
| 8   | Monitoring      | Sentry + UptimeRobot              | Error tracking + uptime alerts                   |
| 9   | Deploy approach | Docker Compose + SSH              | Simple, 70% already implemented                  |
| 10  | CI/CD           | GitHub Actions → Docker Hub → VPS | Path-based triggers, auto rollback               |
| 11  | Frontend        | Vercel + custom domain            | Auto-deploy, preview URLs                        |
| 12  | Migrations      | Prisma migrate deploy in CI       | Runs before app containers start                 |
| 13  | Prisma bundle   | Keep bundled (B3)                 | ~10MB overhead acceptable for now                |
| 14  | Worker fix      | Rename tsup entry + build both    | Fixes current deploy-breaking bugs               |

---

## 13. Structural Code Changes Required

| Change                        | File                              | Risk   | Impact                        |
| ----------------------------- | --------------------------------- | ------ | ----------------------------- |
| Rename worker tsup entry      | `apps/worker/tsup.config.ts`      | Low    | Fixes entry mismatch          |
| Rename chat-worker tsup entry | `apps/chat-worker/tsup.config.ts` | Low    | Fixes entry mismatch          |
| Build both apps in Dockerfile | `Dockerfile.server`               | Low    | Worker exists in image        |
| Build both apps in Dockerfile | `Dockerfile.chat`                 | Low    | Chat-worker exists in image   |
| Add .dockerignore             | `.dockerignore` (new)             | None   | Faster builds                 |
| Add health checks             | Both Dockerfiles                  | None   | Auto-restart on failure       |
| Update compose commands       | `docker-compose.prod.yml`         | Low    | Correct paths                 |
| Baseline Prisma migrations    | `packages/db/prisma/migrations/`  | Medium | Production migration strategy |
| Add backup script             | `scripts/backup.sh` (new)         | None   | Automated backups             |
| Update Nginx config           | `nginx/default.conf`              | Low    | Subdomain routing + SSL       |
