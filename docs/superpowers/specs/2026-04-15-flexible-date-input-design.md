# SCRUM-52 — Flexible Date Input (paste + digitação)

**Data:** 2026-04-15
**Jira:** [SCRUM-52](https://arturmoiscontato.atlassian.net/browse/SCRUM-52)
**Status:** Design aprovado, pronto para plano

## 1. Problema

O `DatePicker` atual (`apps/web/src/components/ui/date-picker.tsx`) é um botão-popover com `react-day-picker`. O usuário não pode digitar nem colar valor — só clicar e navegar pelo calendário. Isso desacelera o preenchimento em operações repetitivas (datas de nascimento, vigência de apólice, sinistros, endossos) e gera atrito para quem já tem a data em mãos.

## 2. Objetivo

Tornar todos os campos de data digitáveis e coláveis, mantendo o seletor visual como alternativa. Melhoria vale para qualquer consumer existente sem alterar os forms.

## 3. Escopo

**Inclui:**

- Reescrever `components/ui/date-picker.tsx` como input mascarado híbrido (campo de texto + botão de calendário).
- Estender `lib/date-utils.ts` com parser flexível e normalizador de paste.
- Testes unitários do parser e do componente.

**Não inclui:**

- Ajustes nos forms consumers (a API do componente fica compatível).
- `DateRangePicker` novo.
- Parser de linguagem natural ("amanhã", "em 3 dias") — scope creep.
- Aceitar ISO (`AAAA-MM-DD`) no paste — fora do caso de uso do corretor.

## 4. Decisões

| #   | Decisão                     | Escolha                                                                                               | Alternativas descartadas                                                              |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1   | Forma do componente         | Input com máscara + botão de ícone à direita que abre Popover/Calendar                                | Input separado do calendário; só adicionar `onPaste` no botão atual                   |
| 2   | Formatos aceitos            | `DD/MM/AAAA`, `DD-MM-AAAA`, `DDMMAAAA` (sem separador), `DDMMAA` (sem separador, com regra de século) | Só `DD/MM/AAAA`; também aceitar ISO (`AAAA-MM-DD`)                                    |
| 3   | Reação a data inválida      | Máscara restringe caracteres (só dígitos + `/`); validação semântica no blur com erro visual inline   | Aceitar qualquer texto e validar só no submit; bloqueio em tempo real enquanto digita |
| 4   | Escopo                      | Apenas o componente base; consumers herdam automaticamente                                            | Migrar forms um a um; incluir range picker                                            |
| 5   | Abordagem técnica           | `@react-input/mask` (já instalado) + parser custom + Popover/Calendar atual                           | `chrono-node`; input controlled puro sem máscara                                      |
| 6   | Regra de século p/ `DDMMAA` | Pivô 30: `>= 30 → 19xx`, `< 30 → 20xx`                                                                | Pivô 50 (padrão Excel); sempre 20xx                                                   |
| 7   | Paste fora da máscara       | `onPaste` intercepta, normaliza via `normalizeToMask` antes de preencher                              | Deixar máscara rejeitar naturalmente (bloqueia `01011990`)                            |
| 8   | Feedback de erro            | Borda vermelha + ícone `AlertCircle` + mensagem local no input; `onChange(null)` no form state        | Toast; só mensagem sem mudança de borda; form state com string inválida               |

## 5. Arquitetura

Três unidades com responsabilidade única:

### 5.1 `lib/date-utils.ts` (estender)

```ts
// Existente — preservar
export function parseDateString(value: string): Date | undefined
export function formatDateToISO(date: Date): string

// Novo
export function parseFlexibleDate(input: string): Date | null
export function normalizeToMask(input: string): string
export function formatDateToBR(date: Date): string
```

**`parseFlexibleDate(input)`** — ordem de tentativa:

1. Trim + strip espaços internos.
2. Só dígitos, comprimento 8 → interpretar como `DDMMAAAA`.
3. Só dígitos, comprimento 6 → interpretar como `DDMMAA` (regra de século).
4. Partes separadas por `/` ou `-` (3 partes) → `[DD, MM, AAAA]` ou `[DD, MM, AA]` se a última parte tem 2 dígitos.
5. Qualquer outra forma → `null`.

Validação semântica via `date-fns/parse` com `dd/MM/yyyy` + `isValid`. Limites: `DD ∈ [1,31]`, `MM ∈ [1,12]`, `AAAA ∈ [1900, anoAtual + 10]`. Rejeita `31/02`, `29/02` em não-bissexto, etc.

**Regra de século (`DDMMAA`)**: `AA >= 30 → 19xx`, `AA < 30 → 20xx`. Pivô 30 cobre nascimentos (1930+) e vigências atuais (até 2029).

**`normalizeToMask(input)`**:

- Strip tudo que não é dígito, `/` ou `-`.
- Trocar `-` por `/`.
- Se puro dígito com 6 ou 8 chars → inserir `/` nas posições corretas (`01011990` → `01/01/1990`).
- Limitar a 10 chars finais.

**`formatDateToBR(date)`** — retorna `DD/MM/AAAA` via `Intl.DateTimeFormat('pt-BR')` para exibir no input.

### 5.2 `components/ui/date-picker.tsx` (reescrever)

**API pública mantida** (consumers não mudam):

```ts
interface DatePickerProps {
  readonly value?: Date
  readonly onChange: (date: Date | undefined) => void
  readonly placeholder?: string // default: "DD/MM/AAAA"
  readonly disabled?: boolean
  readonly className?: string
  readonly id?: string
}
```

> **Nota:** `value` é `Date | undefined`; consumers continuam convertendo ISO↔Date no boundary via `parseDateString`/`formatDateToISO` locais.

**Layout**:

```
┌────────────────────────────┐
│ [ 01/01/1990    ] [📅]     │
└────────────────────────────┘
```

`<div class="relative">` contendo:

- `<InputMask mask="__/__/____" replacement={{ _: /\d/ }} inputMode="numeric" />` (ocupa width total).
- `<button type="button">` absolute right com ícone `Calendar` (`z-10`, `pointer-events-auto` — ver memória `feedback_input_icon_pattern` pois `@coss/style` Input envolve com span).
- Botão abre `<Popover>` + `<Calendar>` (código atual reaproveitado: dropdown de mês/ano 1920 até anoAtual+10, locale `ptBR`).

**Estado interno**:

- `textValue: string` — o que está no input (pode estar parcial ou inválido).
- `value` prop — ISO exterior; formato de verdade do form.
- `localError: boolean` — true quando `textValue` é não-vazio e não parseable.

**Sincronização**:

| Evento                                                      | Ação                                                                                                                                                                                                                              |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prop `value` muda (inclui submit, reset, external setValue) | `textValue = value ? formatDateToBR(parse(value)) : ""`; `localError = false`                                                                                                                                                     |
| `onChange` do input (digitação)                             | `textValue = e.target.value`; `localError = false` (reset enquanto digita)                                                                                                                                                        |
| `onBlur` do input                                           | Vazio → `onChange(null)`, `localError = false`. Não-vazio: `parseFlexibleDate(textValue)`; válido → `textValue = formatDateToBR(d)`, `onChange(toISO(d))`, `localError = false`; inválido → `onChange(null)`, `localError = true` |
| `onPaste` do input                                          | `preventDefault`; `pasted = clipboardData.getData('text')`; `normalized = normalizeToMask(pasted)`; aplica no input + dispara blur logic                                                                                          |
| `onFocus` do input (com valor válido)                       | `select()` para facilitar sobrescrever                                                                                                                                                                                            |
| Selecionar data no Calendar                                 | Fecha popover, `textValue = formatDateToBR(d)`, `onChange(toISO(d))`, `localError = false`                                                                                                                                        |

**Feedback visual**:

- `localError === true` → `border-destructive` no container + ícone `AlertCircle` à esquerda do botão + `<span class="text-destructive text-xs mt-1">Data inválida</span>` abaixo.
- RHF error de submit (Zod) — renderizado pelo consumer via `FormMessage` como já é hoje. Ambos podem coexistir: erro local é feedback imediato, erro RHF é do schema.

### 5.3 Consumers — sem mudança

Forms (`personal-info-fields.tsx`, `issue-policy-dialog`, `claim-form.tsx`, `endorsement-form.tsx`, `assistance-form.tsx`) continuam usando `Controller` + `DatePicker` com `value` ISO e `onChange(iso)`. Placeholder default `DD/MM/AAAA` vem do próprio componente, sobrescritível.

## 6. Acessibilidade

- `<input>` recebe `id` linkado a `<Label>` via RHF (padrão atual).
- Botão de calendário: `aria-label="Abrir calendário"`, `aria-haspopup="dialog"`, `aria-expanded={open}`.
- `aria-invalid={localError}` no input; `aria-describedby` → mensagem local.
- `inputMode="numeric"` → teclado numérico em mobile.
- Popover: navegação por teclado e `Esc` já vêm do Radix + `react-day-picker`.
- Foco volta ao botão do calendário ao fechar popover.

## 7. Testes

### 7.1 `lib/date-utils.spec.ts`

- `parseFlexibleDate` aceita `DD/MM/AAAA`, `DD-MM-AAAA`, `DDMMAAAA`, `DDMMAA`.
- `parseFlexibleDate` rejeita: `32/13/2020`, `29/02/2023`, `abc`, `01/01`, `01/01/19` (6 chars ambíguos com separador), ano `1899`, ano `9999`.
- Regra de século: `010130` → `1930-01-01`; `010129` → `2029-01-01`; pivô exato em 30.
- `normalizeToMask`: `01011990` → `01/01/1990`; `01-01-1990` → `01/01/1990`; `"01/01/1990 "` → `"01/01/1990"`; `"01011990abc"` → `"01/01/1990"`; preserva truncagem a 10 chars.
- `formatDateToBR`: 15 de março de 2026 → `15/03/2026`; 1º de janeiro de 1990 → `01/01/1990` (zero-padding).

### 7.2 QA Playwright (componente coberto por integração, não unit test)

Testes manuais via QA Playwright em `apps/web` (sem vitest configurado nesse app):

- Paste `01011990` → `01/01/1990`, `onChange` dispara com Date.
- Paste `15-03-1990` → `15/03/1990`, normaliza hífens.
- Paste `32/13/2020` → borda vermelha + "Data inválida", `onChange(undefined)`.
- Calendário → seleciona dia → input preenche, popover fecha, `onChange` chamado.
- Mobile 375px → layout OK, `inputMode="numeric"`.
- Dark mode → tokens shadcn herdados, contraste OK.
- Prop `value` muda externamente → input sincroniza.
- `aria-invalid` é true quando `localError` é true.

### 7.3 Fora de escopo

- Testes E2E Playwright — cobertura unit/integration é suficiente; forms consumers já têm seus próprios E2E que passam a exercitar o novo componente automaticamente.
- Testes visuais/regressão — não existem no projeto.

## 8. Quality Gates

Padrão do projeto (CLAUDE.md):

1. `pnpm lint` zero errors
2. `pnpm typecheck` zero errors
3. `pnpm build` sucesso
4. `pnpm test` — novos tests passam + suite existente passa
5. QA Playwright MCP exercitando paste + digitação + seletor em ao menos um form (ex: `ClientForm` birthDate): desktop 1440px + mobile 375px, dark mode, 4 estados UI

## 9. Riscos e mitigações

| Risco                                                                                  | Mitigação                                                                                                         |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Regressão em forms que fazem setValue externo com formato não-ISO                      | Manter `parseDateString` existente; aceitar ambos ISO full e ISO date-only na sincronização entrante              |
| Máscara `@react-input/mask` não permite preencher programaticamente (edge case da lib) | Teste dedicado + fallback: setar `textValue` via state e disparar evento sintético se necessário                  |
| Usuário cola data com hora junto (`01/01/1990 10:30`)                                  | `normalizeToMask` descarta sufixo, mantém apenas data; testar                                                     |
| Browser autocomplete preenche com `MM/DD/YYYY` (US)                                    | `autoComplete="bday"` só em birthDate não previne; parser rejeita mês 13+ — usuário vê erro. Aceitável.           |
| Mudança visual do componente atual (botão → input) pode confundir usuários existentes  | Placeholder `DD/MM/AAAA` claro + ícone de calendário familiar; mudança é melhoria direta, não quebra mental model |
