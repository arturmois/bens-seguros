# SCRUM-48: PDF de Apólice Completo — Design Spec

**Jira:** SCRUM-48 | **Prioridade:** Highest | **Data:** 2026-04-04

---

## Resumo

Expandir o template de PDF de apólice para exibir todos os dados cadastrados: cliente completo (com CPF/CNPJ sem máscara), dados da apólice, vigência, objeto segurado por ramo, e condições comerciais. Sem novos campos no schema — apenas buscar e renderizar dados já existentes.

## Decisões de Design

| Decisão                  | Escolha                                           | Alternativas descartadas                |
| ------------------------ | ------------------------------------------------- | --------------------------------------- |
| Dados do objeto segurado | Buscar do Proposal on-demand via proposalId       | Copiar para Policy no schema            |
| CPF/CNPJ completo        | Buscar via GetClient use case (já descriptografa) | Descriptografar manualmente no route    |
| Novos campos no schema   | Nenhum — usar dados existentes                    | Adicionar insuredObjectDetails à Policy |

---

## 1. Dados a Buscar no Route de Geração

### Route: `apps/server/src/routes/v1/policies/generate-policy-pdf.ts`

Buscar 3 fontes de dados:

1. **Policy** (já busca) — extend repository include para trazer `proposal.details` e `proposal.boardType`
2. **Client completo** — via `GetClient` use case ou `prisma.client.findFirst()` com todos os campos (nome, documento descriptografado, endereço, telefone, e-mail, personType)
3. **Organization** (já busca) — logo, nome

### Repository: `packages/core/src/modules/policy/infrastructure/prisma-policy-repository.ts`

Atualizar `POLICY_INCLUDE` para incluir proposal details:

```typescript
const POLICY_INCLUDE = {
  client: { select: { name: true, document: true } },
  salesperson: { select: { name: true } },
  insurer: { select: { name: true } },
  proposal: { select: { id: true, details: true, boardType: true } },
}
```

Atualizar `PolicyData` interface para incluir:

- `proposalDetails: InsuredObjectDetails | null`
- `boardType: string | null`

---

## 2. Seções do PDF

### Template: `apps/server/src/pdf-templates/policy-summary-pdf.tsx`

Reescrever com as seguintes seções, nesta ordem:

### 2.1 Header

- Logo da corretora (já existe via `PdfHeader`)
- Título: "APÓLICE DE SEGURO"
- Data de emissão

### 2.2 Dados do Cliente

- Nome completo
- CPF/CNPJ **completo** (sem asteriscos) — campo obrigatório para validade do contrato
- Endereço (se preenchido, senão "Não informado")
- Telefone (se preenchido, senão "Não informado")
- E-mail (se preenchido, senão "Não informado")

### 2.3 Dados da Apólice

- Número da apólice
- Status (Ativa, Cancelada, Expirada)
- Ramo (Auto, Residencial, Condomínio, etc.)
- Seguradora (nome completo, nunca "—")
- Tipo (Novo Seguro / Renovação / Endosso) — via `proposal.boardType`

### 2.4 Vigência

- Data de início (`policy.startDate`)
- Data de fim (`policy.endDate`)

### 2.5 Objeto Segurado

- Reutilizar componente `InsuredObjectSection` existente
- Renderiza campos específicos por ramo (Auto, Residencial, Condomínio, Business, Vida, Outros)
- Dados vêm de `proposal.details`
- Se `proposal.details` é null, mostrar "Não informado"

### 2.6 Condições Comerciais

- Prêmio Total: `formatCurrency(policy.premiumValueInCents)`

### 2.7 Cancelamento (condicional)

- Só exibir se `policy.status === 'CANCELLED'`
- Data de cancelamento
- Motivo

### 2.8 Footer

- Nome do corretor (salesperson)
- Dados da corretora
- Reutilizar `PdfFooter` existente

---

## 3. Regras

- Campo vazio → exibir "Não informado" (nunca omitir a linha)
- CPF/CNPJ sempre completo sem asteriscos
- Seguradora sempre com nome completo (se null, "Não informado")
- Board type labels: NEW_INSURANCE → "Novo Seguro", RENEWAL → "Renovação", ENDORSEMENT → "Endosso"
- Layout A4 com blocos claramente separados

---

## 4. Componentes Reutilizados

| Componente             | Arquivo                                                    | Uso                      |
| ---------------------- | ---------------------------------------------------------- | ------------------------ |
| `PdfHeader`            | `apps/server/src/pdf-templates/pdf-header.tsx`             | Header com logo e título |
| `PdfFooter`            | `apps/server/src/pdf-templates/pdf-footer.tsx`             | Footer com corretor      |
| `InsuredObjectSection` | `apps/server/src/pdf-templates/insured-object-section.tsx` | Objeto segurado por ramo |
| `styles`               | `apps/server/src/pdf-templates/pdf-styles.ts`              | Estilos compartilhados   |

---

## 5. Testes

- Gerar PDF para apólice com ramo AUTO — verificar todos os campos do veículo
- Gerar PDF para apólice com ramo RESIDENTIAL — verificar campos do imóvel
- Gerar PDF para apólice sem objeto segurado (proposal.details null) — verificar "Não informado"
- Gerar PDF para apólice cancelada — verificar seção de cancelamento
- Verificar CPF/CNPJ sem asteriscos

---

## 6. Arquivos Impactados

| Camada           | Arquivo                                                                       | Mudança                                                 |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Repository**   | `packages/core/src/modules/policy/infrastructure/prisma-policy-repository.ts` | Extend POLICY_INCLUDE com proposal.details + boardType  |
| **Domain**       | `packages/core/src/modules/policy/domain/policy-repository.ts`                | Extend PolicyData com proposalDetails + boardType       |
| **Mapper**       | `packages/core/src/modules/policy/infrastructure/policy-mapper.ts`            | Mapear novos campos                                     |
| **PDF Route**    | `apps/server/src/routes/v1/policies/generate-policy-pdf.ts`                   | Buscar client completo, passar dados extras ao template |
| **PDF Template** | `apps/server/src/pdf-templates/policy-summary-pdf.tsx`                        | Reescrever com todas as seções                          |
