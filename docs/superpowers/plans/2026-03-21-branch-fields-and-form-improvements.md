# Branch Fields & Form Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add insured-object fields per insurance branch (collected at QUOTE stage), fix form UX bugs (selects, dates, masks, labels), and simplify proposal creation.

**Architecture:** `details Json?` field on Proposal stores branch-specific data as discriminated union. New `UpdateProposalDetails` use case validates via Zod per branch. Frontend uses NativeSelect in modals, DatePicker (Calendar+Popover), masked inputs, and Combobox for client selection.

**Tech Stack:** Prisma 7, tsyringe, Zod discriminatedUnion, @react-input/mask, react-day-picker, shadcn Calendar/Combobox/Popover.

**Spec:** `docs/superpowers/specs/2026-03-21-proposal-branch-fields-and-form-improvements-design.md`

---

## File Structure

```
packages/
├── db/prisma/schema.prisma                              # Add details Json? to Proposal
├── core/src/modules/proposal/
│   ├── domain/
│   │   ├── proposal.ts                                  # Add details prop + updateDetails()
│   │   ├── proposal.spec.ts                             # Tests for updateDetails
│   │   ├── proposal-errors.ts                           # Add ProposalDetailsRequiredError
│   │   └── insured-object-details.ts                    # NEW: discriminated union types
│   ├── application/
│   │   ├── advance-proposal-stage.ts                    # Add details validation
│   │   ├── advance-proposal-stage.spec.ts               # Update tests
│   │   ├── update-proposal-details.ts                   # NEW: use case
│   │   └── update-proposal-details.spec.ts              # NEW: tests
│   └── infrastructure/
│       └── proposal-mapper.ts                           # Add details mapping
apps/
├── server/src/
│   ├── schemas/proposal-details.schemas.ts              # NEW: Zod schemas per branch
│   ├── schemas/proposal.schemas.ts                      # Remove premium/commission from create
│   ├── routes/v1/proposal-routes.ts                     # Add PUT /:id/details
│   └── container-registrations.ts                       # Register UpdateProposalDetails
├── web/src/
│   ├── components/ui/
│   │   ├── date-picker.tsx                              # NEW: Calendar + Popover wrapper
│   │   └── native-select.tsx                            # NEW: styled <select> for modals
│   ├── lib/
│   │   └── masks.ts                                     # NEW: mask definitions (CPF, phone, CEP)
│   ├── features/clients/
│   │   ├── components/client-form.tsx                   # Masks, DatePicker, NativeSelect
│   │   └── components/clients-toolbar.tsx               # Label mapping on filter
│   ├── features/proposals/
│   │   ├── types/index.ts                               # Add InsuredObjectDetails types
│   │   ├── hooks/use-proposals.ts                       # Add useUpdateProposalDetails
│   │   ├── components/proposal-form.tsx                  # Simplify: 3 fields + Combobox
│   │   ├── components/proposal-detail.tsx               # Add insured object section
│   │   ├── components/branch-fields.tsx                 # NEW: dynamic fields per branch
│   │   └── components/proposals-table.tsx               # Label mapping on filters
│   └── features/policies/
│       └── components/policies-table.tsx                # Label mapping on filter
```

---

## Task 1: Prisma Schema + Domain Types

**Files:**

- Modify: `packages/db/prisma/schema.prisma`
- Create: `packages/core/src/modules/proposal/domain/insured-object-details.ts`

- [ ] **Step 1: Add `details` field to Proposal model**

In `schema.prisma`, add after `renewalPolicyId`:

```prisma
details             Json?
```

- [ ] **Step 2: Generate Prisma client**

```bash
cd packages/db && DATABASE_URL="postgresql://bens:bens_dev@localhost:5432/bens_seguros" pnpm exec prisma generate
```

- [ ] **Step 3: Push schema to DB**

```bash
cd packages/db && DATABASE_URL="postgresql://bens:bens_dev@localhost:5432/bens_seguros" pnpm exec prisma db push
```

- [ ] **Step 4: Create insured-object-details.ts**

```ts
// packages/core/src/modules/proposal/domain/insured-object-details.ts

export interface AutoDetails {
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

export interface ResidentialDetails {
  branch: 'RESIDENTIAL';
  tipoImovel: string;
  usoImovel: string;
  cep: string;
  endereco?: string;
  construcao?: string;
  areaM2?: number;
}

export interface CondominiumDetails {
  branch: 'CONDOMINIUM';
  nomeCondominio: string;
  numeroUnidades: number;
  cep: string;
  endereco?: string;
  anoConstrucao?: number;
  numeroAndares?: number;
}

export interface BusinessDetails {
  branch: 'BUSINESS';
  razaoSocial: string;
  cnpj: string;
  atividade: string;
  cep?: string;
  endereco?: string;
  areaM2?: number;
}

export interface LifeDetails {
  branch: 'LIFE';
  profissao: string;
  rendaMensalCentavos?: number;
  fumante?: boolean;
  esportesRadicais?: boolean;
  beneficiarios?: string;
}

export interface OtherDetails {
  branch: 'OTHER';
  descricao: string;
}

export type InsuredObjectDetails =
  | AutoDetails
  | ResidentialDetails
  | CondominiumDetails
  | BusinessDetails
  | LifeDetails
  | OtherDetails;

export function isInsuredObjectDetails(value: unknown): value is InsuredObjectDetails {
  if (typeof value !== 'object' || value === null || !('branch' in value)) return false;
  const branches = ['AUTO', 'RESIDENTIAL', 'CONDOMINIUM', 'BUSINESS', 'LIFE', 'OTHER'];
  return branches.includes((value as { branch: string }).branch);
}
```

- [ ] **Step 5: Export from proposal module index**

Add to `packages/core/src/modules/proposal/index.ts`:

```ts
export type {
  InsuredObjectDetails,
  AutoDetails,
  ResidentialDetails,
  CondominiumDetails,
  BusinessDetails,
  LifeDetails,
  OtherDetails,
} from './domain/insured-object-details.js';
export { isInsuredObjectDetails } from './domain/insured-object-details.js';
```

- [ ] **Step 6: Commit**

```bash
git add packages/db/ packages/core/src/modules/proposal/domain/insured-object-details.ts packages/core/src/modules/proposal/index.ts
git commit -m "feat: add details Json field to Proposal + InsuredObjectDetails types"
```

---

## Task 2: Update Proposal Entity + Tests (TDD)

**Files:**

- Modify: `packages/core/src/modules/proposal/domain/proposal.ts`
- Modify: `packages/core/src/modules/proposal/domain/proposal.spec.ts`
- Modify: `packages/core/src/modules/proposal/domain/proposal-errors.ts`

- [ ] **Step 1: Add ProposalDetailsRequiredError**

In `proposal-errors.ts`, add:

```ts
export class ProposalDetailsRequiredError extends Error {
  readonly code = 'PROPOSAL_DETAILS_REQUIRED' as const;
  constructor(id: string) {
    super(`Preencha os dados do objeto segurado antes de avançar (proposta ${id})`);
    this.name = 'ProposalDetailsRequiredError';
  }
}
```

Add to `ProposalErrors` const:

```ts
detailsRequired: (id: string) => new ProposalDetailsRequiredError(id),
```

- [ ] **Step 2: Write failing tests for updateDetails**

Add to `proposal.spec.ts`:

```ts
import type { AutoDetails } from './insured-object-details.js';

const autoDetails: AutoDetails = {
  branch: 'AUTO',
  marca: 'Toyota',
  modelo: 'Corolla',
  anoFabricacao: 2024,
  anoModelo: 2025,
};

it('updates details with matching branch', () => {
  const proposal = Proposal.create(validProps);
  proposal.updateDetails(autoDetails, 150000, 1500);
  expect(proposal.details).toEqual(autoDetails);
  expect(proposal.premiumValueInCents).toBe(150000);
  expect(proposal.commissionPercentageInCents).toBe(1500);
});

it('rejects details with mismatched branch', () => {
  const proposal = Proposal.create(validProps); // branch: AUTO
  const residentialDetails = {
    branch: 'RESIDENTIAL' as const,
    tipoImovel: 'Casa',
    usoImovel: 'Habitual',
    cep: '01310100',
  };
  expect(() => proposal.updateDetails(residentialDetails, 100000, 1000)).toThrow('branch');
});
```

- [ ] **Step 3: Run tests — expect fail**

```bash
cd packages/core && pnpm exec vitest run src/modules/proposal/domain/proposal.spec.ts
```

- [ ] **Step 4: Add `details` to ProposalProps + implement updateDetails()**

In `proposal.ts`:

Add import:

```ts
import type { InsuredObjectDetails } from './insured-object-details.js';
```

Add to `ProposalProps`:

```ts
details: InsuredObjectDetails | null;
```

Add to `Proposal.create()`:

```ts
details: null,
```

Add method:

```ts
updateDetails(
  details: InsuredObjectDetails,
  premiumValueInCents: number,
  commissionBasisPoints: number,
): void {
  if (details.branch !== this.props.branch) {
    throw new Error(`Details branch ${details.branch} does not match proposal branch ${this.props.branch}`);
  }
  this.props.details = details;
  this.props.premiumValueInCents = premiumValueInCents;
  this.props.commissionPercentageInCents = commissionBasisPoints;
  this.props.updatedAt = new Date();
}
```

Add getter:

```ts
get details(): InsuredObjectDetails | null {
  return this.props.details;
}
```

Update `Proposal.restore()` call sites to include `details`.

- [ ] **Step 5: Run tests — expect pass**

```bash
cd packages/core && pnpm exec vitest run src/modules/proposal/domain/proposal.spec.ts
```

Expected: all tests PASS.

- [ ] **Step 6: Update ProposalMapper**

In `proposal-mapper.ts`, add `details` mapping:

```ts
// toDomain:
details: isInsuredObjectDetails(row.details) ? row.details : null,

// toPersistence:
details: json.details,
```

Import `isInsuredObjectDetails` from `./insured-object-details.js`.

- [ ] **Step 7: Commit**

```bash
git add packages/core/src/modules/proposal/
git commit -m "feat: add details field to Proposal entity with updateDetails method"
```

---

## Task 3: UpdateProposalDetails Use Case + Advance Validation (TDD)

**Files:**

- Create: `packages/core/src/modules/proposal/application/update-proposal-details.ts`
- Create: `packages/core/src/modules/proposal/application/update-proposal-details.spec.ts`
- Modify: `packages/core/src/modules/proposal/application/advance-proposal-stage.ts`
- Modify: `packages/core/src/modules/proposal/application/advance-proposal-stage.spec.ts`

- [ ] **Step 1: Write failing test for UpdateProposalDetails**

```ts
// update-proposal-details.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { UpdateProposalDetails } from './update-proposal-details.js';
import { Proposal } from '../domain/proposal.js';
import type { ProposalRepository } from '../domain/proposal-repository.js';
import type { AutoDetails } from '../domain/insured-object-details.js';

const autoDetails: AutoDetails = {
  branch: 'AUTO',
  marca: 'Toyota',
  modelo: 'Corolla',
  anoFabricacao: 2024,
  anoModelo: 2025,
};

function createMockRepo(proposal: Proposal | null): ProposalRepository {
  return { save: vi.fn(), findById: vi.fn().mockResolvedValue(proposal), findMany: vi.fn() };
}

describe('UpdateProposalDetails', () => {
  it('updates proposal details', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    });
    const repo = createMockRepo(proposal);
    const useCase = new UpdateProposalDetails(repo);

    await useCase.execute(proposal.id, 'org-1', {
      details: autoDetails,
      premiumValueInCents: 150000,
      commissionBasisPoints: 1500,
    });

    expect(proposal.details).toEqual(autoDetails);
    expect(repo.save).toHaveBeenCalledWith(proposal);
  });

  it('throws if proposal not found', async () => {
    const repo = createMockRepo(null);
    const useCase = new UpdateProposalDetails(repo);
    await expect(
      useCase.execute('xxx', 'org-1', {
        details: autoDetails,
        premiumValueInCents: 0,
        commissionBasisPoints: 0,
      }),
    ).rejects.toThrow('não encontrada');
  });
});
```

- [ ] **Step 2: Run test — expect fail**

- [ ] **Step 3: Implement UpdateProposalDetails**

```ts
// update-proposal-details.ts
import { injectable, inject } from 'tsyringe';
import type { Proposal } from '../domain/proposal.js';
import type { ProposalRepository } from '../domain/proposal-repository.js';
import type { InsuredObjectDetails } from '../domain/insured-object-details.js';
import { ProposalErrors } from '../domain/proposal-errors.js';

interface UpdateProposalDetailsDTO {
  details: InsuredObjectDetails;
  premiumValueInCents: number;
  commissionBasisPoints: number;
}

@injectable()
export class UpdateProposalDetails {
  constructor(@inject('ProposalRepository') private readonly proposalRepo: ProposalRepository) {}

  async execute(
    proposalId: string,
    organizationId: string,
    dto: UpdateProposalDetailsDTO,
  ): Promise<Proposal> {
    const proposal = await this.proposalRepo.findById(proposalId, organizationId);
    if (!proposal) throw ProposalErrors.notFound(proposalId);
    proposal.updateDetails(dto.details, dto.premiumValueInCents, dto.commissionBasisPoints);
    await this.proposalRepo.save(proposal);
    return proposal;
  }
}
```

- [ ] **Step 4: Run test — expect pass**

- [ ] **Step 5: Add details validation to AdvanceProposalStage**

In `advance-proposal-stage.ts`, before `proposal.advance()`:

```ts
if (proposal.stage === 'QUOTE' && !proposal.details) {
  throw ProposalErrors.detailsRequired(proposalId);
}
```

Import `ProposalDetailsRequiredError` for the route handler.

- [ ] **Step 6: Add test for advance validation**

In `advance-proposal-stage.spec.ts`, add:

```ts
it('rejects advance from QUOTE without details', async () => {
  const proposal = Proposal.create({
    organizationId: 'org-1',
    clientId: 'c-1',
    salespersonId: 'u-1',
    branch: 'AUTO',
    boardType: 'NEW_INSURANCE',
  });
  proposal.advance(); // → QUOTE
  const repo = createMockRepo(proposal);
  const useCase = new AdvanceProposalStage(repo);

  await expect(useCase.execute(proposal.id, 'org-1')).rejects.toThrow('objeto segurado');
});
```

- [ ] **Step 7: Run all proposal tests — expect pass**

```bash
cd packages/core && pnpm exec vitest run src/modules/proposal/
```

- [ ] **Step 8: Export + register in DI container**

Add `UpdateProposalDetails` to proposal module index and `container-registrations.ts`.

- [ ] **Step 9: Commit**

```bash
git commit -m "feat: add UpdateProposalDetails use case + QUOTE→PROTOCOL validation"
```

---

## Task 4: Backend Route + Zod Schemas

**Files:**

- Create: `apps/server/src/schemas/proposal-details.schemas.ts`
- Modify: `apps/server/src/schemas/proposal.schemas.ts`
- Modify: `apps/server/src/routes/v1/proposal-routes.ts`

- [ ] **Step 1: Create Zod schemas per branch**

Create `proposal-details.schemas.ts` with:

- `autoDetailsSchema`, `residentialDetailsSchema`, `condominiumDetailsSchema`, `businessDetailsSchema`, `lifeDetailsSchema`, `otherDetailsSchema`
- `insuredObjectDetailsSchema = z.discriminatedUnion('branch', [...])`
- `updateProposalDetailsBodySchema = z.object({ details, premiumValueInCents: z.number().int().min(0), commissionBasisPoints: z.number().int().min(0).max(10000) })`

- [ ] **Step 2: Simplify createProposalBodySchema**

In `proposal.schemas.ts`, remove `premiumValueInCents` and `commissionPercentageInCents` fields from create schema.

- [ ] **Step 3: Add PUT /proposals/:id/details route**

In `proposal-routes.ts`, add handler with `requireAbility('update', 'Proposal')` + Zod validation. Map `ProposalDetailsRequiredError` to 422.

- [ ] **Step 4: Typecheck**

```bash
cd apps/server && pnpm exec tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add PUT /proposals/:id/details route with Zod validation per branch"
```

---

## Task 5: Frontend Reusable Components (NativeSelect, DatePicker, Masks)

**Files:**

- Create: `apps/web/src/components/ui/native-select.tsx`
- Create: `apps/web/src/components/ui/date-picker.tsx`
- Create: `apps/web/src/lib/masks.ts`

- [ ] **Step 1: Create NativeSelect component**

Styled `<select>` with Tailwind matching shadcn Input appearance. Props: `options: { value: string; label: string }[]`, `placeholder?`, `value`, `onChange`, `disabled?`, `className?`.

- [ ] **Step 2: Create DatePicker component**

Calendar + Popover composition. Props: `value?: Date`, `onChange: (date: Date | undefined) => void`, `placeholder?`. Display format: `dd/mm/yyyy` using Intl.DateTimeFormat pt-BR. Configure react-day-picker locale to pt-BR.

- [ ] **Step 3: Create masks.ts**

Define mask configs for CPF, CNPJ, dynamic CPF/CNPJ, phone, CEP using `@react-input/mask` format.

- [ ] **Step 4: Typecheck**

```bash
cd apps/web && pnpm exec tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add NativeSelect, DatePicker, and input mask utilities"
```

---

## Task 6: Fix Client Form (Masks, DatePicker, NativeSelect)

**Files:**

- Modify: `apps/web/src/features/clients/components/client-form.tsx`

- [ ] **Step 1: Replace document input with masked input (CPF/CNPJ dynamic)**
- [ ] **Step 2: Replace phone input with masked input**
- [ ] **Step 3: Replace `<input type="date">` with DatePicker component**
- [ ] **Step 4: Replace all Select components with NativeSelect**
- [ ] **Step 5: Ensure labels show pt-BR text (Lead, Cliente, Ex-Cliente, etc.)**
- [ ] **Step 6: Typecheck + visual test**
- [ ] **Step 7: Commit**

```bash
git commit -m "fix: client form - masks, date picker, native selects, pt-BR labels"
```

---

## Task 7: Fix Label Mapping in All Toolbars/Tables

**Files:**

- Modify: `apps/web/src/features/clients/components/clients-toolbar.tsx`
- Modify: `apps/web/src/features/proposals/components/proposals-table.tsx`
- Modify: `apps/web/src/features/policies/components/policies-table.tsx`

- [ ] **Step 1: Fix clients toolbar** — filter shows "Todos", "Lead", "Cliente", "Ex-Cliente"
- [ ] **Step 2: Fix proposals table filters** — stage shows "Captação", "Cotação", etc. BoardType shows "Novo Seguro", "Renovação". Default shows "Todos"
- [ ] **Step 3: Fix policies table filter** — status shows "Todos", "Ativa", "Cancelada", "Expirada"
- [ ] **Step 4: Commit**

```bash
git commit -m "fix: map all filter selects to pt-BR labels"
```

---

## Task 8: Simplify Proposal Form + Client Combobox

**Files:**

- Modify: `apps/web/src/features/proposals/components/proposal-form.tsx`
- Modify: `apps/web/src/features/proposals/hooks/use-proposals.ts`

- [ ] **Step 1: Remove premiumValueInCents and commissionPercentageInCents fields**
- [ ] **Step 2: Replace clientId text input with Combobox**

Use shadcn `Combobox` + `useComboboxFilter`. Fetch clients via `api.get('/api/v1/clients?search=<term>&limit=10')`. Display: name + document. If Combobox has portal issues in Sheet, fall back to Autocomplete component.

- [ ] **Step 3: Replace Select components with NativeSelect** (branch, boardType)
- [ ] **Step 4: Update Zod schema to match (remove premium/commission)**
- [ ] **Step 5: Typecheck + visual test**
- [ ] **Step 6: Commit**

```bash
git commit -m "feat: simplify proposal form - 3 fields + client combobox"
```

---

## Task 9: Branch Fields + Insured Object Section on Detail Page

**Files:**

- Create: `apps/web/src/features/proposals/components/branch-fields.tsx`
- Create: `apps/web/src/features/proposals/components/insured-object-section.tsx`
- Modify: `apps/web/src/features/proposals/components/proposal-detail.tsx`
- Modify: `apps/web/src/features/proposals/hooks/use-proposals.ts`
- Modify: `apps/web/src/features/proposals/types/index.ts`

- [ ] **Step 1: Add InsuredObjectDetails types to frontend types**

Copy types from `@repo/core` or import if possible. Add to `features/proposals/types/index.ts`.

- [ ] **Step 2: Add useUpdateProposalDetails hook**

```ts
export function useUpdateProposalDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      details: InsuredObjectDetails;
      premiumValueInCents: number;
      commissionBasisPoints: number;
    }) => api.post(`/api/v1/proposals/${id}/details`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
      queryClient.invalidateQueries({ queryKey: ['proposal', variables.id] });
      toast.success('Dados do objeto segurado salvos');
    },
    onError: () => toast.error('Erro ao salvar dados'),
  });
}
```

- [ ] **Step 3: Create branch-fields.tsx**

Component that renders fields per branch. Props: `branch`, `defaultValues?`, `onSubmit`. Uses React Hook Form + NativeSelect for enum fields + masked inputs for CEP/CNPJ. Also includes premiumValueInCents and commissionBasisPoints inputs.

- [ ] **Step 4: Create insured-object-section.tsx**

Wrapper that shows/hides based on stage (visible from QUOTE onward). Renders `BranchFields` with the proposal's branch. Shows "Dados do Veículo" / "Dados do Imóvel" etc. heading based on branch.

- [ ] **Step 5: Add insured-object-section to proposal-detail.tsx**

Insert below the proposal info grid, above action buttons. Only visible when `proposal.stage !== 'CAPTURE'`.

- [ ] **Step 6: Typecheck + visual test**
- [ ] **Step 7: Commit**

```bash
git commit -m "feat: add insured object section with branch-specific fields on proposal detail"
```

---

## Task 10: Final Validation

- [ ] **Step 1: Run all quality gates**

```bash
cd /home/artur/projects
pnpm typecheck
cd packages/core && pnpm exec vitest run
```

- [ ] **Step 2: Manual smoke test**

Start API + web servers. Test:

1. Create client with masked CPF, phone, DatePicker
2. Edit client — verify date loads correctly
3. Create proposal — Combobox client search, NativeSelect for branch/type
4. Advance proposal to QUOTE
5. Fill insured object details (Auto branch)
6. Try advance to PROTOCOL — should succeed
7. Verify all filter selects show pt-BR labels

- [ ] **Step 3: Commit any fixes**

```bash
git commit -m "fix: address smoke test issues"
```

---

## Task 11: Code Review

- [ ] **Step 1: Dispatch code-reviewer agent**

Review all changes from this plan against CLAUDE.md rules: SOLID, Clean Code, Object Calisthenics, zero `any`, zero `console.log`, max 200 lines per component, proper error classes, tenant isolation.

- [ ] **Step 2: Fix all critical and important issues**
- [ ] **Step 3: Commit fixes**

```bash
git commit -m "fix: address code review findings"
```

---

## Task 12: QA E2E — Full CRUD Testing via Playwright

Start API + Web servers. Test all flows with Playwright MCP.

- [ ] **Step 1: Client CRUD**
  - Create client with masked CPF, phone, DatePicker for birthDate
  - Verify data appears in table with pt-BR labels
  - Edit client — verify all fields load correctly (especially date)
  - Delete client — confirm dialog + soft delete
  - Verify empty state after deletion

- [ ] **Step 2: Proposal CRUD**
  - Create proposal via simplified form (Combobox client, NativeSelect branch/type)
  - Verify table with pt-BR stage/branch labels
  - Advance through stages: CAPTURE → QUOTE
  - Fill insured object details (branch-specific fields)
  - Advance QUOTE → PROTOCOL (should succeed with details filled)
  - Continue advancing to POLICY_ISSUED
  - Test revert from mid-stage
  - Test mark as lost with reason dialog
  - Verify QUOTE → PROTOCOL blocked without details (422 error)

- [ ] **Step 3: Filter and label verification**
  - Test all toolbar filter selects show pt-BR labels
  - Verify filter functionality (filter by stage, type, status)
  - Verify search works (debounced)

- [ ] **Step 4: Commit QA screenshots + any fixes**

---

## Task 13: Pagination & Filter Stress Test

Create multiple records to test pagination and filters under load.

- [ ] **Step 1: Create 25+ clients via API**

Use Playwright `evaluate()` to batch-create clients with varied types (LEAD, CLIENT, FORMER_CLIENT), names, and documents.

- [ ] **Step 2: Create 25+ proposals via API**

Varied branches (AUTO, RESIDENTIAL, LIFE, etc.), stages (CAPTURE, QUOTE, PROTOCOL, etc.), and board types.

- [ ] **Step 3: Test pagination**
  - Verify "Próximo" button enabled when >20 records
  - Navigate forward, verify next page loads
  - Navigate back with "Anterior"
  - Verify total count updates correctly

- [ ] **Step 4: Test filters with data**
  - Filter clients by type — verify count changes
  - Filter proposals by stage — verify correct subset
  - Filter proposals by board type
  - Search by name — verify debounced results
  - Combine filters (stage + search)

- [ ] **Step 5: Take screenshots as evidence**
- [ ] **Step 6: Commit**

```bash
git commit -m "test: QA pagination and filter stress test with 25+ records"
```
