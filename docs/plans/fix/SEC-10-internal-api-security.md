# SEC-10. Seguranca da Internal API

> **Severidade:** MEDIO | **Esforco:** M (1 dia) | **Prioridade:** Mes 1

---

## Problema

Internal API (`/internal/leads`) usa apenas token estatico para autenticacao. Sem HMAC, sem IP whitelist, sem rate limit.

## Arquivo

`apps/server/src/middlewares/internal-auth-middleware.ts`

## Riscos

Se token vazar, atacante pode criar leads/propostas arbitrarios para qualquer organizacao.

## Implementacao

### Opcao A: HMAC Request Signing (recomendado)

```typescript
// packages/shared/src/internal-auth.ts
import { createHmac } from 'node:crypto'

export function signRequest(
  secret: string,
  method: string,
  path: string,
  body: string,
  timestamp: number
): string {
  const payload = `${timestamp}.${method}.${path}.${body}`
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function verifyRequest(
  secret: string,
  signature: string,
  method: string,
  path: string,
  body: string,
  timestamp: number,
  maxAge: number = 300 // 5 minutos
): boolean {
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - timestamp) > maxAge) return false
  const expected = signRequest(secret, method, path, body, timestamp)
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
```

### Opcao B: IP Whitelist (simples)

```typescript
// apps/server/src/middlewares/internal-auth-middleware.ts
const ALLOWED_IPS = new Set(['127.0.0.1', '::1', '172.17.0.0/16']) // Docker network

app.addHook('preHandler', (request, reply, done) => {
  if (!ALLOWED_IPS.has(request.ip)) {
    reply.status(403).send({ error: 'Forbidden' })
    return
  }
  done()
})
```

### Rate Limit

```typescript
// 1000 req/min para internal API
app.register(rateLimit, {
  max: 1000,
  timeWindow: '1 minute',
  keyGenerator: (request) => request.ip,
  routePrefix: '/internal',
})
```

## Criterios de Aceite

- [ ] HMAC ou IP whitelist implementado
- [ ] Rate limit de 1000 req/min em `/internal/*`
- [ ] Requests sem assinatura valida retornam 403
- [ ] Requests com timestamp > 5 min retornam 403
- [ ] Chat-worker atualizado para assinar requests
