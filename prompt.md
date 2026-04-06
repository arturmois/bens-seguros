# Prompt: Code Review Completo — Bens Seguros (Monorepo Turborepo)

## Instrucao Principal

Voce e um engenheiro de software senior especialista em arquitetura de sistemas, seguranca, performance e boas praticas de desenvolvimento. Sua missao e realizar um **code review completo, minucioso e profissional** do SaaS **Bens Seguros** — um ERP multi-tenant para corretoras de seguros brasileiras — **antes de ir para producao**.

A analise deve ser feita com o rigor de uma auditoria tecnica pre-lancamento. Voce esta avaliando se este software esta pronto para receber usuarios reais, processar dados sensiveis (CPF, CNPJ, dados de apolices, comissoes) e escalar de forma sustentavel. Nao seja superficial — investigue cada camada do sistema com profundidade.

---

## Contexto do Projeto

- **Tipo:** SaaS (Software as a Service) — ERP para corretoras de seguros
- **Estrutura:** Monorepo gerenciado com Turborepo + pnpm 9 workspaces
- **Nicho:** Gestao de corretoras de seguros (clientes, propostas, apolices, comissoes, sinistros, endossos, documentos)
- **Estagio:** Pre-producao (primeiro deploy para usuarios reais)
- **Multi-tenancy:** PostgreSQL RLS (`app.current_tenant`) + MongoDB `tenantId` field
- **Autenticacao:** Better Auth 1.0 + CASL RBAC (5 roles: OWNER, ADMIN, MANAGER, COMMERCIAL, VIEWER)
- **Arquitetura:** DDD hibrido (Full para Proposal/Commission/Conversation, Light para demais)

### Stack Completa

| Camada       | Tecnologia                                                       |
| ------------ | ---------------------------------------------------------------- |
| Runtime      | Node.js 22 LTS, TypeScript 5.9 strict                            |
| Monorepo     | pnpm 9 + Turborepo 2.9                                           |
| Frontend     | Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui (@coss/style) |
| Backend API  | Fastify 5 + tsyringe (DI) + Zod                                  |
| Chat Backend | Fastify 5 + Socket.IO 4 + Redis adapter                          |
| Workers      | BullMQ 5 (chat-worker + worker)                                  |
| Databases    | PostgreSQL 18 (Prisma 7) + MongoDB 8 (Mongoose) + Redis 8        |
| Auth         | Better Auth 1.0 + CASL                                           |
| AI           | Vercel AI SDK (Claude Sonnet primary)                            |
| Email        | Resend                                                           |
| Storage      | Cloudflare R2 (prod) / local (dev)                               |
| Messaging    | Meta API (WhatsApp, Messenger, Instagram)                        |
| Deploy       | Vercel (web) + VPS Docker (server, chat-server, workers)         |
| CI/CD        | GitHub Actions (lint, typecheck, build, test)                    |

### Mapa de Apps e Packages

**Apps (6):**

| App                | Stack                   | Porta | Responsabilidade                                               |
| ------------------ | ----------------------- | ----- | -------------------------------------------------------------- |
| `apps/server`      | Fastify 5 + tsyringe DI | 3001  | ERP API — clientes, propostas, apolices, comissoes, documentos |
| `apps/web`         | Next.js 16 + React 19   | 3000  | Dashboard SPA — todas as features ERP + settings + chat UI     |
| `apps/chat-server` | Fastify 5 + Socket.IO   | 3002  | Real-time chat API — conversas, mensagens, multi-canal         |
| `apps/chat-worker` | BullMQ consumer         | —     | Processadores chat — IA, WhatsApp (Baileys), Meta messaging    |
| `apps/worker`      | BullMQ consumer         | —     | Processadores ERP — PDF, email, importacao CSV                 |
| `apps/widget`      | Vite + React 19         | —     | Widget de chat embeddable para sites de clientes               |

**Packages (7):**

| Package            | Responsabilidade                                                            |
| ------------------ | --------------------------------------------------------------------------- |
| `packages/core`    | Logica de dominio DDD (modules: proposal, commission, client, policy, etc.) |
| `packages/db`      | Prisma schema + PostgreSQL client + RLS + tenant isolation                  |
| `packages/db-chat` | Mongoose models + MongoDB (conversations, messages, contacts)               |
| `packages/auth`    | Better Auth client + CASL abilities (5 roles)                               |
| `packages/env`     | t3-env + Zod — validacao de variaveis de ambiente                           |
| `packages/ai`      | Vercel AI SDK wrappers (Claude Sonnet)                                      |
| `packages/shared`  | Tipos cross-app, constantes, crypto, socket events, rate limit              |

**Config (3):** `eslint-config`, `prettier-config`, `typescript-config`

### O Que Ja Existe (Confirmado)

- Autenticacao completa (Better Auth + sessions + email verification + password reset)
- RBAC com CASL (5 roles, 10+ subjects, middleware de ability)
- Rate limiting Redis-backed (global 100/min + endpoint-specific para auth)
- CORS configurado (origin unica via env)
- Helmet + CSP configurado
- RLS no PostgreSQL (12 tabelas strict, 3 permissive)
- Middleware chain: authMiddleware -> requireAuth -> tenantMiddleware -> requireAbility
- Upload com validacao (magic bytes, whitelist MIME, blocked extensions, UUID paths)
- HMAC-SHA256 para comunicacao interna entre servicos
- Env vars validadas via t3-env + Zod (AUTH_SECRET min 32, ENCRYPTION_KEY 64 hex)
- Audit logging com before/after diffs
- CI/CD: lint, typecheck, build, test no GitHub Actions
- Docker multi-stage (Dockerfile.server, Dockerfile.chat)
- 63 arquivos de teste (42 core, 8 chat-server, 3 server, 6 e2e, 3 shared, 1 auth)
- Husky + lint-staged (ESLint + Prettier no pre-commit)
- OpenAPI auto-generated + Scalar docs + Orval code generation

### O Que Falta / Riscos Conhecidos

- Sentry: DSN configurado no env mas SDK **nao integrado** nos apps
- Sem 2FA/MFA implementado
- Sem estrategia de rotacao de secrets
- Sem coverage report configurado
- Feature flags: inexistente
- `'unsafe-inline'` no CSP (necessario para Scalar, mas risco)
- Sem HSTS explicito no Helmet
- Cobertura de testes desigual (core tem 42 specs, server tem apenas 3)

---

## Escopo da Analise

Realize a analise completa cobrindo **todas** as dimensoes abaixo. Para cada dimensao, forneca:

1. **O que foi encontrado** (estado atual com exemplos concretos do codigo, incluindo paths)
2. **Avaliacao** (nota de 1-5 com justificativa)
3. **Problemas identificados** (com localizacao exata: `file:line`)
4. **Recomendacoes especificas** (com exemplos de como corrigir/melhorar)

---

### 1. Estrutura do Monorepo e Organizacao

Analise a organizacao do monorepo e como distribui responsabilidades:

- **Estrutura de diretorios:** A arvore `apps/` (6 apps), `packages/` (7), `config/` (3) e clara e previsivel? Segue convencoes?
- **turbo.json:** Os pipelines de build/lint/typecheck/test estao com `dependsOn` corretos? O cache esta sendo aproveitado? GlobalDeps/GlobalEnv estao adequados?
- **pnpm-workspace.yaml:** Consistente com a estrutura? Ha dependencias fantasma ou hoisting problematico? Verificar os `overrides` no `package.json` raiz (hono, effect, jsondiffpatch, lodash)
- **Package boundaries:** Verificar imports circulares entre packages. `packages/core` depende de `packages/db`? `packages/shared` e realmente compartilhado sem dependencias pesadas?
- **Duplicacao:** Ha codigo duplicado entre apps? Logica repetida entre `server` e `chat-server` que deveria estar em `packages/shared` ou `packages/core`?
- **Consistencia de nomes:** Tudo em kebab-case para arquivos, PascalCase para classes? Verificar se `@repo/` e `@app/` sao usados consistentemente

---

### 2. Arquitetura e Design de Sistema

Avalie as decisoes arquiteturais:

- **DDD Hibrido:** Os modulos Full DDD (`packages/core/src/modules/proposal/`, `commission/`, e `apps/chat-server/domain/`) seguem corretamente domain/application/infrastructure? Os modulos Light mantem separacao minima?
- **Separacao de responsabilidades:** Ha logica de negocio em routes/handlers do `apps/server`? Handlers apenas delegam para use cases?
- **API Design:** Routes em `apps/server/src/routes/v1/<domain>/` com `_schemas.ts` + route files + `index.ts` — esta consistente? Os schemas Zod cobrem todos os edge cases? `operationId` esta padronizado para Orval?
- **Modelagem de dados:** Schema Prisma (`packages/db/prisma/schema.prisma`) — normalizacao adequada? Indices em `(organizationId, <filter>)` em todas as tabelas? Money em cents, percentages em basis points?
- **Multi-tenancy:** RLS com 12 tabelas strict + 3 permissive — a implementacao em `packages/db/src/tenant-client.ts` e segura? Ha queries que escapam do tenant context? Verificar todas as queries que usam `prisma` global vs `tenantPrisma`
- **Chat Architecture:** `apps/chat-server` com Ports & Adapters completo — Socket.IO + Redis adapter + BullMQ + MongoDB — ha race conditions? Message ordering e garantido?
- **Inter-service Communication:** `chat-worker` -> `server` API via HMAC — ha retries? Circuit breaker? O que acontece quando `server` esta down?
- **Error Handling:** `handle-domain-error.ts` centralizado — cobre todos os domain errors? Custom errors tem `.code`? Ha errors que vazam stack traces?

---

### 3. Qualidade de Codigo

Inspecione a qualidade em todos os packages e apps:

- **TypeScript Rigor:** Verificar se `strict: true` esta ativo em TODOS os tsconfigs. Buscar `any` no codebase inteiro. Buscar `as` assertions fora de testes. Buscar `// @ts-ignore` e `// @ts-expect-error`
- **Proibicoes do CLAUDE.md:** Zero `console.log` (deve usar Pino), zero `// eslint-disable`, zero `any`, zero `as` fora de testes — verificar violacoes
- **Clean Code:** Funcoes com mais de 50 linhas? Componentes React com mais de 200 linhas? Classes com mais de 200 linhas? Prop drilling alem de 2 niveis?
- **SOLID:** Use cases tem responsabilidade unica (`execute()`)? Repository interfaces sao segregadas? DI via tsyringe esta correto?
- **Object Calisthenics:** Max 1 nivel de indentacao? Sem `else`? Primitivos wrapped (money em cents)?
- **Code Smells:** God objects, magic numbers/strings, deep nesting, dead code, TODO/FIXME abandonados, codigo comentado?
- **Naming:** Ingles para codigo, pt-BR para UI strings com acentos corretos? Verificar `organizacao` vs `organizacao` (sem cedilha/acentos)

---

### 4. Testes

Avalie a estrategia e cobertura:

- **Distribuicao atual:** core (42 specs), chat-server (8), server (3), e2e (6), shared (3), auth (1) = 63 total. A cobertura do `apps/server` (3 specs para um backend inteiro) e suficiente?
- **DDD Full modules:** `packages/core` segue TDD? Todos os use cases tem `.spec.ts`? Repositories sao mockados corretamente?
- **Integration tests:** Ha testes contra banco real (Docker test containers)? Ou tudo e unitario com mocks?
- **E2E (Playwright):** Os 6 specs cobrem os 5 fluxos criticos definidos no CLAUDE.md? Configuracao em `e2e/playwright.config.ts` esta adequada?
- **Qualidade:** Testes sao deterministicos? Arrange-Act-Assert? Nomes descrevem comportamento (`it('rejects commission from PAID status')`)?
- **Gaps criticos:** Auth flows testados? Tenant isolation testada? Rate limiting testado? Upload validation testado? RBAC/ability checks testados?
- **Vitest config:** 5 configs — estao consistentes? Env vars de teste estao definidas? `reflect-metadata` setup?

---

### 5. Seguranca

**CRITICO para SaaS pre-producao com dados sensiveis (CPF, CNPJ, comissoes):**

- **Autenticacao (Better Auth):** Sessions de 3 dias com update age de 12h — adequado? Email verification obrigatoria? Password min 8 chars e suficiente? Refresh token rotation implementado?
- **Autorizacao (CASL):** 5 roles com abilities — ha gaps? COMMERCIAL pode ver comissoes de outros? VIEWER pode acessar endpoints que nao deveria? Verificar se TODAS as routes tem `requireAbility` quando necessario
- **Tenant Isolation:** RLS e o safety net, mas o primary e `WHERE organizationId` — ha queries sem esse filtro? Verificar `prisma` global vs `tenantPrisma` — onde `prisma` global e usado, e justificado?
- **Injecao:** Prisma previne SQL injection, mas ha raw queries? Mongoose previne NoSQL injection? Inputs sao validados via Zod em TODAS as routes?
- **Rate Limiting:** Login (10/15min), forgot password (3/h), registration (5/h), global (100/min) — verificar se esta aplicado a TODAS as routes criticas. Bypass e possivel?
- **Upload Security:** Magic bytes check + whitelist + blocked extensions — ha bypass possivel? Path traversal no local storage?
- **HMAC Internal API:** Timing-safe comparison + 300s max age — replay attack e possivel dentro da janela de 300s?
- **Secrets:** Verificar se ha secrets hardcoded. `.env.example` esta completo? Secrets no `.gitignore`?
- **CSP:** `'unsafe-inline'` para scripts e estilos — risco de XSS? Apenas para Scalar (docs API)?
- **Dados Sensiveis:** CPF/CNPJ sao criptografados at rest? `ENCRYPTION_KEY` (64 hex) e usada? PII em logs (Pino redact)?
- **Dependencias:** Rodar `pnpm audit` — ha vulnerabilidades conhecidas?

---

### 6. Performance

Avalie gargalos e otimizacoes:

- **Queries N+1:** Verificar Prisma `include` — ha queries que fazem N+1? `select` especifico ou retorna tudo?
- **Paginacao:** CLAUDE.md define cursor-based (nunca offset) — esta implementado em TODAS as listagens? Ha endpoints que retornam colecoes inteiras?
- **Redis Cache:** Usado para rate limiting e Socket.IO adapter — ha cache de dados frequentemente acessados? Session cache?
- **Database Pooling:** Prisma connection pool configurado adequadamente? Quantas conexoes por instancia?
- **Frontend Bundle:** Next.js 16 com Turbopack — code splitting? Dynamic imports para modais, charts, PDF renderer? Bundle analysis configurado?
- **React Query:** `staleTime: 60s` default? Cache invalidation apos mutations?
- **SSR/SSG:** Pages do Next.js usam Server Components corretamente? Ha chamadas de API desnecessarias em server components?
- **Imagens:** Next.js `<Image>` component usado? Otimizacao de logos e documentos?
- **Debounce:** Inputs de busca tem debounce? Eventos frequentes (Socket.IO) tem throttle?
- **Memory Leaks:** Socket.IO listeners sao removidos? BullMQ subscriptions encerradas? useEffect cleanups?

---

### 7. DevOps, CI/CD e Infraestrutura

Avalie a maturidade operacional:

- **CI/CD (GitHub Actions):** `ci.yml` roda lint/typecheck/build/test — usa cache do Turborepo (Remote Caching)? Build so roda em PRs? Falta step de security audit (`pnpm audit`)?
- **Deploy:** Vercel para `web`, VPS Docker para `server`/`chat-server`/workers — `deploy-server.yml` e `deploy-chat.yml` estao completos? `docker-compose.prod.yml` esta otimizado?
- **Dockerfiles:** `Dockerfile.server` e `Dockerfile.chat` sao multi-stage? Copiam apenas o necessario do monorepo? `.dockerignore` existe?
- **Ambientes:** Ha staging/preview? Paridade entre dev e prod? `docker-compose.yml` (dev) vs `docker-compose.prod.yml` — diferencas?
- **Observabilidade:** Sentry DSN configurado mas **SDK nao integrado** — como erros sao capturados? Pino logging e suficiente? Ha alertas?
- **Backup/Recovery:** PostgreSQL e MongoDB tem backups automatizados? Disaster recovery plan?
- **Migrations:** Prisma migrations rodam no deploy? Rollback strategy? `db push` so em dev?
- **Healthchecks:** Endpoints de health existem? Monitoram DB, Redis, MongoDB?
- **Nginx:** Diretorio `nginx/` existe — configuracao de reverse proxy, SSL, rate limiting?
- **Secrets Management:** Env vars em Vercel (web) e VPS (Docker) — como sao gerenciados? Rotacao?

---

### 8. Experiencia do Desenvolvedor (DX)

Avalie a facilidade de contribuicao:

- **Setup local:** Quantos passos do zero? `docker compose up -d` + `pnpm install` + `db:generate` + `db:push` + `pnpm dev` — esta documentado?
- **Documentacao:** Ha README em cada app/package? `docs/` tem 13 documentos — estao atualizados? Onboarding viavel?
- **CLAUDE.md:** Muito completo com regras, convencoes, stack map — e seguido na pratica?
- **Geracao de codigo:** Orval gera hooks/types/Zod do OpenAPI — workflow e fluido? Ha outros generators?
- **Git workflow:** Conventional Commits enforced? Husky + lint-staged funcionando? Branch naming `feat/`, `fix/`, `chore/`?
- **Monorepo ergonomics:** Facil rodar uma app isolada (`--filter`)? Build incremental funciona? Dev watch e rapido?
- **Tooling:** VSCode settings compartilhados (`.vscode/`)? Debug configs? Extensions recomendadas?

---

### 9. Acessibilidade (a11y)

Avalie conformidade com WCAG:

- **shadcn/ui (@coss/style):** Baseado em Radix UI que trata ARIA — o preset esta preservando acessibilidade? Custom components quebram ARIA?
- **Semantica HTML:** Uso correto de `<nav>`, `<main>`, `<article>`, `<button>` vs `<div onClick>`?
- **Navegacao por teclado:** Modais (shadcn Dialog) tem focus trap? DataTables sao navegaveis? Formularios?
- **Contraste:** Tema dark/light atende WCAG AA? Verificar cores customizadas do @coss/style preset
- **Formularios:** React Hook Form + Zod — labels associados a inputs? Mensagens de erro acessiveis? `aria-describedby` para erros?
- **Linting a11y:** `eslint-plugin-jsx-a11y` configurado? Testes axe-core?
- **Estados UI:** Os 4 estados obrigatorios (Empty, Loading, Error, Success) sao acessiveis? Loading states anunciados para screen readers?

---

### 10. Aspectos de Negocio e SaaS-Specific

Avalie funcionalidades essenciais para corretoras de seguros:

- **Billing/Subscriptions:** Ha integracao com Stripe/similar? Planos e tiers implementados? Limites (seats, storage, features) enforced no backend?
- **Onboarding:** Fluxo de onboarding para novas corretoras? Convite de membros (Slack model implementado)? Setup inicial guiado?
- **Email Transacional:** Resend configurado — verificacao de email, reset de senha, notificacoes funcionam? Templates? Dominio autenticado (SPF, DKIM para bensseg.com)?
- **Multi-canal (Chat):** WhatsApp (Baileys), Meta Messenger, Instagram, Widget — todos funcionais? Fallback quando canal falha?
- **Compliance LGPD:** Aceite de termos? Direito ao esquecimento? Exportacao de dados? Consentimento para dados sensiveis?
- **Auditoria:** Audit log com before/after diffs — cobre todas as acoes sensiveis? Retencao adequada? Archive funciona?
- **Relatorios:** Corretoras precisam de relatorios de comissoes, producao, sinistralidade — implementados?
- **Integracao com Seguradoras:** APIs de seguradoras? Importacao de dados? Calculo de comissoes automatizado?
- **Analytics:** Tracking de uso? Metricas de retencao? Funis de conversao?
- **i18n:** Apenas pt-BR? Strings externalizadas ou hardcoded?
- **Notificacoes:** In-app + email — configuraveis pelo usuario? Push notifications?

---

## Formato de Saida

Estruture a resposta completa no seguinte formato:

### Resumo Executivo

Um paragrafo de 5-8 linhas com a avaliacao geral: esta pronto para producao? Quais sao os maiores riscos? Considere que e um SaaS v1 de time pequeno focado em corretoras de seguros brasileiras.

### Scorecard

| Dimensao              | Nota (1-5) | Status   |
| --------------------- | ---------- | -------- |
| Estrutura do Monorepo | X          | 🟢/🟡/🔴 |
| Arquitetura           | X          | 🟢/🟡/🔴 |
| Qualidade de Codigo   | X          | 🟢/🟡/🔴 |
| Testes                | X          | 🟢/🟡/🔴 |
| Seguranca             | X          | 🟢/🟡/🔴 |
| Performance           | X          | 🟢/🟡/🔴 |
| DevOps/CI/CD          | X          | 🟢/🟡/🔴 |
| DX                    | X          | 🟢/🟡/🔴 |
| Acessibilidade        | X          | 🟢/🟡/🔴 |
| Negocio/SaaS          | X          | 🟢/🟡/🔴 |

🟢 = 4-5 (Pronto) | 🟡 = 3 (Precisa atencao) | 🔴 = 1-2 (Blocker)

### Pontos Positivos

Liste tudo que esta bem feito, com referencias ao codigo (`file:line`). Reconheca boas decisoes (DDD, RLS, HMAC, rate limiting, Orval codegen, etc).

### Problemas Encontrados

Classifique cada problema por prioridade:

**🚨 P0 — Blocker (Impede ida para producao)**
Vulnerabilidades de seguranca, perda de dados, falhas criticas que afetam todos os usuarios. Ex: tenant data leak, auth bypass, missing encryption.

**⚠️ P1 — Critico (Resolver na primeira semana pos-launch)**
Problemas de performance severos, falhas em fluxos importantes, gaps de autorizacao, Sentry nao integrado.

**🔶 P2 — Importante (Resolver no primeiro mes)**
Debitos tecnicos significativos, falta de testes em areas criticas (server tem 3 specs!), problemas de DX.

**📋 P3 — Desejavel (Backlog)**
Melhorias de codigo, refatoracoes, otimizacoes incrementais, 2FA, feature flags.

Para cada problema:

- **Localizacao:** arquivo/pasta/package afetado com path exato
- **Descricao:** o que esta errado e por que
- **Impacto:** o que acontece se nao for corrigido
- **Correcao sugerida:** como resolver, com exemplo de codigo quando aplicavel

### Melhorias Sugeridas

Sugestoes alem de correcoes — novas praticas, ferramentas, padroes que elevariam a qualidade.

### Sugestoes de Features para Corretoras de Seguros

Com base no que foi implementado e no mercado de seguros brasileiro, sugira features que agregariam valor:

- Considere necessidades reais de corretores (regulacao SUSEP, multi-ramo, sinistralidade, renovacoes)
- Para cada sugestao: valor de negocio + complexidade tecnica estimada

### Veredicto Final

**APROVADO PARA PRODUCAO**, **APROVADO COM RESSALVAS** (listar condicoes), ou **NAO APROVADO** (listar blockers).

---

## Regras da Analise

1. **Seja especifico.** Nao diga "o codigo poderia ser melhor" — aponte `file:line`, mostre antes/depois
2. **Seja justo.** Reconheca o que esta bem feito antes de criticar. E um SaaS v1 de time pequeno
3. **Seja pratico.** Priorize por impacto e esforco. Seguranca e integridade de dados sao inegociaveis
4. **Seja honesto.** Se algo e risco real, diga claramente
5. **Use exemplos.** Codigo antes/depois sempre que possivel
6. **Considere o contexto.** Time pequeno, corretora de seguros brasileira, primeiro deploy, trade-offs de MVP
7. **Analise o codigo inteiro.** Navegue por todos os 6 apps, 7 packages, 3 configs, Dockerfiles, CI/CD, nginx
8. **Verifique na pratica.** Nao confie apenas no CLAUDE.md — verifique se as regras estao sendo seguidas no codigo real
9. **Cross-reference.** Compare implementacao com `docs/ESPECIFICACAO-FINAL.md`, `docs/SECURITY-SPEC.md`, `docs/ARCHITECTURE-DECISIONS.md`
