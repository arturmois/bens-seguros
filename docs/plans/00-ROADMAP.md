# Bens Seguros - Roadmap de Implementacao

> Referencia: `docs/ESPECIFICACAO-FINAL.md`

## Fases

| Fase | Nome                 | Status    | Descricao                                                                  |
| ---- | -------------------- | --------- | -------------------------------------------------------------------------- |
| 0    | Foundation           | Concluida | Monorepo, configs, Docker, CI/CD, design system base                       |
| 1    | Auth & Multi-tenancy | Concluida | Better Auth, CASL RBAC, Organization, Members, Invitations                 |
| 2    | Core ERP             | Concluida | Clients, Proposals (DDD Full), Policies                                    |
| 3    | Insurance Operations | Concluida | Claims, Endorsements, Assistances, Documents, Occurrences                  |
| 4    | Financial            | Concluida | Commissions (DDD Full), Reports, Export CSV                                |
| 5    | Chat & Messaging     | Concluida | Chat-server, chat-worker, Baileys, Meta, Socket.IO, Conversations          |
| 6    | AI & Notifications   | Concluida | AI bot (Vercel AI SDK), email (Resend + React Email), in-app notifications |
| 7    | Dashboard & Polish   | Concluida | Dashboard metricas, audit log archive, dark mode, E2E tests, Bull Board    |

**Todas as 8 fases do MVP estao concluidas.**

## Pos-MVP

| Item                 | Status    | Descricao                                                                                                              |
| -------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| Audit Remediation P0 | Concluido | Path traversal, Occurrence isolation, ENCRYPTION_KEY, RLS (PR #31)                                                     |
| Audit Remediation P1 | Concluido | Helmet, error handler, MongoDB plugin, policy expiration, Kanban DnD, middleware tests (PR #32)                        |
| Audit Remediation P2 | Concluido | CORS, tenant gaps, atomic reversal, Redis cache, CSV streaming, route refactoring, diacritics, virtualization (PR #33) |
| Audit Remediation P3 | Pendente  | 21 minor findings para pos-lancamento                                                                                  |

## Proximos Passos

- **Features** — backlog de features futuras em `features/`
- **Fixes** — backlog de correcoes pendentes em `fix/`
- **Auditorias** — itens por severidade: `audit-critico.md`, `audit-high.md`, `audit-medium.md`, `audit-low.md`
