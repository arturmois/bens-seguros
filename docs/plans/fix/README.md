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
| L2     | Claim number via Redis INCR atomico com fallback para aggregate                                                          | Corrigido         |
| M5     | Component decomposition — 4 componentes decompostos (client-form, policies-table, conversation-list, proposals-table)    | Corrigido         |
| L3     | Route files — member-routes split into member + invitation routes (387→194+232 lines)                                    | Corrigido         |
| M2     | Redis cache — insurers (24h TTL), members (1h TTL), org details (1h TTL) com silent fallback                             | Corrigido         |

---

## Pendentes

Nenhum item pendente.

---

**Total pendente:** 0 itens
