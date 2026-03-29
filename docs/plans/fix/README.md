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

## Auditoria Pre-Producao (29/03/2026)

> Auditoria completa: `docs/AUDITORIA-PRE-PRODUCAO.md`
> Spec: `docs/superpowers/specs/2026-03-29-audit-remediation-design.md`
> Plan: `docs/superpowers/plans/2026-03-29-audit-remediation.md`

### P0 — Blockers (4/4 resolvidos, PR #31)

| #    | Finding                                                          | Status    |
| ---- | ---------------------------------------------------------------- | --------- |
| P0-1 | Path traversal no /uploads/\*                                    | Corrigido |
| P0-2 | Occurrence routes sem tenant isolation                           | Corrigido |
| P0-3 | ENCRYPTION_KEY padrao all-zeros                                  | Corrigido |
| P0-4 | 4 tabelas sem RLS (Member, Invitation, Insurer, AuditLogArchive) | Corrigido |

### P1 — Critical (9/9 resolvidos, PR #32)

| #    | Finding                              | Status    |
| ---- | ------------------------------------ | --------- |
| P1-1 | Chat-server sem Helmet               | Corrigido |
| P1-2 | Webhook body logado com PII          | Corrigido |
| P1-3 | Chat-server sem error handler        | Corrigido |
| P1-4 | MongoDB sem enforcement de tenantId  | Corrigido |
| P1-5 | Sem validacao startDate < endDate    | Corrigido |
| P1-6 | Sem expiracao automatica de apolices | Corrigido |
| P1-7 | Kanban sem drag-and-drop             | Corrigido |
| P1-8 | Middleware de seguranca sem testes   | Corrigido |
| P1-9 | Import job status sem tenant check   | Corrigido |

### P2 — Major (27/27 resolvidos, PR #33)

| #     | Finding                                       | Status                                             |
| ----- | --------------------------------------------- | -------------------------------------------------- |
| P2-1  | Chat-server CORS aberto                       | Corrigido                                          |
| P2-2  | Widget rate limiters in-memory                | Corrigido                                          |
| P2-3  | Pino redact paths rasos                       | Corrigido                                          |
| P2-4  | CSRF middleware (documentado, nao necessario) | Corrigido                                          |
| P2-5  | Commission reversal nao atomica               | Corrigido                                          |
| P2-6  | LOST proposals editaveis                      | Corrigido                                          |
| P2-7  | Duplicate policy P2002                        | Corrigido                                          |
| P2-8  | Kanban sem paginacao por coluna               | Corrigido                                          |
| P2-9  | Insurer nao atribuivel em propostas           | Corrigido                                          |
| P2-10 | Claim sequence race condition                 | Ja estava corrigido (Redis INCR)                   |
| P2-11 | Member/Invitation update sem orgId            | Corrigido                                          |
| P2-12 | QR code cross-tenant                          | Corrigido                                          |
| P2-13 | Channel query sem tenantId                    | Corrigido                                          |
| P2-14 | Dashboard stats nao cacheados                 | Corrigido                                          |
| P2-15 | Parallel count() desnecessario                | Corrigido                                          |
| P2-16 | CSV export em memoria                         | Corrigido                                          |
| P2-17 | Missing trigram index                         | Corrigido                                          |
| P2-18 | Chat messages sem virtualizacao               | Corrigido                                          |
| P2-19 | Tabelas sem responsive columns                | Corrigido                                          |
| P2-20 | 30+ strings sem diacriticos                   | Corrigido                                          |
| P2-21 | Chat MessagesError sem retry                  | Corrigido                                          |
| P2-22 | Business logic em member-routes               | Corrigido                                          |
| P2-23 | channel-routes.ts 595 linhas                  | Corrigido                                          |
| P2-24 | Meta API responses sem Zod                    | Corrigido                                          |
| P2-25 | Mongoose double-cast pattern                  | Corrigido                                          |
| P2-26 | E2E tests rasos                               | Corrigido                                          |
| P2-27 | tenant-client.ts query fora do tx             | Analisado (correto com Prisma 7 AsyncLocalStorage) |

### P3 — Minor (0/21 resolvidos, pos-lancamento)

21 items pendentes — ver `docs/AUDITORIA-PRE-PRODUCAO.md` secao P3.

---

**Total pendente:** 21 items P3 (minor)
