# PRD: Cadastro de Apólice com Número da Apólice

**Jira:** SCRUM-49 | **Prioridade:** Highest | **Status:** Backlog
**Tipo:** Feature

---

## Resumo

Permitir cadastro inicial de apólice apenas com número da apólice, com estrutura preparada para vínculos futuros (renovações).

## Problema

No início da operação, as apólices serão cadastradas uma a uma, sem histórico de renovações. Exigir vínculo de renovação agora seria desnecessário e atrapalharia a produtividade. Porém, o sistema precisa estar preparado para quando as renovações começarem a ocorrer (após 12 meses).

## Comportamento Atual

Não existe campo dedicado para número da apólice no cadastro, ou o sistema atual exige dados de vínculo de renovação, inviabilizando o uso imediato.

## Comportamento Esperado

### Fase 1 — Cadastro Inicial

1. Tela de cadastro de apólice exibe apenas campos essenciais:
   - **Número da Apólice** (obrigatório)
   - Demais dados existentes (cliente, vigência, valores, seguradora, etc.)
2. Nenhum campo de "renovação" ou "apólice anterior" deve aparecer na UI

### Fase 2 — Estrutura de Banco (já preparada)

1. Tabela de apólices deve conter coluna opcional `previousPolicyId` (FK para mesma tabela)
2. Inicialmente, esse campo ficará `NULL` para todas as apólices
3. O sistema não valida duplicidade de número de apólice entre organizações

### Fase 3 — Futuro (renovações)

1. Adicionar opção "Vincular renovação" na interface
2. Ao renovar, o sistema preenche automaticamente o vínculo com a apólice anterior
3. Relatórios poderão usar o vínculo para mostrar o histórico de cadeia de renovações

## Critérios de Aceite

- [ ] Campo "Número da Apólice" obrigatório no cadastro de apólice
- [ ] Coluna `previousPolicyId` (nullable FK) no schema Prisma
- [ ] Nenhum campo de vínculo visível na UI nesta fase
- [ ] Número da apólice exibido em listagens e detalhes
- [ ] Testes unitários cobrindo criação com e sem número de apólice

## Notas Técnicas

- A coluna `previousPolicyId` deve ser FK para a mesma tabela `Policy`, permitindo rastrear cadeia de renovações
- O campo já existe como `policyNumber` no schema atual — verificar se está sendo usado corretamente
- Índice composto `(organizationId, policyNumber)` para buscas rápidas
