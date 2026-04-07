# CI & Security Quick Wins — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pnpm audit to CI, configure Vitest coverage reports, and run Docker containers as non-root user.

**Architecture:** Three independent infrastructure fixes. No application code changes. Each task modifies config/infra files only.

**Tech Stack:** GitHub Actions, Vitest + @vitest/coverage-v8, Docker (Alpine)

**Spec:** `docs/superpowers/specs/2026-04-06-ci-security-quick-wins-design.md`

---

### Task 1: Add pnpm audit to CI (P2-4)

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add audit step after install**

In `.github/workflows/ci.yml`, add a new step after `pnpm install --frozen-lockfile` (line 20) and before the `db:generate` step (line 21). Insert between them:

```yaml
- name: Security audit
  run: pnpm audit --audit-level high
  continue-on-error: true
```

The full steps section should read (showing context):

```yaml
- run: pnpm install --frozen-lockfile
- name: Security audit
  run: pnpm audit --audit-level high
  continue-on-error: true
- run: DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" pnpm --filter @repo/db db:generate
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add pnpm audit step for dependency vulnerability visibility (P2-4)"
```

---

### Task 2: Install @vitest/coverage-v8 (P2-3a)

**Files:**

- Modify: `packages/core/package.json`
- Modify: `packages/shared/package.json`
- Modify: `packages/auth/package.json`
- Modify: `apps/server/package.json`
- Modify: `apps/chat-server/package.json`

- [ ] **Step 1: Install coverage provider in all packages that have vitest configs**

Run these commands to add the coverage provider as a dev dependency to each package:

```bash
pnpm --filter @repo/core add -D @vitest/coverage-v8
pnpm --filter @repo/shared add -D @vitest/coverage-v8
pnpm --filter @repo/auth add -D @vitest/coverage-v8
pnpm --filter @app/server add -D @vitest/coverage-v8
pnpm --filter @app/chat-server add -D @vitest/coverage-v8
```

- [ ] **Step 2: Verify tests still pass**

Run: `pnpm test`
Expected: All tests pass (218 tests). The coverage provider is installed but not activated yet (needs config).

- [ ] **Step 3: Commit**

```bash
git add packages/core/package.json packages/shared/package.json packages/auth/package.json apps/server/package.json apps/chat-server/package.json pnpm-lock.yaml
git commit -m "chore: install @vitest/coverage-v8 in all test packages (P2-3)"
```

---

### Task 3: Configure coverage in Vitest configs (P2-3b)

**Files:**

- Modify: `packages/core/vitest.config.ts`
- Modify: `packages/shared/vitest.config.ts`
- Modify: `packages/auth/vitest.config.ts`
- Modify: `apps/server/vitest.config.ts`
- Modify: `apps/chat-server/vitest.config.ts`

- [ ] **Step 1: Add coverage config to packages/core/vitest.config.ts**

Replace the entire file content with:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['reflect-metadata'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
    },
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      MONGODB_URL: 'mongodb://localhost:27017/test',
      AUTH_SECRET: 'test-auth-secret-at-least-32-chars!!',
      SOCKET_JWT_SECRET: 'test-socket-secret-16',
      ENCRYPTION_KEY: 'a'.repeat(64),
    },
  },
})
```

Note: `packages/core` is the only config with `setupFiles: ['reflect-metadata']`. The other 4 do NOT have this line.

- [ ] **Step 2: Add coverage config to packages/shared/vitest.config.ts**

Replace the entire file content with:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
    },
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      MONGODB_URL: 'mongodb://localhost:27017/test',
      AUTH_SECRET: 'test-auth-secret-at-least-32-chars!!',
      SOCKET_JWT_SECRET: 'test-socket-secret-16',
      ENCRYPTION_KEY: 'a'.repeat(64),
    },
  },
})
```

- [ ] **Step 3: Add coverage config to packages/auth/vitest.config.ts**

Replace with the exact same content as Step 2 (packages/shared). The file is identical.

- [ ] **Step 4: Add coverage config to apps/server/vitest.config.ts**

Replace with the exact same content as Step 2. The file is identical.

- [ ] **Step 5: Add coverage config to apps/chat-server/vitest.config.ts**

Replace with the exact same content as Step 2. The file is identical.

- [ ] **Step 6: Verify coverage works**

Run: `pnpm --filter @repo/core exec vitest run --coverage`
Expected: Tests pass AND a coverage report is printed to the terminal showing file-by-file coverage percentages.

- [ ] **Step 7: Commit**

```bash
git add packages/core/vitest.config.ts packages/shared/vitest.config.ts packages/auth/vitest.config.ts apps/server/vitest.config.ts apps/chat-server/vitest.config.ts
git commit -m "feat: configure Vitest v8 coverage in all test packages (P2-3)"
```

---

### Task 4: Add coverage step to CI (P2-3c)

**Files:**

- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Replace test step with coverage-enabled test**

In `.github/workflows/ci.yml`, the last step is:

```yaml
- run: pnpm test
```

Replace with:

```yaml
- run: pnpm test
- name: Coverage report
  run: pnpm test -- --coverage
  continue-on-error: true
```

This runs tests twice: once for the pass/fail gate (strict), once for coverage output (non-blocking). The coverage run uses `continue-on-error: true` because there is no threshold configured yet.

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add coverage report step to CI pipeline (P2-3)"
```

---

### Task 5: Docker non-root user (P2-10)

**Files:**

- Modify: `Dockerfile.server`
- Modify: `Dockerfile.chat`

- [ ] **Step 1: Add non-root user to Dockerfile.server**

In `Dockerfile.server`, add two lines BEFORE the `HEALTHCHECK` directive (currently line 65). Insert after the last `COPY` line (line 63) and before `HEALTHCHECK`:

```dockerfile
RUN addgroup --system app && adduser --system --ingroup app app
USER app
```

The end of the file should read:

```dockerfile
# Bundled app code
COPY --from=builder /app/apps/server/dist ./server/dist
COPY --from=builder /app/apps/worker/dist ./worker/dist

RUN addgroup --system app && adduser --system --ingroup app app
USER app

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3001/health').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"

EXPOSE 3001
CMD ["node", "server/dist/server.js"]
```

- [ ] **Step 2: Add non-root user to Dockerfile.chat**

In `Dockerfile.chat`, add two lines BEFORE the `HEALTHCHECK` directive (currently line 42). Insert after the last `COPY` line (line 40) and before `HEALTHCHECK`:

```dockerfile
RUN addgroup --system app && adduser --system --ingroup app app
USER app
```

The end of the file should read:

```dockerfile
COPY --from=builder /app/apps/chat-server/dist ./chat-server/dist
COPY --from=builder /app/apps/chat-worker/dist ./chat-worker/dist
COPY --from=builder /app/apps/widget/dist ./widget/dist

RUN addgroup --system app && adduser --system --ingroup app app
USER app

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://localhost:3002/health').then(r=>{if(!r.ok)throw r;process.exit(0)}).catch(()=>process.exit(1))"

EXPOSE 3002
CMD ["node", "chat-server/dist/index.js"]
```

- [ ] **Step 3: Verify Dockerfiles parse correctly**

Run: `docker build --check -f Dockerfile.server . && docker build --check -f Dockerfile.chat .`

If `--check` is not supported by the Docker version, just verify syntax by running:

```bash
docker build --no-cache -f Dockerfile.server --target runner -t test-server . 2>&1 | tail -5
```

Expected: Build succeeds (or at least parses without syntax errors).

Alternative quick check: `grep -n 'USER app' Dockerfile.server Dockerfile.chat` should show the line in both files.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile.server Dockerfile.chat
git commit -m "fix: run Docker containers as non-root user (P2-10)"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Run full quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

Expected: All 4 gates pass with zero errors.

- [ ] **Step 2: Verify all changes are committed**

```bash
git status
git log --oneline -7
```

Expected: Clean working tree, 5 new commits (Tasks 1-5).
