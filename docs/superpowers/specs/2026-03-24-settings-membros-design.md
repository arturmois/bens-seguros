# F11: Settings > Membros — Design Spec

> Feature: gestao de membros da organizacao (convidar, alterar role, remover)
> Status: Aprovado
> Data: 2026-03-24

---

## 1. Contexto

Corretoras tem ~10 corretores. Sem gestao de membros, o sistema e single-user. Esta feature desbloqueia uso real em equipe.

### Decisoes de design

- **Soft delete** para remocao de membros (`active: false`). Dados vinculados (propostas, comissoes) permanecem intactos.
- **Convites expiram em 7 dias.**
- **OWNER + ADMIN** podem convidar/remover/alterar roles. MANAGER e abaixo apenas visualizam.
- **Abordagem:** Better Auth org plugin para invitation create/accept + Prisma direto para queries de listagem e role changes (padrao Light, sem DDD completo).

### Infraestrutura ja existente

- Prisma models: `Member` (com campo `active`) e `Invitation` (com `expiresAt`)
- Better Auth org plugin com `acceptInvitation()` funcional
- Accept-invitation page end-to-end funcionando (`/accept-invitation?id=...`)
- Email template de convite pronto (`packages/core/src/modules/notification/infrastructure/email-templates/invitation.ts`)
- Resend email provider integrado
- Settings layout com tab "Membros" (atualmente `disabled: true`)
- Index `@@index([organizationId, role])` ja existe no Member
- `ROLE_HIERARCHY` ja existe em `packages/auth/src/roles.ts` (OWNER:5, ADMIN:4, MANAGER:3, COMMERCIAL:2, VIEWER:1)
- `isRoleAtLeast()` ja existe em `packages/auth/src/roles.ts`
- `idParamSchema` ja existe em `apps/server/src/schemas/shared.ts`
- `useSession()` no frontend retorna `session.member.role` para role do usuario atual

---

## 2. Backend API

### 2.1 Rotas

Arquivo: `apps/server/src/routes/v1/member-routes.ts`

| Metodo | Rota                       | Acao                           | RBAC                              |
| ------ | -------------------------- | ------------------------------ | --------------------------------- |
| GET    | `/api/v1/members`          | Listar membros ativos da org   | OWNER, ADMIN, MANAGER, COMMERCIAL |
| PUT    | `/api/v1/members/:id/role` | Alterar role de membro         | OWNER, ADMIN                      |
| DELETE | `/api/v1/members/:id`      | Desativar membro (soft delete) | OWNER, ADMIN                      |
| GET    | `/api/v1/invitations`      | Listar convites pendentes      | OWNER, ADMIN                      |
| POST   | `/api/v1/invitations`      | Criar convite + enviar email   | OWNER, ADMIN                      |
| DELETE | `/api/v1/invitations/:id`  | Revogar convite pendente       | OWNER, ADMIN                      |

Nota: VIEWER nao tem acesso a listagem de membros — intencional, pois VIEWER e role de consulta limitada.

### 2.2 Schemas (Zod)

Arquivo: `apps/server/src/schemas/member.schemas.ts`

```typescript
// POST /api/v1/invitations
const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER']),
})

// PUT /api/v1/members/:id/role
const changeMemberRoleSchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER']),
})

// GET /api/v1/members (query)
const listMembersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
})

// GET /api/v1/invitations (query)
const listInvitationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
})
```

Usar `idParamSchema` de `apps/server/src/schemas/shared.ts` para validacao de `:id` em PUT e DELETE.

Nota: OWNER nao aparece nos enums de input — nao e possivel atribuir OWNER via API. Transferencia de ownership e um fluxo separado (futuro).

### 2.3 Validacoes de negocio

Implementadas diretamente nos handlers (padrao Light):

1. **Last OWNER protection** — `prisma.member.count({ where: { organizationId, role: 'OWNER', active: true } })`. Se count === 1, rejeitar alteracao/remocao.
2. **Role hierarchy (role change)** — Usar `ROLE_HIERARCHY` de `@repo/auth/roles` (OWNER:5 > ADMIN:4 > ... > VIEWER:1). Caller so pode atribuir roles com valor menor que o proprio: `ROLE_HIERARCHY[callerRole] > ROLE_HIERARCHY[targetRole]`.
3. **Role hierarchy (remove)** — Caller so pode remover membros com role inferior: `ROLE_HIERARCHY[callerRole] > ROLE_HIERARCHY[targetMember.role]`.
4. **Self-protection** — `request.user.id !== targetMember.userId` para DELETE e PUT role.
5. **Email duplicado** — Checar se email ja e membro ativo OU ja tem convite pending na org.
6. **Convite expirado** — `expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)`.

### 2.4 Error classes

Arquivo: `apps/server/src/routes/v1/member-errors.ts`

| Error Class                | HTTP | Quando                                           |
| -------------------------- | ---- | ------------------------------------------------ |
| `MemberNotFoundError`      | 404  | Member ID nao existe ou inactive                 |
| `LastOwnerError`           | 422  | Tentativa de remover/rebaixar ultimo OWNER       |
| `RoleHierarchyError`       | 403  | Tentativa de atribuir/remover role >= ao proprio |
| `DuplicateInvitationError` | 409  | Email ja e membro ou ja tem convite pending      |
| `InvitationNotFoundError`  | 404  | Invitation ID nao existe                         |
| `SelfRemovalError`         | 422  | Tentativa de remover/alterar a si mesmo          |

### 2.5 Fluxo de convite

```
POST /api/v1/invitations { email, role }
  1. Validar Zod schema
  2. Checar RBAC (OWNER/ADMIN via requireAbility)
  3. Checar email duplicado (membro ativo ou convite pending)
  4. Checar role hierarchy (ROLE_HIERARCHY[caller] > ROLE_HIERARCHY[invited])
  5. Criar Invitation via Better Auth server API (auth.api.createInvitation)
     — Garante compatibilidade com accept-invitation flow
     — Better Auth gerencia status values ('pending', 'accepted', 'canceled')
     — Campos: organizationId, email, role, expiresAt (+7d), invitedBy
  6. Enviar email via Resend (template ja existente)
  7. Audit log: auditCreate({ entityType: 'Invitation', ... })
  8. Retornar { success: true, data: invitation }
```

O accept-invitation flow ja funciona end-to-end via Better Auth — nao precisa de mudancas.

### 2.6 Audit logging

Todos os endpoints de mutacao devem chamar audit logger:

- `POST /api/v1/invitations` → `auditCreate({ entityType: 'Invitation', entityId })`
- `PUT /api/v1/members/:id/role` → `auditUpdate({ entityType: 'Member', entityId, before, after })`
- `DELETE /api/v1/members/:id` → `auditDelete({ entityType: 'Member', entityId })`
- `DELETE /api/v1/invitations/:id` → `auditDelete({ entityType: 'Invitation', entityId })`

### 2.7 Resposta padrao

```typescript
// GET /api/v1/members
{
  success: true,
  data: [
    {
      id: "cuid...",
      userId: "cuid...",
      name: "Maria Santos",
      email: "maria@corretora.com",
      role: "ADMIN",
      active: true,
      createdAt: "2026-03-01T...",
    }
  ],
  meta: { total: 3, nextCursor: null }
}
```

Nota: `name` e `email` vem do join com User. Nao expor campos sensiveis extras.

---

## 3. RBAC

### 3.1 Atualizar CASL abilities

Arquivo: `packages/auth/src/abilities.ts`

Adicionar `'Member'` e `'Invitation'` ao tipo `Subject`.

| Role       | Member               | Invitation           |
| ---------- | -------------------- | -------------------- |
| OWNER      | manage               | manage               |
| ADMIN      | read, update, delete | create, read, delete |
| MANAGER    | read                 | read                 |
| COMMERCIAL | read                 | —                    |
| VIEWER     | —                    | —                    |

Nota: ADMIN nao tem `create` em Member (membros sao criados via accept-invitation, nao diretamente). ADMIN tem `create` em Invitation (pode convidar).

### 3.2 Role hierarchy

Usar a constante e funcao ja existente em `packages/auth/src/roles.ts`:

```typescript
// JA EXISTE — nao criar nova
import { ROLE_HIERARCHY, isRoleAtLeast } from '@repo/auth/roles'

// ROLE_HIERARCHY = { OWNER: 5, ADMIN: 4, MANAGER: 3, COMMERCIAL: 2, VIEWER: 1 }

// Para validar se caller pode atribuir/remover target:
function canManageRole(callerRole: Role, targetRole: Role): boolean {
  return ROLE_HIERARCHY[callerRole] > ROLE_HIERARCHY[targetRole]
}
```

---

## 4. Frontend

### 4.1 Estrutura de arquivos

Criar `features/members/` como feature directory standalone (padrao do projeto — channels, proposals, clients sao top-level):

```
apps/web/src/features/members/
  components/
    members-page.tsx              (~120 linhas — layout + tabs)
    members-table.tsx             (~150 linhas — tabela com acoes)
    invite-member-dialog.tsx      (~120 linhas — form email + role)
    change-role-select.tsx        (~80 linhas — dropdown inline)
    pending-invitations.tsx       (~100 linhas — lista com revogar)
  hooks/
    use-members.ts                (~80 linhas — queries + mutations)
  lib/
    member-schemas.ts             (~20 linhas — Zod schemas)
```

Nota: `settings-layout.tsx` permanece em `features/channels/` — nao mover nesta feature. Apenas importar `MembersPage` de `features/members/`.

### 4.2 Layout da pagina

```
┌─────────────────────────────────────────┐
│ Membros da Equipe              [Convidar]│
├─────────────────────────────────────────┤
│ Tab: Membros (3) | Convites Pendentes (1)│
├─────────────────────────────────────────┤
│ Avatar | Nome    | Email   | Role  | ... │
│   QT   | QA Test | qa@...  | OWNER |  —  │
│   MS   | Maria S | ms@...  | ADMIN | ▼ ✕ │
│   CL   | Carlos  | cl@...  | COMM. | ▼ ✕ │
└─────────────────────────────────────────┘
```

- OWNER nao tem acoes (nao pode ser removido/alterado)
- Role do proprio usuario nao tem acoes (self-protection)
- MANAGER/COMMERCIAL veem a tabela mas sem botoes de acao

### 4.3 Acesso a role do usuario atual

Usar `useSession()` do Better Auth client (ja disponivel via `@/lib/auth-client`). O hook retorna `session.data?.member?.role` que indica a role do usuario na org ativa. Usar isso para:

- Mostrar/esconder botao "Convidar"
- Mostrar/esconder acoes na tabela (dropdown role, botao remover)
- Filtrar roles disponiveis no dropdown (hierarchy)

### 4.4 Componentes

**members-page.tsx**

- Header com titulo + botao "Convidar" (visivel apenas para OWNER/ADMIN via `canManage`)
- Tabs: "Membros" e "Convites Pendentes" (tab Convites visivel apenas para OWNER/ADMIN)
- Renderiza MembersTable ou PendingInvitations conforme tab ativa

**members-table.tsx**

- Colunas: Avatar (iniciais), Nome, Email, Role, Acoes
- Role: `change-role-select.tsx` inline (OWNER/ADMIN veem dropdown, outros veem texto)
- Acoes: botao remover com confirmation dialog
- 4 estados UI: empty, loading, error, success

**invite-member-dialog.tsx**

- Dialog (Sheet) com form: email input + role select
- Zod validation: email valido, role obrigatorio
- Role select filtrado por hierarchy (ADMIN nao pode convidar OWNER)
- Submit: POST /api/v1/invitations → toast sucesso → fecha dialog → invalida cache

**change-role-select.tsx**

- Select dropdown com roles disponiveis (filtrado por hierarchy do caller)
- onChange: PUT /api/v1/members/:id/role → toast sucesso → invalida cache

**pending-invitations.tsx**

- Lista de convites: email, role convidado, data envio, dias ate expirar
- Botao "Revogar" por convite → confirmation → DELETE /api/v1/invitations/:id → toast → invalida cache
- Empty state: "Nenhum convite pendente"

### 4.5 Hooks (React Query)

```typescript
// use-members.ts
const MEMBERS_KEY = ['members']
const INVITATIONS_KEY = ['invitations']

useMembers(filters) // GET /api/v1/members
useInvitations() // GET /api/v1/invitations
useInviteMember() // POST /api/v1/invitations → invalidate both
useChangeMemberRole() // PUT /api/v1/members/:id/role → invalidate MEMBERS_KEY
useRemoveMember() // DELETE /api/v1/members/:id → invalidate MEMBERS_KEY
useRevokeInvitation() // DELETE /api/v1/invitations/:id → invalidate INVITATIONS_KEY
```

### 4.6 Habilitar tab Membros

Em `settings-layout.tsx` (em `features/channels/components/`), alterar `disabled: true` para `disabled: false` na secao "membros" e renderizar `MembersPage` quando `section === 'membros'`.

---

## 5. Integracao com Settings existente

A pagina Settings ja tem o layout com sidebar. Apenas:

1. Habilitar tab "Membros" em settings-layout.tsx
2. Importar e renderizar `MembersPage` de `features/members/`
3. Nao alterar nada nas tabs Canais e Agentes IA

---

## 6. Fora de escopo (YAGNI)

- Reenviar convite (revogar + criar novo e suficiente)
- Bulk invite (CSV de emails)
- Transferencia de dados ao remover membro
- Notificacao in-app quando convite e aceito
- Permissoes granulares por modulo
- Transferencia de ownership (fluxo separado futuro)
- Tab "Organizacao" (F12, separado)
- Mover settings-layout.tsx para features/settings/ (refactor separado)
