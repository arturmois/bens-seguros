# Deploy Robustification — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Robustify the VPS setup tutorial and CI/CD pipeline by unifying deploy logic, automating migrations, replacing fixed sleeps with polling, and fixing all 23 documented issues.

**Architecture:** Extract duplicated deploy logic from two GitHub Actions workflows into a single `scripts/deploy.sh`. Make `ci.yml` reusable via `workflow_call` so deploy workflows don't duplicate quality gates. Fix tutorial to match actual infrastructure requirements.

**Tech Stack:** Bash, GitHub Actions, Docker Compose, Prisma 7, Nginx

---

### Task 1: Create `scripts/deploy.sh`

**Files:**

- Create: `scripts/deploy.sh`

**Resolves:** P1 (migration), P3 (polling), P4 (health check parsing), P5 (rollback verification), P7 (nginx workaround), P8 (smoke test for both services)

- [ ] **Step 1: Create the deploy script**

```bash
#!/bin/bash
set -euo pipefail

# === Unified deploy script ===
# Usage: ./deploy.sh <service> <tag>
#   service: "server" | "chat"
#   tag: docker image tag (git SHA short or "latest")

COMPOSE_FILE="/opt/bens-seguros/docker-compose.prod.yml"
DEPLOY_DIR="/opt/bens-seguros"

# --- Validate arguments ---
SERVICE="${1:-}"
TAG="${2:-}"

if [ -z "$SERVICE" ] || [ -z "$TAG" ]; then
  echo "Usage: $0 <server|chat> <tag>"
  exit 1
fi

# --- Map service to containers ---
case "$SERVICE" in
  server)
    CONTAINERS="server worker"
    HEALTH_CONTAINER="bens-seguros-server-1"
    TAG_FILE="${DEPLOY_DIR}/.current-server-tag"
    ;;
  chat)
    CONTAINERS="chat-server chat-worker"
    HEALTH_CONTAINER="bens-seguros-chat-server-1"
    TAG_FILE="${DEPLOY_DIR}/.current-chat-tag"
    ;;
  *)
    echo "ERROR: service must be 'server' or 'chat', got '${SERVICE}'"
    exit 1
    ;;
esac

cd "$DEPLOY_DIR"

# --- Save current tag for rollback ---
PREV_TAG=$(cat "$TAG_FILE" 2>/dev/null || echo "none")
echo "Current tag: ${PREV_TAG} -> New tag: ${TAG}"

# --- Pull new images ---
echo "Pulling images with tag ${TAG}..."
export TAG
docker compose -f "$COMPOSE_FILE" pull $CONTAINERS

# --- Run Prisma migrations (server only) ---
if [ "$SERVICE" = "server" ]; then
  echo "Running Prisma migrations..."
  docker compose -f "$COMPOSE_FILE" exec -T server npx prisma migrate deploy || {
    echo "ERROR: Prisma migration failed! Aborting deploy."
    exit 1
  }
fi

# --- Deploy containers ---
echo "Deploying ${CONTAINERS}..."
docker compose -f "$COMPOSE_FILE" up -d $CONTAINERS

# --- Reload nginx ---
echo "Reloading nginx..."
docker exec bens-seguros-nginx-1 nginx -t && docker exec bens-seguros-nginx-1 nginx -s reload

# --- Poll health check (120s timeout) ---
poll_health() {
  local container="$1"
  local timeout="$2"
  local elapsed=0

  echo "Waiting for ${container} to become healthy (timeout: ${timeout}s)..."
  while [ $elapsed -lt "$timeout" ]; do
    STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "unknown")
    if [ "$STATUS" = "healthy" ]; then
      echo "${container} is healthy! (${elapsed}s)"
      return 0
    fi
    sleep 5
    elapsed=$((elapsed + 5))
  done

  echo "ERROR: ${container} not healthy after ${timeout}s (status: ${STATUS})"
  return 1
}

if ! poll_health "$HEALTH_CONTAINER" 120; then
  echo "Health check failed! Rolling back to ${PREV_TAG}..."
  if [ "$PREV_TAG" != "none" ]; then
    export TAG=${PREV_TAG}
    docker compose -f "$COMPOSE_FILE" up -d $CONTAINERS

    if ! poll_health "$HEALTH_CONTAINER" 120; then
      echo "CRITICAL: Rollback also failed! Manual intervention required."
      exit 2
    fi
    echo "Rollback successful."
  fi
  exit 1
fi

# --- Smoke test: cross-subdomain cookie Domain attribute (server only) ---
if [ "$SERVICE" = "server" ]; then
  echo "Running smoke test (cookie Domain check)..."
  COOKIE_CHECK=$(curl -s -D - -X POST https://api.bensseg.com/api/auth/sign-in/email \
    -H "Content-Type: application/json" \
    -d '{"email":"smoke-test@bensseg.com","password":"invalid"}' \
    2>&1 | grep -c "Domain=bensseg.com" || true)
  if [ "$COOKIE_CHECK" -lt 1 ]; then
    echo "WARNING: Cross-subdomain cookie Domain attribute missing!"
    echo "Auth may not work between app.bensseg.com and api.bensseg.com"
  fi
fi

# --- Save successful tag ---
echo "${TAG}" > "$TAG_FILE"
echo "Deploy successful! Service: ${SERVICE}, Tag: ${TAG}"
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x scripts/deploy.sh`

- [ ] **Step 3: Verify script has no shellcheck issues**

Run: `shellcheck scripts/deploy.sh || echo "shellcheck not installed, skip"`

- [ ] **Step 4: Commit**

```bash
git add scripts/deploy.sh
git commit -m "feat(deploy): add unified deploy script with polling, migration, rollback verification"
```

---

### Task 2: Make `ci.yml` reusable via `workflow_call`

**Files:**

- Modify: `.github/workflows/ci.yml`

**Resolves:** P6 (duplicated quality gates)

- [ ] **Step 1: Add `workflow_call` trigger and remove `build` step**

Replace the entire file `.github/workflows/ci.yml` with:

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  workflow_call:

jobs:
  validate:
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
      - run: DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm --filter @repo/db db:generate
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
```

Note: `pnpm build` is removed because the Docker build step already validates the build. Quality gates focus on lint, typecheck, and test. The `pnpm build` in PRs was redundant with the Docker build in deploy.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "refactor(ci): make ci.yml reusable via workflow_call for deploy pipelines"
```

---

### Task 3: Simplify `deploy-server.yml`

**Files:**

- Modify: `.github/workflows/deploy-server.yml`

**Resolves:** P1, P3, P4, P5, P6, P7, T5

- [ ] **Step 1: Rewrite deploy-server.yml**

Replace the entire file `.github/workflows/deploy-server.yml` with:

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
      - 'pnpm-lock.yaml'
      - 'nginx/**'
      - 'scripts/deploy.sh'
  workflow_dispatch:

jobs:
  quality-gates:
    uses: ./.github/workflows/ci.yml

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
      - uses: actions/checkout@v4
        with:
          sparse-checkout: |
            nginx
            scripts/deploy.sh
            docker-compose.prod.yml
      - uses: appleboy/scp-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: nginx/prod.conf,scripts/deploy.sh,docker-compose.prod.yml
          target: /opt/bens-seguros
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            chmod +x /opt/bens-seguros/scripts/deploy.sh
            /opt/bens-seguros/scripts/deploy.sh server ${{ needs.build-and-push.outputs.sha_short }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-server.yml
git commit -m "refactor(ci): simplify deploy-server to use unified deploy script and reusable CI"
```

---

### Task 4: Simplify `deploy-chat.yml`

**Files:**

- Modify: `.github/workflows/deploy-chat.yml`

**Resolves:** P3, P4, P5, P6, P7, P8, T5

- [ ] **Step 1: Rewrite deploy-chat.yml**

Replace the entire file `.github/workflows/deploy-chat.yml` with:

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
      - 'nginx/**'
      - 'scripts/deploy.sh'
  workflow_dispatch:

jobs:
  quality-gates:
    uses: ./.github/workflows/ci.yml

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
      - uses: actions/checkout@v4
        with:
          sparse-checkout: |
            nginx
            scripts/deploy.sh
            docker-compose.prod.yml
      - uses: appleboy/scp-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          source: nginx/prod.conf,scripts/deploy.sh,docker-compose.prod.yml
          target: /opt/bens-seguros
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            chmod +x /opt/bens-seguros/scripts/deploy.sh
            /opt/bens-seguros/scripts/deploy.sh chat ${{ needs.build-and-push.outputs.sha_short }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-chat.yml
git commit -m "refactor(ci): simplify deploy-chat to use unified deploy script and reusable CI"
```

---

### Task 5: Fix `docker-compose.prod.yml`

**Files:**

- Modify: `docker-compose.prod.yml:149-168` (mongodb service)

**Resolves:** D1 (health check interpolation), D2 (init script confusion)

- [ ] **Step 1: Simplify MongoDB health check and remove init script mount**

In `docker-compose.prod.yml`, replace the mongodb service (lines 149-168):

```yaml
mongodb:
  image: mongo:8
  command:
    [
      '--replSet',
      'rs0',
      '--bind_ip_all',
      '--auth',
      '--keyFile',
      '/data/keyfile',
    ]
  environment:
    MONGO_INITDB_ROOT_USERNAME: ${MONGO_USER}
    MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
  volumes:
    - mongodata:/data/db
    - ./mongo-keyfile:/data/keyfile:ro
  healthcheck:
    test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"]
    interval: 10s
    timeout: 5s
    retries: 5
  restart: always
  deploy:
    resources:
      limits:
        memory: 1G
```

Changes:

- Removed `./scripts/mongo-init-replica.sh:/docker-entrypoint-initdb.d/init.sh:ro` volume mount (D2)
- Simplified health check to `db.adminCommand('ping')` without credential interpolation (D1)

- [ ] **Step 2: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "fix(compose): simplify MongoDB health check, remove init script mount"
```

---

### Task 6: Rewrite `docs/DEPLOY-TUTORIAL.md`

**Files:**

- Modify: `docs/DEPLOY-TUTORIAL.md`

**Resolves:** T1, T2, T3, T4, T6, T8, T9, T10

This is a large edit. The changes are grouped by section.

- [ ] **Step 1: Fix step 2.3 — robust sshd_config edit (T8)**

In `docs/DEPLOY-TUTORIAL.md`, replace:

```bash
# Desabilitar autenticacao por senha
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

With:

```bash
# Desabilitar autenticacao por senha (funciona independente do estado atual do sshd_config)
grep -q "^PasswordAuthentication" /etc/ssh/sshd_config \
  && sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config \
  || echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
systemctl restart sshd
```

- [ ] **Step 2: Fix step 2.4 — add logs directory (T9)**

In `docs/DEPLOY-TUTORIAL.md`, replace:

```bash
mkdir -p /opt/bens-seguros/nginx/certs
mkdir -p /opt/bens-seguros/scripts
mkdir -p /opt/bens-seguros/backups
chown -R deploy:deploy /opt/bens-seguros
```

With:

```bash
mkdir -p /opt/bens-seguros/nginx/certs
mkdir -p /opt/bens-seguros/scripts
mkdir -p /opt/bens-seguros/backups
mkdir -p /opt/bens-seguros/logs
chown -R deploy:deploy /opt/bens-seguros
```

- [ ] **Step 3: Fix step 2.7 — explain hex vs base64 (T4)**

In `docs/DEPLOY-TUTORIAL.md`, replace:

```bash
# Gerar senhas (hex para evitar caracteres especiais em URLs de conexao)
echo "DB_PASSWORD: $(openssl rand -hex 32)"
echo "MONGO_PASSWORD: $(openssl rand -hex 32)"
echo "REDIS_PASSWORD: $(openssl rand -hex 32)"
echo "AUTH_SECRET: $(openssl rand -base64 32)"
echo "SOCKET_JWT_SECRET: $(openssl rand -base64 24)"
echo "ENCRYPTION_KEY: $(openssl rand -hex 32)"
```

With:

```bash
# Senhas que vao em URLs de conexao (DATABASE_URL, MONGODB_URL, REDIS_URL):
# usar hex para evitar caracteres especiais (/, +, =) que quebram URLs
echo "DB_PASSWORD: $(openssl rand -hex 32)"
echo "MONGO_PASSWORD: $(openssl rand -hex 32)"
echo "REDIS_PASSWORD: $(openssl rand -hex 32)"

# Secrets que NAO vao em URLs: base64 e seguro
echo "AUTH_SECRET: $(openssl rand -base64 32)"
echo "SOCKET_JWT_SECRET: $(openssl rand -base64 24)"

# Chave de criptografia AES-256: exige exatamente 64 hex chars (32 bytes)
echo "ENCRYPTION_KEY: $(openssl rand -hex 32)"
```

- [ ] **Step 4: Fix step 2.8 — replace sleep with polling, remove init script reference (T1, T6)**

In `docs/DEPLOY-TUTORIAL.md`, replace the entire step 2.8 content:

````markdown
### 2.8 Inicializar MongoDB replica set

```bash
# Subir MongoDB primeiro
docker compose -f docker-compose.prod.yml up -d mongodb

# Aguardar ficar pronto
sleep 10

# Inicializar replica set
source .env
docker compose -f docker-compose.prod.yml exec mongodb mongosh \
  -u "$MONGO_USER" -p "$MONGO_PASSWORD" --authenticationDatabase admin --eval '
  rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }] })
'
```
````

````

With:

```markdown
### 2.8 Inicializar MongoDB replica set

```bash
# Subir MongoDB primeiro
docker compose -f docker-compose.prod.yml up -d mongodb

# Aguardar ficar healthy (max 60s)
echo "Aguardando MongoDB..."
for i in $(seq 1 12); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' bens-seguros-mongodb-1 2>/dev/null || echo "starting")
  [ "$STATUS" = "healthy" ] && echo "MongoDB healthy!" && break
  sleep 5
done

# Inicializar replica set
source .env
docker compose -f docker-compose.prod.yml exec mongodb mongosh \
  -u "$MONGO_USER" -p "$MONGO_PASSWORD" --authenticationDatabase admin --eval '
  rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }] })
'
````

> O replica set precisa ser inicializado manualmente apenas na primeira vez. Deploys subsequentes via CI/CD nao precisam repetir este passo.

````

- [ ] **Step 5: Fix step 2.9 — correct migration sequence (T2, T3)**

In `docs/DEPLOY-TUTORIAL.md`, replace the entire step 2.9 content:

```markdown
### 2.9 Subir todos os servicos

```bash
cd /opt/bens-seguros

# Puxar imagens do Docker Hub
docker compose -f docker-compose.prod.yml pull

# Subir databases primeiro
docker compose -f docker-compose.prod.yml up -d postgres mongodb redis

# Aguardar health checks
sleep 15

# Rodar migrations do Prisma
docker compose -f docker-compose.prod.yml run --rm server \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

# Subir todos os containers
docker compose -f docker-compose.prod.yml up -d

# Verificar status
docker compose -f docker-compose.prod.yml ps
````

````

With:

```markdown
### 2.9 Subir todos os servicos

```bash
cd /opt/bens-seguros

# Puxar imagens do Docker Hub
docker compose -f docker-compose.prod.yml pull

# Subir databases
docker compose -f docker-compose.prod.yml up -d postgres mongodb redis

# Aguardar databases ficarem healthy (max 60s)
echo "Aguardando databases..."
for i in $(seq 1 12); do
  PG=$(docker inspect --format='{{.State.Health.Status}}' bens-seguros-postgres-1 2>/dev/null || echo "starting")
  MG=$(docker inspect --format='{{.State.Health.Status}}' bens-seguros-mongodb-1 2>/dev/null || echo "starting")
  RD=$(docker inspect --format='{{.State.Health.Status}}' bens-seguros-redis-1 2>/dev/null || echo "starting")
  [ "$PG" = "healthy" ] && [ "$MG" = "healthy" ] && [ "$RD" = "healthy" ] && echo "Databases healthy!" && break
  echo "  postgres=$PG mongodb=$MG redis=$RD"
  sleep 5
done

# Subir server primeiro (para rodar migration)
docker compose -f docker-compose.prod.yml up -d server

# Aguardar server ficar healthy
echo "Aguardando server..."
for i in $(seq 1 24); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' bens-seguros-server-1 2>/dev/null || echo "starting")
  [ "$STATUS" = "healthy" ] && echo "Server healthy!" && break
  sleep 5
done

# Rodar migrations do Prisma (via exec no container ja rodando)
docker compose -f docker-compose.prod.yml exec -T server npx prisma migrate deploy

# Subir todos os containers restantes
docker compose -f docker-compose.prod.yml up -d

# Verificar status
docker compose -f docker-compose.prod.yml ps
````

> Todos os containers devem estar `healthy` ou `running`. Deploys subsequentes via CI/CD rodam a migration automaticamente.

````

- [ ] **Step 6: Fix step 2.10 — correct backup log path (T9)**

In `docs/DEPLOY-TUTORIAL.md`, replace:

```cron
0 3 * * * /opt/bens-seguros/scripts/backup.sh >> /var/log/bens-backup.log 2>&1
````

With:

```cron
0 3 * * * /opt/bens-seguros/scripts/backup.sh >> /opt/bens-seguros/logs/backup.log 2>&1
```

- [ ] **Step 7: Fix step 3.2 — broken markdown (T10)**

In `docs/DEPLOY-TUTORIAL.md`, replace:

```markdown
- **Push em `apps/server/**`ou`packages/**`** → builda imagem server, deploya na VPS
- **Push em `apps/chat-server/**`\*\* → builda imagem chat, deploya na VPS
- **Push em `apps/web/**`\*\* → Vercel deploya automaticamente
```

With:

```markdown
- **Push em `apps/server/**`ou`packages/**`** → builda imagem server, deploya na VPS
- **Push em `apps/chat-server/**`\*\* → builda imagem chat, deploya na VPS
- **Push em `apps/web/**`\*\* → Vercel deploya automaticamente
```

- [ ] **Step 8: Update step 3.2 — document migration automation**

In `docs/DEPLOY-TUTORIAL.md`, replace:

```markdown
Cada deploy:

1. Roda quality gates (lint, typecheck, test)
2. Builda imagem Docker com tag SHA
3. Faz SSH na VPS e atualiza containers
4. Roda Prisma migrate (server apenas)
5. Verifica health check
6. Se falhar, faz rollback automatico
```

With:

```markdown
Cada deploy:

1. Roda quality gates (lint, typecheck, test) via `ci.yml` reutilizavel
2. Builda imagem Docker com tag SHA e pusha para Docker Hub
3. Copia `deploy.sh`, `docker-compose.prod.yml` e `nginx/prod.conf` para a VPS
4. Executa `scripts/deploy.sh <server|chat> <sha>` na VPS, que:
   - Puxa imagens novas
   - Roda Prisma migrate (server apenas)
   - Sobe containers
   - Recarrega nginx
   - Faz polling do health check (max 120s)
   - Smoke test de cookies cross-subdomain (server apenas)
   - Se falhar, faz rollback com verificacao de health
```

- [ ] **Step 9: Commit**

```bash
git add docs/DEPLOY-TUTORIAL.md
git commit -m "docs(deploy): fix tutorial with polling, correct migration, robust commands"
```

---

### Task 7: Verify all changes

- [ ] **Step 1: Verify deploy.sh has no `sleep` except in polling loops**

Run: `grep -n 'sleep' scripts/deploy.sh`

Expected: only `sleep 5` inside the `poll_health` function's while loop.

- [ ] **Step 2: Verify ci.yml has workflow_call trigger**

Run: `grep 'workflow_call' .github/workflows/ci.yml`

Expected: `  workflow_call:` present.

- [ ] **Step 3: Verify deploy workflows use reusable CI**

Run: `grep 'uses:.*ci.yml' .github/workflows/deploy-server.yml .github/workflows/deploy-chat.yml`

Expected: both files have `uses: ./.github/workflows/ci.yml`.

- [ ] **Step 4: Verify deploy workflows have no inline quality-gate steps**

Run: `grep -c 'pnpm lint\|pnpm typecheck\|pnpm test' .github/workflows/deploy-server.yml .github/workflows/deploy-chat.yml`

Expected: `0` for both files.

- [ ] **Step 5: Verify compose has no MONGO_PASSWORD in health check**

Run: `grep 'MONGO_PASSWORD' docker-compose.prod.yml`

Expected: only in the `environment` section (MONGO_INITDB_ROOT_PASSWORD), NOT in healthcheck.

- [ ] **Step 6: Verify compose has no mongo-init-replica mount**

Run: `grep 'mongo-init-replica' docker-compose.prod.yml`

Expected: no matches.

- [ ] **Step 7: Verify tutorial has no raw `sleep` (only inside polling loops)**

Run: `grep -n 'sleep' docs/DEPLOY-TUTORIAL.md`

Expected: `sleep 5` only inside `for` loops (polling), never standalone `sleep 10` or `sleep 15`.

- [ ] **Step 8: Verify tutorial backup log path**

Run: `grep 'backup.log' docs/DEPLOY-TUTORIAL.md`

Expected: `/opt/bens-seguros/logs/backup.log`, NOT `/var/log/`.

- [ ] **Step 9: Commit verification results (if any fixes needed)**

Only if issues found in steps above. Otherwise, skip.
