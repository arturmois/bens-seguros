# SEC-07. Cache-Control Headers

> **Severidade:** MEDIO | **Esforco:** P (15min) | **Prioridade:** Semana 1 | Quick Win

---

## Problema

Nenhum header `Cache-Control` nas rotas API. PII pode ser cacheado por proxies, CDN ou browser.

## Especificacao (SECURITY-SPEC S1)

`no-store, no-cache, must-revalidate` em todas rotas `/api/*`.

## Correcao

```typescript
// apps/server/src/app.ts
app.addHook('onSend', (request, reply, payload, done) => {
  if (request.url.startsWith('/api/')) {
    reply.header(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, max-age=0'
    )
    reply.header('Pragma', 'no-cache')
  }
  done(null, payload)
})
```

## Criterios de Aceite

- [ ] Todas respostas `/api/*` incluem `Cache-Control: no-store`
- [ ] Verificar via DevTools > Network > Response Headers
- [ ] Health check e static assets NAO afetados
