# H3. Empty Catch Handlers no Audit Logger

> **Severidade:** HIGH (observabilidade) | **Esforco:** P (30min) | **Prioridade:** Semana 1

---

## Problema

5 funcoes fire-and-forget usam `.catch(() => {})`, engolindo erros silenciosamente. Viola CLAUDE.md: "NO empty catch blocks — handle or rethrow with context".

## Arquivo

`apps/server/src/services/audit-logger.ts` linhas 48, 58, 67, 76, 85

## Codigo Atual

```typescript
export function auditCreate(ctx: AuditContext): void {
  logCreate({...}).catch(() => {})  // erro silenciado
}
```

## Correcao

```typescript
export function auditCreate(ctx: AuditContext): void {
  logCreate({...}).catch((err) => {
    logger.warn({ err, ctx: 'audit-create' }, 'Audit logging failed (non-critical)')
  })
}
```

Aplicar o mesmo padrao em: `auditCreate`, `auditUpdate`, `auditDelete`, `auditApprove`, `auditReject`.

## Criterios de Aceite

- [ ] Zero `.catch(() => {})` no arquivo
- [ ] Todos os catches logam com `logger.warn`
- [ ] `pnpm lint` passa
