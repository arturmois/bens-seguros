# Technical Debt Batch 1 — Design Spec

**Data:** 2026-04-07
**Origem:** `CODE-REVIEW-REPORT.md` items P2-7, P2-2, P2-6
**Escopo:** 3 fixes de debito tecnico (ProposalChecklistItem RLS, testes endorsement/member, extrair accept-invitation)

---

## Fix 1: ProposalChecklistItem organizationId + RLS (P2-7)

**Problema:** `ProposalChecklistItem` nao tem campo `organizationId` nem RLS policy. Isolacao depende 100% do JOIN com Proposal. Uma query direta sem WHERE vazaria dados entre tenants.

**Solucao:**

**Migration:**

- Adicionar coluna `organizationId String` ao model ProposalChecklistItem
- Popular com dados existentes: `UPDATE "ProposalChecklistItem" SET "organizationId" = p."organizationId" FROM "Proposal" p WHERE p.id = "ProposalChecklistItem"."proposalId"`
- Tornar NOT NULL apos popular
- Adicionar relation `organization Organization @relation(fields: [organizationId], references: [id])`
- Adicionar index `@@index([organizationId, proposalId])`
- Adicionar RLS policy strict no `rls-policies.sql` (mesmo padrao das outras 12 tabelas strict)

**Repository:** Atualizar `packages/core/src/modules/proposal/infrastructure/prisma-checklist-repository.ts` para incluir `organizationId` em todos os WHERE clauses dos 5 metodos (createMany, findByProposal, findById, complete, getSummary).

**Mapper:** Atualizar mapper se necessario para incluir organizationId no toDomain/toPersistence.

**Sem testes novos** — data layer, verificado por migration + build + typecheck.

**Arquivos:**

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/rls-policies.sql`
- `packages/core/src/modules/proposal/infrastructure/prisma-checklist-repository.ts`

---

## Fix 2: Testes Endorsement Module (P2-2a)

**Problema:** 3 use cases (create, get, list) com zero specs.

**Solucao:** 3 spec files seguindo padrao de commission module (`createMockRepo` + test use case com Vitest).

**`create-endorsement.spec.ts`:**

- Happy path: `repo.create` chamado com dados corretos

**`get-endorsement.spec.ts`:**

- Happy path: retorna endorsement quando encontrado
- `EndorsementNotFoundError`: quando `repo.findById` retorna null

**`list-endorsements.spec.ts`:**

- Happy path: retorna lista com paginacao
- Filtro por `policyId`: verifica que filters sao passados ao repo
- Lista vazia: retorna `{ data: [], meta }` sem erro

**Mock pattern:** Seguir exatamente o padrao de `packages/core/src/modules/commission/application/create-commission.spec.ts` — mock repository com `vi.fn()`, instanciar use case com mock, assertions em chamadas e retornos.

**Arquivos:**

- Criar: `packages/core/src/modules/endorsement/application/create-endorsement.spec.ts`
- Criar: `packages/core/src/modules/endorsement/application/get-endorsement.spec.ts`
- Criar: `packages/core/src/modules/endorsement/application/list-endorsements.spec.ts`

---

## Fix 3: Testes Member Module (P2-2b)

**Problema:** 2 use cases (UpdateMemberRole, DeactivateMember) com zero specs. Estes tem logica de negocio real — role hierarchy, last owner protection, self-removal guard.

**Solucao:** 2 spec files com cobertura completa dos cenarios de erro.

**`update-member-role.spec.ts`** (6 cenarios):

- Happy path: atualiza role com sucesso
- `MemberNotFoundError`: member nao existe
- `SelfRemovalError`: caller tenta mudar proprio role
- `RoleHierarchyError`: caller com role menor/igual ao target
- `LastOwnerError`: demover o ultimo OWNER
- Verificar que `countByRole('OWNER')` e chamado quando target e OWNER

**`deactivate-member.spec.ts`** (5 cenarios):

- Happy path: desativa membro com sucesso
- `MemberNotFoundError`: member nao existe
- `SelfRemovalError`: caller tenta se remover
- `RoleHierarchyError`: caller sem hierarquia suficiente
- `LastOwnerError`: ultimo OWNER nao pode ser desativado

**Mock pattern:** Mesmo padrao de commission — `createMockRepo()` com todos os metodos do `MemberRepository` interface (findById, countByRole, updateRole, deactivate).

**Arquivos:**

- Criar: `packages/core/src/modules/member/application/update-member-role.spec.ts`
- Criar: `packages/core/src/modules/member/application/deactivate-member.spec.ts`

---

## Fix 4: Extrair accept-invitation para use case (P2-6)

**Problema:** `apps/server/src/routes/v1/invitations/accept-invitation.ts` tem 253 linhas com 188 linhas de business logic no handler. Mistura validacao, auth, Prisma direto e cookie forwarding. Viola "no business logic in routes" do CLAUDE.md e impede testes unitarios.

**Solucao:** Extrair logica de negocio pura para use case. Auth (signUp/signIn) e cookie handling ficam no handler (sao concerns HTTP acoplados ao Better Auth + Fastify request/reply).

**Nova estrutura:**

```
packages/core/src/modules/invitation/
├── application/
│   ├── accept-invitation.ts          # Use case
│   └── accept-invitation.spec.ts     # 5 cenarios de teste
├── domain/
│   ├── invitation-errors.ts          # 4 error classes
│   └── invitation-repository.ts      # Interface (findById, accept, createMemberAndAccept)
├── infrastructure/
│   └── prisma-invitation-repository.ts  # Implementacao Prisma
└── index.ts                          # Exports
```

**Use case `AcceptInvitation`:**

- Input: `{ invitationId, userId, organizationId }`
- Valida: invitation existe, nao expirada, nao aceita/cancelada
- Verifica: usuario nao e membro existente
- Transaction: cria member + marca invitation accepted
- Output: `{ member, invitation }`

**Erros:**

- `InvitationNotFoundError`
- `InvitationExpiredError`
- `InvitationAlreadyAcceptedError`
- `AlreadyMemberError`

**Handler atualizado fica responsavel por:**

- Auth (register/login via Better Auth API)
- Cookie forwarding
- Chamar use case `AcceptInvitation.execute()`
- Set active organization
- HTTP response

**Testes** (5 cenarios):

- Happy path: cria member + aceita invitation
- `InvitationNotFoundError`
- `InvitationExpiredError`
- `InvitationAlreadyAcceptedError`
- `AlreadyMemberError`

**Arquivos:**

- Criar: `packages/core/src/modules/invitation/domain/invitation-errors.ts`
- Criar: `packages/core/src/modules/invitation/domain/invitation-repository.ts`
- Criar: `packages/core/src/modules/invitation/application/accept-invitation.ts`
- Criar: `packages/core/src/modules/invitation/application/accept-invitation.spec.ts`
- Criar: `packages/core/src/modules/invitation/infrastructure/prisma-invitation-repository.ts`
- Criar: `packages/core/src/modules/invitation/index.ts`
- Modificar: `apps/server/src/routes/v1/invitations/accept-invitation.ts` (simplificar handler)
- Modificar: `apps/server/src/container-registrations.ts` (registrar novo repository no DI)

---

## Fora de Escopo

- Testes de integracao para `apps/server` (P2-1 — Ciclo 2, sessao separada)
- Testes E2E
- Refactoring de outros route handlers com business logic
- AuthService abstraction (complexidade desproporcional para este ciclo)
