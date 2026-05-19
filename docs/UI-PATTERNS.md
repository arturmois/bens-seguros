# Bens Seguros - UI/UX Patterns

> Padroes de interface validados via UI/UX Pro Max. Todos os modulos seguem estes padroes.
> Gerado a partir das guidelines: Swiss Modernism, Data-Dense Dashboard, WCAG AA.

---

## 1. Estilo Visual

**Base:** Swiss Modernism com warmth institucional.

- Grid rigoroso 12 colunas, spacing matematico base 8px
- Hierarquia por peso tipografico + tamanho (nao por cor decorativa)
- Radius do @coss/style preset (0.625rem)
- Cores teal `#1f4b5f` + gold `#b98927` para calor institucional
- Hover states suaves (200ms ease-out)
- Shadows sutis para elevation (cards, dropdowns)
- Dark mode ativo, com tokens semanticos oklch
- Icones: lucide-react (stroke consistente, sem emoji)

**Anti-patterns:** ornamentacao desnecessaria, gradientes decorativos, shadows pesados.

---

## 2. DataTable

Padrao reutilizavel em todos modulos (Clients, Policies, Claims, Commissions, etc.).

### Toolbar (Progressive Disclosure)

```
┌─────────────────────────────────────────────────────────────┐
│ [🔍 Buscar...]                                    [+ Novo]  │  ← Linha 1
│ [Status ▾] [Tipo ▾] [Ramo ▾]              [⊞ ☰] [Filtros] │  ← Linha 2
└─────────────────────────────────────────────────────────────┘
```

- **Linha 1:** busca full-width + botao "Novo" (primary CTA)
- **Linha 2:** chips de filtro rapido (status, tipo, max 3) + toggle view (se aplicavel) + botao "Filtros"
- **"Filtros"** abre Sheet lateral com filtros avancados (date range, responsavel, ramo, etc.)
- Chips ativos mostram contagem de resultados
- Filtros persistem entre sessoes (URL query params)

### Acoes por Linha

- **Linha inteira clicavel** → navega para detalhe (`/clients/[id]`)
- **Coluna final:** `DropdownMenu` (tres pontinhos) com acoes secundarias (editar, duplicar, excluir)
- Touch target do botao menu: min 44px
- Cursor pointer na linha inteira

### Selecao Multipla (Seletiva)

Checkbox apenas nos modulos com acao de lote:

- **Commissions:** aprovar/rejeitar em lote
- **Notifications:** marcar lidas em lote
- **Documents:** download/excluir em lote

Ao selecionar, barra flutuante no bottom:

```
┌─────────────────────────────────────────────────────────────┐
│  ✓ 5 selecionados    [Aprovar]  [Rejeitar]  [✕ Limpar]     │
└─────────────────────────────────────────────────────────────┘
```

### Densidade

2 opcoes, toggle no canto da toolbar:

- **Compact:** padding 8px vertical, font 13px. Default em Commissions, Policies (muitas colunas)
- **Default:** padding 12px vertical, font 14px. Default nos demais modulos
- Preferencia salva em Zustand + localStorage
- Compact respeita min height 44px por linha (touch target)

### Mobile (< 768px)

- Mostra apenas 2-3 colunas essenciais (nome/titulo, status badge, valor)
- Botao chevron expande linha inline com campos adicionais
- Dropdown de acoes acessivel
- Mantem estrutura de tabela (ordenacao funciona)
- Linhas com min 48px de altura
- Sem scroll horizontal

---

## 3. Formularios

### Abertura (Onde o Form Aparece)

| Ação                          | Componente        | Shell               | Exemplos                                                                       |
| ----------------------------- | ----------------- | ------------------- | ------------------------------------------------------------------------------ |
| **Criar**                     | Dialog            | `<FormDialogShell>` | Criar cliente, seguradora, canal, agente, sinistro, proposta                   |
| **Editar**                    | Page `/[id]/edit` | `<FormPageShell>`   | `/clients/[id]/edit`, `/contacts/[id]/edit`, futuros `/insurers/[id]/edit` etc |
| **Sub-recurso** (append-only) | Dialog            | `<FormDialogShell>` | Endorsement de policy, occurrence de claim                                     |

> **Sheet foi descartado em todo o app.** Toda criação acontece em Dialog; edição em Page `/edit`. Ver `docs/FRONTEND-PATTERNS.md` seção 11 para API dos shells.

### Layout Interno

Padrao 3/2/1 baseado em container queries (Tailwind 4), nao em viewport. O grid reage a largura do container pai — funciona igual em Sheet (~500px) e em pagina (~1200px).

| Largura do container | Colunas | Largura util por coluna |
| -------------------- | ------- | ----------------------- |
| < 480px              | 1       | ~448px                  |
| 480 - 919px          | 2       | ~208px - 440px          |
| >= 920px             | 3       | ~285px - 350px+         |

**Componentes (em `apps/web/src/components/shared/`):**

- `<FormSection title description?>` — agrupa campos por contexto. Multiplas sections em um form usam `<form class="space-y-8">`.
- `<FormGrid columns? gap?>` — container responsivo. `columns=3` (default) ou `2`. `gap='md'` (default, gap-4), `'sm'` (gap-3), `'lg'` (gap-6).
- `<FormField label span? required hint error>` — wrapper com label + erro. Prop `span`: `'full' | 2 | 1` (default 1).
- `<FormActions align? gap? noPadding?>` — footer padronizado (Cancelar a esquerda, acao principal a direita). Default `align='end'`, `gap=2`, `pt-2`. Em Dialog/Sheet, usar `noPadding` dentro de `DialogFooter`/`SheetFooter`.

**Convencao de span por tipo de campo:**

| Componente filho                                       | Span padrao (convencao) | Override |
| ------------------------------------------------------ | ----------------------- | -------- |
| `<Textarea>`                                           | `span="full"`           | Sim      |
| `<FileUpload>` / dropzone                              | `span="full"`           | Sim      |
| `<ContactSearch>`, `<PolicySearch>` (busca principal)  | `span="full"`           | Sim      |
| `<Combobox>` com listagem grande                       | `span="full"`           | Sim      |
| `<Input>`, `<Select>`, `<DatePicker>`, `<NumberField>` | default (1)             | Sim      |
| `<CurrencyInput>`, `<PhoneInput>`, `<Switch>`          | default (1)             | Sim      |

A convencao e validada em code review — sem deteccao em runtime.

**Exemplo canonico:**

```tsx
<form onSubmit={handleSubmit} className="space-y-8">
  <FormSection title="Dados Gerais">
    <FormGrid>
      <FormField label="Apolice" span="full">
        <PolicySearch />
      </FormField>
      <FormField label="Data da Ocorrencia">
        <DatePicker />
      </FormField>
      <FormField label="Status">
        <Select items={STATUS_OPTIONS} />
      </FormField>
      <FormField label="Valor Estimado">
        <CurrencyInput />
      </FormField>
    </FormGrid>
  </FormSection>

  <FormSection title="Descricao">
    <FormGrid>
      <FormField label="Descricao" span="full">
        <Textarea rows={4} />
      </FormField>
    </FormGrid>
  </FormSection>
</form>
```

**Footer de acoes (`<FormActions>`):**

Padroniza o cluster Cancelar/Salvar. Ordem fixa: **Cancelar a esquerda (variant outline), acao principal a direita**. Forms em Page usam `<FormActions>` direto; forms em Dialog/Sheet mantem `DialogFooter`/`SheetFooter` (semantica do primitivo shadcn) com `<FormActions noPadding>` dentro pra evitar dupla margem.

```tsx
<FormActions>
  <Button type="button" variant="outline" onClick={onCancel}>
    Cancelar
  </Button>
  <Button type="submit" disabled={isPending}>
    {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
    Salvar
  </Button>
</FormActions>
```

| Prop        | Default | Notas                                                              |
| ----------- | ------- | ------------------------------------------------------------------ |
| `align`     | `'end'` | `'start'`, `'end'`, `'between'`                                    |
| `gap`       | `2`     | `2`, `3`, `4`                                                      |
| `noPadding` | `false` | omitir `pt-2` quando o caller (DialogFooter) ja controla o espaco. |

**Anti-padrao:** evitar `<div className="flex justify-end gap-2 pt-2">` ad-hoc nos forms. Se precisar de layout fora dessas opcoes, expandir a API do componente.

**Forms fora do padrao (mantem 1-col):**

- Auth: `login-form`, `register-form`, `reset-password-form`, `forgot-password-form`
- Dialogs com <= 3 campos: `insurer-form-dialog`, `channel-form-dialog`, `contacts/quick-create-contact`

**Regras gerais (validas para todos os forms):**

- Labels visiveis sempre (nunca placeholder-only)
- Required fields com asterisco `*`
- Helper text abaixo de campos complexos
- Validacao inline no blur (nao por keystroke)
- Erro abaixo do campo com mensagem clara (causa + como resolver)
- Apos submit com erro, auto-focus no primeiro campo invalido
- Inputs com height min 44px (touch friendly)
- Mascaras: CPF/CNPJ, telefone, CEP

### Multi-Step (Formularios Longos)

Tabs horizontais dentro da pagina (nao wizard linear):

```
┌──────────────────────────────────────────────────────────┐
│  [● Dados Gerais]  [○ Checklist]  [○ Documentos]        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  (conteudo da tab ativa)                                 │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                            [Salvar]      │  ← footer fixo
└──────────────────────────────────────────────────────────┘
```

- Navegacao livre entre abas (nao linear)
- Dot indicator: verde = tem dados, vazio = sem dados
- Autosave de rascunho a cada 30s
- Botao "Salvar" em footer fixo (sempre visivel)

---

## 4. Filtros

### Quick Filters (Toolbar)

- Max 3 dropdowns visiveis (os mais usados do modulo)
- Implementados como `Select` do shadcn ou chips toggleaveis
- Valor "Todos" como default

### Advanced Filters (Sheet Lateral)

- Abre pela direita via botao "Filtros"
- Campos: date range picker, select de responsavel, multi-select de ramo/tipo
- Botao "Aplicar" + "Limpar filtros"
- Contagem de filtros ativos mostrada no botao da toolbar: `Filtros (3)`
- Filtros refletidos na URL (query params) para compartilhar/bookmarkar

---

## Filtros de listagem — FilterTabs vs Select

Convenção para decidir entre `<FilterTabs>` (shared primitive) e `<Select>` (shadcn) na `TableToolbar` de um módulo de listagem.

### Regra geral

`FilterTabs` renderiza **apenas a dimensão primária** do módulo, com **no máximo 4 opções**. Todos os demais filtros (incluindo status secundário, período, prioridade) ficam em `<Select>` dentro da toolbar.

### Quando usar `FilterTabs`

- **≤ 4 opções** (mais que 4 quebra o header em mobile 375px)
- **Dimensão primária** — a que o usuário filtra com mais frequência
- **"Todos" é o default comum** (usuário abre a página e clica em cada tab)
- **Valores categóricos**, não faixas contínuas

### Quando usar `<Select>`

- **> 4 opções**
- **Dimensão secundária** (o módulo já tem `FilterTabs` para a primária)
- **Filtro raramente usado**
- **Valores muito numerosos (> 20)** → prefira `<Autocomplete>` ou `<Combobox>`

### Matriz canônica por módulo (2026-04)

| Módulo      | FilterTabs (primário)               | Select (secundário) |
| ----------- | ----------------------------------- | ------------------- |
| clients     | tipo (Lead/Cliente/Ex-Cliente)      | —                   |
| proposals   | tipo (Novo/Renovação)               | estágio             |
| policies    | status (Ativa/Cancelada/Expirada)   | —                   |
| commissions | período (Todas/30 dias/90 dias)     | status              |
| claims      | prioridade (Normal/Alta/Urgente)    | status              |
| assistances | tipo (Guincho/Mecânica/Chaveiro)    | status              |
| insurers    | status (Ativas/Inativas)            | —                   |
| audit       | período (Todas/30 dias/7 dias/Hoje) | entidade, ação      |

### Layout esperado

```
┌──────────────────────────────────────────────────────┐
│ <ListPageHeader>                                     │
│  Breadcrumb › Page                                   │
│  h1 + description                    [Primary CTA]   │
├──────────────────────────────────────────────────────┤
│ <TableToolbar>                                       │
│  [FilterTabs] [🔎 search] [Select] [Columns] [Export]│
├──────────────────────────────────────────────────────┤
│ <DataTable />                                        │
├──────────────────────────────────────────────────────┤
│ <CursorPagination />                                 │
└──────────────────────────────────────────────────────┘
```

### Ao adicionar um novo módulo

1. Identifique a **dimensão primária** (a mais filtrada pelo usuário).
2. Se tiver ≤ 4 opções categóricas → `FilterTabs`.
3. Se tiver qualquer outra dimensão secundária → `<Select>` na toolbar.
4. Adicione uma linha à matriz acima.

### Exceções documentadas

Nenhuma no momento. Se um novo módulo precisar quebrar a convenção, documente a exceção aqui com motivação.

---

## 5. Kanban (Propostas)

### Layout

```
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
│CAPTURE │ │ QUOTE  │ │PROTOCOL│ │INSPECT.│ │PAYMENT │ │▸ LOST    │
│  12    │ │   8    │ │   5    │ │   3    │ │   2    │ │  (colap) │
│R$120k  │ │ R$85k  │ │ R$60k  │ │ R$45k  │ │ R$30k  │ │          │
├────────┤ ├────────┤ ├────────┤ ├────────┤ ├────────┤ │          │
│ Card 1 │ │ Card 1 │ │ Card 1 │ │ Card 1 │ │ Card 1 │ │          │
│ Card 2 │ │ Card 2 │ │ Card 2 │ │        │ │        │ │          │
│ ...    │ │        │ │        │ │        │ │        │ │          │
└────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └──────────┘
```

### Header de Coluna

- Nome do estagio
- Contagem de cards
- Soma total de premios (em R$)

### Card

- Nome do cliente (bold)
- Ramo: badge colorido (AUTO = blue, LIFE = green, etc.)
- Vendedor: avatar pequeno (24px)
- Dias no estagio: chip cinza, vermelho se > 7 dias
- Card clicavel → abre Sheet lateral com resumo + link para detalhe

### Interacao

- Drag-and-drop avanca/reverte stage
- Confirmacao antes de mover (Dialog: "Avancar para QUOTE?")
- Coluna LOST colapsavel por default
- Mobile: scroll horizontal com snap nas colunas

### Toggle Tabela/Kanban

- `SegmentedControl` no canto direito da toolbar (icone grid + icone kanban)
- Mesma rota `/proposals`
- Filtros persistem entre views
- Preferencia salva em Zustand + localStorage

---

## 6. Pagina de Detalhe

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  ← Voltar    Breadcrumb: Clientes > João Silva              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Avatar   João Silva da Costa        [Editar] [...]  │   │  ← Header card
│  │           CPF: 123.456.789-00   Status: ● CLIENTE    │   │
│  │           Tel: (11) 99999-0000   Email: joao@...      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  [Propostas]  [Apolices]  [Documentos]  [Historico]         │  ← Tabs
│  ─────────────────────────────────────────────────          │
│                                                             │
│  (conteudo da tab ativa - lazy loaded via React Query)      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- **Header card:** dados-chave + status badge + acoes primarias (botoes)
- **Tabs horizontais:** sub-recursos carregam lazy
- Trocar de tab preserva scroll (`state-preservation`)
- Info mais importante visivel sem scroll (`content-priority`)

---

## 7. Modais vs Pages

| Tipo                      | Quando Usar                                                              | Exemplos                                                                                   |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| **Dialog (modal centro)** | Confirmacoes destrutivas, **forms de criacao**, sub-recursos append-only | Excluir cliente, motivo de perda, criar cliente, criar seguradora, endorsement, occurrence |
| **Pagina dedicada**       | **Edicao** (`/[id]/edit`), detalhes com sub-recursos, fluxos complexos   | `/clients/[id]/edit`, `/proposals/[id]`, `/clients/[id]`                                   |

> Sheet não é usado. Forms de criação usam Dialog via `<FormDialogShell>`; forms de edição usam Page `/[id]/edit` via `<FormPageShell>`.

### Regras

- Dialog: sempre tem X para fechar + botao Cancelar
- Dialog `<FormDialogShell>`: max-width `sm:max-w-md` (sm), `sm:max-w-lg` (md, default), `sm:max-w-5xl` (lg). Bloqueia close enquanto `isPending`.
- Dialog confirmacao destrutiva: max-width 440px
- Scrim: 40-60% black para isolar foreground

---

## 8. Empty / Loading / Error / Success States

### Loading

- **Skeleton shimmer** que replica layout real (tabela → linhas skeleton, cards → card skeleton)
- Nunca spinner generico sozinho
- Aparece apos 300ms (evita flash em loads rapidos)

### Empty

```
┌──────────────────────────────────┐
│         [icon lucide]            │
│                                  │
│    Nenhum cliente cadastrado     │  ← titulo
│    Comece adicionando seu        │  ← descricao contextual
│    primeiro cliente.             │
│                                  │
│       [+ Novo Cliente]           │  ← CTA primario
└──────────────────────────────────┘
```

- Icone lucide relevante ao modulo (Users, FileText, Shield, etc.)
- Titulo + descricao contextual (nao generico)
- CTA primario para acao mais provavel

### Error

- Mensagem clara do problema
- Botao "Tentar novamente" (retry)
- Se error de permissao: explicar o que falta

### Success

- Toast (Sonner) com auto-dismiss 4s
- Position: top-right
- Rich colors (verde para sucesso)

---

## 9. Acoes Destrutivas

### Soft Delete (reversivel)

- Sem dialog previo
- Executa imediatamente
- Toast com botao "Desfazer" por 5s
- Se nao desfazer, aplica soft delete definitivo

### Acoes Irreversiveis

- Dialog com:
  - Descricao do impacto ("Esta apolice sera cancelada permanentemente")
  - Campo obrigatorio de motivo (textarea)
  - Botao destructive (vermelho) separado visualmente do cancel
  - Botao cancel a esquerda, destructive a direita

---

## 10. Decisoes Registradas

| #     | Padrao               | Escolha                                                                                                 |
| ----- | -------------------- | ------------------------------------------------------------------------------------------------------- |
| UI-1  | Estilo visual        | Swiss Modernism + warmth teal/gold                                                                      |
| UI-2  | Toolbar tabela       | Hibrida: quick filters + Sheet "Mais filtros"                                                           |
| UI-3  | Acoes por linha      | Linha clicavel + dropdown contextual                                                                    |
| UI-4  | Selecao multipla     | Seletiva (Commissions, Notifications, Documents)                                                        |
| UI-5  | Densidade tabela     | 2 opcoes (compact/default), auto por modulo                                                             |
| UI-6  | Abertura forms       | Dialog para criar (`FormDialogShell`); Page `/edit` para editar (`FormPageShell`). Sheet descartado.    |
| UI-7  | Layout forms         | `FormSection` + `FormGrid` 3/2/1 com container queries; nunca `<h3>` ou `<div className="grid">` inline |
| UI-8  | Multi-step           | Tabs horizontais, navegacao livre, autosave 30s                                                         |
| UI-9  | Pagina detalhe       | Header resumo + tabs de sub-recursos (lazy)                                                             |
| UI-10 | Kanban               | Cards com contexto operacional, drag confirma stage                                                     |
| UI-11 | Toggle tabela/kanban | SegmentedControl na toolbar, filtros persistem                                                          |
| UI-12 | Modais/Pages         | Dialog para criar e confirmar; Page para editar e detalhar. Sheet descartado.                           |
| UI-13 | Empty/Loading/Error  | Skeleton + empty contextual + error recovery                                                            |
| UI-14 | Acoes destrutivas    | Undo toast (soft delete) + dialog com motivo (irreversivel)                                             |
| UI-15 | Tabela mobile        | Colunas prioritarias + expand inline                                                                    |
