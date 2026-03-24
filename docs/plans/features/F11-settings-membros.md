# F11. Settings > Membros (Gestao de Equipe)

> **Esforco:** M (3-5 dias) | **Impacto:** Bloqueante para producao | **Prioridade:** Semana 2

---

## Descricao

Convidar/remover membros da organizacao, alterar roles. Essencial para qualquer corretora com equipe (~10 corretores).

## Por Que

Owner nao pode adicionar membros da equipe. Settings > Membros esta marcado "Em Breve". Sem isso, sistema e single-user.

## Problema que Resolve

Corretora nao consegue usar o sistema em equipe. Bloqueante para adocao real.

## Implementacao

### Backend

#### Rotas

```typescript
// apps/server/src/routes/v1/member-routes.ts

GET    /api/v1/members                  // Listar membros da org
POST   /api/v1/invitations              // Convidar por email
PUT    /api/v1/members/:id/role         // Alterar role
DELETE /api/v1/members/:id              // Remover membro
DELETE /api/v1/invitations/:id          // Revogar convite pendente
GET    /api/v1/invitations              // Listar convites pendentes
```

#### RBAC

```typescript
// Apenas OWNER e ADMIN podem gerenciar membros
requireAbility('manage', 'Member')

// Regras adicionais:
// - OWNER nao pode ser removido
// - Ultimo OWNER nao pode mudar role
// - Nao pode atribuir role superior ao proprio
```

#### Use Cases

```typescript
// packages/core/src/modules/member/application/
invite - member.ts // Cria Invitation + envia email (Resend)
change - member - role.ts // Altera role com validacoes
remove - member.ts // Remove membro (soft delete?)
revoke - invitation.ts // Cancela convite pendente
list - members.ts // Lista membros com role e status
list - invitations.ts // Lista convites pendentes
```

#### Email de Convite

```typescript
// Template React Email
<InvitationEmail
  orgName="Corretora ABC"
  inviterName="João (Owner)"
  role="COMMERCIAL"
  acceptUrl="https://app.bensseg.com/accept-invitation?token=xxx"
/>
```

### Frontend

#### Pagina Settings > Membros

```
features/settings/components/members/
  members-page.tsx           (~150 linhas — layout + tabs)
  members-table.tsx          (~120 linhas — tabela de membros)
  invite-member-dialog.tsx   (~100 linhas — form email + role)
  change-role-dialog.tsx     (~80 linhas — select de role)
  remove-member-dialog.tsx   (~60 linhas — confirmacao)
  pending-invitations.tsx    (~80 linhas — lista de convites)
```

#### Layout

```
┌─────────────────────────────────────┐
│ Membros                    [Convidar]│
├─────────────────────────────────────┤
│ Tab: Membros | Convites Pendentes   │
├─────────────────────────────────────┤
│ Nome    | Email  | Role   | Acoes   │
│ João    | j@...  | OWNER  | —       │
│ Maria   | m@...  | ADMIN  | [▼][✕]  │
│ Carlos  | c@...  | COMM.  | [▼][✕]  │
└─────────────────────────────────────┘
```

#### Estados UI

1. **Empty:** "Nenhum membro alem de voce. Convide sua equipe!"
2. **Loading:** Skeleton table
3. **Error:** Mensagem + retry
4. **Success:** Tabela com membros

### Fluxo de Convite

1. Owner clica "Convidar"
2. Dialog: email + role selector
3. Backend cria `Invitation` + envia email
4. Convidado recebe email com link
5. Link direciona para `/accept-invitation?token=xxx`
6. Pagina de aceite (ja existe no onboarding)
7. Membro adicionado com role definido

## Pre-requisitos

- Better Auth invitation flow (pode ja ter suporte parcial)
- Resend email configurado (ja existe)

## Criterios de Aceite

- [ ] Listar membros com nome, email, role
- [ ] Convidar membro por email com selecao de role
- [ ] Email de convite enviado com link funcional
- [ ] Alterar role de membro existente
- [ ] Remover membro (com confirmacao)
- [ ] Revogar convite pendente
- [ ] RBAC: apenas OWNER/ADMIN gerenciam
- [ ] Owner nao pode ser removido
- [ ] 4 estados UI (empty, loading, error, success)
