# SCRUM-49: Número da Apólice Anterior em Renovações

**Data:** 2026-04-05
**Ticket:** SCRUM-49 — DADOS DO NUMERO DE APOLICE
**Status:** Aprovado

## Problema

Ao criar uma proposta de renovação, o sistema exige vincular a uma apólice existente no banco (`renewalPolicyId` via componente `PolicySearch`). Mas na fase inicial de uso, as apólices antigas não estão cadastradas no sistema — impossibilitando o corretor de criar renovações. Além disso, um cliente pode ter múltiplas apólices renovando ao mesmo tempo, e sem o número não há como identificar qual é qual.

## Solução

Campo de texto livre "Número da apólice anterior" (`renewalPolicyNumber`) com lookup automático. O corretor digita o número, o sistema busca se existe na organização: se encontrar, vincula silenciosamente; se não, prossegue sem vínculo guardando o número como referência.

## Abordagem Escolhida

**Abordagem A: Campo de texto livre + lookup automático** — selecionada entre 3 opções por ser a UX mais fluida (single input, sistema resolve nos bastidores).

---

## Design Detalhado

### 1. Modelo de Dados

**Novo campo na tabela `Proposal` (Prisma):**

```prisma
renewalPolicyNumber  String?   // Número da apólice anterior (texto livre)
```

- Coexiste com `renewalPolicyId` (vínculo real quando a apólice existe)
- Corretor digita número → sistema encontra match → preenche **ambos** (`renewalPolicyId` + `renewalPolicyNumber`)
- Corretor digita número → sistema não encontra → `renewalPolicyId` = null, `renewalPolicyNumber` = número digitado
- Relevante apenas quando `boardType = 'RENEWAL'`
- Nenhuma mudança na tabela `Policy`

### 2. Backend (API)

**Schema de criação (`_schemas.ts`):**

- Adicionar `renewalPolicyNumber: z.string().optional()` no `createNewInsuranceOrRenewalProposalBody`
- Manter `renewalPolicyId` no body como opcional (compatibilidade com import/API direta), mas o frontend passa apenas `renewalPolicyNumber`

**Use case `CreateProposal`:**

1. Recebe `renewalPolicyNumber` (texto digitado)
2. Se `boardType === 'RENEWAL'` e `renewalPolicyNumber` preenchido:
   - Busca `PolicyRepository.findByPolicyNumber(organizationId, renewalPolicyNumber)`
   - Encontrou → seta `renewalPolicyId` com ID da apólice
   - Não encontrou → `renewalPolicyId` = null
3. Salva `renewalPolicyNumber` na Proposal em ambos os casos

**Schema de resposta** — adicionar `renewalPolicyNumber` no response da Proposal.

Nenhuma nova rota.

### 3. Frontend

**Novo componente `RenewalPolicyInput`** (substitui `PolicySearch` no form de renovação):

- Input de texto simples, label "Número da apólice anterior"
- Debounce 300ms busca apólice por número exato
- Feedback inline:
  - **Encontrou** → badge verde "Apólice vinculada" + nome do cliente
  - **Não encontrou** → nenhum erro, campo normal (neutro)
  - **Buscando** → spinner discreto
- Valor enviado ao backend: `renewalPolicyNumber` (string)
- Campo opcional

**Formulário de proposta (`proposal-form.tsx`):**

- Troca `PolicySearch` por `RenewalPolicyInput` no bloco `boardType === 'RENEWAL'`

**Detalhe da proposta (`proposal-detail.tsx`):**

- `renewalPolicyId` presente → `RenewalPolicyCard` com link (como hoje)
- Só `renewalPolicyNumber` sem vínculo → número com badge "Não vinculada"
- Nenhum dos dois → não mostra nada

Sem mudança na listagem de propostas.

### 4. Domínio e Testes

**Entidade `Proposal` (`packages/core`):**

- `ProposalProps`: `renewalPolicyNumber: string | null`
- `CreateProposalInput`: `renewalPolicyNumber?: string`
- Getter `get renewalPolicyNumber()`
- `Proposal.create()`: `renewalPolicyNumber: input.renewalPolicyNumber ?? null`

**`PolicyRepository`** — novo método: `findByPolicyNumber(organizationId: string, policyNumber: string): Promise<PolicyData | null>`

**`ProposalMapper`** — `toDomain()` e `toPersistence()` incluem `renewalPolicyNumber`

**Testes TDD (4 cenários):**

1. `CreateProposal`: renovação com número que existe → `renewalPolicyId` preenchido + `renewalPolicyNumber` preenchido
2. `CreateProposal`: renovação com número que não existe → `renewalPolicyId` null + `renewalPolicyNumber` preenchido
3. `CreateProposal`: renovação sem número → ambos null (preserva comportamento atual)
4. `Proposal` entity: criar com `renewalPolicyNumber` e verificar getter

---

## Resumo de Mudanças

| Camada                  | Mudança                                            |
| ----------------------- | -------------------------------------------------- |
| Prisma schema           | +1 campo `renewalPolicyNumber` na Proposal         |
| Entidade Proposal       | +1 prop, +1 getter                                 |
| Use case CreateProposal | +lookup por número, resolve vínculo                |
| PolicyRepository        | +1 método `findByPolicyNumber`                     |
| Route schema            | `renewalPolicyNumber` no body e response           |
| Frontend form           | Novo `RenewalPolicyInput` substitui `PolicySearch` |
| Frontend detail         | Exibir `renewalPolicyNumber` quando sem vínculo    |
| Testes                  | 4 novos testes                                     |

## Fora do Escopo

- Reconciliação retroativa (vincular apólices antigas quando forem cadastradas no futuro)
- Mudanças na listagem de propostas
- Mudanças na tabela Policy
- Geração automática de números de apólice
