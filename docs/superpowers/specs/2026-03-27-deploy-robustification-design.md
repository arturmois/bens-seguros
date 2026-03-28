# Deploy Robustification — Design Spec

**Date:** 2026-03-27
**Scope:** Robustify initial VPS setup and CI/CD pipeline without rearchitecting
**Approach:** Deploy script unificado + fixes cirurgicos

---

## Context

First production deploy (2026-03-23) took ~6h with 20+ iterative fixes. Second setup attempt (2026-03-27) hit 3 blockers in the tutorial: missing MongoDB keyfile, passwords with special characters breaking URLs, and Prisma 7 config file absent from Docker image.

Full analysis identified 23 issues across tutorial (11), CI/CD pipeline (9), and Docker Compose (3).

## Goals

1. Migration runs automatically on every server deploy
2. Tutorial is followable from scratch without hitting undocumented blockers
3. Deploy pipeline uses polling instead of fixed sleeps
4. Deploy logic lives in one place (no duplication between server/chat workflows)
5. Rollback is verified, not fire-and-forget

## Non-Goals

- Rearchitect build system (turbo prune, compile packages to dist/)
- Add staging environment
- Change hosting provider

---

## Design

### 1. `scripts/deploy.sh` — Unified deploy script

**Location:** `scripts/deploy.sh` (repo) → copied to VPS at `/opt/bens-seguros/scripts/deploy.sh`

**Interface:**

```bash
./scripts/deploy.sh <service> <tag>
# service: "server" | "chat"
# tag: git SHA short or "latest"
```

**Behavior (in order):**

1. Validate arguments — exit 1 if service is not `server` or `chat`
2. Map service to containers:
   - `server` → server, worker
   - `chat` → chat-server, chat-worker
3. Save current tag for rollback: `cat .current-<service>-tag`
4. Pull new images: `docker compose pull <containers>`
5. **If `server`:** run `prisma migrate deploy` via `docker compose exec server npx prisma migrate deploy` — resolves **P1**
6. Deploy: `docker compose up -d <containers>`
7. Reload nginx: `docker exec nginx-1 nginx -t && nginx -s reload`
8. **Poll health check** with 120s timeout, checking every 5s — resolves **P3**
   - Uses `docker inspect --format='{{.State.Health.Status}}'` — resolves **P4**
9. **If `server`:** smoke test — curl sign-in endpoint, verify `Domain=` in Set-Cookie — resolves **P8**
10. On failure: rollback to previous tag + **poll health check on rollback too** — resolves **P5**
11. Save successful tag to `.current-<service>-tag`

**Error handling:** `set -euo pipefail`, explicit exit codes, descriptive echo messages.

**No nginx workaround:** the `rm -f prod.conf` hack is removed — resolves **P7**.

### 2. CI/CD Workflow changes

#### `ci.yml` becomes reusable — resolves P6

```yaml
on:
  pull_request:
    branches: [main]
  workflow_call: # called by deploy workflows
```

Same steps as today: checkout, pnpm install, prisma generate, lint, typecheck, test. PRs trigger it directly, deploy workflows call it.

#### `deploy-server.yml` simplified

3 jobs:

1. **quality-gates:** `uses: ./.github/workflows/ci.yml`
2. **build-and-push:** identical to current (Docker build + push with SHA tag)
3. **deploy:**
   - SCP: `scripts/deploy.sh`, `nginx/prod.conf`, `docker-compose.prod.yml` to VPS — resolves **T5**
   - SSH: `chmod +x scripts/deploy.sh && ./scripts/deploy.sh server <SHA>`

#### `deploy-chat.yml` — same structure

Identical to server except: `Dockerfile.chat`, `bens-chat` image, `./scripts/deploy.sh chat <SHA>`.

### 3. Dockerfile fixes

#### `Dockerfile.server`

- `prisma.config.ts` already added (line 59) — resolves **P2**
- Keep `ARG DATABASE_URL` for prisma generate compatibility — **P9** deferred (works, not worth risking)

#### `Dockerfile.chat`

No changes needed.

### 4. Docker Compose fixes

#### D1 — MongoDB health check simplified

```yaml
healthcheck:
  test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"]
  interval: 10s
  timeout: 5s
  retries: 5
```

Removes credential interpolation. `ping` runs inside the container where auth context is already established via keyfile.

#### D2 — Remove `mongo-init-replica.sh` volume mount

The `entrypoint-initdb.d` script only runs on first init with empty volume. Since the tutorial has an explicit manual step (2.8), remove the mount to avoid confusion about which is the source of truth.

```yaml
# Remove this line:
# - ./scripts/mongo-init-replica.sh:/docker-entrypoint-initdb.d/init.sh:ro
```

#### D3 — No change

depends_on with `condition: service_healthy` already handles ordering. Cascade feedback is acceptable.

### 5. Tutorial fixes

#### T1 — Step 2.8: Replace `sleep 10` with health check polling

```bash
docker compose -f docker-compose.prod.yml up -d mongodb
echo "Aguardando MongoDB ficar healthy..."
for i in $(seq 1 12); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' bens-seguros-mongodb-1 2>/dev/null || echo "starting")
  [ "$STATUS" = "healthy" ] && echo "MongoDB healthy!" && break
  sleep 5
done
```

#### T2/T3 — Step 2.9: Fix migration command and sequencing

Correct sequence:

1. Pull images
2. Start databases → poll health
3. Start server → poll health
4. Run migration via `docker compose exec` (not `run`)
5. Start remaining containers

#### T4 — Step 2.7: Explain hex vs base64

Add note: hex for passwords in URLs (DB_PASSWORD, MONGO_PASSWORD, REDIS_PASSWORD), base64 for secrets that don't appear in URLs (AUTH_SECRET, SOCKET_JWT_SECRET).

#### T6 — Step 2.8: Remove reference to mongo-init-replica.sh

Manual `rs.initiate` is the only source of truth.

#### T8 — Step 2.3: Robust sshd_config edit

Replace fragile `sed` with:

```bash
grep -q "^PasswordAuthentication" /etc/ssh/sshd_config \
  && sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config \
  || echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
```

#### T9 — Step 2.10: Fix backup log path

Change `/var/log/bens-backup.log` to `/opt/bens-seguros/logs/backup.log` (user deploy has write access). Add `mkdir -p /opt/bens-seguros/logs` to step 2.4.

#### T10 — Step 3.2: Fix broken markdown

Fix `\*\*` escaping in tutorial text.

---

## Files to create/modify

| File                                  | Action       | Issues resolved            |
| ------------------------------------- | ------------ | -------------------------- |
| `scripts/deploy.sh`                   | **Create**   | P1, P3, P4, P5, P7, P8     |
| `.github/workflows/ci.yml`            | **Modify**   | P6                         |
| `.github/workflows/deploy-server.yml` | **Modify**   | P1, P3, P4, P5, P6, P7, T5 |
| `.github/workflows/deploy-chat.yml`   | **Modify**   | P3, P4, P5, P6, P7, P8, T5 |
| `Dockerfile.server`                   | Already done | P2                         |
| `docker-compose.prod.yml`             | **Modify**   | D1, D2                     |
| `docs/DEPLOY-TUTORIAL.md`             | **Modify**   | T1-T10                     |

## Verification

After implementation:

1. Read `deploy.sh` end-to-end — no `sleep` (only polling), no hardcoded paths
2. Both deploy workflows should be <40 lines in the deploy job
3. `ci.yml` has `workflow_call` trigger
4. Tutorial is followable: every command works on a fresh VPS
5. `docker-compose.prod.yml` MongoDB health check has no `${MONGO_PASSWORD}` interpolation
