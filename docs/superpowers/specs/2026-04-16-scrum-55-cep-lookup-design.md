# SCRUM-55 — Busca de Endereço por CEP

**Jira:** https://arturmoiscontato.atlassian.net/browse/SCRUM-55
**Data:** 2026-04-16
**Status:** Design aprovado — aguardando plano de implementação

## Objetivo

Permitir que usuários digitem apenas o CEP nos formulários de proposta (ramos Residencial, Empresarial e Condomínio) e tenham os campos de endereço (logradouro, bairro, cidade, estado) preenchidos automaticamente via consulta a um provedor público de CEP (ViaCEP). O campo número permanece sempre em branco para preenchimento manual, e todos os campos seguem editáveis após o auto-preenchimento.

**Ganho:** reduz erros de digitação, agiliza o cadastro, padroniza dados de endereço.

## Escopo

**Dentro do escopo:**

- Backend proxy em `@app/server` para consulta de CEP (`GET /api/v1/cep/:cep`), com cache Redis.
- Provider ViaCEP como adapter da porta `CepLookupProvider`.
- Hook `useCepLookup` e componente `<AddressFieldsWithCep />` no `@app/web`.
- Migração dos formulários de ramo `residential`, `business`, `condominium` para usar os 6 campos estruturados de endereço.
- Atualização do PDF template, seed e aggilizador (se aplicável) para consumir os campos estruturados.

**Fora do escopo (tickets separados):**

- Adicionar seção de endereço ao formulário de cliente (o DB já suporta, mas a UI não tem essa seção hoje).
- Fallback multi-provedor (Correios, BrasilAPI) — a porta é extensível, mas só entregamos `ViaCepProvider` neste ticket.
- Cache local no browser além do que o React Query já provê dentro da sessão.
- Internacionalização de endereços (escopo pt-BR apenas).

## Decisões tomadas no brainstorming

| Decisão                         | Opção escolhida                                                                  | Motivo                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Escopo de forms                 | Proposal branch forms (residencial, empresarial, condomínio)                     | CEP já existe nesses forms; é onde o gap do ticket está mais claro. Client form é feature separada.       |
| Estrutura de endereço           | Reestruturar em 6 campos (street, number, complement, neighborhood, city, state) | Ticket assume campos estruturados. Flat concatenado entregaria feature meia-boca.                         |
| Backend proxy vs direto         | Backend proxy com cache Redis (30 dias TTL)                                      | Permite troca de provedor sem deploy do frontend, cache reduz 99% dos hits externos, logging estruturado. |
| Migração de dados               | Reset do banco (estamos em dev)                                                  | Sem usuários reais; `pnpm db:reset` + seed resolve. Zero código de compat.                                |
| Trigger de lookup               | `onBlur` OU 8 dígitos digitados (o que vier primeiro)                            | Aderente ao ticket e UX padrão brasileira.                                                                |
| Comportamento ao auto-preencher | Sempre sobrescreve street/neighborhood/city/state; nunca toca number/complement  | Ticket prevê edição manual após fill; número depende do usuário.                                          |

## Arquitetura

```
┌──────────────────┐
│ Browser (Next.js)│
│ branch-field-sets│
│  ── CEP input    │ user digita CEP
│  ── street       │
│  ── number       │ ← auto-fill
│  ── neighborhood │
│  ── city, state  │
└────────┬─────────┘
         │ GET /api/v1/cep/{cep}
         ▼
┌──────────────────────┐         ┌─────────────────┐
│ @app/server (Fastify)│ miss    │ Redis cache     │
│ routes/v1/cep/       ├────────▶│ key: cep:{cep}  │
│  ── get-cep.ts       │ hit     │ TTL: 30 dias    │
│  + LookupCep use case│◀────────┤                 │
│  + ViaCepProvider    │         └─────────────────┘
└────────┬─────────────┘
         │ miss → HTTPS (undici, timeout 5s)
         ▼
  ┌─────────────────┐
  │ viacep.com.br   │
  │  /ws/{cep}/json │
  └─────────────────┘
```

## Backend

### Novos arquivos

```
packages/core/src/modules/cep/
├── domain/
│   ├── cep-lookup-provider.ts   (port — provedor externo)
│   ├── cep-cache-store.ts       (port — cache genérico com TTL)
│   ├── address-data.ts          (value type)
│   └── errors.ts                (CepNotFoundError, CepProviderUnavailableError)
├── application/
│   ├── lookup-cep.ts            (@injectable use case)
│   └── lookup-cep.spec.ts
└── infrastructure/
    ├── viacep-provider.ts       (adapter — implementa CepLookupProvider)
    ├── viacep-provider.spec.ts
    ├── redis-cep-cache-store.ts (adapter — implementa CepCacheStore via Redis)
    └── redis-cep-cache-store.spec.ts

apps/server/src/routes/v1/cep/
├── _schemas.ts                  (zod + response envelopes)
├── get-cep.ts                   (route handler)
├── index.ts                     (Fastify plugin)
└── __tests__/get-cep.spec.ts
```

### Contrato HTTP

**Request:** `GET /api/v1/cep/:cep` (autenticado — `requireAuth` + `tenantMiddleware`)

**Params:** `cep` — 8 dígitos após strip de não-numéricos. Schema rejeita com 400 se length ≠ 8.

**Responses:**

- `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "zipCode": "01311000",
      "street": "Avenida Paulista",
      "neighborhood": "Bela Vista",
      "city": "São Paulo",
      "state": "SP",
      "complement": null
    }
  }
  ```
- `400 Bad Request` — `{ success: false, error: { code: 'INVALID_CEP', message: 'CEP inválido. Use 8 dígitos.' } }`
- `401 Unauthorized` — padrão da middleware de auth
- `404 Not Found` — `{ success: false, error: { code: 'CEP_NOT_FOUND', message: 'CEP não encontrado.' } }`
- `502 Bad Gateway` — `{ success: false, error: { code: 'CEP_PROVIDER_UNAVAILABLE', message: 'Serviço de CEP indisponível. Tente novamente.' } }`

### Use case `LookupCep`

**Responsabilidade:** dado um CEP, retornar os dados de endereço (via cache ou provider).

**Algoritmo:**

1. Normaliza CEP (strip não-numéricos); se length ≠ 8 lança erro (defesa em profundidade — route já valida).
2. Consulta `CepCacheStore.get(cep)`. Hit → retorna imediatamente.
3. Miss → chama `CepLookupProvider.lookup(cep)`.
   - Provider retorna `null` → lança `CepNotFoundError` (não cacheia 404 para permitir retry futuro).
   - Provider lança erro de infra → propaga como `CepProviderUnavailableError`.
   - Sucesso → `CepCacheStore.set(cep, data, 60 * 60 * 24 * 30)` (30 dias) e retorna.

**Mapeamento de erros no handler:** atualizar `apps/server/src/routes/v1/handle-domain-error.ts` para mapear `CepNotFoundError → 404` e `CepProviderUnavailableError → 502` (padrão do projeto: match por `.code` da domain error).

### Ports

```ts
// cep-lookup-provider.ts
export interface CepLookupProvider {
  // Retorna null se o CEP não existir no provedor.
  // Lança CepProviderUnavailableError em caso de timeout/rede/resposta inválida.
  lookup(cep: string): Promise<AddressData | null>
}

// cep-cache-store.ts
export interface CepCacheStore {
  get(cep: string): Promise<AddressData | null>
  set(cep: string, data: AddressData, ttlSeconds: number): Promise<void>
}
```

O use case depende das duas portas (infra é injetada via tsyringe). `packages/core` não referencia `ioredis` ou qualquer driver — o adapter Redis vive em `infrastructure/`.

### Adapter `ViaCepProvider`

- Usa `undici` (já dependência do projeto) para HTTP.
- Endpoint: `https://viacep.com.br/ws/{cep}/json/`.
- Timeout: 5 segundos (`AbortController`).
- Trata `{ erro: true }` no body como `null`.
- Qualquer outro erro (timeout, rede, status não-200, parse falho) → lança `CepProviderUnavailableError`.
- Mapeia campos:
  - `cep → zipCode` (strip do hífen)
  - `logradouro → street`
  - `bairro → neighborhood`
  - `localidade → city`
  - `uf → state`
  - `complemento → complement` (pode ser string vazia — normaliza para `null`)

### DI

Em `apps/server/src/container-registrations.ts`:

```ts
container.register<CepLookupProvider>('CepLookupProvider', {
  useClass: ViaCepProvider,
})
container.register<CepCacheStore>('CepCacheStore', {
  useClass: RedisCepCacheStore,
})
// LookupCep é @injectable — tsyringe resolve automaticamente
```

O `RedisCepCacheStore` recebe a instância de Redis via DI (mesma já usada pelo BullMQ / Socket.IO adapter).

## Frontend

### Novos arquivos

```
apps/web/src/features/address/
├── hooks/
│   ├── use-cep-lookup.ts
│   └── use-cep-lookup.spec.ts
└── components/
    ├── address-fields-with-cep.tsx
    └── address-fields-with-cep.spec.tsx
```

### Hook `useCepLookup`

```ts
type CepLookupError =
  | { type: 'not-found' }
  | { type: 'provider-unavailable' }
  | { type: 'network' }

interface UseCepLookupReturn {
  lookup: (cep: string) => Promise<AddressData | null>
  isLoading: boolean
  error: CepLookupError | null
}
```

**Comportamento:**

- Normaliza CEP (strip não-numéricos).
- Se length ≠ 8, retorna `null` sem chamar a API (no-op silencioso — o form só dispara quando completo).
- Usa `getCep` gerado pelo Orval. Discrimina erro por status HTTP (404 → `not-found`, 502 → `provider-unavailable`, outros → `network`).
- Retorna `null` em qualquer erro; expõe o erro tipado em `error` para o componente decidir toast.

### Componente `<AddressFieldsWithCep />`

```tsx
import type {
  Control,
  FieldValues,
  UseFormRegister,
  UseFormSetValue,
} from 'react-hook-form'

interface AddressFieldsWithCepProps<T extends FieldValues = FieldValues> {
  control: Control<T>
  register: UseFormRegister<T>
  setValue: UseFormSetValue<T>
  fieldNames?: {
    cep?: string // default 'cep'
    street?: string // default 'street'
    number?: string // default 'number'
    complement?: string // default 'complement'
    neighborhood?: string // default 'neighborhood'
    city?: string // default 'city'
    state?: string // default 'state'
  }
  required?: { cep?: boolean } // default { cep: false }
}
```

> Obs: o componente é genérico em `T extends FieldValues` para preservar tipagem nos forms consumidores sem `any`. Os nomes de campo default assumem o shape `{ cep, street, number, complement, neighborhood, city, state }`.

**Layout:** grid responsivo (1 col mobile, 2 cols desktop). CEP ocupa 1 col, `street` ocupa as 2 cols, `number` + `complement` em linha, `neighborhood` 2 cols, `city` + `state` em linha.

**UX:**

- **Trigger de lookup:** `onBlur` do campo CEP OU quando atingir 8 dígitos durante digitação (o que vier primeiro).
- **Loading:** `Loader2` dentro do input CEP (direita, `size-4 animate-spin`, `pointer-events-none z-10` conforme convenção do projeto — ver memory "Input icon z-index"). Demais campos de endereço ficam `disabled` durante o lookup.
- **Sucesso:** `setValue('street', ...)`, `setValue('neighborhood', ...)`, `setValue('city', ...)`, `setValue('state', ...)`. Sempre sobrescreve (usuário pode editar depois). Nunca toca `number` e `complement`.
- **CEP não encontrado:** toast `"CEP não encontrado. Verifique o número ou digite o endereço manualmente."`. Campos não alterados. Foco move para `street` (para o usuário começar a preencher manual).
- **Provedor indisponível / rede:** toast `"Erro ao buscar CEP. Preencha o endereço manualmente."`. Campos intactos.
- **Acessibilidade:** `aria-busy` no fieldset durante loading; mensagem de erro em region com `aria-live="polite"`.
- **Cleanup:** se o componente desmonta antes da promise resolver, o resultado é ignorado (evita `setState` em unmount).

### Schemas Zod (regenerados pelo Orval)

Após ajustes backend, rodar `pnpm --filter @app/web generate:api`. Os schemas de `residentialDetails`, `businessDetails`, `condominiumDetails` passam a ter os 6 campos estruturados.

## Proposal branch details — breaking changes

### Backend

1. **`apps/server/src/routes/v1/proposals/_schemas.ts`** — nos schemas `residentialDetails`, `businessDetails`, `condominiumDetails`:
   - Remover: `address: z.string().optional()`
   - Adicionar: `street, number, complement, neighborhood, city: z.string().trim().optional()` e `state: z.string().length(2).optional()`.
   - Manter: `cep` com regex `^\d{5}-?\d{3}$`.

2. **`packages/core/src/modules/proposal/domain/insured-object-details.ts`** — types `ResidentialDetails`, `BusinessDetails`, `CondominiumDetails`: trocar `address?: string` pelos 6 campos.

3. **`apps/server/src/pdf-templates/insured-object-section.tsx`** — renderizar endereço a partir dos campos estruturados:

   ```
   {street}, {number}{complement ? ' - ' + complement : ''}
   {neighborhood} — {city}/{state}
   CEP: {cep}
   ```

4. **Aggilizador (`packages/aggilizador/src/builders/`)** — se algum builder property-specific lê `address`, migrar para os campos estruturados. Builders de auto não são afetados.

### Frontend

5. **`apps/web/src/features/proposals/lib/build-branch-details.ts`** — substituir o mapping de `address` pelos 6 campos.

6. **`apps/web/src/features/proposals/lib/constants.ts`** — atualizar `PropertyDetailsFormValues` (e demais formas) para refletir os novos campos. Atualizar `EMPTY_FORM_VALUES` se aplicável.

7. **`apps/web/src/features/proposals/components/branch-field-sets-property/residential.tsx`, `business.tsx`, `condominium.tsx`** — substituir os dois `FieldWrapper`s (`CEP` + `Endereço`) por `<AddressFieldsWithCep />`. Manter os outros campos (propertyType, propertyUsage, construction, areaM2, etc.).

### Seed & reset

8. **`packages/db/prisma/seed.ts`** — as propostas seed passam a ter campos estruturados em vez de `address` string.
9. Após merge: `pnpm db:reset && pnpm db:seed` no ambiente dev.

## Testes

| Camada              | Arquivo                            | Cobertura                                                                                                                                                                             |
| ------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Use case            | `lookup-cep.spec.ts`               | cache hit, cache miss + grava cache com TTL correto, not-found (não cacheia), provider error (lança)                                                                                  |
| Adapter provider    | `viacep-provider.spec.ts`          | mapping ViaCEP → AddressData, `erro: true` → null, timeout 5s, network error → throw                                                                                                  |
| Adapter cache       | `redis-cep-cache-store.spec.ts`    | get/set round-trip, TTL aplicado, chave prefixada `cep:`                                                                                                                              |
| Route               | `get-cep.spec.ts`                  | 200 sucesso, 400 CEP inválido, 404 not-found, 502 indisponível, 401 não autenticado                                                                                                   |
| Hook                | `use-cep-lookup.spec.ts`           | normaliza CEP, retorna null em < 8 dígitos, propaga erro tipado, cleanup em unmount                                                                                                   |
| Componente          | `address-fields-with-cep.spec.tsx` | dispara lookup onBlur, dispara em 8 dígitos, sobrescreve street/neighborhood/city/state, nunca toca number/complement, disabled durante loading, toast em erro, foco em street em 404 |
| E2E QA (Playwright) | Manual via MCP                     | Fluxo completo em cada um dos 3 branch forms (residencial/empresarial/condomínio); desktop 1440px + mobile 375px; estados loading/erro/sucesso; dark mode                             |

## Edge cases

- CEP com ou sem hífen → normalizado antes do fetch e antes da chave Redis.
- CEP com 7 ou 9 dígitos → 400 antes de qualquer I/O externo.
- ViaCEP retornando `{ erro: true }` → 404 + toast amigável, sem cache.
- Timeout / rede → 502 + toast, campos intactos.
- Usuário edita manualmente antes da promise resolver → cleanup ignora resultado tardio.
- CEP digitado, apagado, redigitado → novo lookup dispara (trigger é onBlur/onComplete, não depende de debounce).
- Rate limit: Fastify global 100 req/min já cobre. Cache Redis elimina 99% dos hits externos após warm-up.

## Critérios de aceite

1. Digitar um CEP válido nos 3 branch forms (residencial, empresarial, condomínio) preenche street/neighborhood/city/state, deixa number/complement vazios.
2. CEP inválido (formato) → toast e sem alteração de campos.
3. CEP não encontrado (ViaCEP erro) → toast amigável e sem alteração de campos.
4. Provedor indisponível (timeout/rede) → toast e sem alteração de campos.
5. Usuário consegue editar qualquer campo após o auto-preenchimento.
6. Segundo lookup do mesmo CEP atinge cache Redis (verificável via log estruturado `cep.cache.hit`).
7. 5 Quality Gates passam: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, e critérios funcionais acima via QA Playwright.
8. Code review aprovado (agente reviewer — SOLID, Clean Code, Object Calisthenics, naming, max 200 linhas por arquivo).
9. QA Playwright aprovado (screenshots em `audit/` desktop + mobile, 4 estados UI — Empty/Loading/Error/Success).

## Ordem de entrega sugerida (detalhada pelo writing-plans)

1. Backend CEP: port + adapter + use case + errors + testes (TDD).
2. Rota Fastify + schemas + DI + teste de integração.
3. Regenerar Orval no frontend (`pnpm --filter @app/web generate:api`).
4. Hook `useCepLookup` + testes.
5. Componente `<AddressFieldsWithCep />` + testes.
6. Breaking change no proposal: backend zod + domain + PDF + aggilizador + seed.
7. Frontend: `build-branch-details.ts`, `constants.ts`, migração dos 3 branch forms para o novo componente.
8. `pnpm db:reset && pnpm db:seed`.
9. QA Playwright (3 forms × 2 viewports × 4 estados UI).
10. Code review + ajustes.
