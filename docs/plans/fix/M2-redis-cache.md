# M2. Redis Cache para Dados Estaticos

> **Severidade:** MEDIO (performance) | **Esforco:** M (1-2 dias) | **Prioridade:** Semana 4

---

## Problema

Dados que mudam raramente sao buscados do PostgreSQL a cada request: seguradoras (fixture data) e membros da org.

## Implementacao

### Etapa 1: Cache Utils

```typescript
// packages/core/src/shared/cache.ts
import { Redis } from 'ioredis'

export class CacheService {
  constructor(private readonly redis: Redis) {}

  async get<TResult>(key: string): Promise<TResult | null> {
    const data = await this.redis.get(key)
    if (!data) return null
    return JSON.parse(data) as TResult
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  }

  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern)
    if (keys.length > 0) await this.redis.del(...keys)
  }
}
```

### Etapa 2: Aplicar nos Repositories

```typescript
// Seguradoras: cache 24h
const INSURER_TTL = 86400 // 24h
const cacheKey = `insurers:${organizationId}`

// Em ListInsurers:
const cached = await cache.get<InsurerData[]>(cacheKey)
if (cached) return cached
const data = await repo.findMany(filters)
await cache.set(cacheKey, data, INSURER_TTL)
return data

// Members: cache 1h
const MEMBER_TTL = 3600 // 1h
```

### Etapa 3: Invalidacao

Invalidar cache nos endpoints de mutacao:

- Insurer create/update -> `cache.invalidate('insurers:*')`
- Member invite/remove/role-change -> `cache.invalidate('members:orgId')`

## Criterios de Aceite

- [ ] Cache de seguradoras com TTL 24h
- [ ] Cache de membros com TTL 1h
- [ ] Invalidacao automatica em mutacoes
- [ ] Fallback para DB se Redis indisponivel
