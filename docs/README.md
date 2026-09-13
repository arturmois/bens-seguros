# Documentacao — Bens Seguros

## Especificacoes e Design

| Documento                | Descricao                                                    |
| ------------------------ | ------------------------------------------------------------ |
| `ESPECIFICACAO-FINAL.md` | Especificacao completa do produto (requisitos, modulos, API) |
| `CHAT-SPEC.md`           | Especificacao do modulo de chat (WhatsApp, Socket.IO, AI)    |
| `SECURITY-SPEC.md`       | Especificacao de seguranca (LGPD, RBAC, criptografia)        |
| `SETTINGS-DESIGN.md`     | Design da pagina de configuracoes (layout, secoes, UX)       |

## Padroes e Arquitetura

| Documento                   | Descricao                                                     |
| --------------------------- | ------------------------------------------------------------- |
| `ARCHITECTURE-DECISIONS.md` | Decisoes de arquitetura (ADRs, GAPs, trade-offs)              |
| `FRONTEND-PATTERNS.md`      | Padroes do frontend (componentes, hooks, data fetching, auth) |
| `UI-PATTERNS.md`            | Padroes visuais (design system, tabelas, formularios, cores)  |
| `audits/2026-09-13-domain-analysis.md` | Mapa de domínio as-is (DDD estratégico: capacidades, conceitos, regras, acoplamentos, gaps) |
| `architecture/2026-09-13-modular-architecture.md` | Arquitetura modular alvo (proposta): 14 contextos, regras de camadas, contratos, eventos, ownership de dados, migração em 6 fases |
| `architecture/context-map.md` | Mapa de contextos vivo: módulos, dependências permitidas, catálogo de eventos, gateways |

## Operacional

| Documento                | Descricao                                                         |
| ------------------------ | ----------------------------------------------------------------- |
| `DEPLOY-TUTORIAL.md`     | Tutorial passo a passo de deploy em producao                      |
| `MULTI-CHANNEL-SETUP.md` | Configuracao dos canais: Web Chat, Messenger, Instagram, WhatsApp |

## Backlog e Planejamento

Tudo em `plans/`:

| Diretorio/Arquivo     | Descricao                                                              |
| --------------------- | ---------------------------------------------------------------------- |
| `plans/00-ROADMAP.md` | Roadmap geral (8 fases concluidas)                                     |
| `plans/features/`     | 4 features futuras (longo prazo): workflow, multi-channel, API, mobile |
| `plans/fix/`          | Historico de 27 correcoes resolvidas (0 pendente)                      |
