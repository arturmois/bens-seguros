# SEC-04. Pino Redaction para PII

> **Severidade:** HIGH | **Esforco:** P (30min) | **Prioridade:** Semana 1 | Quick Win

---

## Problema

Pino configurado sem `redact.paths`. PII (CPF, email, telefone) pode aparecer em logs de producao.

## Arquivos

- `apps/server/src/app.ts` (Fastify logger)
- `apps/chat-server/src/infra/logger.ts`

## Especificacao (SECURITY-SPEC S2)

```
redact.paths: ['cpf','cnpj','email','phone','password','token','birthDate'] -> [REDACTED]
```

## Correcao

```typescript
// apps/server/src/app.ts
const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: {
      paths: [
        'cpf',
        'cnpj',
        'email',
        'phone',
        'password',
        'token',
        'birthDate',
        'req.body.cpf',
        'req.body.cnpj',
        'req.body.email',
        'req.body.phone',
        'req.body.password',
        'req.body.document',
        'req.headers.authorization',
        'req.headers.cookie',
      ],
      censor: '[REDACTED]',
    },
  },
})
```

```typescript
// apps/chat-server/src/infra/logger.ts
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'cpf',
      'cnpj',
      'email',
      'phone',
      'password',
      'token',
      'req.headers.authorization',
    ],
    censor: '[REDACTED]',
  },
})
```

## Criterios de Aceite

- [ ] Pino redaction configurado em server e chat-server
- [ ] Log de request com CPF mostra `[REDACTED]`
- [ ] Authorization header redactado
- [ ] `pnpm build` passa
