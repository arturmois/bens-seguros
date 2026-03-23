# Relatorio de Analise: Pipeline CI/CD e Deploy em Producao

**Data:** 2026-03-23
**Autor:** Claude (analise pos-deploy)
**Contexto:** Analise completa do processo de deploy do Bens Seguros, baseada nos problemas reais encontrados durante a primeira implantacao em producao.

---

## 1. Resumo Executivo

O deploy em producao levou aproximadamente 6 horas, com mais de 15 fixes iterativos. A maioria dos problemas veio de **incompatibilidades entre o ambiente de desenvolvimento (localhost) e producao (cross-domain)**, e da **estrategia de bundling com tsup que conflita com a estrutura pnpm**.

O sistema funciona em producao (registro, login, onboarding, dashboard, chat), mas o processo revelou fragilidades estruturais que devem ser corrigidas para evitar problemas futuros.

---

## 2. Problemas Encontrados (Cronologico)

### 2.1 Build Pipeline (Docker)

| #   | Problema                                      | Causa Raiz                                      | Fix Aplicado                                     | Tempo Gasto |
| --- | --------------------------------------------- | ----------------------------------------------- | ------------------------------------------------ | ----------- |
| 1   | Husky falha no `pnpm install --prod`          | `prepare` script roda husky que e devDependency | `--ignore-scripts`                               | 10 min      |
| 2   | Prisma `DATABASE_URL` obrigatorio no generate | `prisma.config.ts` valida env na importacao     | `ARG DATABASE_URL=dummy`                         | 15 min      |
| 3   | `pnpm exec prisma` nao encontrado             | Prisma CLI nao hoisted para root no builder     | `./node_modules/.bin/prisma` direto              | 10 min      |
| 4   | Prisma ainda nao encontrado                   | `packages/db/node_modules` nao copiado          | Copy `packages/db/node_modules`                  | 10 min      |
| 5   | tsup nao resolve `@repo/*` packages           | Docker COPY nao preserva symlinks pnpm          | `COPY --from=deps /app ./` (copia tudo)          | 20 min      |
| 6   | `pg` CJS `require("events")` em ESM           | `pg` bundled pelo tsup em vez de external       | Adicionar `pg`, `@prisma/adapter-pg` a externals | 15 min      |
| 7   | `@t3-oss/env-core` nao encontrado no runner   | Faltavam packages no `prod-deps` stage          | Adicionar todos os packages ao prod-deps         | 10 min      |
| 8   | `mongoose` nao encontrado no runner (chat)    | pnpm strict mode nao hoista para root           | `--shamefully-hoist` no prod-deps                | 15 min      |

### 2.2 Runtime/Config

| #   | Problema                                    | Causa Raiz                                                   | Fix Aplicado                      |
| --- | ------------------------------------------- | ------------------------------------------------------------ | --------------------------------- |
| 9   | Chat-server porta NaN                       | Parseia porta de `CHAT_SERVER_URL` (HTTPS sem porta)         | `process.env.PORT ?? 3002`        |
| 10  | Health check `wget` falha                   | Alpine wget nao conecta a localhost no container             | `node fetch` no health check      |
| 11  | Health check compose sobrescreve Dockerfile | `docker-compose.prod.yml` tambem define healthcheck com wget | Atualizar compose para node fetch |
| 12  | Workers `unhealthy`                         | Herdam health check do Dockerfile mas nao tem porta HTTP     | `healthcheck: disable` no compose |
| 13  | CI health check timeout                     | `sleep 40` < `start_period(30s) + interval(30s)`             | `sleep 70`                        |

### 2.3 Cross-Domain/Auth

| #   | Problema                           | Causa Raiz                                                    | Fix Aplicado                                         |
| --- | ---------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------- |
| 14  | CORS bloqueado pelo Cloudflare     | Bot protection intercepta preflight OPTIONS                   | WAF Custom Rule "Skip"                               |
| 15  | Nginx 502 apos restart containers  | Nginx cacheia IP dos containers que mudam                     | `docker compose restart nginx`                       |
| 16  | Sessao nao persiste apos login     | Cookie setado em `api.bensseg.com`, nao compartilhado         | `crossSubDomainCookies` + `COOKIE_DOMAIN`            |
| 17  | `credentials: 'include'` faltando  | Auth client nao envia cookies cross-origin                    | Adicionar `fetchOptions: { credentials: 'include' }` |
| 18  | Proxy busca cookie com nome errado | `__Secure-` prefix em producao vs `better-auth.session_token` | Checar ambos os nomes                                |
| 19  | Senhas com `+/=` quebram URLs      | `openssl rand -base64` gera caracteres especiais              | `openssl rand -hex`                                  |
| 20  | `.env` com `${VAR}` interpolacao   | Docker Compose nao faz interpolacao aninhada                  | Valores diretos nas URLs                             |

---

## 3. Analise da Arquitetura Atual

### 3.1 Estrategia de Bundling (tsup + noExternal)

**Como funciona hoje:**

```
@repo/core, @repo/db, @repo/env, @repo/shared, @repo/auth
    ↓ (tsup noExternal — bundled inline)
apps/server/dist/server.js (1.73 MB)
```

Packages internos (`@repo/*`) sao marcados como `noExternal` no tsup, fazendo o bundle incluir todo o codigo deles. Dependencias externas (`fastify`, `pg`, `bullmq`, etc.) sao marcadas como `external` e resolvidas do `node_modules` em runtime.

**Problemas dessa abordagem:**

1. **Lista de externals incompleta** — Quando um package interno (`@repo/db`) importa uma lib externa (`pg` via `@prisma/adapter-pg`), essa lib tambem e bundled. Se ela usa CJS com `require()` dinamico, quebra em runtime. Tivemos que descobrir e adicionar `pg`, `@prisma/adapter-pg`, `@t3-oss/env-core`, `resend`, `@aws-sdk/*` manualmente.

2. **Fragilidade** — Qualquer novo `import` em qualquer package interno que traga uma lib CJS quebra o build silenciosamente (passa no build, falha no runtime). Nao ha validacao automatica.

3. **Duplicacao** — `@repo/core` e `@repo/db` sao bundled em `server.js` E `worker.js` (mesma imagem Docker). Nao e um problema de tamanho (1.7MB), mas e ineficiente.

4. **Prod-deps desacoplado** — O `prod-deps` stage precisa listar TODOS os packages que tem dependencias externas. Se um package novo e criado, o Dockerfile precisa ser atualizado manualmente.

### 3.2 Resolucao de Modulos no Docker (pnpm)

**Como funciona hoje:**

```
deps stage:    pnpm install → cria node_modules com symlinks pnpm
builder stage: COPY --from=deps /app ./ → copia tudo (preserva symlinks)
               COPY . . → sobrepoe source (node_modules excluido pelo .dockerignore)
prod-deps:     pnpm install --prod --shamefully-hoist → hoista tudo para root
runner stage:  COPY --from=prod-deps /app/node_modules → flat node_modules
```

**Problemas:**

1. **`shamefully-hoist` e um workaround** — pnpm existe para evitar hoisting fantasma. Usar `--shamefully-hoist` derrota o proposito. Funciona, mas e fragil.

2. **Symlinks do pnpm nao funcionam com Docker COPY seletivo** — Tentamos copiar `node_modules` parcialmente e falhamos. A unica coisa que funcionou foi `COPY --from=deps /app ./` (copia tudo).

3. **Sem `turbo prune`** — O Turborepo tem o comando `turbo prune <app> --docker` que cria um subconjunto minimo do monorepo para o Docker build. Nao usamos isso. Resultado: o Docker context inclui TODOS os packages, mesmo os que o app nao precisa.

### 3.3 Packages Sem Build Step

**Como funciona hoje:**
Todos os 7 packages (`db`, `db-chat`, `core`, `auth`, `env`, `shared`, `ai`) exportam **source TypeScript direto** (sem compilacao). O campo `exports` no `package.json` aponta para `./src/index.ts`.

**Impacto:**

- **Positivo:** Simplicidade. Sem build step intermediario. Mudancas refletem imediatamente.
- **Negativo:** tsup precisa de `noExternal` para resolver os imports, o que causa os problemas de bundling descritos acima.
- **Negativo:** `tsc --noEmit` (typecheck) precisa processar TODOS os packages a cada check, sem cache de compilacao.
- **Negativo:** Em producao, o runner precisa de `node_modules` para as dependencias dos packages, mesmo que o codigo deles esteja bundled. Isso cria a confusao sobre o que precisa estar no `prod-deps`.

### 3.4 Cross-Domain Cookie/Auth

**Como funciona hoje:**

```
app.bensseg.com (Vercel) → fetch → api.bensseg.com (VPS)
                                    ↓
                              Set-Cookie: __Secure-better-auth.session_token
                              Domain=bensseg.com; SameSite=Lax; Secure; HttpOnly
```

**Problemas encontrados:**

1. Cookie prefix `__Secure-` so existe em HTTPS — dev usa nome diferente de prod.
2. `SameSite=Lax` funciona entre subdominios do mesmo dominio, mas precisa de `credentials: 'include'` no fetch.
3. Middleware/proxy do Next.js roda server-side — precisa ler o cookie do request, nao do `document.cookie`.

### 3.5 Nginx como Reverse Proxy

**Problema recorrente:** Toda vez que um container e recriado, ele ganha um novo IP na rede Docker. O Nginx resolve os nomes (`server`, `chat-server`) no startup e cacheia o IP. Quando o container muda, Nginx retorna 502.

**Solucao atual:** `docker compose restart nginx` manual. Fragil.

---

## 4. Melhores Praticas da Industria (Pesquisado)

### 4.1 `turbo prune` para Docker (Recomendacao Oficial)

O Turborepo recomenda oficialmente o uso de `turbo prune <app> --docker` para builds Docker. Isso:

- Cria um subconjunto minimo do monorepo em `./out/`
- Separa `out/json/` (package.json's) de `out/full/` (source code)
- Gera lockfile minimo com apenas as dependencias necessarias
- Otimiza Docker layer caching (deps mudam menos que source)

```dockerfile
# Stage 1: Prune
FROM base AS pruner
COPY . .
RUN turbo prune server --docker

# Stage 2: Install deps (cached se package.json nao mudou)
FROM base AS installer
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Stage 3: Build
FROM base AS builder
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
RUN turbo build --filter=server
```

**Impacto:** Eliminaria os problemas 2, 3, 4, 5, 7, 8 da tabela acima.

### 4.2 Packages Compilados (Built Packages)

Em vez de exportar source TypeScript, cada package teria um `build` step que compila para JavaScript:

```json
{
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts"
  }
}
```

**Impacto:**

- Apps nao precisam de `noExternal` — packages ja sao JS, importados normalmente
- `external` list fica automatica — so dependencias dos apps
- TypeScript composite builds permitem cache incremental
- Docker runner so precisa de `node_modules` + `dist/` dos packages

### 4.3 Nginx resolver (Previne 502)

```nginx
resolver 127.0.0.11 valid=10s;  # Docker DNS resolver
set $upstream_server server:3001;
proxy_pass http://$upstream_server;
```

Com `resolver` + variavel, Nginx re-resolve o DNS a cada 10s. Elimina o problema de IP cacheado.

### 4.4 Docker Compose `depends_on` com Health + Nginx

Em vez de `--no-deps`, configurar o Nginx para tolerar backends indisponiveis:

```nginx
proxy_connect_timeout 5s;
proxy_next_upstream error timeout http_502;
```

---

## 5. Pontos Positivos

1. **Monorepo bem estruturado** — 5 apps + 7 packages com responsabilidades claras
2. **DDD Hybrid** — Separacao de dominios funciona bem
3. **tsup + ESM** — Build rapido, output moderno
4. **CI path-based triggers** — Deploys seletivos por app (server vs chat)
5. **Multi-stage Dockerfile** — Imagem final pequena (~150MB)
6. **Health checks** — Auto-restart em falha (quando configurados corretamente)
7. **SHA tagging** — Permite rollback preciso
8. **Separacao dev/prod** — `docker-compose.yml` (dev) vs `docker-compose.prod.yml` (prod)
9. **Cloudflare** — SSL gratis, DDoS protection, cache
10. **Better Auth crossSubDomainCookies** — Solucao elegante para auth cross-subdomain

## 6. Pontos Negativos

1. **Sem `turbo prune`** — Docker context inclui todo o monorepo
2. **`shamefully-hoist` como workaround** — Derrota o proposito do pnpm strict mode
3. **Lista de externals manual** — Cada nova dependencia CJS pode quebrar o runtime
4. **Packages sem build** — Obriga tsup a resolver TypeScript source em runtime do bundler
5. **Sem validacao de runtime** — Build passa mas app crasha (CJS dynamic require)
6. **Nginx IP caching** — 502 a cada redeploy ate restart manual
7. **Health check inconsistente** — Dockerfile e compose definiam health checks diferentes
8. **Sem smoke test pos-deploy** — CI so verifica "healthy", nao testa endpoints reais
9. **Cookie name muda entre dev/prod** — `better-auth.session_token` vs `__Secure-better-auth.session_token`
10. **`.env` fragil** — Caracteres especiais em senhas, interpolacao nao funciona, valores expostos

---

## 7. Recomendacoes de Melhorias

### Prioridade Alta (Impacto direto na estabilidade)

#### 7.1 Adotar `turbo prune` nos Dockerfiles

```dockerfile
FROM base AS pruner
WORKDIR /app
RUN npm i -g turbo
COPY . .
RUN turbo prune server --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=server
```

**Beneficios:** Elimina problemas de symlinks, reduz contexto Docker, melhora cache de layers.

#### 7.2 Compilar packages internos

Adicionar `tsup` build a cada package:

```
packages/db/tsup.config.ts       → dist/index.js (exporta Prisma client)
packages/core/tsup.config.ts     → dist/index.js (exporta use cases)
packages/env/tsup.config.ts      → dist/index.js (exporta env validado)
packages/auth/tsup.config.ts     → dist/index.js (exporta createAuth)
packages/shared/tsup.config.ts   → dist/index.js (exporta tipos)
```

Apps passam a importar de `dist/` em vez de `src/`. Remove necessidade de `noExternal`.

**Impacto:** Apps tsup config fica simples — so `external: [/node_modules/]` (tudo de node_modules e external automaticamente).

#### 7.3 Nginx resolver para Docker DNS

```nginx
resolver 127.0.0.11 valid=10s ipv6=off;

server {
    listen 443 ssl;
    server_name api.bensseg.com;

    set $backend_server server:3001;

    location / {
        proxy_pass http://$backend_server;
        # ... headers
    }
}
```

**Impacto:** Elimina 502 apos redeploy. Zero downtime.

#### 7.4 Smoke test no CI pos-deploy

```bash
# Apos docker compose up -d
sleep 70

# Verifica health
curl -sf https://api.bensseg.com/health || exit 1

# Verifica CORS
curl -sf -X OPTIONS -H "Origin: https://app.bensseg.com" \
  https://api.bensseg.com/api/auth/get-session | grep -q "access-control" || exit 1
```

### Prioridade Media (Melhoria de DX e manutenibilidade)

#### 7.5 TypeScript composite builds

Adicionar `references` no tsconfig para cache incremental:

```json
// apps/server/tsconfig.json
{
  "references": [
    { "path": "../../packages/core" },
    { "path": "../../packages/db" }
  ]
}
```

#### 7.6 Script de validacao de externals

Criar script que verifica se todas as dependencias importadas por packages sao ou bundled ou listadas como external no tsup config. Rodar no CI.

#### 7.7 `.env` validation script para VPS

Script que roda na VPS e valida o `.env` antes do deploy:

- Verifica se todas as variaveis obrigatorias existem
- Valida formato de URLs (sem caracteres quebrados)
- Testa conectividade com databases

#### 7.8 Separar imagens Docker por app

Em vez de 2 imagens (server+worker, chat+worker), criar 4 imagens independentes. Cada uma com apenas o que precisa. Reduz tamanho e melhora isolamento.

### Prioridade Baixa (Nice to have)

#### 7.9 Docker Compose profiles

Usar profiles para separar servicos opcionais:

```yaml
services:
  chat-worker:
    profiles: ['chat']
```

#### 7.10 Remote caching do Turborepo

Habilitar Turbo remote cache para compartilhar cache entre CI e dev local. Reduz tempo de build significativamente.

#### 7.11 Observabilidade

- Adicionar `promtail` + `Loki` (ou similar) para log aggregation
- `Prometheus` + `Grafana` quando tiver mais clientes

---

## 8. Arquitetura Proposta (Futuro)

```
Atual:
  packages/ → exportam TypeScript source
  apps/ → tsup bundle com noExternal (resolve packages inline)
  Docker → COPY tudo, shamefully-hoist, lista manual de externals

Proposto:
  packages/ → cada um compila para dist/ com tsup
  apps/ → tsup bundle sem noExternal (packages sao JS normal)
  Docker → turbo prune, pnpm install normal (sem shamefully-hoist)
```

### Build Flow Proposto

```
1. turbo build (packages compilam primeiro, apps depois — via dependsOn)
2. turbo prune server --docker (gera subconjunto minimo)
3. Docker build (instala deps do lockfile minimo, copia source, builda)
4. Runner stage (node_modules + dist/ de cada app)
```

### Estimativa de Esforco

| Melhoria             | Esforco | Impacto | ROI       |
| -------------------- | ------- | ------- | --------- |
| turbo prune          | 4-6h    | Alto    | Alto      |
| Compilar packages    | 6-8h    | Alto    | Alto      |
| Nginx resolver       | 30min   | Medio   | Altissimo |
| Smoke test CI        | 1h      | Medio   | Alto      |
| TS composite builds  | 2-3h    | Medio   | Medio     |
| Externals validation | 2h      | Medio   | Medio     |
| .env validation      | 1h      | Baixo   | Medio     |
| Separar imagens      | 3-4h    | Baixo   | Baixo     |

**Recomendacao de ordem:** Nginx resolver (30min) → turbo prune (4-6h) → Compilar packages (6-8h) → Smoke test CI (1h)

---

## 9. Licoes Aprendidas

1. **Sempre teste Docker build localmente antes de push** — Teriamos evitado 5+ fixes iterativos.
2. **pnpm strict mode + Docker = dor** — pnpm cria symlinks que Docker COPY nao preserva. `turbo prune` resolve.
3. **tsup noExternal e fragil** — Qualquer import CJS transitivo quebra em runtime. Prefira packages compilados.
4. **Dev localhost esconde problemas cross-domain** — CORS, cookies, DNS sao invisiveis em localhost.
5. **Cloudflare bot protection bloqueia APIs** — Sempre criar regra WAF "Skip" para subdominios de API.
6. **Nginx cacheia DNS do Docker** — Usar `resolver 127.0.0.11` com variavel upstream.
7. **Better Auth `__Secure-` prefix** — Em HTTPS, cookies recebem prefixo diferente de dev. Testar com ambos.
8. **`openssl rand -hex` > `-base64`** — Base64 gera `+/=` que quebram URLs. Hex e seguro.
9. **compose healthcheck sobrescreve Dockerfile HEALTHCHECK** — Definir em apenas um lugar.
10. **Workers nao tem porta HTTP** — Desabilitar health check para queue consumers.
