# SEC-08. Presigned URL Expiry — 15 Minutos

> **Severidade:** MEDIO | **Esforco:** P (5min) | **Prioridade:** Semana 1 | Quick Win

---

## Problema

Presigned URLs expiram em 3600s (1 hora). Spec exige 900s (15 minutos).

## Arquivo

`packages/core/src/modules/document/infrastructure/r2-storage-provider.ts` linha 14

## Correcao

```typescript
// ANTES:
const DEFAULT_SIGNED_URL_EXPIRY = 3600

// DEPOIS:
const DEFAULT_SIGNED_URL_EXPIRY = 900 // 15 minutos (SECURITY-SPEC S9)
```

## Criterios de Aceite

- [ ] Presigned URLs expiram em 15 minutos
- [ ] Frontend continua funcionando (download/visualizacao de documentos)
- [ ] Testar: URL apos 16 minutos retorna 403
