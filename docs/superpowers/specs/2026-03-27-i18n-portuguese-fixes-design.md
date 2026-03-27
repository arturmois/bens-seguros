# Design: Correção de Português e Padronização de Idioma

**Data:** 2026-03-27
**Escopo:** Frontend (strings de UI) + Backend (identificadores de código) + CLAUDE.md (regras)

---

## Contexto

O projeto tem dois problemas de idioma:

1. **Frontend:** ~73 strings de UI com erros de português (acentos e cedilha faltando)
2. **Backend:** 33 propriedades em português em 2 arquivos de domínio de seguros

O projeto não está em produção, então renomeações no backend não requerem migrações.

---

## Decisões

### Regra de Idioma

- **Código (variáveis, funções, classes, interfaces, tipos, enums, constantes):** inglês
- **Exceções:** siglas brasileiras sem tradução — `cpf`, `cnpj`, `cep` — mantidas como estão
- **Strings de exibição (labels, mensagens, placeholders, toasts, títulos):** português correto (pt-BR) com acentos e cedilha
- **Comentários de código:** inglês

### Mapeamento de Renomeação Backend

| De (PT)               | Para (EN)             |
| --------------------- | --------------------- |
| `marca`               | `brand`               |
| `modelo`              | `model`               |
| `anoFabricacao`       | `manufacturingYear`   |
| `anoModelo`           | `modelYear`           |
| `placa`               | `licensePlate`        |
| `chassi`              | `vin`                 |
| `cor`                 | `color`               |
| `combustivel`         | `fuelType`            |
| `usoVeiculo`          | `vehicleUsage`        |
| `tipoImovel`          | `propertyType`        |
| `usoImovel`           | `propertyUsage`       |
| `endereco`            | `address`             |
| `construcao`          | `construction`        |
| `areaM2`              | `areaM2`              |
| `nomeCondominio`      | `condominiumName`     |
| `numeroUnidades`      | `unitCount`           |
| `anoConstrucao`       | `constructionYear`    |
| `numeroAndares`       | `floorCount`          |
| `razaoSocial`         | `legalName`           |
| `atividade`           | `businessActivity`    |
| `profissao`           | `occupation`          |
| `rendaMensalCentavos` | `monthlyIncomeCents`  |
| `fumante`             | `isSmoker`            |
| `esportesRadicais`    | `extremeSports`       |
| `alturaEmCentimetros` | `heightInCentimeters` |
| `pesoEmGramas`        | `weightInGrams`       |
| `beneficiarios`       | `beneficiaries`       |
| `descricao`           | `description`         |

### Arquivos Backend Afetados

1. `packages/core/src/modules/proposal/domain/insured-object-details.ts` — interfaces de domínio
2. `apps/server/src/schemas/proposal-details.schemas.ts` — schemas Zod
3. Quaisquer consumidores dessas interfaces (frontend forms, API handlers, seed data)

### Correções Frontend

~73 erros de acentuação/cedilha em strings de UI:

- **Marketing** (~35): hero, features, pricing, FAQ, testimonials, footer, nav
- **Schemas de validação** (~15): mensagens de erro em Zod (obrigatório, mínimo, máximo, inválido)
- **Forms e dialogs** (~12): labels, placeholders, descriptions
- **Chat** (~5): transfer-agent-modal, header-actions, chat-area-states
- **Outros** (~6): audit-table, import-dialog, dashboard, commissions

### Abordagem

Correção direta — sem i18n, sem lint rules customizadas. Prevenção via regras no CLAUDE.md + code review.
