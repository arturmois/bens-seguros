# PRD: Informação de Datas nas Cotações

**Jira:** SCRUM-30 | **Prioridade:** Highest | **Status:** Backlog
**Tipo:** Feature / Melhoria

---

## Resumo

Incluir campos de datas de vigência, criação, envio e retorno nas telas de cotação (seguro novo, renovação e endosso).

## Problema

Não há visibilidade consolidada de informações temporais nas cotações. Isso dificulta acompanhamento comercial, cumprimento de prazos e análise de eficiência no atendimento.

## Comportamento Atual

As cotações não apresentam de forma clara: período de vigência proposto, data de geração, data de envio ao cliente, prazo de validade ou data de retorno.

## Comportamento Esperado

### Campos de Data a Incluir

Na tela de detalhamento da cotação (e listagem, quando possível):

**Vigência Proposta:**

- Data de Início
- Data de Fim

**Datas do Processo:**

- Data da Cotação (criação) — preenchido automaticamente ao salvar
- Data de Envio ao Cliente — preenchido ao clicar "Enviar cotação" (e-mail/WhatsApp)
- Data de Retorno/Resposta do Cliente — preenchido manualmente
- Data de Validade da Cotação — prazo para aceitação

### Regras

1. Campos preenchidos automaticamente quando possível (criação ao salvar, envio ao enviar)
2. Edição manual permitida quando necessário
3. Informações visíveis no resumo da cotação
4. Disponíveis em relatórios para monitoramento de prazos

## Critérios de Aceite

- [ ] Campos de vigência (início/fim) editáveis na proposta
- [ ] Data de criação exibida automaticamente
- [ ] Data de envio registrada automaticamente ao enviar cotação
- [ ] Data de retorno editável manualmente
- [ ] Data de validade da cotação editável
- [ ] Datas visíveis no detalhe da proposta e no card do kanban (quando relevante)
- [ ] Testes unitários para lógica de preenchimento automático

## Notas Técnicas

- Verificar quais campos já existem em `Proposal` no schema Prisma (`createdAt` já existe)
- Novos campos candidatos: `coverageStartDate`, `coverageEndDate`, `sentToClientAt`, `clientResponseAt`, `quoteValidUntil`
- Migração Prisma para adicionar colunas opcionais
- Atualizar schemas Zod em `apps/server/src/routes/v1/proposals/_schemas.ts`
- Regenerar Orval após mudanças na API
