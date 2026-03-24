# F11: Settings > Membros — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable team management in Settings — invite members by email, list members, change roles, remove members, manage pending invitations.

**Architecture:** Better Auth org plugin handles invitation create/accept flow. Prisma queries for listing and role changes (Light pattern, no DDD). CASL abilities for RBAC. React Query hooks for frontend data fetching.

**Tech Stack:** Fastify 5, Prisma 7, Better Auth 1.0, CASL, Zod, React 19, TanStack React Query 5, shadcn/ui, Sonner (toasts)

**Spec:** `docs/superpowers/specs/2026-03-24-settings-membros-design.md`

---

## File Structure

### Create

| File                                                                | Responsibility                              |
| ------------------------------------------------------------------- | ------------------------------------------- |
| `apps/server/src/schemas/member.schemas.ts`                         | Zod schemas for member/invitation endpoints |
| `apps/server/src/routes/v1/member-errors.ts`                        | Domain error classes (6 total)              |
| `apps/server/src/routes/v1/member-routes.ts`                        | 6 REST endpoints for members + invitations  |
| `apps/web/src/features/members/components/members-page.tsx`         | Main page with tabs                         |
| `apps/web/src/features/members/components/members-table.tsx`        | Member list table with actions              |
| `apps/web/src/features/members/components/invite-member-dialog.tsx` | Invitation form dialog                      |
| `apps/web/src/features/members/components/change-role-select.tsx`   | Inline role dropdown                        |
| `apps/web/src/features/members/components/pending-invitations.tsx`  | Pending invitations list                    |
| `apps/web/src/features/members/hooks/use-members.ts`                | React Query hooks (6 hooks)                 |
| `apps/web/src/features/members/lib/member-schemas.ts`               | Frontend Zod schemas                        |
| `apps/web/src/features/members/types.ts`                            | TypeScript interfaces                       |

### Modify

| File                                                            | Change                                                           |
| --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `packages/auth/src/abilities.ts`                                | Add 'Member' and 'Invitation' to Subject type + role permissions |
| `apps/server/src/app.ts`                                        | Register memberRoutes                                            |
| `apps/web/src/features/channels/components/settings-layout.tsx` | Enable "Membros" tab, render MembersPage                         |

---

## Task 1: RBAC — Add Member and Invitation subjects to CASL

**Files:**

- Modify: `packages/auth/src/abilities.ts`

- [ ] **Step 1: Add 'Member' and 'Invitation' to Subject type**

```typescript
// In packages/auth/src/abilities.ts
// Add to Subject union type:
export type Subject =
  | 'all'
  | 'User'
  | 'Organization'
  | 'Client'
  | 'Proposal'
  | 'Policy'
  | 'Claim'
  | 'Commission'
  | 'Endorsement'
  | 'Assistance'
  | 'Document'
  | 'AuditLog'
  | 'Notification'
  | 'Member'
  | 'Invitation'
```

- [ ] **Step 2: Add permissions in defineAbilitiesFor switch cases**

```typescript
// OWNER already has can('manage', 'all') — covers Member + Invitation

// ADMIN case — add after existing permissions:
can(['read', 'update', 'delete'], 'Member')
can(['create', 'read', 'delete'], 'Invitation')

// MANAGER case — add:
can('read', 'Member')
can('read', 'Invitation')

// COMMERCIAL case — add:
can('read', 'Member')

// VIEWER — no changes (no access to members)
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: All 5 apps pass

- [ ] **Step 4: Commit**

```bash
git add packages/auth/src/abilities.ts
git commit -m "feat(auth): add Member and Invitation subjects to CASL abilities"
```

---

## Task 2: Backend — Zod schemas and error classes

**Files:**

- Create: `apps/server/src/schemas/member.schemas.ts`
- Create: `apps/server/src/routes/v1/member-errors.ts`

- [ ] **Step 1: Create member schemas**

```typescript
// apps/server/src/schemas/member.schemas.ts
import { z } from 'zod'

export const createInvitationBodySchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER']),
})

export const changeMemberRoleBodySchema = z.object({
  role: z.enum(['ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER']),
})

export const listMembersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
})

export const listInvitationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
})
```

- [ ] **Step 2: Create error classes**

```typescript
// apps/server/src/routes/v1/member-errors.ts

export class MemberNotFoundError extends Error {
  readonly code = 'MEMBER_NOT_FOUND' as const
  constructor(id: string) {
    super(`Member ${id} not found`)
    this.name = 'MemberNotFoundError'
  }
}

export class LastOwnerError extends Error {
  readonly code = 'LAST_OWNER' as const
  constructor() {
    super('Cannot remove or demote the last owner')
    this.name = 'LastOwnerError'
  }
}

export class RoleHierarchyError extends Error {
  readonly code = 'ROLE_HIERARCHY_VIOLATION' as const
  constructor() {
    super('Cannot assign or manage a role equal to or higher than your own')
    this.name = 'RoleHierarchyError'
  }
}

export class DuplicateInvitationError extends Error {
  readonly code = 'DUPLICATE_INVITATION' as const
  constructor(email: string) {
    super(`User ${email} is already a member or has a pending invitation`)
    this.name = 'DuplicateInvitationError'
  }
}

export class InvitationNotFoundError extends Error {
  readonly code = 'INVITATION_NOT_FOUND' as const
  constructor(id: string) {
    super(`Invitation ${id} not found`)
    this.name = 'InvitationNotFoundError'
  }
}

export class SelfRemovalError extends Error {
  readonly code = 'SELF_REMOVAL' as const
  constructor() {
    super('Cannot remove or change your own role')
    this.name = 'SelfRemovalError'
  }
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck --filter @app/server`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/schemas/member.schemas.ts apps/server/src/routes/v1/member-errors.ts
git commit -m "feat(server): add member/invitation schemas and error classes"
```

---

## Task 3: Backend — Member routes (6 endpoints)

**Files:**

- Create: `apps/server/src/routes/v1/member-routes.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Create member-routes.ts with all 6 endpoints**

Reference patterns from `insurer-routes.ts`. The file should include:

1. `GET /api/v1/members` — list active members with User join (name, email)
2. `PUT /api/v1/members/:id/role` — change role with hierarchy + last-owner + self checks
3. `DELETE /api/v1/members/:id` — soft delete (active: false) with hierarchy + last-owner + self checks
4. `GET /api/v1/invitations` — list pending invitations
5. `POST /api/v1/invitations` — create invitation + send email
6. `DELETE /api/v1/invitations/:id` — revoke pending invitation

Key implementation details:

- Import `ROLE_HIERARCHY` from `@repo/auth/roles` for hierarchy checks
- Import `prisma` from `@repo/db` for direct queries (Light pattern)
- Use `requireAbility('read', 'Member')` for GET members, `requireAbility('update', 'Member')` for PUT, `requireAbility('delete', 'Member')` for DELETE member, `requireAbility('create', 'Invitation')` for POST invitation, `requireAbility('delete', 'Invitation')` for DELETE invitation
- Use `idParamSchema` from `../../schemas/client.schemas.js` for :id param validation
- Call `auditCreate`, `auditUpdate`, `auditDelete` from `../../services/audit-logger.js`
- GET members: `prisma.member.findMany({ where: { organizationId, active: true }, include: { user: { select: { name: true, email: true } } } })`
- Invitation email: use Resend email provider from `@repo/core` with existing invitation template
- Invitation expiry: `new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)`
- Error handler function `handleMemberError` mapping error classes to HTTP status codes

- [ ] **Step 2: Register routes in app.ts**

```typescript
// In apps/server/src/app.ts, add import:
import { memberRoutes } from './routes/v1/member-routes.js'

// In the authenticated scope, add:
app.register(memberRoutes)
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck --filter @app/server`
Expected: PASS

- [ ] **Step 4: Test manually with curl**

```bash
# List members
curl -s http://localhost:3001/api/v1/members -H "Cookie: ..." | jq .

# Create invitation
curl -s -X POST http://localhost:3001/api/v1/invitations \
  -H "Content-Type: application/json" \
  -H "Cookie: ..." \
  -d '{"email":"test@example.com","role":"COMMERCIAL"}' | jq .
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/src/routes/v1/member-routes.ts apps/server/src/app.ts
git commit -m "feat(server): add member management routes (list, invite, change role, remove, revoke)"
```

---

## Task 4: Frontend — Types and React Query hooks

**Files:**

- Create: `apps/web/src/features/members/types.ts`
- Create: `apps/web/src/features/members/lib/member-schemas.ts`
- Create: `apps/web/src/features/members/hooks/use-members.ts`

- [ ] **Step 1: Create types**

```typescript
// apps/web/src/features/members/types.ts
import type { Role } from '@repo/auth/roles'

export interface MemberData {
  readonly id: string
  readonly userId: string
  readonly name: string
  readonly email: string
  readonly role: Role
  readonly active: boolean
  readonly createdAt: string
}

export interface InvitationData {
  readonly id: string
  readonly email: string
  readonly role: Role
  readonly status: string
  readonly expiresAt: string
  readonly invitedBy: string
  readonly createdAt: string
}
```

- [ ] **Step 2: Create frontend schemas**

```typescript
// apps/web/src/features/members/lib/member-schemas.ts
import { z } from 'zod'

export const inviteMemberSchema = z.object({
  email: z.string().email('Email invalido'),
  role: z.enum(['ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'], {
    required_error: 'Selecione um cargo',
  }),
})

export type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>
```

- [ ] **Step 3: Create React Query hooks**

Follow `use-ai-agents.ts` pattern. Create 6 hooks:

- `useMembers()` — GET /api/v1/members, staleTime 60_000
- `useInvitations()` — GET /api/v1/invitations, staleTime 60_000
- `useInviteMember()` — POST /api/v1/invitations, invalidate both keys, toast success/error
- `useChangeMemberRole()` — PUT /api/v1/members/:id/role, invalidate MEMBERS_KEY, toast
- `useRemoveMember()` — DELETE /api/v1/members/:id, invalidate MEMBERS_KEY, toast
- `useRevokeInvitation()` — DELETE /api/v1/invitations/:id, invalidate INVITATIONS_KEY, toast

Use `api` from `@/lib/api-client` (not chatApi — members are on the main server).

- [ ] **Step 4: Run typecheck**

Run: `pnpm typecheck --filter @app/web`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/members/
git commit -m "feat(web): add member types, schemas, and React Query hooks"
```

---

## Task 5: Frontend — MembersPage component

**Files:**

- Create: `apps/web/src/features/members/components/members-page.tsx`

- [ ] **Step 1: Create members-page.tsx**

Follow `ai-agents-page.tsx` pattern. Include:

- Header: "Membros da Equipe" + "Convidar" button (visible only for OWNER/ADMIN)
- Two tabs: "Membros (N)" and "Convites Pendentes (N)"
- Tab visibility: "Convites" only for OWNER/ADMIN
- Render `MembersTable` or `PendingInvitations` based on active tab
- State for invite dialog open/close
- Get current user role from `useSession()` via `@/lib/auth-client`
- Pass `canManage` boolean to children

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/members/components/members-page.tsx
git commit -m "feat(web): add MembersPage component with tabs"
```

---

## Task 6: Frontend — MembersTable component

**Files:**

- Create: `apps/web/src/features/members/components/members-table.tsx`

- [ ] **Step 1: Create members-table.tsx**

Include:

- Columns: Avatar (initials from name), Name, Email, Role, Actions
- 4 UI states: loading (skeleton), error (retry button), empty ("Convide sua equipe!"), success (table)
- Role column: `ChangeRoleSelect` inline if canManage and not self and not OWNER target
- Actions column: remove button with confirmation dialog if canManage and not self and not OWNER target
- Role hierarchy check: only show roles lower than caller in dropdown
- Avatar: 2-letter initials with colored background
- Use `useRemoveMember()` hook for deletion

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/members/components/members-table.tsx
git commit -m "feat(web): add MembersTable component with 4 UI states"
```

---

## Task 7: Frontend — InviteMemberDialog component

**Files:**

- Create: `apps/web/src/features/members/components/invite-member-dialog.tsx`

- [ ] **Step 1: Create invite-member-dialog.tsx**

Follow `ai-agent-form-sheet.tsx` pattern. Include:

- Sheet dialog with form: email input + role select
- React Hook Form + zodResolver with `inviteMemberSchema`
- Role select: only roles lower than caller's role (use ROLE_HIERARCHY)
- Submit: call `useInviteMember()` mutation
- onSuccess: close dialog, form.reset()
- Loading state in submit button (Loader2 spinner)
- Error handling: duplicate email shows specific toast

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/members/components/invite-member-dialog.tsx
git commit -m "feat(web): add InviteMemberDialog with form validation"
```

---

## Task 8: Frontend — ChangeRoleSelect and PendingInvitations

**Files:**

- Create: `apps/web/src/features/members/components/change-role-select.tsx`
- Create: `apps/web/src/features/members/components/pending-invitations.tsx`

- [ ] **Step 1: Create change-role-select.tsx**

- Select dropdown with available roles (filtered by caller hierarchy)
- onChange: call `useChangeMemberRole()` mutation
- Disabled state while mutation is pending

- [ ] **Step 2: Create pending-invitations.tsx**

- List of pending invitations: email, role, date sent, days until expiry
- "Revogar" button per invitation with confirmation
- Empty state: "Nenhum convite pendente"
- Loading/error states

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/members/components/change-role-select.tsx apps/web/src/features/members/components/pending-invitations.tsx
git commit -m "feat(web): add ChangeRoleSelect and PendingInvitations components"
```

---

## Task 9: Integration — Enable Membros tab in Settings

**Files:**

- Modify: `apps/web/src/features/channels/components/settings-layout.tsx`

- [ ] **Step 1: Enable the Membros tab**

In `SETTINGS_SECTIONS` array, change the membros entry:

```typescript
// FROM:
{ id: 'membros', label: 'Membros', icon: Users, disabled: true, href: '#' },
// TO:
{ id: 'membros', label: 'Membros', icon: Users, disabled: false, href: '/settings?section=membros' },
```

- [ ] **Step 2: Render MembersPage in settings page**

In `apps/web/src/app/(dashboard)/settings/page.tsx`, add conditional rendering for `section === 'membros'`:

```typescript
import { MembersPage } from '@/features/members/components/members-page'

// In the component:
if (section === 'membros') return <SettingsLayout activeSection={section}><MembersPage /></SettingsLayout>
```

- [ ] **Step 3: Run typecheck and verify**

Run: `pnpm typecheck`
Expected: All 5 apps pass

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/channels/components/settings-layout.tsx apps/web/src/app/\(dashboard\)/settings/page.tsx
git commit -m "feat(web): enable Membros tab in Settings and render MembersPage"
```

---

## Task 10: Verification — Typecheck, lint, and manual testing

- [ ] **Step 1: Run full quality gates**

```bash
pnpm typecheck    # All 5 apps pass
pnpm lint         # Zero errors
pnpm build        # Successful build
```

- [ ] **Step 2: Manual testing checklist**

1. Navigate to Settings > Membros — tab is active, page loads
2. Members table shows current user (OWNER)
3. Click "Convidar" — dialog opens with email + role form
4. Submit invalid email — validation error shown
5. Submit valid email + role — invitation created, toast success
6. Switch to "Convites Pendentes" tab — invitation shown
7. Click "Revogar" on invitation — confirmation, then revoked
8. If second member exists: change role via dropdown — toast success
9. If second member exists: remove member — confirmation, then removed
10. Login as COMMERCIAL user — can see members but no action buttons

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during manual testing"
```
