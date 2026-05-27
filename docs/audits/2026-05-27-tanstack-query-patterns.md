# TanStack Query Patterns Audit (SCRUM-86)

**Data:** 2026-05-27
**Escopo:** `apps/web/src/features/**` e `apps/web/src/lib/**`
**Origem:** spike aberto a partir de revert em PR #382 (`feedback_bens-code-reviewer-may-hallucinate` — caso TanStack Query)

## Sumário executivo

- ✅ **Pattern dominante é correto.** 15+ hooks customizados wrappam `useMutation` (raw ou Orval-gerado) com `onSuccess`/`onError` globais. Consumers usam `mutate()` + per-call `onSuccess` opcional pra navegação/UX. Ordem de execução respeitada (hook FIRST, per-call SECOND).
- ⚠️ **1 anti-pattern encontrado.** `auto-fields.tsx` usa `mutateAsync` + `try/catch` silencioso quando `mutate()` + per-call `onSuccess` seria suficiente.
- ✅ **0 casos** de `onError` per-call duplicando o `onError` do hook global.
- ✅ **0 casos** de `mutateAsync` sem `await` (`void mutateAsync(...)`).
- ✅ **0 hooks customizados sem `onError`** (todos os 15+ tratam erro globalmente).

## Metodologia

```bash
# 1) Localizar mutateAsync no projeto
rg -t ts --type-add 'tsx:*.tsx' -t tsx 'mutateAsync' apps/web/src
# → 3 hits: 2 prod (auto-fields.tsx) + 1 test mock

# 2) Catch silencioso próximo a mutateAsync
rg -A 5 'mutateAsync' apps/web/src/features
# → 2 hits com `catch {}` em auto-fields.tsx

# 3) Hooks customizados usando useMutation raw
rg -t ts --type-add 'tsx:*.tsx' -t tsx 'useMutation\(' apps/web/src/features --files-with-matches
# → 15 hooks (use-clients, use-proposals, use-conversations, etc.)

# 4) Per-call mutate options nos consumers
rg -t ts --type-add 'tsx:*.tsx' -t tsx '\.mutate\(.+,\s*\{' apps/web/src/features --files-with-matches
# → 10+ components (commission-actions, channel-form-dialog, etc.)
```

## Findings

### CRITICAL

Nenhum.

### WARNING (1)

#### W1 — auto-fields.tsx: `mutateAsync` + `try/catch` silencioso

**File:** `apps/web/src/features/proposals/components/branch-field-sets/auto-fields.tsx:70-77, 82-91`

**Pattern atual:**

```tsx
async function handlePlateBlur(e: React.FocusEvent<HTMLInputElement>) {
  const plate = normalizePlate(e.target.value)
  if (!isValidPlate(plate)) return
  try {
    const result = await lookup.mutateAsync({ data: { plate, proposalId } })
    fillEmptyFields(result.data.data)
  } catch {
    // onError in useVehicleLookup handles the toast
  }
}
```

**Por que é anti-pattern:**

`mutateAsync` retorna uma Promise que **rejeita em caso de erro** — mesmo quando `onError` está configurado no hook (`useVehicleLookup` em `hooks/use-vehicle-lookup.ts` trata os 3 códigos de erro conhecidos). O `try/catch` vazio existe **apenas pra suprimir essa rejection** que de outra forma viraria unhandled promise rejection no console.

Sinaliza que o autor usou `mutateAsync` por hábito quando `mutate()` com per-call `onSuccess` resolveria sem rejection.

**Doc TanStack Query v5 confirma:**

- `mutate()` com per-call `{ onSuccess }` é o pattern recomendado pra "component-specific side effects"
- Ordem de execução: hook-level `onSuccess` fires FIRST, per-call `onSuccess` fires SECOND (complementares)
- `mutateAsync` é pra casos onde precisa compor `await` com outras Promises — exige try/catch porque rejeita em erro

**Refactor recomendado:**

```tsx
function handlePlateBlur(e: React.FocusEvent<HTMLInputElement>) {
  const plate = normalizePlate(e.target.value)
  if (!isValidPlate(plate)) return
  lookup.mutate(
    { data: { plate, proposalId } },
    { onSuccess: (result) => fillEmptyFields(result.data.data) }
  )
}
```

Sem `try/catch`, sem `async`, mais limpo. `onError` global do `useVehicleLookup` continua tratando os toasts.

**Severidade:** WARNING (não é bug funcional — o toast é exibido corretamente; é code smell + dependência implícita)

**Esforço:** ~10min (refactor de 2 handlers; sem specs pra esse componente).

**Action:** abrir PR pequena de refactor. Não bloqueante, mas vale fechar pra evitar contágio.

### INFO

- **Pattern dominante consistente:** todos os 15 hooks customizados em `apps/web/src/features/**/hooks/` seguem o mesmo molde — `useMutation` (ou Orval mutation hook) com `onSuccess` que invalida queries + `toast.success`, e `onError` com `extractErrorMessage(err, fallback)`. Sem drift.
- **72 chamadas `.mutate()`** nos consumers, ~10 com per-call options pra navegação ou auto-fill — uso idiomático.
- **Orval auto-gen mutations** (em `apps/web/src/api/endpoints/**`) **não são usadas diretamente** pelos componentes — sempre passam por wrappers customizados nos `features/**/hooks/`. Isolamento limpo entre auto-gen e domain logic.
- **Test mocks usando `as unknown as MutationReturn`** (padrão recomendado pelo `bens-code-rules`) presente em todos os 7 specs auditados — sem `as any` ou `as never` em código de produção.

## Recomendações

1. **Refactor `auto-fields.tsx`** — PR ~10min, dois `handle*Blur`. Sem specs existentes pra esse componente.
2. **NÃO criar skill** `bens-tanstack-query-patterns` — pattern já é consistente em todo o codebase; um anti-pattern isolado não justifica skill nova. A memory existente `feedback_bens-code-reviewer-may-hallucinate` (com o caso TanStack registrado) é suficiente como referência.
3. **PR review futuro:** flagar imediatamente qualquer `mutateAsync` + `catch {}` silencioso. Sinal claro de uso desnecessário de async/await.

## Critério de pronto

- [x] Audit completo (`apps/web/src/features/**`)
- [x] 1 hit identificado, classificado, com refactor sugerido
- [x] Memory `feedback_bens-code-reviewer-may-hallucinate` já registra o anti-pattern
- [ ] PR refactor de `auto-fields.tsx` (próxima etapa autônoma — não bloqueia outros itens do billing)

## Memory referenciadas

- `feedback_bens-code-reviewer-may-hallucinate` — caso TanStack que originou o spike
- `bens-code-rules` — `as unknown as X` é a forma aceita pra test mocks
