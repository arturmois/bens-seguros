# Features Backlog — Bens Seguros

> Atualizado: 26/03/2026

## Concluidas

| Feature | Descricao                                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------------------------- |
| F01     | Kanban propostas — removido (drag & drop sem valor real para o dominio)                                          |
| F02     | Import/Export CSV — 100% implementado (import clients via worker, export clients/policies/proposals/commissions) |
| F04     | Alertas Proativos — 100% implementado (job diario BullMQ, 4 checks, dashboard widget, alert counts API)          |
| F05     | Global Search — 100% implementado (Cmd+K command palette, search API)                                            |
| F11     | Settings > Membros — 100% implementado (6 rotas, 5 componentes, email)                                           |
| F12     | Settings > Organizacao — 100% implementado (3 rotas, 3 componentes, logo upload R2)                              |
| F13     | AI Agent Config — 100% implementado (CRUD + channel integration)                                                 |
| F03     | PDF Generation — cotacao + apolice (@react-pdf/renderer, R2 storage, PII masking)                                |

## Proximas (Longo Prazo)

| Arquivo                                                  | Esforco          | Impacto           | Descricao                            |
| -------------------------------------------------------- | ---------------- | ----------------- | ------------------------------------ |
| [F06-workflow-automation.md](F06-workflow-automation.md) | G (3-4sem)       | **Diferenciacao** | Motor de regras e automacoes         |
| [F07-multi-channel.md](F07-multi-channel.md)             | G (2-4sem/canal) | Aquisicao         | Web chat, Instagram, Telegram        |
| [F08-advanced-dashboard.md](F08-advanced-dashboard.md)   | M-G (1-3sem)     | Retencao          | Drill-down, comparativo, ranking     |
| [F09-public-api.md](F09-public-api.md)                   | G (4-6sem)       | Diferenciacao     | API publica + integracao seguradoras |
| [F10-mobile-app.md](F10-mobile-app.md)                   | G (6-8sem)       | Retencao          | PWA primeiro, React Native depois    |

---

**Total:** 10 features | 8 concluidas/removidas | 0 em design | 5 longo prazo

## Legenda de Impacto

- **Aquisicao:** Deal-breaker para novos clientes
- **Retencao:** Motivo para voltar ao sistema diariamente
- **Diferenciacao:** Nenhum concorrente BR oferece
