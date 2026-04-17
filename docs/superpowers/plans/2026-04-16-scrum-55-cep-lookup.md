# SCRUM-55 — CEP Address Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement CEP (Brazilian postal code) auto-fill for proposal branch forms (residential, business, condominium). Users type CEP → street/neighborhood/city/state auto-fill via ViaCEP. Number/complement stay user-entered. Includes backend proxy with Redis cache.

**Architecture:** DDD Full module in `@repo/core` (port + use case + adapter). Fastify route in `@app/server` exposes `GET /api/v1/cep/:cep`. Reuses existing `CacheService` from `@repo/core` for Redis. Frontend has `useCepLookup` hook (Orval-generated) + reusable `<AddressFieldsWithCep />` component. Proposal branch details schemas migrate from single `address: string` to 6 structured fields (street, number, complement, neighborhood, city, state).

**Tech Stack:** TypeScript 5.9, Node 22 native `fetch`, Fastify 5 + Zod, tsyringe DI, Prisma 7 JSON, Redis 8, Vitest, React 19 + react-hook-form + Orval-generated hooks.

**Spec reference:** `docs/superpowers/specs/2026-04-16-scrum-55-cep-lookup-design.md`

---

## File Structure

**New files (backend):**

```
packages/core/src/modules/cep/
├── domain/
│   ├── address-data.ts            — value type (AddressData)
│   ├── cep-lookup-provider.ts     — port interface
│   └── errors.ts                  — CepNotFoundError, CepProviderUnavailableError, InvalidCepError
├── application/
│   ├── lookup-cep.ts              — @injectable use case
│   └── lookup-cep.spec.ts
├── infrastructure/
│   ├── viacep-provider.ts         — adapter (Node fetch, timeout 5s)
│   └── viacep-provider.spec.ts
└── index.ts                       — barrel export

apps/server/src/routes/v1/cep/
├── _schemas.ts                    — zod request/response schemas
├── get-cep.ts                     — route handler
├── index.ts                       — Fastify plugin
└── __tests__/get-cep.spec.ts
```

**New files (frontend):**

```
apps/web/src/features/address/
├── hooks/
│   ├── use-cep-lookup.ts
│   └── use-cep-lookup.spec.ts
└── components/
    ├── address-fields-with-cep.tsx
    └── address-fields-with-cep.spec.tsx
```

**Modified files:**

- `apps/server/src/routes/v1/handle-domain-error.ts` — add `CEP_NOT_FOUND → 404`, `CEP_PROVIDER_UNAVAILABLE → 502`, `INVALID_CEP → 400`
- `apps/server/src/routes/v1/proposals/_schemas.ts` — replace `address` with 6 fields in residential/business/condominium
- `apps/server/src/container-registrations.ts` — register `CepLookupProvider` + `CepCacheService` + `LookupCep`
- `apps/server/src/app.ts` — register `cepRoutes`
- `packages/core/src/modules/proposal/domain/insured-object-details.ts` — domain types
- `packages/core/src/index.ts` — export CEP module
- `apps/web/src/features/proposals/lib/constants.ts` — local proposal detail interfaces
- `apps/web/src/features/proposals/lib/build-branch-details.ts` — payload builder
- `apps/web/src/features/proposals/components/branch-field-sets-property/residential.tsx`
- `apps/web/src/features/proposals/components/branch-field-sets-property/business.tsx`
- `apps/web/src/features/proposals/components/branch-field-sets-property/condominium.tsx`
- `apps/server/src/pdf-templates/insured-object-section.tsx`

**Generated files (via Orval):** `apps/web/src/api/endpoints/cep/*`, updated `apps/web/src/api/endpoints/proposals/*`

---

## Task 1: Core CEP module scaffold — types, errors, port

**Files:**

- Create: `packages/core/src/modules/cep/domain/address-data.ts`
- Create: `packages/core/src/modules/cep/domain/errors.ts`
- Create: `packages/core/src/modules/cep/domain/cep-lookup-provider.ts`
- Create: `packages/core/src/modules/cep/index.ts`

- [ ] **Step 1: Create `address-data.ts`**

```ts
// packages/core/src/modules/cep/domain/address-data.ts
export interface AddressData {
  readonly zipCode: string // 8 digits, no hyphen
  readonly street: string
  readonly neighborhood: string
  readonly city: string
  readonly state: string // 2-letter UF (e.g., "SP")
  readonly complement: string | null
}
```

- [ ] **Step 2: Create `errors.ts`**

```ts
// packages/core/src/modules/cep/domain/errors.ts
export class InvalidCepError extends Error {
  readonly code = 'INVALID_CEP'
  constructor() {
    super('CEP inválido. Use 8 dígitos.')
    this.name = 'InvalidCepError'
  }
}

export class CepNotFoundError extends Error {
  readonly code = 'CEP_NOT_FOUND'
  constructor() {
    super('CEP não encontrado.')
    this.name = 'CepNotFoundError'
  }
}

export class CepProviderUnavailableError extends Error {
  readonly code = 'CEP_PROVIDER_UNAVAILABLE'
  constructor() {
    super('Serviço de CEP indisponível. Tente novamente.')
    this.name = 'CepProviderUnavailableError'
  }
}
```

- [ ] **Step 3: Create `cep-lookup-provider.ts`**

```ts
// packages/core/src/modules/cep/domain/cep-lookup-provider.ts
import type { AddressData } from './address-data.js'

export interface CepLookupProvider {
  // Returns null when the CEP is well-formed but not present in the provider.
  // Throws CepProviderUnavailableError for timeouts, network errors, or
  // unparseable responses — i.e. conditions the caller can retry later.
  lookup(cep: string): Promise<AddressData | null>
}
```

- [ ] **Step 4: Create barrel export `index.ts`**

```ts
// packages/core/src/modules/cep/index.ts
export type { AddressData } from './domain/address-data.js'
export type { CepLookupProvider } from './domain/cep-lookup-provider.js'
export {
  CepNotFoundError,
  CepProviderUnavailableError,
  InvalidCepError,
} from './domain/errors.js'
export { LookupCep } from './application/lookup-cep.js'
export { ViaCepProvider } from './infrastructure/viacep-provider.js'
```

(Note: `LookupCep` and `ViaCepProvider` referenced above don't exist yet — they're added in Tasks 2 and 3. TypeScript will error until then; expected.)

- [ ] **Step 5: Add module to core's root barrel**

Modify `packages/core/src/index.ts`. Find the "Domain modules" comment block (near the bottom of the exports section) and add — in alphabetical position between `audit` and `claim`:

```ts
export * from './modules/cep/index.js'
```

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/modules/cep packages/core/src/index.ts
git commit -m "feat(core): scaffold CEP module (types, errors, port)"
```

---

## Task 2: `LookupCep` use case (TDD)

**Files:**

- Create: `packages/core/src/modules/cep/application/lookup-cep.ts`
- Create: `packages/core/src/modules/cep/application/lookup-cep.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/modules/cep/application/lookup-cep.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LookupCep } from './lookup-cep.js'
import type { CepLookupProvider } from '../domain/cep-lookup-provider.js'
import type { CacheService } from '../../../shared/cache-service.js'
import type { AddressData } from '../domain/address-data.js'
import {
  CepNotFoundError,
  CepProviderUnavailableError,
  InvalidCepError,
} from '../domain/errors.js'

const cached: AddressData = {
  zipCode: '01311000',
  street: 'Avenida Paulista',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  complement: null,
}

function makeCache(overrides: Partial<CacheService> = {}): CacheService {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeProvider(
  overrides: Partial<CepLookupProvider> = {}
): CepLookupProvider {
  return {
    lookup: vi.fn().mockResolvedValue(null),
    ...overrides,
  }
}

describe('LookupCep', () => {
  let cache: CacheService
  let provider: CepLookupProvider
  let useCase: LookupCep

  beforeEach(() => {
    cache = makeCache()
    provider = makeProvider()
    useCase = new LookupCep(provider, cache)
  })

  it('rejects CEPs with less than 8 digits', async () => {
    await expect(useCase.execute({ cep: '1234' })).rejects.toBeInstanceOf(
      InvalidCepError
    )
  })

  it('normalizes CEP by stripping non-digits before cache lookup', async () => {
    cache.get = vi.fn().mockResolvedValue(cached)
    const result = await useCase.execute({ cep: '01311-000' })
    expect(cache.get).toHaveBeenCalledWith('cep:01311000')
    expect(result).toEqual(cached)
  })

  it('returns cached AddressData on cache hit without calling provider', async () => {
    cache.get = vi.fn().mockResolvedValue(cached)
    const result = await useCase.execute({ cep: '01311000' })
    expect(result).toEqual(cached)
    expect(provider.lookup).not.toHaveBeenCalled()
  })

  it('fetches from provider on cache miss and caches the result for 30 days', async () => {
    provider.lookup = vi.fn().mockResolvedValue(cached)
    const result = await useCase.execute({ cep: '01311000' })
    expect(result).toEqual(cached)
    expect(provider.lookup).toHaveBeenCalledWith('01311000')
    expect(cache.set).toHaveBeenCalledWith('cep:01311000', cached, 2592000)
  })

  it('throws CepNotFoundError when provider returns null and does not cache', async () => {
    provider.lookup = vi.fn().mockResolvedValue(null)
    await expect(useCase.execute({ cep: '00000000' })).rejects.toBeInstanceOf(
      CepNotFoundError
    )
    expect(cache.set).not.toHaveBeenCalled()
  })

  it('propagates CepProviderUnavailableError when provider throws', async () => {
    provider.lookup = vi
      .fn()
      .mockRejectedValue(new CepProviderUnavailableError())
    await expect(useCase.execute({ cep: '01311000' })).rejects.toBeInstanceOf(
      CepProviderUnavailableError
    )
    expect(cache.set).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/core exec vitest run src/modules/cep/application/lookup-cep.spec.ts`
Expected: FAIL with "Cannot find module './lookup-cep.js'".

- [ ] **Step 3: Implement `LookupCep`**

```ts
// packages/core/src/modules/cep/application/lookup-cep.ts
import { inject, injectable } from 'tsyringe'
import type { CacheService } from '../../../shared/cache-service.js'
import type { AddressData } from '../domain/address-data.js'
import type { CepLookupProvider } from '../domain/cep-lookup-provider.js'
import { CepNotFoundError, InvalidCepError } from '../domain/errors.js'

const CACHE_KEY_PREFIX = 'cep:'
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

interface LookupCepInput {
  readonly cep: string
}

@injectable()
export class LookupCep {
  constructor(
    @inject('CepLookupProvider')
    private readonly provider: CepLookupProvider,
    @inject('CepCacheService')
    private readonly cache: CacheService
  ) {}

  async execute(input: LookupCepInput): Promise<AddressData> {
    const normalized = input.cep.replace(/\D/g, '')
    if (normalized.length !== 8) {
      throw new InvalidCepError()
    }

    const cacheKey = `${CACHE_KEY_PREFIX}${normalized}`
    const cached = await this.cache.get<AddressData>(cacheKey)
    if (cached) {
      return cached
    }

    const result = await this.provider.lookup(normalized)
    if (!result) {
      throw new CepNotFoundError()
    }

    await this.cache.set(cacheKey, result, CACHE_TTL_SECONDS)
    return result
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/core exec vitest run src/modules/cep/application/lookup-cep.spec.ts`
Expected: PASS — 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/cep/application
git commit -m "feat(core): add LookupCep use case with cache"
```

---

## Task 3: `ViaCepProvider` adapter (TDD)

**Files:**

- Create: `packages/core/src/modules/cep/infrastructure/viacep-provider.ts`
- Create: `packages/core/src/modules/cep/infrastructure/viacep-provider.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/modules/cep/infrastructure/viacep-provider.spec.ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ViaCepProvider } from './viacep-provider.js'
import { CepProviderUnavailableError } from '../domain/errors.js'

function mockFetch(response: Response | (() => Promise<Response>)): () => void {
  const fetchMock = vi
    .fn()
    .mockImplementation(
      typeof response === 'function' ? response : async () => response
    )
  const original = globalThis.fetch
  globalThis.fetch = fetchMock as typeof fetch
  return () => {
    globalThis.fetch = original
  }
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  })
}

describe('ViaCepProvider', () => {
  let restoreFetch: (() => void) | undefined

  afterEach(() => {
    restoreFetch?.()
    restoreFetch = undefined
  })

  it('maps ViaCEP response to AddressData', async () => {
    restoreFetch = mockFetch(
      jsonResponse({
        cep: '01311-000',
        logradouro: 'Avenida Paulista',
        complemento: 'de 1578 ao fim - lado par',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      })
    )
    const provider = new ViaCepProvider()
    const result = await provider.lookup('01311000')
    expect(result).toEqual({
      zipCode: '01311000',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      complement: 'de 1578 ao fim - lado par',
    })
  })

  it('returns null when ViaCEP responds with { erro: true }', async () => {
    restoreFetch = mockFetch(jsonResponse({ erro: true }))
    const provider = new ViaCepProvider()
    const result = await provider.lookup('00000000')
    expect(result).toBeNull()
  })

  it('normalizes empty complement to null', async () => {
    restoreFetch = mockFetch(
      jsonResponse({
        cep: '01311-000',
        logradouro: 'Avenida Paulista',
        complemento: '',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      })
    )
    const provider = new ViaCepProvider()
    const result = await provider.lookup('01311000')
    expect(result?.complement).toBeNull()
  })

  it('throws CepProviderUnavailableError on non-200 response', async () => {
    restoreFetch = mockFetch(new Response('bad gateway', { status: 502 }))
    const provider = new ViaCepProvider()
    await expect(provider.lookup('01311000')).rejects.toBeInstanceOf(
      CepProviderUnavailableError
    )
  })

  it('throws CepProviderUnavailableError on network failure', async () => {
    restoreFetch = mockFetch(async () => {
      throw new TypeError('fetch failed')
    })
    const provider = new ViaCepProvider()
    await expect(provider.lookup('01311000')).rejects.toBeInstanceOf(
      CepProviderUnavailableError
    )
  })

  it('throws CepProviderUnavailableError on timeout (AbortError)', async () => {
    restoreFetch = mockFetch(async () => {
      const error = new Error('The operation was aborted')
      error.name = 'AbortError'
      throw error
    })
    const provider = new ViaCepProvider()
    await expect(provider.lookup('01311000')).rejects.toBeInstanceOf(
      CepProviderUnavailableError
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/core exec vitest run src/modules/cep/infrastructure/viacep-provider.spec.ts`
Expected: FAIL with "Cannot find module './viacep-provider.js'".

- [ ] **Step 3: Implement `ViaCepProvider`**

```ts
// packages/core/src/modules/cep/infrastructure/viacep-provider.ts
import { injectable } from 'tsyringe'
import type { AddressData } from '../domain/address-data.js'
import type { CepLookupProvider } from '../domain/cep-lookup-provider.js'
import { CepProviderUnavailableError } from '../domain/errors.js'

interface ViaCepResponse {
  cep?: string
  logradouro?: string
  complemento?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean
}

const VIACEP_URL = 'https://viacep.com.br/ws'
const TIMEOUT_MS = 5000

@injectable()
export class ViaCepProvider implements CepLookupProvider {
  async lookup(cep: string): Promise<AddressData | null> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, TIMEOUT_MS)

    try {
      const response = await fetch(`${VIACEP_URL}/${cep}/json/`, {
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new CepProviderUnavailableError()
      }
      const body = (await response.json()) as ViaCepResponse
      if (body.erro) {
        return null
      }
      return {
        zipCode: cep,
        street: body.logradouro ?? '',
        neighborhood: body.bairro ?? '',
        city: body.localidade ?? '',
        state: body.uf ?? '',
        complement:
          body.complemento && body.complemento.length > 0
            ? body.complemento
            : null,
      }
    } catch (error) {
      if (error instanceof CepProviderUnavailableError) {
        throw error
      }
      throw new CepProviderUnavailableError()
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @repo/core exec vitest run src/modules/cep/infrastructure/viacep-provider.spec.ts`
Expected: PASS — 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/cep/infrastructure
git commit -m "feat(core): add ViaCepProvider adapter with timeout + error mapping"
```

---

## Task 4: Backend route + schemas + error mapping (TDD)

**Files:**

- Create: `apps/server/src/routes/v1/cep/_schemas.ts`
- Create: `apps/server/src/routes/v1/cep/get-cep.ts`
- Create: `apps/server/src/routes/v1/cep/index.ts`
- Create: `apps/server/src/routes/v1/cep/__tests__/get-cep.spec.ts`
- Modify: `apps/server/src/routes/v1/handle-domain-error.ts`

- [ ] **Step 1: Add CEP error codes to `handle-domain-error.ts`**

Open `apps/server/src/routes/v1/handle-domain-error.ts`. In the `CODE_TO_STATUS` object (after the `// 400 Bad Request` block), add:

```ts
  // 400 Bad Request
  INVITATION_EXPIRED: 400,
  INVITATION_ALREADY_ACCEPTED: 400,
  INVALID_CEP: 400,
```

And in the `// 404 Not Found` block, add at the end:

```ts
  CEP_NOT_FOUND: 404,
```

Add a new block before the `// 403 Forbidden` block:

```ts
  // 502 Bad Gateway
  CEP_PROVIDER_UNAVAILABLE: 502,
```

- [ ] **Step 2: Create `_schemas.ts`**

```ts
// apps/server/src/routes/v1/cep/_schemas.ts
import { z } from 'zod'
import { errorResponse, successResponse } from '../../shared/response.schema.js'

export const cepParamSchema = z.object({
  cep: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((digits) => digits.length === 8, {
      message: 'CEP inválido. Use 8 dígitos.',
    }),
})

const addressDataSchema = z.object({
  zipCode: z.string().length(8),
  street: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string().length(2),
  complement: z.string().nullable(),
})

export const cepLookupResponse = successResponse(addressDataSchema)

export { errorResponse }
```

- [ ] **Step 3: Create `get-cep.ts`**

```ts
// apps/server/src/routes/v1/cep/get-cep.ts
import { container, LookupCep } from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { handleDomainError } from '../handle-domain-error.js'
import { cepLookupResponse, cepParamSchema, errorResponse } from './_schemas.js'

export function getCepRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/cep/:cep',
    schema: {
      tags: ['CEP'],
      summary: 'Lookup Brazilian address by postal code (CEP)',
      operationId: 'getCep',
      params: cepParamSchema,
      response: {
        200: cepLookupResponse,
        400: errorResponse,
        404: errorResponse,
        502: errorResponse,
      },
    },
    handler: async (request, reply) => {
      const useCase = container.resolve(LookupCep)
      try {
        const data = await useCase.execute({ cep: request.params.cep })
        return reply.send({ success: true, data })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
```

- [ ] **Step 4: Create `index.ts`**

```ts
// apps/server/src/routes/v1/cep/index.ts
import type { FastifyInstance } from 'fastify'
import { getCepRoute } from './get-cep.js'

export async function cepRoutes(app: FastifyInstance) {
  getCepRoute(app)
}
```

- [ ] **Step 5: Write the failing integration test**

Use the project's existing integration test helpers. Copy the structure from `apps/server/src/routes/v1/clients/__tests__/get-client.spec.ts` — it already builds a Fastify app via `createTestApp()`. Inspect that file and adapt the pattern. The test should:

```ts
// apps/server/src/routes/v1/cep/__tests__/get-cep.spec.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { container, LookupCep } from '@repo/core'
import {
  CepNotFoundError,
  CepProviderUnavailableError,
  InvalidCepError,
} from '@repo/core'
import { createTestApp } from '../../../../__tests__/helpers/app.js'

// Reuse whatever helper the other v1 specs use to build a signed-in request.
// For cep, the route is under the authenticated plugin, so the helper must
// provide an authenticated cookie/header. Follow the pattern of get-client.spec.ts.

describe('GET /api/v1/cep/:cep', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = await createTestApp()
  })

  afterEach(async () => {
    await app.close()
    container.clearInstances()
  })

  it('returns 200 with AddressData on successful lookup', async () => {
    const execute = vi.fn().mockResolvedValue({
      zipCode: '01311000',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      complement: null,
    })
    container.register(LookupCep, {
      useValue: { execute } as unknown as LookupCep,
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cep/01311-000',
      headers: {
        /* auth headers per project helper */
      },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual({
      success: true,
      data: {
        zipCode: '01311000',
        street: 'Avenida Paulista',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        complement: null,
      },
    })
    expect(execute).toHaveBeenCalledWith({ cep: '01311000' })
  })

  it('returns 400 when CEP is malformed', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cep/123',
      headers: {
        /* auth headers */
      },
    })
    expect(response.statusCode).toBe(400)
  })

  it('returns 404 when LookupCep throws CepNotFoundError', async () => {
    const execute = vi.fn().mockRejectedValue(new CepNotFoundError())
    container.register(LookupCep, {
      useValue: { execute } as unknown as LookupCep,
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cep/00000000',
      headers: {
        /* auth headers */
      },
    })
    expect(response.statusCode).toBe(404)
    expect(response.json().error.code).toBe('CEP_NOT_FOUND')
  })

  it('returns 502 when LookupCep throws CepProviderUnavailableError', async () => {
    const execute = vi.fn().mockRejectedValue(new CepProviderUnavailableError())
    container.register(LookupCep, {
      useValue: { execute } as unknown as LookupCep,
    })

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cep/01311000',
      headers: {
        /* auth headers */
      },
    })
    expect(response.statusCode).toBe(502)
    expect(response.json().error.code).toBe('CEP_PROVIDER_UNAVAILABLE')
  })

  it('returns 401 when unauthenticated', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/cep/01311000',
    })
    expect(response.statusCode).toBe(401)
  })
})
```

> **NOTE for the implementer:** inspect `apps/server/src/routes/v1/clients/__tests__/get-client.spec.ts` and copy the exact auth-header pattern this project uses. The `createTestApp()` path and auth helper may be named differently — follow what already works in other specs.

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/cep/__tests__/get-cep.spec.ts`
Expected: FAIL — tests run but fail because the route is not yet registered in the app. Proceed to Task 5 which wires everything together.

- [ ] **Step 7: Commit**

```bash
git add apps/server/src/routes/v1/cep apps/server/src/routes/v1/handle-domain-error.ts
git commit -m "feat(server): add /api/v1/cep route + schemas + error mapping"
```

---

## Task 5: DI registration + route wiring (make route live)

**Files:**

- Modify: `apps/server/src/container-registrations.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Register CEP bindings in DI**

Open `apps/server/src/container-registrations.ts`.

Add to the imports from `@repo/core` (keep alphabetical):

```ts
  LookupCep,
  ViaCepProvider,
  RedisCacheService,
```

(`RedisCacheService` is already imported — don't duplicate.)

Inside `registerDependencies(redis)`, after the existing `CacheService` registration block near the top, add:

```ts
if (redis) {
  const cepCache = new RedisCacheService(redis)
  container.register('CepCacheService', { useValue: cepCache })
}

container.register('CepLookupProvider', { useClass: ViaCepProvider })
container.register(LookupCep, {
  useFactory: (c) =>
    new LookupCep(c.resolve('CepLookupProvider'), c.resolve('CepCacheService')),
})
```

> **Why a dedicated `CepCacheService` token?** The existing `'CacheService'` registration is general-purpose. A distinct token keeps the CEP cache swappable without touching other consumers (the spec calls this out under DI). Keeping both registrations is intentional; both point at the same `RedisCacheService` instance per request to this function.

- [ ] **Step 2: Register CEP route in `app.ts`**

Open `apps/server/src/app.ts`.

Add to the route imports (keep alphabetical — insert after `auditLogRoutes` and before `chatTokenRoute`):

```ts
import { cepRoutes } from './routes/v1/cep/index.js'
```

Inside the authenticated-app registration block (around line 307, `await authenticatedApp.register(...)`), add after `searchRoutes`:

```ts
await authenticatedApp.register(cepRoutes)
```

- [ ] **Step 3: Run the Task 4 integration test to confirm it passes**

Run: `pnpm --filter @app/server exec vitest run src/routes/v1/cep/__tests__/get-cep.spec.ts`
Expected: PASS — 5 tests green. If auth helper differs, adjust the spec per the inspection done in Task 4 Step 5.

- [ ] **Step 4: Run full server build + typecheck**

Run: `pnpm --filter @app/server typecheck && pnpm --filter @app/server build`
Expected: both succeed with no errors. If `@repo/env`-bundling or `noExternal` complaints appear, verify no new env vars were introduced (none are needed).

- [ ] **Step 5: Start server and smoke test manually**

Run (terminal 1): `docker compose up -d && pnpm --filter @app/server dev`
Run (terminal 2): `curl -i 'http://localhost:3001/api/v1/cep/01311000' -b cookies.txt` (using an authenticated session cookie — or via the `/api/docs` Scalar UI after logging in).
Expected: `200 OK` JSON body with `Avenida Paulista` (ViaCEP real call; adds ~300 ms first hit, ~2 ms on cached second hit).

- [ ] **Step 6: Commit**

```bash
git add apps/server/src/container-registrations.ts apps/server/src/app.ts
git commit -m "feat(server): wire CEP route + DI registration"
```

---

## Task 6: Regenerate Orval for the new CEP endpoint

**Files:**

- Regenerates: `apps/web/src/api/endpoints/cep/cep.ts`
- Regenerates: `apps/web/src/api/endpoints/cep/cep.zod.ts`
- Regenerates: `apps/web/src/api/model/*` (new AddressData-related types)

- [ ] **Step 1: Ensure server is running on :3001** (from Task 5 Step 5). If not, start it.

- [ ] **Step 2: Run Orval**

Run: `pnpm --filter @app/web generate:api`
Expected: new files appear under `apps/web/src/api/endpoints/cep/` and new models under `apps/web/src/api/model/` (naming based on `operationId: 'getCep'`).

- [ ] **Step 3: Typecheck frontend**

Run: `pnpm --filter @app/web typecheck`
Expected: PASS.

- [ ] **Step 4: Commit generated files**

```bash
git add apps/web/src/api
git commit -m "chore(web): regenerate Orval API client (add getCep)"
```

---

## Task 7: `useCepLookup` hook (TDD)

**Files:**

- Create: `apps/web/src/features/address/hooks/use-cep-lookup.ts`
- Create: `apps/web/src/features/address/hooks/use-cep-lookup.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/features/address/hooks/use-cep-lookup.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useCepLookup } from './use-cep-lookup'

const getCepMock = vi.fn()

vi.mock('@/api/endpoints/cep/cep', () => ({
  getCep: (...args: unknown[]) => getCepMock(...args),
}))

const payload = {
  zipCode: '01311000',
  street: 'Avenida Paulista',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  complement: null,
}

describe('useCepLookup', () => {
  beforeEach(() => {
    getCepMock.mockReset()
  })

  it('returns null without calling API when CEP has fewer than 8 digits', async () => {
    const { result } = renderHook(() => useCepLookup())
    const data = await act(() => result.current.lookup('1234'))
    expect(data).toBeNull()
    expect(getCepMock).not.toHaveBeenCalled()
    expect(result.current.error).toBeNull()
  })

  it('normalizes CEP and returns AddressData on success', async () => {
    getCepMock.mockResolvedValue({ data: { success: true, data: payload } })
    const { result } = renderHook(() => useCepLookup())
    const data = await act(() => result.current.lookup('01311-000'))
    expect(getCepMock).toHaveBeenCalledWith('01311000')
    expect(data).toEqual(payload)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeNull()
  })

  it('sets error { type: "not-found" } on 404', async () => {
    getCepMock.mockRejectedValue({
      response: { status: 404, data: { error: { code: 'CEP_NOT_FOUND' } } },
    })
    const { result } = renderHook(() => useCepLookup())
    const data = await act(() => result.current.lookup('00000000'))
    expect(data).toBeNull()
    await waitFor(() =>
      expect(result.current.error).toEqual({ type: 'not-found' })
    )
  })

  it('sets error { type: "provider-unavailable" } on 502', async () => {
    getCepMock.mockRejectedValue({
      response: {
        status: 502,
        data: { error: { code: 'CEP_PROVIDER_UNAVAILABLE' } },
      },
    })
    const { result } = renderHook(() => useCepLookup())
    const data = await act(() => result.current.lookup('01311000'))
    expect(data).toBeNull()
    await waitFor(() =>
      expect(result.current.error).toEqual({ type: 'provider-unavailable' })
    )
  })

  it('sets error { type: "network" } on unknown errors', async () => {
    getCepMock.mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useCepLookup())
    const data = await act(() => result.current.lookup('01311000'))
    expect(data).toBeNull()
    await waitFor(() =>
      expect(result.current.error).toEqual({ type: 'network' })
    )
  })

  it('clears error on a subsequent successful lookup', async () => {
    getCepMock.mockRejectedValueOnce({
      response: { status: 404, data: { error: { code: 'CEP_NOT_FOUND' } } },
    })
    getCepMock.mockResolvedValueOnce({ data: { success: true, data: payload } })
    const { result } = renderHook(() => useCepLookup())

    await act(() => result.current.lookup('00000000'))
    await waitFor(() =>
      expect(result.current.error).toEqual({ type: 'not-found' })
    )

    await act(() => result.current.lookup('01311000'))
    await waitFor(() => expect(result.current.error).toBeNull())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @app/web exec vitest run src/features/address/hooks/use-cep-lookup.spec.ts`
Expected: FAIL with "Cannot find module './use-cep-lookup'".

- [ ] **Step 3: Implement `useCepLookup`**

```ts
// apps/web/src/features/address/hooks/use-cep-lookup.ts
'use client'

import { useCallback, useRef, useState } from 'react'
import { getCep } from '@/api/endpoints/cep/cep'
import type { GetCep200Data } from '@/api/model'

export type CepLookupErrorType =
  | 'not-found'
  | 'provider-unavailable'
  | 'network'

export interface CepLookupError {
  readonly type: CepLookupErrorType
}

export interface UseCepLookupReturn {
  readonly lookup: (cep: string) => Promise<GetCep200Data | null>
  readonly isLoading: boolean
  readonly error: CepLookupError | null
}

function classifyError(error: unknown): CepLookupErrorType {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { status?: unknown } }).response?.status ===
      'number'
  ) {
    const status = (error as { response: { status: number } }).response.status
    if (status === 404) return 'not-found'
    if (status === 502) return 'provider-unavailable'
  }
  return 'network'
}

export function useCepLookup(): UseCepLookupReturn {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<CepLookupError | null>(null)
  const requestIdRef = useRef(0)

  const lookup = useCallback(
    async (cep: string): Promise<GetCep200Data | null> => {
      const normalized = cep.replace(/\D/g, '')
      if (normalized.length !== 8) {
        return null
      }

      const requestId = ++requestIdRef.current
      setIsLoading(true)
      setError(null)

      try {
        const response = await getCep(normalized)
        if (requestId !== requestIdRef.current) return null
        return response.data.data
      } catch (err) {
        if (requestId !== requestIdRef.current) return null
        setError({ type: classifyError(err) })
        return null
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    []
  )

  return { lookup, isLoading, error }
}
```

> **Note on types:** `GetCep200Data` is the Orval-generated model from Task 6. If the generated name differs (Orval derives names from `operationId` + response shape), use the actual generated name visible in `apps/web/src/api/model/`. The shape must match `AddressData`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @app/web exec vitest run src/features/address/hooks/use-cep-lookup.spec.ts`
Expected: PASS — 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/address/hooks
git commit -m "feat(web): add useCepLookup hook"
```

---

## Task 8: `<AddressFieldsWithCep />` component (TDD)

**Files:**

- Create: `apps/web/src/features/address/components/address-fields-with-cep.tsx`
- Create: `apps/web/src/features/address/components/address-fields-with-cep.spec.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/features/address/components/address-fields-with-cep.spec.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, FormProvider } from 'react-hook-form'
import { AddressFieldsWithCep } from './address-fields-with-cep'
import { toast } from 'sonner'

const lookupMock = vi.fn()

vi.mock('../hooks/use-cep-lookup', () => ({
  useCepLookup: () => ({
    lookup: lookupMock,
    isLoading: false,
    error: null,
  }),
}))

vi.mock('sonner', () => ({
  toast: { error: vi.fn() },
}))

interface FormShape {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

function Harness({ defaultValues }: { defaultValues?: Partial<FormShape> }) {
  const form = useForm<FormShape>({
    defaultValues: {
      cep: '',
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      ...defaultValues,
    },
  })
  return (
    <FormProvider {...form}>
      <AddressFieldsWithCep
        control={form.control}
        register={form.register}
        setValue={form.setValue}
      />
    </FormProvider>
  )
}

describe('<AddressFieldsWithCep />', () => {
  beforeEach(() => {
    lookupMock.mockReset()
    vi.mocked(toast.error).mockReset()
  })

  it('triggers lookup on blur after 8 digits and autofills fields', async () => {
    lookupMock.mockResolvedValue({
      zipCode: '01311000',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      complement: null,
    })

    const user = userEvent.setup()
    render(<Harness />)

    const cepInput = screen.getByLabelText(/CEP/i)
    await user.type(cepInput, '01311000')
    fireEvent.blur(cepInput)

    await waitFor(() => {
      expect(screen.getByLabelText(/Logradouro/i)).toHaveValue(
        'Avenida Paulista'
      )
    })
    expect(screen.getByLabelText(/Bairro/i)).toHaveValue('Bela Vista')
    expect(screen.getByLabelText(/Cidade/i)).toHaveValue('São Paulo')
    expect(screen.getByLabelText(/Estado/i)).toHaveValue('SP')
    // Number and complement are never touched
    expect(screen.getByLabelText(/Número/i)).toHaveValue('')
    expect(screen.getByLabelText(/Complemento/i)).toHaveValue('')
  })

  it('shows error toast and leaves fields untouched on not-found', async () => {
    lookupMock.mockImplementation(() => {
      // Simulate hook setting error state internally; component reads lookup return === null
      return Promise.resolve(null)
    })

    const user = userEvent.setup()
    render(
      <Harness
        defaultValues={{
          street: 'Rua Existente',
          city: 'Cidade Existente',
        }}
      />
    )

    const cepInput = screen.getByLabelText(/CEP/i)
    await user.type(cepInput, '00000000')
    fireEvent.blur(cepInput)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringMatching(/CEP não encontrado/i)
      )
    })
    // Existing values remain
    expect(screen.getByLabelText(/Logradouro/i)).toHaveValue('Rua Existente')
    expect(screen.getByLabelText(/Cidade/i)).toHaveValue('Cidade Existente')
  })

  it('overwrites existing values on a successful lookup', async () => {
    lookupMock.mockResolvedValue({
      zipCode: '01311000',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      complement: null,
    })

    const user = userEvent.setup()
    render(
      <Harness
        defaultValues={{
          street: 'Rua Antiga',
          city: 'Outra Cidade',
        }}
      />
    )

    const cepInput = screen.getByLabelText(/CEP/i)
    await user.type(cepInput, '01311000')
    fireEvent.blur(cepInput)

    await waitFor(() => {
      expect(screen.getByLabelText(/Logradouro/i)).toHaveValue(
        'Avenida Paulista'
      )
    })
    expect(screen.getByLabelText(/Cidade/i)).toHaveValue('São Paulo')
  })

  it('triggers lookup on completion (8 digits typed) without waiting for blur', async () => {
    lookupMock.mockResolvedValue({
      zipCode: '01311000',
      street: 'Avenida Paulista',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      complement: null,
    })

    const user = userEvent.setup()
    render(<Harness />)

    const cepInput = screen.getByLabelText(/CEP/i)
    await user.type(cepInput, '01311000')

    // No blur — assert auto-trigger on 8 digits
    await waitFor(() => expect(lookupMock).toHaveBeenCalledWith('01311000'))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @app/web exec vitest run src/features/address/components/address-fields-with-cep.spec.tsx`
Expected: FAIL with "Cannot find module './address-fields-with-cep'".

- [ ] **Step 3: Implement `<AddressFieldsWithCep />`**

```tsx
// apps/web/src/features/address/components/address-fields-with-cep.tsx
'use client'

import { Loader2 } from 'lucide-react'
import { InputMask } from '@react-input/mask'
import { useEffect, useRef } from 'react'
import {
  Controller,
  type Control,
  type FieldValues,
  type Path,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form'
import { toast } from 'sonner'

import { FieldWrapper } from '@/features/proposals/components/branch-field-sets'
import { Input } from '@/components/ui/input'
import { CEP_MASK } from '@/lib/masks'

import { useCepLookup, type CepLookupError } from '../hooks/use-cep-lookup'

type FieldName =
  | 'cep'
  | 'street'
  | 'number'
  | 'complement'
  | 'neighborhood'
  | 'city'
  | 'state'

interface AddressFieldsWithCepProps<T extends FieldValues = FieldValues> {
  readonly control: Control<T>
  readonly register: UseFormRegister<T>
  readonly setValue: UseFormSetValue<T>
  readonly fieldNames?: Partial<Record<FieldName, string>>
  readonly required?: { cep?: boolean }
}

const DEFAULT_NAMES: Record<FieldName, string> = {
  cep: 'cep',
  street: 'street',
  number: 'number',
  complement: 'complement',
  neighborhood: 'neighborhood',
  city: 'city',
  state: 'state',
}

const ERROR_MESSAGES: Record<CepLookupError['type'], string> = {
  'not-found':
    'CEP não encontrado. Verifique o número ou digite o endereço manualmente.',
  'provider-unavailable':
    'Serviço de CEP indisponível. Preencha o endereço manualmente.',
  network: 'Erro ao buscar CEP. Preencha o endereço manualmente.',
}

export function AddressFieldsWithCep<T extends FieldValues = FieldValues>({
  control,
  register,
  setValue,
  fieldNames,
  required,
}: AddressFieldsWithCepProps<T>) {
  const names = { ...DEFAULT_NAMES, ...fieldNames } as Record<FieldName, string>
  const { lookup, isLoading, error } = useCepLookup()
  const lastLookedUpRef = useRef<string>('')
  const reportedErrorRef = useRef<CepLookupError | null>(null)

  useEffect(() => {
    if (error && error !== reportedErrorRef.current) {
      toast.error(ERROR_MESSAGES[error.type])
      reportedErrorRef.current = error
    }
    if (!error) {
      reportedErrorRef.current = null
    }
  }, [error])

  async function handleLookup(rawCep: string) {
    const digits = rawCep.replace(/\D/g, '')
    if (digits.length !== 8 || digits === lastLookedUpRef.current) return
    lastLookedUpRef.current = digits

    const result = await lookup(digits)
    if (!result) return

    setValue(names.street as Path<T>, result.street as T[Path<T>], {
      shouldDirty: true,
    })
    setValue(names.neighborhood as Path<T>, result.neighborhood as T[Path<T>], {
      shouldDirty: true,
    })
    setValue(names.city as Path<T>, result.city as T[Path<T>], {
      shouldDirty: true,
    })
    setValue(names.state as Path<T>, result.state as T[Path<T>], {
      shouldDirty: true,
    })
  }

  return (
    <>
      <FieldWrapper label="CEP" required={required?.cep ?? false}>
        <Controller
          name={names.cep as Path<T>}
          control={control}
          render={({ field }) => (
            <div className="relative">
              <InputMask
                component={Input}
                mask={CEP_MASK.mask}
                replacement={CEP_MASK.replacement}
                placeholder="00000-000"
                {...field}
                value={String(field.value ?? '')}
                onChange={(event) => {
                  field.onChange(event)
                  void handleLookup(event.target.value)
                }}
                onBlur={(event) => {
                  field.onBlur()
                  void handleLookup(event.target.value)
                }}
              />
              {isLoading ? (
                <Loader2
                  className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 z-10 size-4 -translate-y-1/2 animate-spin"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Logradouro">
        <Input
          placeholder="Rua, Avenida, etc."
          disabled={isLoading}
          {...register(names.street as Path<T>)}
        />
      </FieldWrapper>
      <FieldWrapper label="Número">
        <Input placeholder="Ex: 123" {...register(names.number as Path<T>)} />
      </FieldWrapper>
      <FieldWrapper label="Complemento">
        <Input
          placeholder="Ex: Apto 42"
          {...register(names.complement as Path<T>)}
        />
      </FieldWrapper>
      <FieldWrapper label="Bairro">
        <Input
          placeholder="Bairro"
          disabled={isLoading}
          {...register(names.neighborhood as Path<T>)}
        />
      </FieldWrapper>
      <FieldWrapper label="Cidade">
        <Input
          placeholder="Cidade"
          disabled={isLoading}
          {...register(names.city as Path<T>)}
        />
      </FieldWrapper>
      <FieldWrapper label="Estado">
        <Input
          placeholder="UF"
          maxLength={2}
          disabled={isLoading}
          {...register(names.state as Path<T>)}
        />
      </FieldWrapper>
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @app/web exec vitest run src/features/address/components/address-fields-with-cep.spec.tsx`
Expected: PASS — 4 tests green.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/address
git commit -m "feat(web): add AddressFieldsWithCep composable form component"
```

---

## Task 9: Proposal schema breaking change — backend (zod + domain)

**Files:**

- Modify: `apps/server/src/routes/v1/proposals/_schemas.ts`
- Modify: `packages/core/src/modules/proposal/domain/insured-object-details.ts`

- [ ] **Step 1: Update zod schemas**

In `apps/server/src/routes/v1/proposals/_schemas.ts`, replace the three property-branch schemas with the structured shape. Find each block and change:

**`residentialDetailsSchema`** — replace `address: z.string().optional()` with 6 structured fields:

```ts
const residentialDetailsSchema = z.object({
  branch: z.literal('RESIDENTIAL'),
  propertyType: z.string().min(1),
  propertyUsage: z.string().min(1),
  cep: z.string().min(1),
  street: z.string().trim().optional(),
  number: z.string().trim().optional(),
  complement: z.string().trim().optional(),
  neighborhood: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().length(2).optional(),
  construction: z.string().optional(),
  areaM2: z.number().optional(),
})
```

**`condominiumDetailsSchema`** — same treatment, inserting the 6 fields after `cep` and removing `address`:

```ts
const condominiumDetailsSchema = z.object({
  branch: z.literal('CONDOMINIUM'),
  condominiumName: z.string().min(1),
  unitCount: z.number().int().min(1),
  cep: z.string().min(1),
  street: z.string().trim().optional(),
  number: z.string().trim().optional(),
  complement: z.string().trim().optional(),
  neighborhood: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().length(2).optional(),
  constructionYear: z.number().int().optional(),
  floorCount: z.number().int().optional(),
  blockCount: z.number().int().optional(),
  elevatorCount: z.number().int().optional(),
  employeeCount: z.number().int().optional(),
  hasSecurityEquipment: z.boolean().optional(),
  securityEquipmentDetails: z.string().optional(),
  hasFireEquipment: z.boolean().optional(),
  fireEquipmentDetails: z.string().optional(),
})
```

**`businessDetailsSchema`** — `cep` is optional here, same structured fields:

```ts
const businessDetailsSchema = z.object({
  branch: z.literal('BUSINESS'),
  legalName: z.string().min(1),
  cnpj: z.string().min(1),
  businessActivity: z.string().min(1),
  cep: z.string().optional(),
  street: z.string().trim().optional(),
  number: z.string().trim().optional(),
  complement: z.string().trim().optional(),
  neighborhood: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().length(2).optional(),
  areaM2: z.number().optional(),
})
```

- [ ] **Step 2: Update domain types**

In `packages/core/src/modules/proposal/domain/insured-object-details.ts`, update the three interfaces. Replace `address?: string` with the 6 fields:

```ts
export interface ResidentialDetails {
  branch: 'RESIDENTIAL'
  propertyType: string
  propertyUsage: string
  cep: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  construction?: string
  areaM2?: number
}

export interface CondominiumDetails {
  branch: 'CONDOMINIUM'
  condominiumName: string
  unitCount: number
  cep: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  constructionYear?: number
  floorCount?: number
  blockCount?: number
  elevatorCount?: number
  employeeCount?: number
  hasSecurityEquipment?: boolean
  securityEquipmentDetails?: string
  hasFireEquipment?: boolean
  fireEquipmentDetails?: string
}

export interface BusinessDetails {
  branch: 'BUSINESS'
  legalName: string
  cnpj: string
  businessActivity: string
  cep?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  areaM2?: number
}
```

- [ ] **Step 3: Typecheck core + server**

Run: `pnpm --filter @repo/core typecheck && pnpm --filter @app/server typecheck`
Expected: PASS for core. Server may surface errors where code reads `details.address` — expected; they're fixed in Task 10 (PDF template) and Task 12 (aggilizador check).

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/v1/proposals/_schemas.ts packages/core/src/modules/proposal/domain/insured-object-details.ts
git commit -m "feat(proposal): restructure branch details address into 6 fields"
```

---

## Task 10: Update PDF template to render structured address

**Files:**

- Modify: `apps/server/src/pdf-templates/insured-object-section.tsx`

- [ ] **Step 1: Add a helper and update the three property sections**

Open the file. Before `AutoSection`, add:

```tsx
interface StructuredAddress {
  readonly street?: string
  readonly number?: string
  readonly complement?: string
  readonly neighborhood?: string
  readonly city?: string
  readonly state?: string
}

function formatAddress(details: StructuredAddress): string | undefined {
  const line1 = [details.street, details.number].filter(Boolean).join(', ')
  const withComplement = details.complement
    ? `${line1}${line1 ? ' - ' : ''}${details.complement}`
    : line1
  const line2 = [details.neighborhood, details.city, details.state]
    .filter(Boolean)
    .join(' — ')
  const combined = [withComplement, line2].filter(Boolean).join(' · ')
  return combined.length > 0 ? combined : undefined
}
```

Replace the body of `ResidentialSection` with:

```tsx
function ResidentialSection({
  details,
}: {
  readonly details: ResidentialDetails
}) {
  return (
    <>
      <View style={styles.row}>
        <FieldRow label="Tipo de Imóvel" value={details.propertyType} />
        <FieldRow label="Uso" value={details.propertyUsage} />
      </View>
      <View style={styles.row}>
        <FieldRow label="CEP" value={details.cep} />
        <FieldRow label="Área (m²)" value={details.areaM2} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Endereço" value={formatAddress(details)} />
        <FieldRow label="Construção" value={details.construction} />
      </View>
    </>
  )
}
```

Replace the body of `CondominiumSection`:

```tsx
function CondominiumSection({
  details,
}: {
  readonly details: CondominiumDetails
}) {
  return (
    <>
      <View style={styles.row}>
        <FieldRow label="Nome do Condomínio" value={details.condominiumName} />
        <FieldRow label="Unidades" value={details.unitCount} />
      </View>
      <View style={styles.row}>
        <FieldRow label="CEP" value={details.cep} />
        <FieldRow label="Andares" value={details.floorCount} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Endereço" value={formatAddress(details)} />
        <FieldRow label="Ano Construção" value={details.constructionYear} />
      </View>
    </>
  )
}
```

Replace the body of `BusinessSection`:

```tsx
function BusinessSection({ details }: { readonly details: BusinessDetails }) {
  return (
    <>
      <View style={styles.row}>
        <FieldRow label="Razão Social" value={details.legalName} />
        <FieldRow label="CNPJ" value={details.cnpj} />
      </View>
      <View style={styles.row}>
        <FieldRow label="Atividade" value={details.businessActivity} />
        <FieldRow label="Área (m²)" value={details.areaM2} />
      </View>
      <View style={styles.row}>
        <FieldRow label="CEP" value={details.cep} />
        <FieldRow label="Endereço" value={formatAddress(details)} />
      </View>
    </>
  )
}
```

- [ ] **Step 2: Typecheck server**

Run: `pnpm --filter @app/server typecheck`
Expected: PASS (unless aggilizador also reads `address` — address in Task 12).

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/pdf-templates/insured-object-section.tsx
git commit -m "feat(pdf): render proposal address from structured fields"
```

---

## Task 11: Regenerate Orval + update frontend types + payload builder

**Files:**

- Regenerates: `apps/web/src/api/endpoints/proposals/proposals.*`, `apps/web/src/api/model/*`
- Modify: `apps/web/src/features/proposals/lib/constants.ts` (local detail interfaces)
- Modify: `apps/web/src/features/proposals/lib/build-branch-details.ts`

- [ ] **Step 1: Ensure server is running (rebuild if needed so OpenAPI spec reflects the schema changes)**

Run: `pnpm --filter @app/server dev` (background). If already running, restart so the new schemas are served.

- [ ] **Step 2: Regenerate Orval**

Run: `pnpm --filter @app/web generate:api`
Expected: proposal-related types updated.

- [ ] **Step 3: Update local detail interfaces in `constants.ts`**

Open `apps/web/src/features/proposals/lib/constants.ts`. Replace the three property-branch interfaces:

```ts
export interface ResidentialDetails {
  branch: 'RESIDENTIAL'
  propertyType: string
  propertyUsage: string
  cep: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  construction?: string
  areaM2?: number
}

export interface CondominiumDetails {
  branch: 'CONDOMINIUM'
  condominiumName: string
  unitCount: number
  cep: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  constructionYear?: number
  floorCount?: number
  blockCount?: number
  elevatorCount?: number
  employeeCount?: number
  hasSecurityEquipment?: boolean
  securityEquipmentDetails?: string
  hasFireEquipment?: boolean
  fireEquipmentDetails?: string
}

export interface BusinessDetails {
  branch: 'BUSINESS'
  legalName: string
  cnpj: string
  businessActivity: string
  cep?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  areaM2?: number
}
```

- [ ] **Step 4: Update `build-branch-details.ts`**

Open `apps/web/src/features/proposals/lib/build-branch-details.ts`. Replace the three relevant branches:

```ts
    case 'RESIDENTIAL':
      return {
        branch,
        propertyType: String(fields.propertyType ?? ''),
        propertyUsage: String(fields.propertyUsage ?? ''),
        cep: String(fields.cep ?? ''),
        street: fields.street ? String(fields.street) : undefined,
        number: fields.number ? String(fields.number) : undefined,
        complement: fields.complement ? String(fields.complement) : undefined,
        neighborhood: fields.neighborhood ? String(fields.neighborhood) : undefined,
        city: fields.city ? String(fields.city) : undefined,
        state: fields.state ? String(fields.state) : undefined,
        construction: fields.construction
          ? String(fields.construction)
          : undefined,
        areaM2: fields.areaM2 ? Number(fields.areaM2) : undefined,
      }
    case 'CONDOMINIUM':
      return {
        branch,
        condominiumName: String(fields.condominiumName ?? ''),
        unitCount: Number(fields.unitCount) || 0,
        cep: String(fields.cep ?? ''),
        street: fields.street ? String(fields.street) : undefined,
        number: fields.number ? String(fields.number) : undefined,
        complement: fields.complement ? String(fields.complement) : undefined,
        neighborhood: fields.neighborhood ? String(fields.neighborhood) : undefined,
        city: fields.city ? String(fields.city) : undefined,
        state: fields.state ? String(fields.state) : undefined,
        constructionYear: fields.constructionYear
          ? Number(fields.constructionYear)
          : undefined,
        floorCount: fields.floorCount ? Number(fields.floorCount) : undefined,
        blockCount: fields.blockCount ? Number(fields.blockCount) : undefined,
        elevatorCount: fields.elevatorCount
          ? Number(fields.elevatorCount)
          : undefined,
        employeeCount: fields.employeeCount
          ? Number(fields.employeeCount)
          : undefined,
        hasSecurityEquipment:
          typeof fields.hasSecurityEquipment === 'boolean'
            ? fields.hasSecurityEquipment
            : undefined,
        securityEquipmentDetails: fields.securityEquipmentDetails
          ? String(fields.securityEquipmentDetails)
          : undefined,
        hasFireEquipment:
          typeof fields.hasFireEquipment === 'boolean'
            ? fields.hasFireEquipment
            : undefined,
        fireEquipmentDetails: fields.fireEquipmentDetails
          ? String(fields.fireEquipmentDetails)
          : undefined,
      }
    case 'BUSINESS':
      return {
        branch,
        legalName: String(fields.legalName ?? ''),
        cnpj: String(fields.cnpj ?? ''),
        businessActivity: String(fields.businessActivity ?? ''),
        cep: fields.cep ? String(fields.cep) : undefined,
        street: fields.street ? String(fields.street) : undefined,
        number: fields.number ? String(fields.number) : undefined,
        complement: fields.complement ? String(fields.complement) : undefined,
        neighborhood: fields.neighborhood ? String(fields.neighborhood) : undefined,
        city: fields.city ? String(fields.city) : undefined,
        state: fields.state ? String(fields.state) : undefined,
        areaM2: fields.areaM2 ? Number(fields.areaM2) : undefined,
      }
```

(The AUTO, LIFE, and OTHER branches remain unchanged.)

- [ ] **Step 5: Typecheck frontend**

Run: `pnpm --filter @app/web typecheck`
Expected: errors in `residential.tsx`, `business.tsx`, `condominium.tsx` for the unused `address` prop — these are fixed in Tasks 13/14/15.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/api apps/web/src/features/proposals/lib
git commit -m "feat(web): regenerate Orval + update proposal address types"
```

---

## Task 12: Check aggilizador for `address` references

**Files:**

- Possibly modify: `packages/aggilizador/src/builders/property-*.ts` (if they exist)

- [ ] **Step 1: Search for `address` usage in aggilizador**

Run: `grep -rn "\\.address\\b\\|address:" packages/aggilizador/src --include="*.ts"`
Expected: one of:

- **Zero matches in property builders** → skip to Step 3 (nothing to do).
- **Matches found** → continue to Step 2.

- [ ] **Step 2: Replace `address` with structured fields in each matched file**

For each builder that reads `details.address`, replace with the same `formatAddress(details)` helper from Task 10 (copy it or, preferably, extract to a shared utility at `packages/core/src/modules/proposal/domain/format-address.ts` and import from both sides). If the builder forwards to an insurer API that expects a single `address` string, the `formatAddress` helper is the right call site. If the insurer API has structured fields too, map directly.

> **Decision rule:** if there's only 1-2 call sites, copy the helper. If 3+, extract to `packages/core`. Prefer copy for now — YAGNI.

- [ ] **Step 3: Run aggilizador tests**

Run: `pnpm --filter @repo/aggilizador test`
Expected: PASS.

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @repo/aggilizador typecheck`
Expected: PASS.

- [ ] **Step 5: Commit (only if changes were made)**

```bash
git add packages/aggilizador
git commit -m "refactor(aggilizador): consume structured address fields"
```

If no changes were needed, skip this commit and move on.

---

## Task 13: Migrate `residential.tsx` to `<AddressFieldsWithCep />`

**Files:**

- Modify: `apps/web/src/features/proposals/components/branch-field-sets-property/residential.tsx`

- [ ] **Step 1: Replace the CEP + address blocks**

Open the file. Remove the `CEP_MASK` import (no longer used here). Replace the two `FieldWrapper`s for `CEP` and `Endereço` with a single `<AddressFieldsWithCep />`. The final file:

```tsx
'use client'

import { Controller } from 'react-hook-form'

import { AddressFieldsWithCep } from '@/features/address/components/address-fields-with-cep'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  CONSTRUCTION_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  PROPERTY_USAGE_OPTIONS,
} from '../../lib/branch-options'
import type { FieldHelperProps } from '../branch-field-sets'
import { FieldWrapper } from '../branch-field-sets'

export function ResidentialFields({
  register,
  control,
  setValue,
}: FieldHelperProps) {
  return (
    <>
      <FieldWrapper label="Tipo de Imóvel" required>
        <Controller
          name="propertyType"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={PROPERTY_TYPE_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string | null) => {
                    const item = PROPERTY_TYPE_OPTIONS.find(
                      (o) => o.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Uso do Imóvel" required>
        <Controller
          name="propertyUsage"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={PROPERTY_USAGE_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string | null) => {
                    const item = PROPERTY_USAGE_OPTIONS.find(
                      (o) => o.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_USAGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
      <AddressFieldsWithCep
        control={control}
        register={register}
        setValue={setValue}
        required={{ cep: true }}
      />
      <FieldWrapper label="Construção">
        <Controller
          name="construction"
          control={control}
          render={({ field }) => (
            <Select
              value={String(field.value ?? '')}
              onValueChange={field.onChange}
              items={CONSTRUCTION_OPTIONS}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione">
                  {(value: string | null) => {
                    const item = CONSTRUCTION_OPTIONS.find(
                      (o) => o.value === value
                    )
                    return item?.label ?? null
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CONSTRUCTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Área (m²)">
        <Input
          type="number"
          placeholder="Ex: 120"
          {...register('areaM2', { valueAsNumber: true })}
        />
      </FieldWrapper>
    </>
  )
}
```

> **Important — `FieldHelperProps` may not yet include `setValue`.** Open `apps/web/src/features/proposals/components/branch-field-sets.tsx` and add `setValue: UseFormSetValue<FieldValues>` (or the existing generic) to the props interface if missing. The imports from `react-hook-form` likely already include other helpers. Grep for `FieldHelperProps` to see the exact file and extend it.

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @app/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/components/branch-field-sets-property/residential.tsx apps/web/src/features/proposals/components/branch-field-sets.tsx
git commit -m "feat(web): use AddressFieldsWithCep in residential branch form"
```

---

## Task 14: Migrate `business.tsx` to `<AddressFieldsWithCep />`

**Files:**

- Modify: `apps/web/src/features/proposals/components/branch-field-sets-property/business.tsx`

- [ ] **Step 1: Replace the CEP + address blocks**

Open the file. Remove `CEP_MASK` from the masks import (keep `CNPJ_MASK`). Replace the two `FieldWrapper`s for `CEP` and `Endereço` with `<AddressFieldsWithCep />`. Final structure (only relevant diffs shown):

```tsx
import { Controller, useWatch } from 'react-hook-form'
import { InputMask } from '@react-input/mask'

import { AddressFieldsWithCep } from '@/features/address/components/address-fields-with-cep'
import { Input } from '@/components/ui/input'
import { CNPJ_MASK } from '@/lib/masks'

import type { FieldHelperProps } from '../branch-field-sets'
import { FieldWrapper } from '../branch-field-sets'
import { AutoFilledBadge, type AutoFillData } from './shared'

interface BusinessFieldsProps extends FieldHelperProps {
  autoFill?: AutoFillData
}

export function BusinessFields({
  register,
  control,
  setValue,
  autoFill,
}: BusinessFieldsProps) {
  const isCompanyClient = autoFill?.clientPersonType === 'COMPANY'
  const legalNameValue = useWatch({ control, name: 'legalName' })

  return (
    <>
      <FieldWrapper label="Razão Social" required>
        <Input
          placeholder="Razão social da empresa"
          {...register('legalName')}
        />
        {isCompanyClient && (
          <AutoFilledBadge
            value={String(legalNameValue ?? '')}
            originalValue={autoFill?.clientName ?? ''}
          />
        )}
      </FieldWrapper>
      <FieldWrapper label="CNPJ" required>
        <Controller
          name="cnpj"
          control={control}
          render={({ field }) => (
            <>
              <InputMask
                component={Input}
                mask={CNPJ_MASK.mask}
                replacement={CNPJ_MASK.replacement}
                placeholder="00.000.000/0000-00"
                {...field}
                value={String(field.value ?? '')}
              />
              {isCompanyClient && (
                <AutoFilledBadge
                  value={String(field.value ?? '')}
                  originalValue={autoFill?.clientDocument ?? ''}
                />
              )}
            </>
          )}
        />
      </FieldWrapper>
      <FieldWrapper label="Atividade" required>
        <Input
          placeholder="Atividade principal"
          {...register('businessActivity')}
        />
      </FieldWrapper>
      <AddressFieldsWithCep
        control={control}
        register={register}
        setValue={setValue}
        required={{ cep: false }}
      />
      <FieldWrapper label="Área (m²)">
        <Input
          type="number"
          placeholder="Ex: 200"
          {...register('areaM2', { valueAsNumber: true })}
        />
      </FieldWrapper>
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @app/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/components/branch-field-sets-property/business.tsx
git commit -m "feat(web): use AddressFieldsWithCep in business branch form"
```

---

## Task 15: Migrate `condominium.tsx` to `<AddressFieldsWithCep />`

**Files:**

- Modify: `apps/web/src/features/proposals/components/branch-field-sets-property/condominium.tsx`

- [ ] **Step 1: Replace the CEP + address blocks**

Open the file. Remove `CEP_MASK` import, remove `InputMask` import, remove `Controller` if only used for the CEP field. Replace the CEP + Endereço `FieldWrapper`s with `<AddressFieldsWithCep />`. Keep all other fields (condominiumName, unitCount, constructionYear, etc.).

```tsx
'use client'

import { useWatch } from 'react-hook-form'

import { AddressFieldsWithCep } from '@/features/address/components/address-fields-with-cep'
import { Input } from '@/components/ui/input'

import type { FieldHelperProps } from '../branch-field-sets'
import { FieldWrapper } from '../branch-field-sets'
import { AutoFilledBadge, EquipmentToggle, type AutoFillData } from './shared'

interface CondominiumFieldsProps extends FieldHelperProps {
  autoFill?: AutoFillData
}

export function CondominiumFields({
  register,
  control,
  setValue,
  autoFill,
}: CondominiumFieldsProps) {
  const isCompanyClient = autoFill?.clientPersonType === 'COMPANY'
  const condominiumNameValue = useWatch({ control, name: 'condominiumName' })

  return (
    <>
      <FieldWrapper label="Nome do Condomínio" required>
        <Input
          placeholder="Nome do condomínio"
          {...register('condominiumName')}
        />
        {isCompanyClient && (
          <AutoFilledBadge
            value={String(condominiumNameValue ?? '')}
            originalValue={autoFill?.clientName ?? ''}
          />
        )}
      </FieldWrapper>
      <FieldWrapper label="Número de Unidades" required>
        <Input
          type="number"
          placeholder="Ex: 48"
          {...register('unitCount', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <AddressFieldsWithCep
        control={control}
        register={register}
        setValue={setValue}
        required={{ cep: true }}
      />
      <FieldWrapper label="Ano de Construção">
        <Input
          type="number"
          placeholder="Ex: 2010"
          {...register('constructionYear', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Número de Andares">
        <Input
          type="number"
          placeholder="Ex: 12"
          {...register('floorCount', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Quantidade de Blocos">
        <Input
          type="number"
          placeholder="Ex: 4"
          {...register('blockCount', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Quantidade de Elevadores">
        <Input
          type="number"
          placeholder="Ex: 2"
          {...register('elevatorCount', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <FieldWrapper label="Número de Funcionários">
        <Input
          type="number"
          placeholder="Ex: 10"
          {...register('employeeCount', { valueAsNumber: true })}
        />
      </FieldWrapper>
      <EquipmentToggle
        name="hasSecurityEquipment"
        detailsName="securityEquipmentDetails"
        label="Possui equipamentos de segurança?"
        placeholder="Ex: Câmeras, portaria 24h, alarme"
        control={control}
        register={register}
      />
      <EquipmentToggle
        name="hasFireEquipment"
        detailsName="fireEquipmentDetails"
        label="Possui equipamentos de incêndio?"
        placeholder="Ex: Sprinklers, extintores, hidrantes"
        control={control}
        register={register}
      />
    </>
  )
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @app/web typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/components/branch-field-sets-property/condominium.tsx
git commit -m "feat(web): use AddressFieldsWithCep in condominium branch form"
```

---

## Task 16: Full quality gates + DB reset

**Files:** none (repo-wide checks)

- [ ] **Step 1: Reset and reseed the database**

Run: `pnpm db:reset`
Expected: DB drops, migrates, seeds succeed.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: zero errors.

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: zero errors across all packages.

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: all apps build successfully.

- [ ] **Step 5: Tests**

Run: `pnpm test`
Expected: all tests pass.

- [ ] **Step 6: If any of steps 2-5 fail, stop and fix before continuing.**

---

## Task 17: Manual QA via Playwright (MCP)

**Files:** none (QA evidence in `audit/`)

- [ ] **Step 1: Start all apps**

Run: `pnpm dev` (web :3000, server :3001, chat-server :3002)

- [ ] **Step 2: QA script — desktop (1440px)**

Log in as `test@user.com` / `Senha@123`. For each of the three branch forms:

1. Navigate to a new proposal, select branch (Residencial / Empresarial / Condomínio).
2. Fill required non-address fields.
3. **Golden path:** type `01311-000` in CEP → expect loading spinner → street `Avenida Paulista`, bairro `Bela Vista`, cidade `São Paulo`, estado `SP` auto-filled. Número + complemento remain empty. Capture screenshot to `audit/SCRUM-55/desktop-<branch>-success.png`.
4. **Not-found:** clear CEP, type `00000-000` → expect toast `"CEP não encontrado..."`. Fields not altered. Capture screenshot.
5. **Manual edit:** after a successful lookup, edit `street` manually → value persists, no re-lookup.
6. **Retrigger:** blur the CEP field with an already-looked-up value → no duplicate request (check network tab).
7. Save the proposal → backend accepts payload with structured fields (verify via Prisma Studio or `/api/docs`).

- [ ] **Step 3: QA script — mobile (375px)**

Re-run the golden path for one branch (residencial) at 375px viewport. Capture screenshot `audit/SCRUM-55/mobile-residencial-success.png`. Verify fields stack in a single column and CEP spinner does not overflow.

- [ ] **Step 4: Dark mode sanity check**

Toggle dark mode. Verify CEP spinner, field labels, and toast colors remain legible. Screenshot `audit/SCRUM-55/dark-residencial-success.png`.

- [ ] **Step 5: Commit screenshots**

```bash
git add audit/SCRUM-55
git commit -m "docs(qa): SCRUM-55 Playwright evidence"
```

- [ ] **Step 6: Open PR**

Use `gh pr create` with title `feat: CEP address lookup (SCRUM-55)` and a body summarizing the spec link, the 6-field restructure, and screenshots.

---

## Self-Review Checklist (run before handoff)

- [ ] Spec coverage — every section in the spec maps to a task:
  - Section "Backend" → Tasks 1-5
  - Section "Frontend" → Tasks 6-8
  - Section "Proposal breaking changes" → Tasks 9-11, 13-15
  - Section "Aggilizador" → Task 12
  - Section "PDF template" → Task 10
  - Section "Seed reset" → Task 16 Step 1
  - Section "Testes" → TDD throughout + Task 17
  - Section "Critérios de aceite" → Tasks 16-17
- [ ] No placeholders (searched for TBD / TODO / "similar to Task N" — none present).
- [ ] Type consistency: `AddressData` shape is identical in core (Task 1), ViaCEP mapping (Task 3), zod response schema (Task 4), hook (Task 7), and component (Task 8). `LookupCep.execute({ cep })` signature is consistent across use case (Task 2), route (Task 4), and spec mock (Task 4 Step 5).
- [ ] File paths are absolute from repo root everywhere.
- [ ] Each task ends with a commit.
