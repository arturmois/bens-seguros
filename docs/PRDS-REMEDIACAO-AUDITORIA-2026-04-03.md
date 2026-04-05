# PRDs de Remediacao Pre-Producao

**Data:** 2026-04-03
**Base:** Auditoria tecnica completa de prontidao para producao
**Escopo:** Bens Seguros ERP SaaS
**Objetivo do documento:** transformar os achados da auditoria em frentes executaveis de produto e engenharia, com criterio claro de aceite antes de liberacao para producao

---

## Como ler este documento

Este arquivo contem 10 PRDs, um para cada pilar auditado:

1. Arquitetura
2. Escalabilidade
3. Performance
4. Seguranca
5. Confiabilidade
6. Banco de Dados
7. DevOps / Infra
8. UX / Produto
9. Custos
10. Riscos de Negocio

Cada PRD abaixo deve ser tratado como uma frente de remediacao pre-producao. Itens marcados como bloqueadores impedem `GO-LIVE`.

---

## PRD-01 - Arquitetura e Isolamento de Dominio

**Status:** Bloqueador de producao
**Prioridade:** P0
**Owner sugerido:** Arquitetura + Backend

### Contexto

O ERP principal possui uma boa tentativa de modularizacao por dominio, mas o isolamento real entre camadas e tenants ainda depende demais de convencao de codigo. O chat e o ERP tambem usam mecanismos diferentes de isolamento e autorizacao.

### Problema

- O multi-tenant nao e enforced por arquitetura de forma uniforme.
- O `global prisma` e usado em muitos fluxos sensiveis.
- RLS existe, mas nao e mecanismo obrigatorio para toda operacao.
- O chat usa `tenantId` manual em MongoDB, sem enforcement forte.

### Objetivo

Definir e implementar uma arquitetura onde isolamento por tenant, autorizacao e fronteiras entre camada de aplicacao, dominio e persistencia sejam obrigatorios por desenho, nao opcionais por disciplina.

### Escopo

- Padronizar acesso a dados do ERP para exigir contexto de tenant.
- Padronizar acesso a dados do chat para exigir contexto de tenant.
- Remover caminhos paralelos inseguros com bypass de tenant enforcement.
- Documentar contratos entre `domain`, `application`, `infra` e `routes`.

### Fora de escopo

- Refatoracao cosmetica sem efeito em isolamento ou risco operacional.
- Reescrita completa do monolito ou split em microservicos.

### Requisitos funcionais

- Toda operacao tenant-scoped deve exigir contexto de tenant no ponto de entrada.
- Nenhum repositorio tenant-scoped pode ser instanciado sem tenant context explicito.
- Toda rota deve declarar claramente autenticacao, tenant resolution e autorizacao.
- O chat deve adotar um mecanismo padrao de enforcement equivalente ao ERP.

### Requisitos nao funcionais

- O enforcement deve falhar em modo seguro.
- O custo operacional do enforcement nao pode degradar throughput de forma inviavel.
- A arquitetura final deve ser documentada em ADR e diagrama de fluxo.

### Entregaveis

- RFC/ADR de isolamento multi-tenant.
- Refatoracao dos repositorios e factories.
- Checklist de boundaries por modulo.
- Testes de isolamento entre tenants no ERP e no chat.

### Metricas de sucesso

- 100% das rotas tenant-scoped cobertas por testes de isolamento.
- 0 acessos tenant-scoped usando client global sem justificativa formal.
- 0 bypasses de tenant context em code review.

### Criterios de aceite

- Nao existe caminho de leitura ou escrita tenant-scoped sem tenant context obrigatorio.
- Testes automatizados provam que um tenant nao enxerga nem altera dados de outro.
- O desenho final esta documentado e aprovado pela arquitetura.

### Dependencias

- PRD-04 Seguranca
- PRD-06 Banco de Dados

---

## PRD-02 - Escalabilidade Operacional e Horizontal

**Status:** Critico
**Prioridade:** P1
**Owner sugerido:** Backend + Plataforma

### Contexto

O sistema usa Redis, BullMQ, Prisma, MongoDB e Socket.IO. Ha boas bases para escala, mas varios mecanismos ainda sao locais ao processo ou nao foram desenhados para operacao horizontal segura.

### Problema

- Rate limit de socket esta em memoria por processo.
- Alguns fluxos pesados ainda rodam no request thread.
- A estrategia de cache e pontual, nao sistemica.
- O dashboard evita tenant-safe path por problema de pool e escalabilidade.

### Objetivo

Preparar o sistema para crescimento de usuarios, operadores, conversas e volume de operacoes sem degradacao severa nem vazamento de isolamento.

### Escopo

- Redis-based rate limiting distribuido para sockets e widget.
- Revisao de concorrencia de workers e throughput por fila.
- Politica de cache para dashboard, organization e consultas pesadas.
- Revisao de pool, fan-out e backpressure para Prisma, BullMQ e Socket.IO.

### Fora de escopo

- Autoscaling cloud nativo.
- Migração de banco ou troca de stack.

### Requisitos funcionais

- Socket rate limit deve funcionar igual com 1 ou N instancias.
- Filas criticas devem ter politicas explicitas de concorrencia, retry e retention.
- Fluxos pesados devem sair do request path quando possivel.

### Requisitos nao funcionais

- O sistema deve suportar escalonamento horizontal do chat sem perda de protecao anti-abuso.
- O dashboard nao pode depender de bypass de seguranca para performar.

### Entregaveis

- Rate limiter distribuido em Redis.
- Tabela de sizing por fila.
- Politica de cache por endpoint.
- Plano de tuning de pool do Prisma e Redis.

### Metricas de sucesso

- 0 limitadores criticos em memoria local.
- p95 estavel sob carga com 2x a capacidade atual esperada.
- Reducao do tempo medio de resposta em consultas pesadas.

### Criterios de aceite

- Teste de carga com multiplas instancias sem furar rate limit.
- Filas criticas processam backlog sem crescimento indefinido.
- Dashboard continua responsivo sem relaxar enforcement de tenant.

### Dependencias

- PRD-03 Performance
- PRD-05 Confiabilidade

---

## PRD-03 - Performance e Processamento Assincrono

**Status:** Critico
**Prioridade:** P1
**Owner sugerido:** Backend

### Contexto

Existem operacoes CPU e IO intensivas no caminho sincrono, incluindo renderizacao de PDF, upload, queries agregadas e integracoes externas.

### Problema

- PDFs ainda sao gerados inline em varios endpoints.
- Consultas analiticas fazem fan-out grande.
- Integracoes externas e uploads podem alongar requests.
- O request path esta sendo usado para trabalho que deveria ser de fila.

### Objetivo

Reduzir latencia de API e evitar timeout sob carga, movendo trabalho pesado para fluxos assincornos e melhorando consultas quentes.

### Escopo

- Mover geracao de PDF para BullMQ.
- Definir polling ou notificacao de job para downloads.
- Revisar endpoints com fan-out de query.
- Introduzir timeouts e limites para chamadas externas.

### Fora de escopo

- Reescrita do modulo de relatorios.
- Nova engine de BI.

### Requisitos funcionais

- Endpoints de PDF devem responder rapidamente com job id ou URL cacheada.
- Operacoes demoradas devem ser rastreaveis por status.
- Toda chamada externa deve ter timeout configurado.

### Requisitos nao funcionais

- p95 dos endpoints criticos deve cair para faixa aceitavel em producao.
- Nenhum endpoint critico deve bloquear worker thread por renderizacao longa.

### Entregaveis

- Nova fila de geracao de PDF.
- Contrato de API async para relatorios e documentos.
- Lista de queries quentes com plano de otimizacao.

### Metricas de sucesso

- Reducao de p95 e p99 em endpoints de exportacao.
- Queda de erro por timeout em operacoes pesadas.
- Backlog de jobs dentro de SLA definido.

### Criterios de aceite

- Nenhum endpoint de PDF faz render completo no request path.
- Dashboards e exports passam em teste de carga sem timeout critico.

### Dependencias

- PRD-02 Escalabilidade
- PRD-06 Banco de Dados

---

## PRD-04 - Seguranca, LGPD e Controle de Acesso

**Status:** Bloqueador de producao
**Prioridade:** P0
**Owner sugerido:** Security + Backend

### Contexto

O sistema manipula PII, dados operacionais de corretora, documentos de clientes, chat, autenticacao, widget publico e integracoes externas. O baseline atual e insuficiente para o risco do dominio.

### Problema

- Ausencia de MFA e step-up auth para operacoes sensiveis.
- Token de chat com vida longa e sem revogacao.
- Replay possivel em rota interna HMAC.
- Tenant isolation depende de disciplina de codigo.
- Validacao de upload ainda permissiva para alguns tipos.
- Politicas de acesso e revogacao nao sao fortes o suficiente para operacao financeira.

### Objetivo

Elevar o baseline de seguranca para nivel adequado a um SaaS multi-tenant financeiro, cobrindo autenticacao, autorizacao, anti-abuso, protecao de PII e operacao segura de canais publicos.

### Escopo

- MFA para usuarios internos.
- Revogacao/revalidacao de acesso no chat.
- Anti-replay com nonce/idempotency na API interna.
- Hardening de uploads e widget.
- Revisao OWASP Top 10 para APIs e chat.
- Reforco de LGPD: minimizacao, retencao, trilha e exposicao controlada.

### Fora de escopo

- Certificacoes formais.
- SOC2, ISO 27001 ou compliance juridico completo.

### Requisitos funcionais

- Usuario revogado nao pode operar chat com token antigo.
- Operacoes criticas devem exigir nivel de autenticacao adequado.
- API interna deve rejeitar replay e duplicidade maliciosa.
- Upload deve validar tipo real e politica de extensoes/formatos.

### Requisitos nao funcionais

- Segredos obrigatorios sem defaults inseguros.
- Logs e telemetria nao podem expor PII sensivel.
- Widget publico deve ter controles anti-abuso e anti-origem indevida.

### Entregaveis

- Plano de hardening de auth.
- Revocation strategy para chat tokens.
- Anti-replay design para API interna.
- Matriz de risco OWASP por superficie.

### Metricas de sucesso

- 100% dos acessos criticos com revalidacao adequada.
- 0 tokens de chat validos apos revogacao do usuario.
- 0 uploads aceitos fora da politica definida.

### Criterios de aceite

- Pentest interno ou revisao tecnica confirma mitigacao dos vetores criticos.
- MFA e revogacao de sessao/token estao ativos.
- Anti-replay esta implementado e coberto por teste.

### Dependencias

- PRD-01 Arquitetura
- PRD-07 DevOps / Infra

---

## PRD-05 - Confiabilidade, Observabilidade e Recuperacao

**Status:** Bloqueador parcial
**Prioridade:** P0
**Owner sugerido:** Plataforma + Backend

### Contexto

Ha logging, Sentry parcial e filas, mas ainda faltam garantias fortes de recuperacao, rastreabilidade operacional e resistencia a falha para fluxos criticos.

### Problema

- Auditoria falha em modo best-effort.
- Workers principais nao reportam para Sentry.
- Falta padrao claro de retry, timeout e circuit breaker para integracoes.
- Ausencia de staging reduz capacidade de detectar regressao.
- Alguns erros operacionais sao engolidos como "non-critical".

### Objetivo

Garantir que o sistema seja observavel, recuperavel e confiavel o suficiente para operar fluxos financeiros sem perda silenciosa de evento critico.

### Escopo

- Tornar trilha de auditoria fail-closed para operacoes criticas.
- Expandir telemetria para workers.
- Definir politicas de retry/timeout/circuit breaker por integracao.
- Definir alertas operacionais e health signals.
- Padronizar correlation id entre API, worker e chat.

### Fora de escopo

- NOC 24x7.
- Plataforma completa de observabilidade enterprise.

### Requisitos funcionais

- Falha de auditoria em operacao critica deve bloquear ou gerar compensacao segura.
- Workers devem emitir erro estruturado e rastreavel.
- Jobs devem ter estado observavel e retenção adequada.

### Requisitos nao funcionais

- Log estruturado, sem PII indevida.
- Alertas para falha de fila, backlog, erro de integracao e falha de auditoria.

### Entregaveis

- Matriz de criticidade por evento.
- Padrao de retries e timeouts.
- Dashboards operacionais.
- Integracao de workers com Sentry.

### Metricas de sucesso

- 100% dos eventos criticos observaveis de ponta a ponta.
- MTTR reduzido para incidentes comuns.
- 0 falhas silenciosas de auditoria em fluxo financeiro.

### Criterios de aceite

- Operacoes criticas nao concluem sem trilha minima persistida.
- Workers aparecem em observabilidade com erros correlacionados.
- Runbooks e alertas estao prontos.

### Dependencias

- PRD-04 Seguranca
- PRD-07 DevOps / Infra

---

## PRD-06 - Banco de Dados, Integridade e Consistencia

**Status:** Bloqueador de producao
**Prioridade:** P0
**Owner sugerido:** Backend + Data

### Contexto

O sistema usa PostgreSQL com Prisma e MongoDB com Mongoose. O desenho geral e viavel, mas ainda ha lacunas de consistencia, isolamento e transacao em fluxos financeiros e operacionais.

### Problema

- RLS nao cobre tudo de forma obrigatoria.
- Algumas operacoes financeiras nao estao encapsuladas em transacao forte.
- Imports criam dados intermediarios sem atomicidade.
- Mongo tenant scope nao e garantido sem contexto.
- Ha caminhos de consistencia eventual sem compensacao formal.

### Objetivo

Garantir consistencia, integridade transacional e isolamento de dados adequados para operacao de corretora multi-tenant.

### Escopo

- Revisao de RLS e tabela por tabela.
- Revisao de constraints unicas e invariantes de negocio.
- Encapsular fluxos criticos em transacao ou saga controlada.
- Revisao de indices para consultas de dashboard, busca e claims.
- Politica de TTL e retencao no chat.

### Fora de escopo

- Troca de Prisma ou Mongo.
- Reparticionamento ou sharding.

### Requisitos funcionais

- Emissao de apolice e criacao de comissao devem ser consistentes.
- Import de apolice nao pode deixar proposal stub orfa.
- Chat e ERP devem preservar tenant isolation no banco.

### Requisitos nao funcionais

- Indices compativeis com consultas reais.
- Integridade garantida sob concorrencia.
- Politica documentada de retencao e arquivamento.

### Entregaveis

- Matriz de tabelas com status de RLS/tenant enforcement.
- Plano de transacoes para fluxos criticos.
- Revisao de indices.
- Plano de retencao para mensagens e logs.

### Metricas de sucesso

- 0 inconsistencias reproduziveis em fluxos financeiros criticos.
- 0 dados orfaos em import e emissao.
- Consultas quentes com plano de execucao aceitavel.

### Criterios de aceite

- Fluxos criticos cobertos por testes de integridade concorrente.
- RLS e tenant enforcement revisados e aprovados.
- Dados intermediarios tem estrategia de compensacao ou atomicidade.

### Dependencias

- PRD-01 Arquitetura
- PRD-03 Performance

---

## PRD-07 - DevOps, Release Safety e Ambientes

**Status:** Bloqueador de producao
**Prioridade:** P0
**Owner sugerido:** Plataforma

### Contexto

Hoje o deploy de backend vai direto para producao em `push` para `main`, com rollback baseado apenas em troca de imagem e sem staging obrigatorio.

### Problema

- Nao ha staging obrigatorio.
- Nao ha aprovacao manual antes de producao.
- Migrations e rollout nao estao orquestrados com seguranca suficiente.
- Rollback de app nao equivale a rollback de schema.
- CI nao cobre smoke real com infraestrutura alvo.

### Objetivo

Tornar o pipeline de release seguro, previsivel e reversivel para operacao financeira.

### Escopo

- Ambiente de staging com smoke real.
- Promotion flow staging -> producao.
- Approval gate manual para producao.
- Estrategia segura para migrations.
- Checklist de rollback e compatibilidade reversa.

### Fora de escopo

- Kubernetes ou plataforma totalmente nova.
- GitOps completo.

### Requisitos funcionais

- Nenhum deploy vai direto para producao sem passar por staging.
- Migrations criticas exigem rollout compativel.
- Rollback deve considerar app e banco.

### Requisitos nao funcionais

- Pipeline deve ser auditable.
- Segredos devem ficar fora de artefatos e scripts inseguros.
- Smoke tests devem validar auth, tenant context, filas e bancos.

### Entregaveis

- Novo pipeline CI/CD.
- Estrategia de migrations.
- Runbook de rollback.
- Definicao de ambientes e ownership.

### Metricas de sucesso

- 100% dos deploys produtivos passam por staging.
- 0 deploys com rollback manual improvisado.
- Reducao de falha de release.

### Criterios de aceite

- Pipeline exige aprovacao manual para producao.
- Existe staging funcional e automatizado.
- Rollback e testado e documentado.

### Dependencias

- PRD-05 Confiabilidade
- PRD-06 Banco de Dados

---

## PRD-08 - UX e Fluxos Criticos de Operacao

**Status:** Importante antes de escala comercial
**Prioridade:** P1
**Owner sugerido:** Produto + UX + Backend

### Contexto

Os fluxos de cotacao, proposta, emissao, sinistro, documento e chat estao funcionais, mas ainda possuem pontos de friccao operacional e pouca protecao contra erro humano em tarefas que geram impacto financeiro.

### Problema

- Fluxos criticos nao deixam sempre claro estado, irreversibilidade e proximo passo.
- Geração de PDF e import podem induzir o usuario a repetir acao.
- Faltam barreiras visuais e funcionais para acao de alto impacto.
- Existe risco de dupla emissao, duplicidade de lead ou erro de acompanhamento.

### Objetivo

Reduzir erro operacional, ambiguidade de status e retrabalho nos fluxos centrais da corretora.

### Escopo

- Revisao UX de proposta -> emissao -> documento.
- Revisao UX de sinistro e assistencia.
- Revisao de estados de loading, reprocessamento e conclusao.
- Confirmacoes e guardrails para acoes irreversiveis ou financeiras.

### Fora de escopo

- Rebranding completo.
- Redesign geral do sistema.

### Requisitos funcionais

- Toda acao critica deve expor claramente estado, resultado e impacto.
- Operacoes longas devem ter status e feedback confiavel.
- Acoes sensiveis devem ter confirmacao apropriada.

### Requisitos nao funcionais

- Fluxos devem ser entendiveis por operador sem conhecimento tecnico.
- O numero de erros operacionais deve cair.

### Entregaveis

- Mapa dos fluxos criticos.
- Lista de pontos de friccao e melhorias.
- Especificacao de UX states e mensagens.

### Metricas de sucesso

- Queda de duplicidade operacional.
- Menor abandono ou retrabalho em fluxo de proposta/emissao.
- Menor volume de suporte interno por erro de operacao.

### Criterios de aceite

- Fluxos criticos revisados com produto e operacao.
- Estados de erro/loading/sucesso padronizados.
- Acoes irreversiveis protegidas por UX adequada.

### Dependencias

- PRD-03 Performance
- PRD-10 Riscos de Negocio

---

## PRD-09 - Governanca de Custos e Eficiencia

**Status:** Importante
**Prioridade:** P2
**Owner sugerido:** Produto + Plataforma

### Contexto

O sistema combina infra de API, chat, Redis, bancos, armazenamento e IA. Ainda ha pouca governanca explicita de custo por tenant, por fluxo e por feature.

### Problema

- Custos de IA sem quota por tenant.
- Custos de armazenamento e PDF sem politica clara.
- Filas e retencao podem crescer sem controle.
- Falta visibilidade de custo por modulo.

### Objetivo

Criar governanca de custo que permita crescer sem surpresas financeiras e com capacidade de repassar consumo ou limitar abuso.

### Escopo

- Medicao de custo por canal e tenant.
- Quotas e limites para IA.
- Politica de retencao para arquivos, mensagens e logs.
- Revisao de custo de infra por workload.

### Fora de escopo

- Billing externo ao cliente final.
- Modelo completo de cobranca SaaS.

### Requisitos funcionais

- IA deve ter limites configuraveis por tenant.
- Uso de storage e filas deve ser observavel.
- Feature cara deve poder ser desativada ou limitada.

### Requisitos nao funcionais

- Custos precisam ser explicaveis para operacao e direcao.
- Crescimento de custo deve acompanhar crescimento de receita/uso.

### Entregaveis

- Painel de custo por modulo.
- Quotas de IA.
- Politica de retention e cleanup.

### Metricas de sucesso

- 100% dos custos relevantes com owner e metrica.
- Quotas de IA ativadas por tenant.
- Reducao de gasto desperdicado em storage e jobs.

### Criterios de aceite

- Existe baseline de custo mensal por stack.
- IA tem budget guardrails.
- Storage e retention estao documentados e automatizados.

### Dependencias

- PRD-03 Performance
- PRD-05 Confiabilidade

---

## PRD-10 - Controles de Risco de Negocio e Prejuizo Financeiro

**Status:** Bloqueador de producao
**Prioridade:** P0
**Owner sugerido:** Produto + Operacao + Engenharia

### Contexto

Em um ERP de corretora, falhas de emissao, comissionamento, sinistro, tenant leak, perda de auditoria e erro de deploy podem gerar prejuizo financeiro direto, passivo juridico e perda reputacional.

### Problema

- Nao existe matriz formal ligando falha tecnica a risco de negocio.
- Fluxos financeiros ainda nao tem controles compensatorios suficientes.
- Dependencias de terceiros podem parar fluxo sem plano claro.
- Falhas de consistencia ou duplicidade podem impactar receita, comissao e atendimento.

### Objetivo

Criar um framework pratico de controle de risco de negocio para o produto antes do go-live.

### Escopo

- Mapear riscos tecnicos para impacto financeiro e operacional.
- Definir controles preventivos, detectivos e corretivos.
- Definir runbooks de contingencia para terceiros.
- Definir gating formal de `GO / NO-GO`.

### Fora de escopo

- Matriz juridica completa.
- Politica corporativa ampla fora do produto.

### Requisitos funcionais

- Cada fluxo critico deve ter risco, dono, controle e plano de resposta.
- Dependencias externas devem ter fallback ou contingencia operacional.
- O go-live deve depender de checklist executivo fechado.

### Requisitos nao funcionais

- O modelo de risco deve ser simples o bastante para uso operacional real.
- A diretoria deve conseguir entender o status de risco sem ler codigo.

### Entregaveis

- Matriz de risco tecnico x impacto de negocio.
- Runbooks de contingencia.
- Checklist executivo de liberacao.
- Tabela de dependencias terceiras e seus fallbacks.

### Metricas de sucesso

- 100% dos riscos P0/P1 com owner e plano.
- 0 itens sem resposta para incidente de fluxo financeiro.
- Checklist de go-live com rastreabilidade objetiva.

### Criterios de aceite

- Existe comite tecnico/produto com aprovacao formal do checklist final.
- Riscos bloqueadores tem controle implementado ou mitigacao aceita formalmente.
- O criterio de `GO / NO-GO` esta documentado e auditavel.

### Dependencias

- Todos os PRDs anteriores, com foco em PRD-04, PRD-05, PRD-06 e PRD-07

---

## Roadmap sugerido de execucao

### Onda 1 - Bloqueadores de go-live

- PRD-01 Arquitetura e Isolamento de Dominio
- PRD-04 Seguranca, LGPD e Controle de Acesso
- PRD-05 Confiabilidade, Observabilidade e Recuperacao
- PRD-06 Banco de Dados, Integridade e Consistencia
- PRD-07 DevOps, Release Safety e Ambientes
- PRD-10 Controles de Risco de Negocio

### Onda 2 - Estabilizacao operacional

- PRD-02 Escalabilidade Operacional e Horizontal
- PRD-03 Performance e Processamento Assincrono
- PRD-08 UX e Fluxos Criticos de Operacao

### Onda 3 - Otimizacao e governanca

- PRD-09 Governanca de Custos e Eficiencia

---

## Definicao de pronto para liberacao

O sistema so deve receber `GO` para producao quando:

- todos os PRDs da Onda 1 estiverem entregues ou mitigados formalmente;
- houver staging validado com smoke real;
- houver checklist executivo assinado;
- houver teste de isolamento entre tenants, de revogacao de acesso e de rollback;
- houver observabilidade minima ativa para API, workers, chat e filas.
