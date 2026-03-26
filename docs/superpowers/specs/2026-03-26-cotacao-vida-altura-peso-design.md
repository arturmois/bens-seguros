# SCRUM-35: Cotação Vida - Altura, Peso e IMC

**Jira:** [SCRUM-35](https://arturmoiscontato.atlassian.net/browse/SCRUM-35)
**Data:** 2026-03-26
**Status:** Aprovado

## Resumo

Adicionar campos opcionais de altura (cm) e peso (gramas) na seção "Dados do Segurado" do fluxo de cotação de seguro de vida, com cálculo automático de IMC no frontend.

## Decisoes de Design

| Decisao         | Escolha                               | Motivo                                                |
| --------------- | ------------------------------------- | ----------------------------------------------------- |
| Obrigatoriedade | Opcionais                             | Regra de negocio definida pelo usuario                |
| Unidade altura  | Centimetros inteiros                  | Consistente com padrao do projeto (inteiros no banco) |
| Unidade peso    | Gramas inteiros                       | Consistente com centavos para dinheiro                |
| IMC             | Calculado no frontend, nao persistido | Derivado dos dados existentes, zero custo de storage  |

## Dados e Armazenamento

Dois novos campos no objeto `LifeDetails`, armazenados no JSON `Proposal.details`:

- **`alturaEmCentimetros`**: `number | undefined` — inteiro, range 100–250
- **`pesoEmGramas`**: `number | undefined` — inteiro, range 20000–300000

Sem migracao Prisma necessaria — o campo `details` ja e `Json?`.

IMC calculado no frontend: `(pesoEmGramas / 1000) / (alturaEmCentimetros / 100)^2`

## Validacao (Zod)

Adicionar ao `lifeDetailsSchema` existente em `proposal-details.schemas.ts`:

```typescript
alturaEmCentimetros: z.number().int().min(100).max(250).optional(),
pesoEmGramas: z.number().int().min(20000).max(300000).optional(),
```

## Frontend

### Campos

- 2 inputs numericos posicionados apos "fumante" e antes de "beneficiarios"
- Layout: grid 2 colunas, lado a lado
- Labels: "Altura (cm)" placeholder "175" | "Peso (kg)" placeholder "70.5"
- Input de peso aceita decimal no display (ex: `70.5`) mas converte para gramas antes de salvar (`70.5 * 1000 = 70500`)
- Input de altura aceita inteiro direto (ex: `175`)

### Badge IMC

Aparece abaixo dos campos quando ambos (altura e peso) estao preenchidos.

Formato: `IMC: 24.2 — Normal`

Faixas OMS:

| Faixa          | Range       | Cor      |
| -------------- | ----------- | -------- |
| Abaixo do peso | < 18.5      | Azul     |
| Normal         | 18.5 – 24.9 | Verde    |
| Sobrepeso      | 25.0 – 29.9 | Amarelo  |
| Obesidade      | >= 30.0     | Vermelho |

## Arquivos Afetados

| Camada             | Arquivo                                                               | Mudanca                                    |
| ------------------ | --------------------------------------------------------------------- | ------------------------------------------ |
| Zod (server)       | `apps/server/src/schemas/proposal-details.schemas.ts`                 | +2 campos opcionais no `lifeDetailsSchema` |
| Domain type (core) | `packages/core/src/modules/proposal/domain/insured-object-details.ts` | +2 campos opcionais no `LifeDetails`       |
| Frontend type      | `apps/web/src/features/proposals/types/index.ts`                      | +2 campos opcionais no `LifeDetails`       |
| Frontend form      | `apps/web/src/features/proposals/components/branch-field-sets.tsx`    | +2 inputs + badge IMC no `LifeFields`      |

## Fora de Escopo

- Persistencia do IMC no banco
- Configuracao de obrigatoriedade por tenant
- Integracao com sistemas de subscricao automatica
- Validacao cruzada altura/peso (ex: rejeitar combinacoes fisicamente impossiveis)
