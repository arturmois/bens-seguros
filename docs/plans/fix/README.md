# Fix Backlog — Bens Seguros

> Auditoria completa: 24/03/2026
> Atualizado: 26/03/2026

## Resolvidos

Os seguintes itens da auditoria ja foram corrigidos:

| Item   | Descricao                                                                                                                | Status            |
| ------ | ------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| C1     | Type assertions no notification repo                                                                                     | Corrigido         |
| C2     | Deps vulneraveis (overrides adicionados; ai@4.x nao atualiza para v5 por incompatibilidade com zod 4 — vuln low/teorica) | Mitigado          |
| C3     | Favicon ausente                                                                                                          | Corrigido         |
| H1     | Bull Board RBAC (ja protegia via scoped plugin com requireAbility)                                                       | Ja estava correto |
| H2     | Audit count ignora filtros                                                                                               | Corrigido         |
| H3     | Empty catches no audit logger                                                                                            | Corrigido         |
| H5     | Sidebar aberta no mobile                                                                                                 | Corrigido         |
| SEC-01 | PII encryption (AES-256-GCM + HMAC-SHA256 hash + masking)                                                                | Corrigido         |
| SEC-02 | PostgreSQL RLS (tenant_isolation policies + SET LOCAL via Prisma extension)                                              | Corrigido         |
| SEC-03 | Presenter pattern (role-based PII masking: list masked, detail by role/ownership)                                        | Corrigido         |
| SEC-04 | PII sem redaction nos logs Pino                                                                                          | Corrigido         |
| SEC-05 | PII em Sentry error reports                                                                                              | Corrigido         |
| SEC-07 | Cache-Control headers (server + chat-server)                                                                             | Corrigido         |
| SEC-08 | Presigned URL expiry (900s)                                                                                              | Corrigido         |
| M3     | Workers sem timeout/concurrency                                                                                          | Corrigido         |
| M4     | Componentes pesados sem lazy load (charts, kanban, chat, QR code)                                                        | Corrigido         |
| SEC-06 | Rate limiting granular (auth Redis ZSET, Socket.IO in-memory, @fastify/rate-limit global + invitations)                  | Corrigido         |
| M1     | Next.js Image no chat (zero `<img>` tags)                                                                                | Corrigido         |
| L1     | Index composto (organizationId, role) no Member                                                                          | Corrigido         |
| SEC-09 | Magic bytes validation (file-type + extension blocklist + MIME allowlist)                                                | Corrigido         |
| SEC-10 | Internal API HMAC security (signRequest/verifyRequest + timingSafeEqual + 20 req/min rate limit)                         | Corrigido         |
| H4     | Test coverage — 22 test files adicionados, 23 use cases cobertos (state machines, financeiro, validacao, dominio)        | Corrigido         |

---

## Pendentes

### Performance e Quality

| Arquivo                                                        | Severidade | Esforco  | Descricao                      |
| -------------------------------------------------------------- | ---------- | -------- | ------------------------------ |
| [M2-redis-cache.md](M2-redis-cache.md)                         | MEDIO      | M (1-2d) | Sem cache para dados estaticos |
| [M5-component-decomposition.md](M5-component-decomposition.md) | MEDIO      | M (1-2d) | 6 componentes >200 linhas      |
| [L2-claim-number-sequence.md](L2-claim-number-sequence.md)     | LOW        | P (1h)   | Claim number via aggregate     |
| [L3-route-files-size.md](L3-route-files-size.md)               | LOW        | M (1d)   | Route files >200 linhas        |

---

**Total pendente:** 4 itens | 0 Seguranca | 4 Quality/Performance
