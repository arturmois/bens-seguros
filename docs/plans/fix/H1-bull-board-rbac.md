# H1. Bull Board sem RBAC

> **Severidade:** HIGH (seguranca) | **Esforco:** P (30min) | **Prioridade:** Semana 1

---

## Problema

Bull Board esta no escopo autenticado mas sem verificacao de role. Qualquer usuario autenticado (VIEWER, COMMERCIAL) pode acessar `/admin/queues` e manipular filas.

## Arquivos

- `apps/server/src/app.ts` linhas 99-103
- `apps/server/src/bull-board.ts`

## Impacto

Usuarios com role baixo podem pausar/limpar filas de notificacoes, policy-expiry e audit-archive.

## Correcao

```typescript
// apps/server/src/app.ts
app.register(async (scope) => {
  scope.addHook('preHandler', requireAbility('manage', 'all'))
  registerBullBoard(scope)
})
```

## Criterios de Aceite

- [ ] OWNER acessa `/admin/queues` normalmente
- [ ] ADMIN, MANAGER, COMMERCIAL, VIEWER recebem 403
- [ ] Teste manual com diferentes roles
