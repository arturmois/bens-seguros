# H2. Bug no Count de Audit Log

> **Severidade:** HIGH (bug funcional) | **Esforco:** P (30min) | **Prioridade:** Semana 1

---

## Problema

Total count da paginacao ignora os filtros aplicados (entityType, action, userId, dateFrom, dateTo).

## Arquivo

`apps/server/src/routes/v1/audit-log-routes.ts` linha 42

## Codigo Atual

```typescript
// ERRADO: count ignora filtros
prisma.auditLog.count({ where: { organizationId: orgId } })
```

## Correcao

```typescript
// CORRETO: mesma clausula where do findMany
prisma.auditLog.count({ where })
```

## Impacto

Paginacao mostra total incorreto quando filtros estao ativos. Ex: filtrar por "Cliente" mostra "150 registros" quando ha 3 do tipo Cliente.

## Criterios de Aceite

- [ ] Count reflete filtros aplicados
- [ ] Paginacao funciona corretamente com filtros
- [ ] Sem filtro, count mostra total real
