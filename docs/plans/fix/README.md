# Fix Backlog — Bens Seguros

> Auditoria completa: 24/03/2026

## Prioridade por Semana

### Semana 1 — Quick Wins (P effort, Alto impacto)

| Arquivo                                                            | Severidade | Esforco   | Descricao                                    |
| ------------------------------------------------------------------ | ---------- | --------- | -------------------------------------------- |
| [C1-type-assertions.md](C1-type-assertions.md)                     | CRITICO    | P (1h)    | 18 `as` type assertions no notification repo |
| [C2-vulnerable-deps.md](C2-vulnerable-deps.md)                     | CRITICO    | P (30min) | Dependencias com vulnerabilidades HIGH       |
| [C3-favicon.md](C3-favicon.md)                                     | CRITICO    | P (15min) | Favicon ausente — 404 em toda page load      |
| [H1-bull-board-rbac.md](H1-bull-board-rbac.md)                     | HIGH       | P (30min) | Bull Board acessivel sem RBAC                |
| [H2-audit-count-bug.md](H2-audit-count-bug.md)                     | HIGH       | P (30min) | Count de audit log ignora filtros            |
| [H3-empty-catch-handlers.md](H3-empty-catch-handlers.md)           | HIGH       | P (30min) | 5 empty catches no audit logger              |
| [H5-mobile-sidebar.md](H5-mobile-sidebar.md)                       | HIGH       | P (30min) | Sidebar aberta por default no mobile         |
| [SEC-04-pino-redaction.md](SEC-04-pino-redaction.md)               | HIGH       | P (30min) | PII sem redaction nos logs                   |
| [SEC-05-sentry-pii.md](SEC-05-sentry-pii.md)                       | HIGH       | P (30min) | PII em error reports do Sentry               |
| [SEC-07-cache-control-headers.md](SEC-07-cache-control-headers.md) | MEDIO      | P (15min) | Cache-Control ausente em /api/\*             |
| [SEC-08-presigned-url-expiry.md](SEC-08-presigned-url-expiry.md)   | MEDIO      | P (5min)  | URL expira em 1h, spec exige 15min           |
| [M3-worker-config.md](M3-worker-config.md)                         | MEDIO      | P (30min) | Workers sem timeout/concurrency              |
| [M4-dynamic-imports.md](M4-dynamic-imports.md)                     | MEDIO      | P (1h)    | Componentes pesados sem lazy load            |

### Semana 2-3 — Seguranca

| Arquivo                                                              | Severidade | Esforco   | Descricao                           |
| -------------------------------------------------------------------- | ---------- | --------- | ----------------------------------- |
| [SEC-03-presenter-pattern.md](SEC-03-presenter-pattern.md)           | HIGH       | M (2-3d)  | CPF exposto para todas as roles     |
| [SEC-06-rate-limiting.md](SEC-06-rate-limiting.md)                   | HIGH       | M (1-2d)  | Login brute force, Socket.IO flood  |
| [SEC-09-magic-bytes-validation.md](SEC-09-magic-bytes-validation.md) | MEDIO      | P (1h)    | Upload sem validacao de magic bytes |
| [SEC-10-internal-api-security.md](SEC-10-internal-api-security.md)   | MEDIO      | M (1d)    | Internal API com token estatico     |
| [M1-nextjs-image.md](M1-nextjs-image.md)                             | MEDIO      | P (30min) | `<img>` nativo no chat              |

### Mes 1 — Seguranca Critica (LGPD)

| Arquivo                                              | Severidade | Esforco  | Descricao                           |
| ---------------------------------------------------- | ---------- | -------- | ----------------------------------- |
| [SEC-01-pii-encryption.md](SEC-01-pii-encryption.md) | CRITICO    | G (3-5d) | CPF/CNPJ em plaintext no PostgreSQL |
| [SEC-02-postgresql-rls.md](SEC-02-postgresql-rls.md) | CRITICO    | G (3-5d) | RLS nao implementado                |
| [M2-redis-cache.md](M2-redis-cache.md)               | MEDIO      | M (1-2d) | Sem cache para dados estaticos      |

### Mes 2+ — Quality & Backlog

| Arquivo                                                        | Severidade | Esforco   | Descricao                     |
| -------------------------------------------------------------- | ---------- | --------- | ----------------------------- |
| [H4-test-coverage.md](H4-test-coverage.md)                     | HIGH       | G (3-5d)  | ~40 use cases sem testes      |
| [M5-component-decomposition.md](M5-component-decomposition.md) | MEDIO      | M (1-2d)  | 6 componentes >200 linhas     |
| [L1-member-index.md](L1-member-index.md)                       | LOW        | P (15min) | Index (orgId, role) no Member |
| [L2-claim-number-sequence.md](L2-claim-number-sequence.md)     | LOW        | P (1h)    | Claim number via aggregate    |
| [L3-route-files-size.md](L3-route-files-size.md)               | LOW        | M (1d)    | Route files >200 linhas       |

---

**Total:** 26 itens | 13 Quick Wins (Semana 1) | 5 Seguranca (Semana 2-3) | 3 LGPD (Mes 1) | 5 Backlog
