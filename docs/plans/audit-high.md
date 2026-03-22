# Auditoria de Produção — HIGH

> Itens que devem ser corrigidos na **primeira semana** após o lançamento.
> Data da auditoria: 22/03/2026

---

## H1. Bull Board sem RBAC

**Severidade:** HIGH (segurança)
**Arquivo:** `apps/server/src/app.ts` linhas 99-103
**Arquivo auxiliar:** `apps/server/src/bull-board.ts`

**Problema:**
O Bull Board está registrado dentro do escopo autenticado (`authMiddleware`), mas sem verificação de role. Qualquer usuário autenticado (incluindo VIEWER e COMMERCIAL) pode acessar `/admin/queues` e manipular filas (pausar, limpar, retry jobs).

**Impacto:** Usuários com role baixo podem interferir em jobs de notificações, policy-expiry e audit-archive.

**Correção:**
Adicionar `requireAbility('manage', 'all')` como preHandler no registro do Bull Board:

```typescript
// apps/server/src/app.ts
app.register(async (scope) => {
  scope.addHook('preHandler', requireAbility('manage', 'all'))
  registerBullBoard(scope)
})
```

---

## H2. Bug no count de Audit Log

**Severidade:** HIGH (bug funcional)
**Arquivo:** `apps/server/src/routes/v1/audit-log-routes.ts` linha 42

**Problema:**
O total count da paginação ignora os filtros aplicados (entityType, action, userId, dateFrom, dateTo):

```typescript
// ATUAL (errado):
prisma.auditLog.count({ where: { organizationId: orgId } })

// CORRETO:
prisma.auditLog.count({ where }) // mesma cláusula where do findMany
```

**Impacto:** A paginação mostra total incorreto quando filtros estão ativos. Ex: filtrar por "Cliente" mostra "4 registros" quando na verdade há apenas 1 do tipo Cliente.

---

## H3. Empty catch handlers no audit logger

**Severidade:** HIGH (observabilidade)
**Arquivo:** `apps/server/src/services/audit-logger.ts` linhas 48, 58, 67, 76, 85

**Problema:**
5 funções fire-and-forget usam `.catch(() => {})`, engolindo erros silenciosamente:

```typescript
export function auditCreate(ctx: AuditContext): void {
  logCreate({...}).catch(() => {})  // ❌ erro silenciado
}
```

**Impacto:** Se `toJson()` ou `extractMeta()` falharem antes de chegar ao `logAudit` (que já tem try/catch com Pino), o erro some sem rastro.

**Correção:**

```typescript
export function auditCreate(ctx: AuditContext): void {
  logCreate({...}).catch((err) => {
    logger.warn({ err, ctx: 'audit-create' }, 'Audit logging failed (non-critical)')
  })
}
```

Aplicar o mesmo padrão nas 5 funções: `auditCreate`, `auditUpdate`, `auditDelete`, `auditApprove`, `auditReject`.

---

## H4. Cobertura de testes insuficiente em módulos light

**Severidade:** HIGH (qualidade)
**Diretório:** `packages/core/src/modules/`

**Problema:**
Apenas os módulos DDD Full têm testes unitários:

- ✅ Proposal: 3 arquivos de teste
- ✅ Commission: 4 arquivos de teste
- ❌ Client: 0 testes (5 use cases)
- ❌ Policy: 0 testes (5 use cases)
- ❌ Claim: 0 testes (5 use cases)
- ❌ Assistance: 0 testes (4 use cases)
- ❌ Document: 0 testes (4 use cases)
- ❌ Endorsement: 0 testes (3 use cases)
- ❌ Insurer: 0 testes (2 use cases)
- ❌ Notification: 0 testes (4 use cases)

**Total:** ~40 use cases sem cobertura.

**Impacto:** Risco de regressão em módulos mais simples. Padrão de mock e AAA já existe nos testes de Proposal — basta replicar.

**Correção:**
Criar testes unitários seguindo o padrão de `advance-proposal-stage.spec.ts`:

```typescript
function createMockRepo(entity: Entity | null): EntityRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(entity),
    findMany: vi.fn(),
  }
}
```

**Meta:** 80%+ cobertura em DDD Full, 50%+ em Light.

---

## H5. Sidebar expandida por default no mobile

**Severidade:** HIGH (UX)
**Arquivo:** `apps/web/src/components/ui/sidebar.tsx` ou componente de layout
**Evidência:** Screenshot `qa-03-mobile-375px.png`

**Problema:**
No primeiro load em viewport < 768px (mobile), a sidebar inicia expandida ocupando ~70% da tela. O conteúdo principal fica praticamente invisível. O usuário precisa manualmente clicar em "Fechar menu lateral" para ver o dashboard.

**Impacto:** Primeira impressão ruim em dispositivos móveis. Usuários mobile são a maioria no mercado brasileiro de corretores.

**Correção:**
Inicializar o estado da sidebar como colapsada quando `window.innerWidth < 768`:

```typescript
const [isOpen, setIsOpen] = useState(() => {
  if (typeof window === 'undefined') return true
  return window.innerWidth >= 768
})
```

Ou usar o hook `useMediaQuery` para controlar o estado inicial.
