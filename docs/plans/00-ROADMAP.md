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

## Proximos Passos

- **Features** — backlog de features futuras em `features/`
- **Fixes** — backlog de correcoes pendentes em `fix/`
- **Auditorias** — itens por severidade: `audit-critico.md`, `audit-high.md`, `audit-medium.md`, `audit-low.md`
