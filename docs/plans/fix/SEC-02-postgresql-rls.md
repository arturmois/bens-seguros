# SEC-02. Row Level Security (RLS) PostgreSQL

> **Severidade:** CRITICO (seguranca) | **Esforco:** G (3-5 dias) | **Prioridade:** Mes 1

---

## Problema

Isolamento de tenant depende 100% de middleware + repository filters. Sem RLS, um bug em qualquer query vaza dados entre tenants. Unico ponto de falha.

## Especificacao

SECURITY-SPEC e ARCHITECTURE-DECISIONS exigem RLS como defense-in-depth.

## Implementacao

### Etapa 1: Prisma Middleware para SET current_tenant

```typescript
// packages/db/src/tenant-middleware.ts
import { Prisma } from '@prisma/client'

export function createTenantMiddleware(organizationId: string) {
  return Prisma.defineExtension({
    query: {
      $allOperations({ args, query }) {
        return prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `SET LOCAL app.current_tenant = '${organizationId}'`
          )
          return query(args)
        })
      },
    },
  })
}
```

### Etapa 2: SQL Migration — Criar Policies

```sql
-- Habilitar RLS em todas as tabelas com organizationId
ALTER TABLE "Client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Proposal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Policy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Claim" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Endorsement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Assistance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Policy padrao: tenant isolation
CREATE POLICY org_isolation_client ON "Client"
  USING ("organizationId" = current_setting('app.current_tenant', true));

CREATE POLICY org_isolation_proposal ON "Proposal"
  USING ("organizationId" = current_setting('app.current_tenant', true));

-- Repetir para cada tabela...

-- IMPORTANTE: app user nao e superuser (superuser bypassa RLS)
-- Verificar: SELECT rolsuper FROM pg_roles WHERE rolname = 'app_user';
```

### Etapa 3: DB User Restrito

```sql
-- Criar user sem DDL (SEC S15)
CREATE ROLE bens_app WITH LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE bens TO bens_app;
GRANT USAGE ON SCHEMA public TO bens_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO bens_app;
-- AuditLog: sem DELETE
REVOKE DELETE ON "AuditLog" FROM bens_app;
```

### Etapa 4: Integrar no Middleware Chain

```typescript
// apps/server/src/middlewares/tenant-middleware.ts
// Apos validar organizationId, configurar tenant no Prisma client:
request.prisma = prisma.$extends(createTenantMiddleware(organizationId))
```

## Riscos

- RLS com `current_setting('app.current_tenant', true)` retorna NULL se nao setado — garantir que middleware SEMPRE seta
- Prisma raw queries ($executeRaw) precisam do SET tambem
- Performance: SET LOCAL por transaction (minimo overhead)
- Migrations Prisma rodam como superuser (nao afetadas por RLS)

## Criterios de Aceite

- [ ] RLS habilitado em todas as tabelas com organizationId
- [ ] Policy `org_isolation_*` em cada tabela
- [ ] Middleware seta `app.current_tenant` antes de cada query
- [ ] Teste: query sem SET retorna 0 rows (nao dados de outro tenant)
- [ ] Teste: query com SET correto retorna apenas dados do tenant
- [ ] DB user sem DDL, sem DELETE em AuditLog
- [ ] `pnpm test` passa (testes ajustados para setar tenant)
