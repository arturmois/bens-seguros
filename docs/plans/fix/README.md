# Fix Backlog — Bens Seguros

> Auditoria completa: 24/03/2026
> Atualizado: 25/03/2026

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
| SEC-04 | PII sem redaction nos logs Pino                                                                                          | Corrigido         |
| SEC-05 | PII em Sentry error reports                                                                                              | Corrigido         |
| SEC-07 | Cache-Control headers (server + chat-server)                                                                             | Corrigido         |
| SEC-08 | Presigned URL expiry (900s)                                                                                              | Corrigido         |
| M3     | Workers sem timeout/concurrency                                                                                          | Corrigido         |
| M4     | Componentes pesados sem lazy load (charts, kanban, chat, QR code)                                                        | Corrigido         |

---

## Pendentes

### Seguranca (Prioridade Alta)

| Arquivo                                                              | Severidade | Esforco  | Descricao                           |
| -------------------------------------------------------------------- | ---------- | -------- | ----------------------------------- |
| [SEC-01-pii-encryption.md](SEC-01-pii-encryption.md)                 | CRITICO    | G (3-5d) | CPF/CNPJ em plaintext no PostgreSQL |
| [SEC-02-postgresql-rls.md](SEC-02-postgresql-rls.md)                 | CRITICO    | G (3-5d) | RLS nao implementado                |
| [SEC-03-presenter-pattern.md](SEC-03-presenter-pattern.md)           | HIGH       | M (2-3d) | CPF exposto para todas as roles     |
| [SEC-06-rate-limiting.md](SEC-06-rate-limiting.md)                   | HIGH       | M (1-2d) | Login brute force, Socket.IO flood  |
| [SEC-09-magic-bytes-validation.md](SEC-09-magic-bytes-validation.md) | MEDIO      | P (1h)   | Upload sem validacao de magic bytes |
| [SEC-10-internal-api-security.md](SEC-10-internal-api-security.md)   | MEDIO      | M (1d)   | Internal API com token estatico     |

### Performance e Quality

| Arquivo                                                        | Severidade | Esforco   | Descricao                      |
| -------------------------------------------------------------- | ---------- | --------- | ------------------------------ |
| [M1-nextjs-image.md](M1-nextjs-image.md)                       | MEDIO      | P (30min) | `<img>` nativo no chat         |
| [M2-redis-cache.md](M2-redis-cache.md)                         | MEDIO      | M (1-2d)  | Sem cache para dados estaticos |
| [H4-test-coverage.md](H4-test-coverage.md)                     | HIGH       | G (3-5d)  | ~40 use cases sem testes       |
| [M5-component-decomposition.md](M5-component-decomposition.md) | MEDIO      | M (1-2d)  | 6 componentes >200 linhas      |
| [L1-member-index.md](L1-member-index.md)                       | LOW        | P (15min) | Index (orgId, role) no Member  |
| [L2-claim-number-sequence.md](L2-claim-number-sequence.md)     | LOW        | P (1h)    | Claim number via aggregate     |
| [L3-route-files-size.md](L3-route-files-size.md)               | LOW        | M (1d)    | Route files >200 linhas        |

---

**Total pendente:** 13 itens | 6 Seguranca | 7 Quality/Performance
