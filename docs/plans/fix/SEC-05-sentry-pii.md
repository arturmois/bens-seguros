# SEC-05. Sentry beforeSend — Strip PII

> **Severidade:** HIGH | **Esforco:** P (30min) | **Prioridade:** Semana 1 | Quick Win

---

## Problema

Sentry configurado sem `beforeSend` hook. Error reports podem conter CPF, email, senhas em stack traces e request data.

## Arquivos

- `apps/web/sentry.client.config.ts`
- `apps/web/sentry.server.config.ts`
- `apps/server/src/app.ts` (Sentry init)

## Especificacao (SECURITY-SPEC S3)

Strip PII (cpf, email, phone, request body) antes de enviar ao Sentry.

## Correcao

```typescript
// Funcao reutilizavel
function stripPiiFromEvent(event: Sentry.Event): Sentry.Event {
  const sensitiveFields = [
    'cpf',
    'cnpj',
    'email',
    'phone',
    'password',
    'birthDate',
    'document',
  ]

  if (event.request?.data) {
    try {
      const data =
        typeof event.request.data === 'string'
          ? JSON.parse(event.request.data)
          : event.request.data

      for (const field of sensitiveFields) {
        if (data[field]) data[field] = '[REDACTED]'
      }
      event.request.data = JSON.stringify(data)
    } catch {
      // data nao e JSON, manter como esta
    }
  }

  if (event.request?.query_string) {
    event.request.query_string = '[REDACTED]'
  }

  if (event.user) {
    event.user = { id: event.user.id }
  }

  return event
}

// Aplicar em cada Sentry.init:
Sentry.init({
  dsn: '...',
  beforeSend: stripPiiFromEvent,
})
```

## Criterios de Aceite

- [ ] `beforeSend` configurado em todos os Sentry.init (web client, web server, server)
- [ ] Error com CPF no body envia `[REDACTED]` ao Sentry
- [ ] User info reduzido a apenas `id`
- [ ] Query strings redactadas
