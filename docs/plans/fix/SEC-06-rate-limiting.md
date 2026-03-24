# SEC-06. Rate Limiting Granular

> **Severidade:** HIGH | **Esforco:** M (1-2 dias) | **Prioridade:** Semana 2-3

---

## Problema

Apenas rate limit global (100 req/min). Faltam limites especificos para:

- Login brute force
- Forgot password abuse
- Registration spam
- Socket.IO message flood

## Especificacao (SECURITY-SPEC AUTH-8, S11)

| Endpoint           | Limite                | Key    |
| ------------------ | --------------------- | ------ |
| Login              | 5 tentativas / 15 min | email  |
| Forgot Password    | 3 requests / 1 hora   | email  |
| Registration       | 3 contas / 1 hora     | IP     |
| Socket.IO messages | 10 msgs / segundo     | userId |
| Invitations        | 20 / hora             | orgId  |

## Implementacao

### Auth Rate Limits (Better Auth hooks)

```typescript
// packages/auth/src/index.ts
// Usar Better Auth rateLimit plugin ou custom hooks:
const authRateLimit = {
  signIn: { window: 900, max: 5 }, // 5 per 15 min
  forgotPassword: { window: 3600, max: 3 }, // 3 per hour
  signUp: { window: 3600, max: 3 }, // 3 per hour per IP
}
```

### Socket.IO Rate Limit

```typescript
// apps/chat-server/src/infra/socket/socket-rate-limit.ts
import Bottleneck from 'bottleneck'

const limiters = new Map<string, Bottleneck>()

export function getSocketLimiter(userId: string): Bottleneck {
  if (!limiters.has(userId)) {
    limiters.set(
      userId,
      new Bottleneck({
        reservoir: 10,
        reservoirRefreshInterval: 1000, // 10 msgs/sec
        reservoirRefreshAmount: 10,
      })
    )
  }
  return limiters.get(userId)!
}

// No socket handler:
socket.use(async ([event, ...args], next) => {
  if (event === 'send-message') {
    const limiter = getSocketLimiter(socket.data.userId)
    try {
      await limiter.schedule(() => Promise.resolve())
      next()
    } catch {
      next(new Error('Rate limit exceeded'))
    }
  } else {
    next()
  }
})
```

## Dependencias

- `bottleneck` (ja no projeto ou adicionar)

## Criterios de Aceite

- [ ] Login: 6a tentativa em 15min retorna 429
- [ ] Forgot password: 4o request em 1h retorna 429
- [ ] Socket.IO: 11a msg/segundo rejeita
- [ ] Rate limit nao afeta usuarios normais
- [ ] Mensagem de erro amigavel (nao expor detalhes internos)
