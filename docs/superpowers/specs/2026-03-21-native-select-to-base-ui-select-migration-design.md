# Migração NativeSelect → Select (base-ui)

**Data:** 2026-03-21
**Objetivo:** Consistência visual - substituir todos os `NativeSelect` (HTML nativo) pelo `Select` do `@base-ui/react` já existente no projeto, corrigindo o bug de labels pt-BR.

## Contexto

O projeto usa o preset `@coss/style` baseado em `@base-ui/react`. O componente `Select` (`components/ui/select.tsx`) já existe com 241 linhas, totalmente estilizado, mas **não era usado** porque o `<Select.Value>` renderizava o valor cru (ex: `ALL`, `CAPTURE`) em vez do label pt-BR (ex: `Todos`, `Captação`).

A solução anterior foi criar o `NativeSelect` (wrapper sobre `<select>` HTML nativo), que funciona mas quebra a consistência visual do design system.

## Causa Raiz do Bug

O `@base-ui/react Select` precisa da prop `items` no `<Select.Root>` para mapear `value → label` no trigger. Sem essa prop, o `<Select.Value>` mostra o valor cru.

```tsx
// Bugado - mostra raw value
<Select value={value} onValueChange={onChange}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  ...
</Select>

// Corrigido - mostra label pt-BR
<Select value={value} onValueChange={onChange} items={options}>
  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
  ...
</Select>
```

## Escopo

Substituir **todas as 11 instâncias** de `NativeSelect` em 6 arquivos e deletar o componente.

### Filtros de Toolbar (4 instâncias)

| Arquivo                                             | Campo        | Options                    |
| --------------------------------------------------- | ------------ | -------------------------- |
| `features/clients/components/clients-toolbar.tsx`   | Tipo cliente | `TYPE_FILTER_OPTIONS`      |
| `features/proposals/components/proposals-table.tsx` | Estágio      | `STAGES` + labels          |
| `features/proposals/components/proposals-table.tsx` | Tipo board   | `BOARD_TYPES` + labels     |
| `features/policies/components/policies-table.tsx`   | Status       | `POLICY_STATUSES` + labels |

**Padrão filtro toolbar:**

```tsx
<Select value={filter} onValueChange={onFilterChange} items={OPTIONS}>
  <SelectTrigger className="w-40">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {OPTIONS.map((opt) => (
      <SelectItem key={opt.value} value={opt.value}>
        {opt.label}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Campos de Formulário (7 instâncias)

| Arquivo                                                        | Campo                      | Options                  |
| -------------------------------------------------------------- | -------------------------- | ------------------------ |
| `features/clients/components/client-form.tsx`                  | Tipo                       | `TYPE_OPTIONS`           |
| `features/clients/components/client-form.tsx`                  | Estado civil               | `MARITAL_SELECT_OPTIONS` |
| `features/proposals/components/proposal-form.tsx`              | Ramo                       | `BRANCH_OPTIONS`         |
| `features/proposals/components/proposal-form.tsx`              | Tipo board                 | `BOARD_TYPE_OPTIONS`     |
| `features/proposals/components/branch-field-sets.tsx`          | Combustível                | `COMBUSTIVEL_OPTIONS`    |
| `features/proposals/components/branch-field-sets.tsx`          | Uso veículo                | `USO_VEICULO_OPTIONS`    |
| `features/proposals/components/branch-field-sets-property.tsx` | Tipo/uso/construção imóvel | 3 arrays de options      |

**Padrão campo formulário (React Hook Form):**

```tsx
<Controller
  name="fieldName"
  control={control}
  render={({ field, fieldState }) => (
    <Select value={field.value} onValueChange={field.onChange} items={OPTIONS}>
      <SelectTrigger aria-invalid={fieldState.invalid}>
        <SelectValue placeholder="Selecione" />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )}
/>
```

## Cleanup

- Deletar `components/ui/native-select.tsx`
- Remover todos os imports de `NativeSelect`

## Decisões

- **base-ui sobre Radix:** O preset `@coss/style` já usa base-ui. Manter coerência.
- **Fix no uso, não no componente:** O `select.tsx` não precisa de alterações. O fix é passar `items` no consumer.
- **Deletar NativeSelect:** Código morto após migração. Git preserva histórico.

## Critérios de Aceite

1. Todos os 11 selects mostram labels pt-BR corretos no trigger
2. Filtros de toolbar funcionam (mudam estado, resetam cursor)
3. Campos de formulário funcionam com React Hook Form (validação, submit)
4. Zero imports de `NativeSelect` no codebase
5. Arquivo `native-select.tsx` deletado
6. Visual consistente com o design system (@coss/style)
7. Typecheck passa sem erros
