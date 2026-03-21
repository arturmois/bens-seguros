# Bens Seguros - Roadmap de Implementacao

> Referencia: `/home/artur/projects/ESPECIFICACAO-FINAL.md`

## Fases

| Fase | Nome                 | Descricao                                                                  | Dependencias                      |
| ---- | -------------------- | -------------------------------------------------------------------------- | --------------------------------- |
| 0    | Foundation           | Monorepo, configs, Docker, CI/CD, design system base                       | Nenhuma                           |
| 1    | Auth & Multi-tenancy | Better Auth, CASL RBAC, Organization, Members, Invitations                 | Fase 0                            |
| 2    | Core ERP             | Clients, Proposals (DDD Full), Policies                                    | Fase 1                            |
| 3    | Insurance Operations | Claims, Endorsements, Assistances, Documents, Occurrences                  | Fase 2                            |
| 4    | Financial            | Commissions (DDD Full), Reports, Export CSV                                | Fase 2                            |
| 5    | Chat & Messaging     | Chat-server, chat-worker, Baileys, Meta, Socket.IO, Conversations          | Fase 1                            |
| 6    | AI & Notifications   | AI bot (Vercel AI SDK), email (Resend + React Email), in-app notifications | Fase 5 (chat), Fase 4 (comissoes) |
| 7    | Dashboard & Polish   | Dashboard metricas, audit log archive, dark mode, E2E tests, Bull Board    | Fase 4, Fase 5                    |

## Diagrama de Dependencias

```
Fase 0 (Foundation)
  └── Fase 1 (Auth & Multi-tenancy)
        ├── Fase 2 (Core ERP)
        │     ├── Fase 3 (Insurance Operations)
        │     └── Fase 4 (Financial)
        └── Fase 5 (Chat & Messaging)
              └── Fase 6 (AI & Notifications) ← tambem depende de Fase 4
                    └── Fase 7 (Dashboard & Polish)
```

## Planos por Fase

| Fase | Arquivo                           |
| ---- | --------------------------------- |
| 0    | `fase-00-foundation.md`           |
| 1    | `fase-01-auth-multitenancy.md`    |
| 2    | `fase-02-core-erp.md`             |
| 3    | `fase-03-insurance-operations.md` |
| 4    | `fase-04-financial.md`            |
| 5    | `fase-05-chat-messaging.md`       |
| 6    | `fase-06-ai-notifications.md`     |
| 7    | `fase-07-dashboard-polish.md`     |

## Principios

- **TDD:** test-first em todos use cases (obrigatorio em DDD Full)
- **DRY/YAGNI:** sem abstrações prematuras
- **Commits frequentes:** cada task termina com commit
- **5 Quality Gates:** lint, typecheck, build, test, acceptance
- **Conventional Commits:** feat:, fix:, refactor:, test:, chore:
