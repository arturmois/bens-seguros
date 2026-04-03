# Kanban de Endosso Vinculado a Apólices Ativas — Design Spec

**Data:** 2026-04-03
**Status:** Aprovado
**Contexto:** O produto já possui fluxo de propostas com kanban e um board específico de renovação, mas ainda não oferece um fluxo operacional dedicado para endossos que precisam evoluir a partir de apólices vigentes. O ticket `SCRUM-23` pede um kanban próprio de endosso, com vínculo obrigatório à apólice ativa e reaproveitamento máximo do que já existe em propostas/renovação.

---

## Problema

Hoje o sistema trata endosso apenas como necessidade operacional difusa, sem um fluxo dedicado de acompanhamento.

Isso gera três falhas centrais:

- falta de rastreabilidade para casos em que o endosso precisa virar proposta operacional
- ausência de validação explícita de vínculo com apólice vigente
- atrito para o operador, que precisa acompanhar alterações em apólices ativas sem um board próprio

O resultado é risco de retrabalho, perda de prazo e pouca clareza entre proposta nova, renovação e endosso.

---

## Objetivo

Adicionar um fluxo de **Endosso** com board operacional próprio, mantendo a base técnica de propostas existente.

O MVP deve permitir:

- iniciar endosso somente a partir de uma apólice ativa
- criar uma proposta operacional de endosso com vínculo obrigatório à apólice de origem
- acompanhar o andamento em um kanban próprio
- exibir no card e no detalhe do item os dados essenciais da apólice original
- impedir avanço e criação inválidos por regra de backend, não apenas de frontend

---

## Não Objetivos

Esta entrega não deve incluir:

- entidade de domínio totalmente nova e paralela a `Proposal`
- criação avulsa de endosso fora da tela de apólice
- customização de etapas por corretora
- workflow builder de transições
- migração de históricos antigos de endosso
- regras avançadas de automação
- cálculo técnico de prêmio ou integração profunda com seguradoras

O foco é habilitar rastreabilidade e operação consistente com o menor escopo estrutural viável.

---

## Opções Avaliadas

### Opção 1: Feature totalmente nova e isolada

Criar módulo próprio de endosso, com entidade, endpoints, board e regras independentes.

**Prós**

- maior separação conceitual no domínio
- nomenclatura totalmente específica

**Contras**

- alto custo de implementação
- duplicação de comportamento de proposal/kanban
- maior risco de divergência entre fluxos semelhantes

**Decisão:** rejeitada para o MVP.

### Opção 2: Apenas mais um tipo dentro do board atual de propostas

Endosso entra como mais uma variação operacional sem navegação própria.

**Prós**

- menor custo inicial
- reaproveitamento máximo

**Contras**

- UX pouco explícita
- risco de esconder a regra mais importante do fluxo, que é a origem obrigatória na apólice ativa
- menor clareza operacional para corretores e backoffice

**Decisão:** rejeitada como experiência final.

### Opção 3: Arquitetura híbrida

Reaproveitar a base técnica de `Proposal` e do kanban existente, mas expor **Endosso** como fluxo operacional próprio para o usuário.

**Prós**

- melhor equilíbrio entre velocidade e clareza operacional
- preserva consistência com renovação e propostas
- reduz duplicação estrutural
- deixa o domínio de endosso explícito na UX

**Contras**

- exige ajustes controlados de modelo, listagem, navegação e detalhes de card

**Decisão:** escolhida.

---

## Decisão Final

O MVP de Endosso será implementado como **fluxo híbrido**:

- base técnica reaproveita `Proposal`
- o sistema ganha `boardType = ENDORSEMENT`
- a experiência do usuário terá entrada, board, filtros e linguagem próprios
- o vínculo com a apólice ativa será obrigatório desde a criação

Essa decisão permite entregar valor de produto real sem abrir uma nova linha de manutenção paralela.

---

## Modelo de Produto

Cada item do board de Endosso representa uma **proposta operacional derivada de uma apólice vigente**.

### Regras centrais

- Endosso nasce somente a partir de uma apólice ativa
- o vínculo com a apólice é obrigatório
- o vínculo não pode ser trocado depois da criação
- não existe criação avulsa pelo kanban
- o board é próprio para o usuário, mas usa a mesma espinha dorsal de proposals

### Entrada do fluxo

A criação acontece exclusivamente dentro da tela de uma apólice ativa, por uma ação contextual como `Criar Endosso`.

O usuário não deve:

- escolher board manualmente
- pesquisar apólice no formulário inicial
- criar endosso fora do contexto da apólice

Isso reduz erro operacional e reforça a regra principal do ticket.

---

## Fluxo do Usuário

### 1. Ponto de entrada

Na tela de detalhe da apólice ativa, o usuário aciona `Criar Endosso`.

### 2. Criação do endosso

O sistema abre um formulário curto, já contextualizado com a apólice de origem.

Campos mínimos recomendados no MVP:

- apólice de origem `somente leitura`
- tipo de alteração/endosso
- observações iniciais

O vínculo técnico com a apólice já entra resolvido no momento de abertura.

### 3. Acompanhamento

Após criação, o item aparece no board de Endosso.

O board terá:

- navegação própria
- filtros orientados ao domínio de endosso
- cards com dados da apólice de origem e status do processo
- detalhe do card com ações operacionais e links para a apólice e para os detalhes completos da proposta

### 4. Evolução

O operador move o item entre etapas conforme o andamento, respeitando as regras de transição já existentes ou suas adaptações mínimas para esse board.

---

## UX do Board

### Princípios

- clareza operacional acima de flexibilidade
- zero ambiguidade sobre a apólice de origem
- baixo atrito para encontrar um endosso em andamento
- consistência visual com o board de propostas/renovação

### Estrutura do board

O board terá experiência própria sob o nome `Endosso`, separado de propostas comuns na navegação do produto.

Elementos mínimos:

- campo de busca
- filtros por apólice, segurado, seguradora, responsável e data de criação
- colunas por etapa
- cards clicáveis com contexto da apólice
- detalhe do card com visão operacional e referência da apólice original

### Card de endosso

O card deve mostrar sem abrir detalhe:

- segurado/cliente
- número da apólice de origem
- vigência resumida
- tipo de alteração
- estágio atual

### Detalhe do card

O detalhe deve separar visualmente:

- andamento operacional do endosso
- dados da apólice original

O usuário deve conseguir, a partir desse painel:

- avançar o estágio quando permitido
- visualizar checklist ou pendências
- abrir a apólice original
- abrir a tela completa da proposta de endosso

---

## Etapas do MVP

Para o MVP, as etapas serão **fixas**.

Etapas visíveis aprovadas para o usuário:

- `Cotação`
- `Protocolo`
- `Pendência`
- `Pagamento`
- `Apólice`

### Diretriz de implementação

Como o board atual de proposals já trabalha com uma máquina de estados compartilhada, a entrega deve priorizar reaproveitamento.

Para evitar abertura de uma state machine paralela no MVP, a implementação deve usar os códigos atuais de `ProposalStage` com este mapeamento explícito para o board de Endosso:

- `QUOTE` -> `Cotação`
- `PROTOCOL` -> `Protocolo`
- `INSPECTION` -> `Pendência`
- `PAYMENT` -> `Pagamento`
- `POLICY_ISSUED` -> `Apólice`
- `LOST` -> `Perda`

`CAPTURE` não será exibido como coluna do board de Endosso. Itens de endosso devem nascer diretamente no primeiro estágio operacional visível.

### Fora do escopo do MVP

- editor de etapas
- transições configuráveis por tenant
- múltiplos pipelines por corretora

---

## Arquitetura e Componentes

### Decisão de arquitetura

Reaproveitar a base de `Proposal` no backend e a base do kanban existente no frontend, adicionando especialização por `boardType`.

### Componentes afetados

No nível de produto, a feature deve tocar ao menos:

- origem do fluxo na tela de apólice
- modelo e contratos de proposal para suportar endosso
- listagem/consulta do kanban por novo `boardType`
- card e detalhe do card com contexto da apólice
- filtros e navegação do board
- validações de criação e de elegibilidade

### Diretriz de composição

Preferir extensão dos componentes atuais de kanban, em vez de clonagem de tela.

O board de Endosso deve compartilhar:

- infraestrutura de query/cache
- comportamento de drag-and-drop
- padrão de detalhe do card
- regras gerais de invalidação de cache e atualização otimista

Especializações devem ficar em:

- labels
- filtros
- dados extras do card
- bloqueios e validações específicos de endosso

---

## Modelo de Dados

### Base principal

`Proposal` continua sendo a entidade base do fluxo.

### Campos necessários para o MVP

- `boardType = ENDORSEMENT`
- `sourcePolicyId` obrigatório
- `endorsementType` para classificar a alteração
- `endorsementReason` ou observação inicial
- `sourcePolicySnapshot`

### Snapshot recomendado

O snapshot da apólice de origem deve guardar os dados mínimos necessários para leitura rápida e histórico:

- `policyNumber`
- `clientName`
- `startDate`
- `endDate`
- `status`
- `insurerId` e/ou `insurerName` quando existir no modelo atual

### Regra de verdade do dado

- a apólice real continua sendo a fonte canônica
- o snapshot existe para exibição rápida, robustez de card e preservação de contexto histórico

---

## Fluxo de Dados

### Criação

1. Usuário abre uma apólice ativa.
2. Usuário aciona `Criar Endosso`.
3. Frontend envia criação com `boardType = ENDORSEMENT` e `sourcePolicyId`.
4. Backend valida elegibilidade da apólice e pertencimento ao tenant.
5. Backend persiste a proposal de endosso com snapshot da apólice.
6. Frontend redireciona ou atualiza o board de Endosso.

### Operação no board

1. Board lista itens filtrados por `boardType = ENDORSEMENT`.
2. Card exibe dados próprios do endosso e da apólice de origem.
3. Mudança de estágio segue fluxo controlado pelo backend.
4. UI invalida cache e reflete atualização otimista quando seguro.

---

## Regras e Validações

### Backend

As regras críticas devem existir no backend, independentemente do comportamento do frontend.

Validações obrigatórias:

- `boardType = ENDORSEMENT` exige `sourcePolicyId`
- a apólice deve pertencer à mesma organização
- a apólice deve estar em status elegível para endosso
- não é permitido criar endosso sem origem válida
- não é permitido alterar a apólice vinculada após criação

### Frontend

Validações e restrições de UX:

- não expor criação avulsa no board
- deixar a origem da apólice explícita em todos os pontos relevantes
- bloquear ações que contradigam o estado atual do item
- exibir mensagens claras quando a apólice não for elegível

---

## Tratamento de Erros

O fluxo deve tratar erros como parte do design, não como exceção ignorada.

### Casos mínimos

- apólice inexistente
- apólice de outro tenant
- apólice sem status elegível
- falha ao criar endosso
- falha ao mover estágio
- item sem snapshot esperado por inconsistência de dado legado

### Diretriz de UX

- mensagens de erro curtas e operacionais
- fallback visual consistente com os padrões do sistema
- nenhuma ação deve falhar silenciosamente

---

## Permissões

Esta spec não redefine a matriz completa de permissões. No MVP, Endosso deve reaproveitar exatamente a autorização operacional já aplicada ao fluxo de proposals.

Diretriz:

- somente usuários que já podem criar e operar proposals poderão iniciar e mover endossos
- a ação na tela de apólice só aparece para quem também pode ler a apólice em questão
- não será criada permissão nova exclusiva de Endosso no MVP

---

## Testes

### Backend

- rejeita criação de endosso sem `sourcePolicyId`
- rejeita criação com apólice de outro tenant
- rejeita criação com apólice em status não elegível
- persiste `boardType = ENDORSEMENT`
- persiste snapshot mínimo da apólice

### Frontend

- ação `Criar Endosso` aparece em apólice elegível
- criação nasce com vínculo pré-definido
- board lista somente endossos quando em contexto de Endosso
- card mostra número da apólice e contexto básico
- detalhe do card mostra apólice original e ações do fluxo

### Integração/E2E

- criar endosso a partir de apólice ativa
- visualizar item no board de Endosso
- avançar estágio com sucesso
- receber erro claro ao tentar criar com apólice inelegível

---

## Riscos e Decisões de Implementação

### Risco 1: Divergência entre stages aprovados e máquina atual

O sistema atual pode não possuir exatamente os mesmos códigos de stage aprovados para a UX de Endosso.

**Mitigação:** mapear labels/semântica por `boardType` antes de criar novos enums ou state machine paralela.

### Risco 2: Duplicação de UI

Criar telas separadas demais para Endosso pode replicar lógica já consolidada no board de proposals.

**Mitigação:** especializar componentes existentes e isolar somente as diferenças reais.

### Risco 3: Snapshot insuficiente ou excessivo

Pouco dado no snapshot enfraquece a operação; dado demais pode gerar acoplamento desnecessário.

**Mitigação:** manter snapshot mínimo aprovado nesta spec.

---

## Resumo do Escopo Aprovado

O MVP de `SCRUM-23` entrega:

- fluxo híbrido sobre a base de proposals
- novo `boardType = ENDORSEMENT`
- criação apenas a partir de apólice ativa
- vínculo obrigatório e imutável com a apólice de origem
- board próprio de Endosso com filtros e cards contextualizados
- dados da apólice original no card e no detalhe
- etapas fixas no MVP
- validações fortes de backend
- cobertura mínima de testes para criação, elegibilidade e operação do board

Essa é a menor solução que resolve o problema de produto com clareza operacional e sem abrir uma estrutura paralela desnecessária.
