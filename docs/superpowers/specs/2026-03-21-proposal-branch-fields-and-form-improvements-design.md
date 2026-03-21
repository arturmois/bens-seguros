# Design: Campos por Ramo de Seguro + Melhorias de Formulário

> Spec para sub-campos do objeto segurado por ramo e correções de UX nos formulários do ERP.

---

## 1. Coleta Progressiva de Dados

**Decisão:** dados do objeto segurado NÃO são coletados na criação da proposta. A coleta segue o workflow por estágio:

| Estágio       | Dados coletados                                                         |
| ------------- | ----------------------------------------------------------------------- |
| **CAPTURE**   | Cliente + Ramo + Tipo (3 campos, via Sheet)                             |
| **QUOTE**     | Dados do objeto segurado (campos por ramo) + Valor do prêmio + Comissão |
| **PROTOCOL+** | Dados complementares via checklist existente                            |

**Regra de avanço:** para avançar de QUOTE → PROTOCOL, os campos obrigatórios do ramo devem estar preenchidos.

---

## 2. Campos do Objeto Segurado por Ramo

Armazenados em `details Json?` no model Proposal (Prisma). Validação via Zod no backend por ramo.

### AUTO (Veículo)

| Campo         | Obrigatório | Tipo                                 |
| ------------- | :---------: | ------------------------------------ |
| marca         |     sim     | string                               |
| modelo        |     sim     | string                               |
| anoFabricacao |     sim     | number                               |
| anoModelo     |     sim     | number                               |
| placa         |     não     | string (máscara ABC1D23)             |
| chassi        |     não     | string                               |
| cor           |     não     | string                               |
| combustivel   |     não     | string (Flex/Gasolina/Etanol/Diesel) |
| usoVeiculo    |     não     | string (Particular/Comercial/Táxi)   |

### RESIDENTIAL (Imóvel Residencial)

| Campo      | Obrigatório | Tipo                                  |
| ---------- | :---------: | ------------------------------------- |
| tipoImovel |     sim     | string (Casa/Apartamento)             |
| usoImovel  |     sim     | string (Habitual/Veraneio/Desocupado) |
| cep        |     sim     | string (máscara 00000-000)            |
| endereco   |     não     | string                                |
| construcao |     não     | string (Alvenaria/Madeira/Mista)      |
| areaM2     |     não     | number                                |

### CONDOMINIUM (Condomínio)

| Campo          | Obrigatório | Tipo                       |
| -------------- | :---------: | -------------------------- |
| nomeCondominio |     sim     | string                     |
| numeroUnidades |     sim     | number                     |
| cep            |     sim     | string (máscara 00000-000) |
| endereco       |     não     | string                     |
| anoConstrucao  |     não     | number                     |
| numeroAndares  |     não     | number                     |

### BUSINESS (Empresarial)

| Campo       | Obrigatório | Tipo                                |
| ----------- | :---------: | ----------------------------------- |
| razaoSocial |     sim     | string                              |
| cnpj        |     sim     | string (máscara 00.000.000/0000-00) |
| atividade   |     sim     | string                              |
| cep         |     não     | string                              |
| endereco    |     não     | string                              |
| areaM2      |     não     | number                              |

### LIFE (Vida)

| Campo            | Obrigatório | Tipo                 |
| ---------------- | :---------: | -------------------- |
| profissao        |     sim     | string               |
| rendaMensal      |     não     | number (centavos)    |
| fumante          |     não     | boolean              |
| esportesRadicais |     não     | boolean              |
| beneficiarios    |     não     | string (texto livre) |

### OTHER (Outros)

| Campo     | Obrigatório | Tipo              |
| --------- | :---------: | ----------------- |
| descricao |     sim     | string (textarea) |

---

## 3. Schema Change

Adicionar ao model Proposal em `schema.prisma`:

```prisma
details Json? // Dados do objeto segurado, schema varia por ramo
```

Nenhuma migration destrutiva — campo nullable, aditivo.

Adicionar `premiumValueInCents` e `commissionPercentageInCents` ao endpoint de details (preenchidos no QUOTE junto com o objeto segurado).

---

## 3b. Domain Layer — Integração DDD Full

O Proposal é DDD Full. O campo `details` deve fluir pela camada de domínio.

### ProposalProps

Adicionar à interface `ProposalProps`:

```ts
details: InsuredObjectDetails | null;
premiumValueInCents: number; // já existe
commissionPercentageInCents: number; // já existe (basis points 0-10000)
```

### Tipo discriminado para `details`

```ts
interface AutoDetails {
  branch: 'AUTO';
  marca: string;
  modelo: string;
  anoFabricacao: number;
  anoModelo: number;
  placa?: string;
  chassi?: string;
  cor?: string;
  combustivel?: string;
  usoVeiculo?: string;
}
interface ResidentialDetails {
  branch: 'RESIDENTIAL';
  tipoImovel: string;
  usoImovel: string;
  cep: string;
  endereco?: string;
  construcao?: string;
  areaM2?: number;
}
interface CondominiumDetails {
  branch: 'CONDOMINIUM';
  nomeCondominio: string;
  numeroUnidades: number;
  cep: string;
  endereco?: string;
  anoConstrucao?: number;
  numeroAndares?: number;
}
interface BusinessDetails {
  branch: 'BUSINESS';
  razaoSocial: string;
  cnpj: string;
  atividade: string;
  cep?: string;
  endereco?: string;
  areaM2?: number;
}
interface LifeDetails {
  branch: 'LIFE';
  profissao: string;
  rendaMensalCentavos?: number;
  fumante?: boolean;
  esportesRadicais?: boolean;
  beneficiarios?: string;
}
interface OtherDetails {
  branch: 'OTHER';
  descricao: string;
}

type InsuredObjectDetails =
  | AutoDetails
  | ResidentialDetails
  | CondominiumDetails
  | BusinessDetails
  | LifeDetails
  | OtherDetails;
```

Definir em `packages/core/src/modules/proposal/domain/insured-object-details.ts` e reutilizar no frontend.

### Método na entity Proposal

```ts
updateDetails(details: InsuredObjectDetails, premiumValueInCents: number, commissionBasisPoints: number): void
```

Valida que `details.branch` corresponde ao `this.branch` da proposta. Atualiza `this.props.details`, `premiumValueInCents` e `commissionPercentageInCents`.

### ProposalMapper

`toDomain()`: converter `Json` → `InsuredObjectDetails | null` usando type guard por `branch`.
`toPersistence()`: converter `InsuredObjectDetails | null` → `Json` (plain object serialization).

### Use Case: UpdateProposalDetails

```ts
@injectable()
class UpdateProposalDetails {
  constructor(@inject('ProposalRepository') repo: ProposalRepository) {}

  async execute(
    proposalId: string,
    organizationId: string,
    dto: {
      details: InsuredObjectDetails;
      premiumValueInCents: number;
      commissionBasisPoints: number;
    },
  ): Promise<Proposal> {
    const proposal = await this.repo.findById(proposalId, organizationId);
    if (!proposal) throw ProposalErrors.notFound(proposalId);
    proposal.updateDetails(dto.details, dto.premiumValueInCents, dto.commissionBasisPoints);
    await this.repo.save(proposal);
    return proposal;
  }
}
```

---

## 3c. Validação de Avanço QUOTE → PROTOCOL

### Onde: no use case `AdvanceProposalStage`

Antes de chamar `proposal.advance()`, verificar:

```ts
if (proposal.stage === 'QUOTE' && !proposal.details) {
  throw new ProposalDetailsRequiredError(proposalId);
}
```

### Erro: `ProposalDetailsRequiredError`

```ts
class ProposalDetailsRequiredError extends Error {
  readonly code = 'PROPOSAL_DETAILS_REQUIRED' as const;
  // "Preencha os dados do objeto segurado antes de avançar para Protocolo"
}
```

HTTP mapping: 422 Unprocessable Entity.

A validação dos campos obrigatórios por ramo é feita na **entrada** (Zod schema no endpoint PUT /details). Se os dados passaram na validação Zod e foram salvos, estão completos. O avanço só checa `details !== null`.

---

## 3d. Zod Schemas por Ramo (Backend)

Definidos em `apps/server/src/schemas/proposal-details.schemas.ts`:

```ts
const autoDetailsSchema = z.object({
  branch: z.literal('AUTO'),
  marca: z.string().min(1),
  modelo: z.string().min(1),
  anoFabricacao: z.number().int().min(1900).max(2100),
  anoModelo: z.number().int().min(1900).max(2100),
  placa: z.string().optional(),
  chassi: z.string().optional(),
  cor: z.string().optional(),
  combustivel: z.string().optional(),
  usoVeiculo: z.string().optional(),
});

// ... mesmo padrão para cada ramo

const insuredObjectDetailsSchema = z.discriminatedUnion('branch', [
  autoDetailsSchema,
  residentialDetailsSchema,
  condominiumDetailsSchema,
  businessDetailsSchema,
  lifeDetailsSchema,
  otherDetailsSchema,
]);

const updateProposalDetailsSchema = z.object({
  details: insuredObjectDetailsSchema,
  premiumValueInCents: z.number().int().min(0),
  commissionBasisPoints: z.number().int().min(0).max(10000),
});
```

Endpoint: `PUT /api/v1/proposals/:id/details`

- Middleware: `authMiddleware -> tenantMiddleware -> requireAbility('update', 'Proposal')`
- COMMERCIAL: verifica `salespersonId === userId` (ownership check per AUTH-7)
- Semântica: full replacement (não merge parcial)

---

## 3e. Notas de Domínio

- Campo `rendaMensalCentavos` (não `rendaMensal`) — money in cents per CLAUDE.md
- `commissionBasisPoints` é o nome semântico correto (0-10000 = 0%-100%). O campo Prisma mantém `commissionPercentageInCents` por backward compatibility, mas a API e UI usam "basis points"
- Placa de veículo: aceitar ambos formatos (ABC-1234 antigo e ABC1D23 Mercosul) — sem máscara rígida, campo texto livre
- `fumante` e `esportesRadicais`: renderizados como Switch (toggle) no frontend, não como Select
- DatePicker: configurar locale `pt-BR` via `date-fns/locale/ptBR` no react-day-picker
- Combobox no Sheet: testar se @base-ui Combobox tem o mesmo bug de portal do Select. Se sim, usar Autocomplete (mesmo pacote, API similar) ou input com dropdown customizado

---

## 4. Onde os Campos Aparecem

- **Criação (Sheet):** 3 campos apenas — cliente (combobox), ramo (select), tipo (select)
- **Detalhe (`/proposals/[id]`):** seção "Objeto Segurado" renderiza os campos do ramo correspondente. Aparece a partir do estágio QUOTE. Formulário inline com botão "Salvar".
- **Validação de avanço:** ao avançar QUOTE → PROTOCOL, backend valida que os campos obrigatórios do ramo estão preenchidos em `details`.

---

## 5. Melhorias de UX nos Formulários

### 5.1 Máscaras de Input

**Lib:** `@react-input/mask` (7.9 kB, React 19 compatível)

| Campo    | Máscara            | Onde                                     |
| -------- | ------------------ | ---------------------------------------- |
| CPF      | 000.000.000-00     | Formulário de cliente                    |
| CNPJ     | 00.000.000/0000-00 | Formulário de cliente, ramo BUSINESS     |
| Telefone | (00) 00000-0000    | Formulário de cliente                    |
| CEP      | 00000-000          | Ramos RESIDENTIAL, CONDOMINIUM, BUSINESS |

O campo Documento do cliente usa máscara dinâmica — CPF (11 dígitos) ou CNPJ (14 dígitos) baseado no tamanho do input.

### 5.2 Date Picker

Substituir `<input type="date">` por componente **Calendar + Popover** do shadcn.

- Criar componente reutilizável `DatePicker` em `components/ui/date-picker.tsx`
- Formato de exibição: pt-BR (dd/mm/aaaa)
- Resolve o bug de data não carregando ao editar (valor era string ISO, input nativo espera formato diferente)

### 5.3 Selects Bugados em Modais

**Problema:** @base-ui Select dentro de Sheet/Dialog abre e fecha instantaneamente (conflito de portal/focus com overlay).

**Solução:** usar `<select>` nativo com estilo Tailwind dentro de Sheet/Dialog. Criar componente `NativeSelect` reutilizável.

- Manter shadcn Select nos toolbars de listagem (fora de modais, funciona normalmente)
- Usar NativeSelect dentro de Sheet, Dialog, e na página de detalhe

### 5.4 Mapeamento de Labels

Todos os selects e badges devem mostrar labels em pt-BR, nunca valores brutos:

| Valor         | Label           |
| ------------- | --------------- |
| CAPTURE       | Captação        |
| QUOTE         | Cotação         |
| PROTOCOL      | Protocolo       |
| INSPECTION    | Vistoria        |
| PAYMENT       | Pagamento       |
| POLICY_ISSUED | Apólice Emitida |
| LOST          | Perda           |
| NEW_INSURANCE | Novo Seguro     |
| RENEWAL       | Renovação       |
| LEAD          | Lead            |
| CLIENT        | Cliente         |
| FORMER_CLIENT | Ex-Cliente      |
| ALL / **all** | Todos           |

Aplicar em: filtros de toolbar + selects de formulário + badges de tabela.

### 5.5 Seletor de Cliente na Proposta

Substituir input de texto (ID cru) por **Combobox** do shadcn:

- Busca por nome ou documento
- Faz query à API `GET /api/v1/clients?search=<term>&limit=10`
- Exibe: nome + documento formatado
- Debounce de 300ms na busca
- Funciona dentro do Sheet de criação de proposta

### 5.6 Formulário de Criação Simplificado

Remover os campos `premiumValueInCents` e `commissionPercentageInCents` do formulário de nova proposta. Esses valores são preenchidos no detalhe, no estágio QUOTE, junto com os dados do objeto segurado.

Campos do formulário de criação:

1. Cliente (combobox com busca)
2. Ramo (select com labels pt-BR)
3. Tipo (select: Novo Seguro / Renovação)

---

## 6. Componentes Afetados

### Novos componentes

- `components/ui/date-picker.tsx` — Calendar + Popover wrapper
- `components/ui/native-select.tsx` — select nativo estilizado para uso em modais
- `features/proposals/components/branch-fields.tsx` — campos dinâmicos por ramo
- `features/proposals/components/insured-object-section.tsx` — seção na página de detalhe

### Componentes modificados

- `features/clients/components/client-form.tsx` — máscaras, date picker, native select
- `features/clients/components/clients-toolbar.tsx` — labels pt-BR nos filtros
- `features/proposals/components/proposal-form.tsx` — combobox cliente, remover campos, native select
- `features/proposals/components/proposals-table.tsx` — labels pt-BR nos filtros
- `features/proposals/components/proposal-detail.tsx` — adicionar seção objeto segurado
- `features/policies/components/policies-table.tsx` — labels pt-BR nos filtros

### Backend

- `packages/db/prisma/schema.prisma` — adicionar `details Json?` ao Proposal
- `packages/core/src/modules/proposal/` — adicionar use case UpdateProposalDetails
- `apps/server/src/routes/v1/proposal-routes.ts` — rota PUT /proposals/:id/details
- `apps/server/src/schemas/proposal.schemas.ts` — Zod schemas por ramo

---

## 7. Ordem de Implementação Recomendada

1. Prisma schema (`details Json?`) + generate
2. Domain: tipos `InsuredObjectDetails`, método `updateDetails()`, mapper
3. Backend: Zod schemas por ramo + use case `UpdateProposalDetails` + rota PUT
4. Frontend: componentes reutilizáveis (NativeSelect, DatePicker)
5. Frontend: máscaras de input + labels pt-BR (pode paralelizar)
6. Frontend: formulário de proposta simplificado + Combobox cliente
7. Frontend: seção "Objeto Segurado" na página de detalhe + branch fields

---

## 8. Fora de Escopo

- Kanban board (Fase posterior)
- Documentos anexados à proposta
- Checklist por estágio (já existe no modelo, UI em fase posterior)
- Validação de CPF/CNPJ (dígitos verificadores) — apenas máscara de formato
- Busca de endereço por CEP (API ViaCEP) — melhoria futura
- Seleção de seguradora (Insurer) na cotação — será adicionado quando o módulo Insurer estiver implementado
