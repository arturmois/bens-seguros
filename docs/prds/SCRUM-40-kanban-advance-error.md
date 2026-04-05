# PRD: Erro ao Finalizar Proposta pelo Kanban

**Jira:** SCRUM-40 | **Prioridade:** Highest | **Status:** Backlog
**Tipo:** Bug

---

## Resumo

Ao tentar finalizar uma proposta e transformá-la em apólice pelo Kanban, o sistema exibe "não é possível avançar a partir do estágio", impedindo a conclusão do processo.

## Como Reproduzir

1. Acessar a tela de propostas/Kanban
2. Localizar uma proposta apta para finalização (estágio PAYMENT)
3. Tentar avançar o estágio para converter em apólice (POLICY_ISSUED)
4. Erro: "não é possível avançar a partir do estágio"

## Comportamento Esperado

O sistema deve permitir avançar a proposta do estágio PAYMENT para POLICY_ISSUED pelo drag-and-drop no Kanban, concluindo o fluxo sem erros.

## Análise Preliminar

Possíveis causas:

1. O Kanban frontend não inclui `POLICY_ISSUED` no set `ADVANCE_TARGETS` — verificar `proposal-kanban.tsx`
2. A lógica de `advance()` no domínio pode estar bloqueando a transição PAYMENT → POLICY_ISSUED
3. O checklist pode estar bloqueando o avanço (itens obrigatórios não completos)
4. A rota de advance no backend pode estar retornando erro de validação

## Critérios de Aceite

- [ ] Proposta pode ser arrastada de PAYMENT para POLICY_ISSUED no Kanban
- [ ] A transição cria a apólice corretamente
- [ ] Mensagem de erro clara se checklist estiver incompleto (não erro genérico)
- [ ] Teste unitário cobrindo transição PAYMENT → POLICY_ISSUED

## Notas Técnicas

- Verificar `ADVANCE_TARGETS` em `proposal-kanban.tsx` — pode não incluir `POLICY_ISSUED`
- Verificar `Proposal.advance()` em `packages/core/src/modules/proposal/domain/proposal.ts`
- Verificar se o drag-and-drop mapeia corretamente o target stage
- A emissão de apólice pode requerer lógica especial (criação de Policy entity)
