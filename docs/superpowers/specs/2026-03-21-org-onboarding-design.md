# Organization Onboarding & Management - Design Spec

> Gap identificado na Fase 1: modelos de Organization/Member/Invitation existem, mas falta a UI e o fluxo de criação/seleção de organização.

## Decisões

| Decisão         | Escolha                                                      | Motivo                                           |
| --------------- | ------------------------------------------------------------ | ------------------------------------------------ |
| Pós-registro    | Condicional: convite → dashboard, sem convite → /onboarding  | Padrão SaaS (Slack, Linear). Sem usuário "solto" |
| CNPJ            | Opcional no onboarding, obrigatório antes de emitir proposta | Progressive disclosure, menor fricção            |
| Org Switcher    | Topo do sidebar, substitui logo "Bens"                       | Padrão consolidado SaaS B2B (Linear, Slack)      |
| Login multi-org | Lembra última org ativa, fallback /select-org se inválida    | Reduz fricção no uso diário                      |
| Backend         | Better Auth org plugin + endpoints complementares            | Aproveita o que já está pronto                   |

---

## Fluxos de Usuário

### Fluxo 1: Novo Usuário (sem convite)

```
/register → (check invites) → /onboarding → (cria org, seta ativa) → /
```

1. Usuário preenche nome, email, senha em `/register`
2. Conta criada via Better Auth
3. No `register.onSuccess` do hook `use-auth.ts`, chama `authClient.organization.listUserInvitations()`
4. Se array vazio (sem convites) → `router.push('/onboarding')`
5. Se tem convites → auto-aceita o primeiro via `authClient.organization.acceptInvitation()`, seta org ativa, seta cookie `bens-active-org`, `router.push('/')`
6. No `/onboarding`, usuário preenche nome da corretora + slug (auto-gerado)
7. `authClient.organization.create()` → `authClient.organization.setActive()`
8. Seta cookie `bens-active-org` com o `organizationId`
9. Member criado com role OWNER (via `creatorRole` config)
10. Redirect para `/` (dashboard)

### Fluxo 2: Usuário Convidado

```
Email (link) → /accept-invitation?id=xxx → /register ou /login → aceita invite → /
```

1. OWNER/ADMIN envia convite por email
2. Email contém link `/accept-invitation?id={invitationId}`
3. Se não tem conta → redireciona para `/register?invitationId=xxx`
4. Se já tem conta → redireciona para `/login?invitationId=xxx`
5. Após autenticar → auto-aceita via `authClient.organization.acceptInvitation()`
6. `authClient.organization.setActive()` com a org do convite + seta cookie `bens-active-org`
7. Redirect para `/` (dashboard)

### Fluxo 3: Login com Múltiplas Orgs

```
/login → (checa última org ativa) → / ou /select-org
```

1. Usuário faz login em `/login`
2. No `login.onSuccess` do hook `use-auth.ts`, checa `session.activeOrganizationId`
3. Se existe org ativa → seta cookie `bens-active-org`, redirect para `/`
4. Se ausente → redirect para `/select-org`
5. Em `/select-org`, se usuário tem 1 org → auto-seleciona (chama `setActive`, seta cookie, redirect para `/`)
6. Se 2+ orgs → cards mostram todas, ao clicar → `setActive()` + cookie + redirect para `/`

---

## Cookie de Org Ativa (proxy.ts)

Better Auth armazena `activeOrganizationId` no registro `Session` do banco, não em cookie. O proxy.ts roda no edge e não faz queries ao banco.

**Solução:** Cookie custom `bens-active-org` gerenciado pelo frontend:

- **Nome:** `bens-active-org`
- **Valor:** `organizationId` (string cuid)
- **Setado quando:** `setActive()` é chamado (onboarding, switcher, select-org, accept-invitation, login)
- **Removido quando:** logout (`queryClient.clear()` + `deleteCookie`)
- **Escopo:** `path=/`, `sameSite=lax`, `httpOnly=false` (precisa ser lido pelo proxy)
- **Propósito:** Check otimista apenas. A validação real (membro ativo, org existe) acontece no `tenant-middleware` do server.

Helper para setar/ler o cookie:

```ts
// lib/org-cookie.ts
export function setActiveOrgCookie(organizationId: string) {
  document.cookie = `bens-active-org=${organizationId};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`
}

export function clearActiveOrgCookie() {
  document.cookie = 'bens-active-org=;path=/;max-age=0'
}
```

---

## Roles: Configuração do Better Auth Organization Plugin

Better Auth usa 3 roles default (`owner`, `admin`, `member`). Nosso sistema usa 5 (`OWNER`, `ADMIN`, `MANAGER`, `COMMERCIAL`, `VIEWER`).

**Solução concreta:** Usar hooks pós-criação para corrigir o role no banco.

1. O plugin `organization()` cria o Member com `role: "owner"` (lowercase, string)
2. Um hook `afterCreateOrganization` atualiza o Member via Prisma: `role = 'OWNER'` (enum)
3. Para convites, configurar `memberRoleValues` para aceitar nossos roles customizados

Configuração no `packages/auth/src/index.ts`:

```ts
plugins: [
  organization({
    creatorRole: 'OWNER',
    memberRoleValues: ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
  }),
],
```

Se `memberRoleValues` não for suficiente (Better Auth pode rejeitar valores fora de `owner/admin/member`), usar a abordagem de hooks:

```ts
// Fallback: hook pós-criação
organization({
  async afterCreateOrganization({ organization, member }) {
    await prisma.member.update({
      where: { id: member.id },
      data: { role: 'OWNER' },
    });
  },
}),
```

**Validação necessária durante implementação:** testar qual abordagem funciona com a versão instalada do Better Auth.

---

## Componentes

### Tela /onboarding

Layout centralizado (mesma estética das telas de auth), card com:

- Indicador "Passo 2 de 2"
- Título "Configure sua corretora"
- Subtítulo "Estas informações podem ser alteradas depois"
- Campo **Nome da corretora** (obrigatório, mín 2 chars)
- Campo **Slug** com prefixo visual `bens.app/`
  - Auto-gerado a partir do nome via `slugify()` (lowercase, sem acentos, hífens)
  - Editável pelo usuário
  - Validação de unicidade via debounce (500ms) com `authClient.organization.checkOrganizationSlug()`
  - Indicador visual: checkmark verde (disponível) ou x vermelho (em uso)
  - Regex: `[a-z0-9-]`, mín 3 chars
- Botão "Criar corretora" (loading state durante submit)
- Texto informativo: "Você será o administrador (Owner) desta organização"

**Proteções:**

- Rota protegida (requer sessão)
- Se já tem org E não veio com `?new=true` → redirect para `/`
- Query param `?new=true` permite criar org adicional (usado pelo Org Switcher)
- Toast de erro em caso de falha

### Tela /select-org

Layout centralizado (reutiliza `(onboarding)/layout.tsx`), lista de cards clicáveis:

- Título "Selecione uma organização"
- Subtítulo "Escolha a corretora que deseja acessar"
- Cards com: avatar (iniciais + cor), nome, slug, badge da role, chevron
- Hover: borda teal + shadow
- Clique → `setActive()` + cookie + redirect para `/`
- **Auto-seleção:** se usuário tem exatamente 1 org, a página chama `setActive()` automaticamente e redireciona sem mostrar UI (evita double-redirect)

**Quando aparece:**

- Login com última org inválida (removido, org desativada)
- Login sem `activeOrganizationId` na session
- Nunca aparece se última org é válida (proxy deixa passar)

### Tela /accept-invitation

Página intermediária para aceitar convites. Colocada no route group `(onboarding)` pois compartilha o mesmo requisito: requer sessão, não requer org ativa.

- Recebe `?id={invitationId}` na URL
- Se não autenticado → redirect para `/login?invitationId=xxx`
- Se autenticado → chama `authClient.organization.acceptInvitation({ invitationId })`
- Sucesso → `setActive()` + cookie + redirect para `/`
- Erro (expirado, já aceito) → mensagem de erro com link para `/login`

### Layout (onboarding) — `(onboarding)/layout.tsx`

Layout compartilhado entre `/onboarding`, `/select-org` e `/accept-invitation`:

- Fundo `bg-muted`, centralizado vertical e horizontal (`min-h-dvh`)
- Container com `max-w-lg` para onboarding/accept, `max-w-xl` para select-org
- Sem sidebar, sem header — tela "limpa" como as telas de auth
- Logo "Bens Seguros" no topo (texto, não componente)

### Org Switcher (sidebar)

Componente no topo do sidebar, substituindo o logo "Bens":

**Estado fechado:**

- Avatar com iniciais da org (2 primeiras letras) + cor gerada por hash do id
- Nome da org (truncado com ellipsis)
- Role do usuário naquela org
- Chevron down

**Dropdown aberto (usa Popover do shadcn/ui):**

- Org ativa com checkmark
- Separador
- Outras orgs disponíveis (avatar + nome + role), hover com background
- Separador
- Botão "+ Criar nova organização" → navega para `/onboarding?new=true`

**Ao trocar de org:**

1. `authClient.organization.setActive({ organizationId })`
2. `setActiveOrgCookie(organizationId)`
3. `queryClient.clear()` (previne data leakage entre orgs)
4. `router.push('/')` (dashboard da nova org)

**Sidebar colapsado (w-16):**

- Mostra apenas o avatar com iniciais
- Dropdown abre posicionado à direita do sidebar

### Hook `useOrgs` — `features/org/hooks/use-orgs.ts`

```ts
interface Org {
  id: string
  name: string
  slug: string
  logo: string | null
  role: Role
}

function useOrgs(): {
  orgs: Org[]
  activeOrg: Org | null
  isLoading: boolean
  switchOrg: (orgId: string) => Promise<void>
}
```

- Wraps `authClient.organization.list()` via React Query
- `switchOrg` chama `setActive()` + cookie + `queryClient.clear()` + redirect
- `activeOrg` derivado do `session.activeOrganizationId`
- Query key: `['orgs']`, invalidado no switch

---

## Dashboard Layout — Role Real

O layout `(dashboard)/layout.tsx` atualmente passa `role="MANAGER"` hardcoded. Para obter o role real:

**Abordagem:** Usar `useOrgs()` no `AppShell` para derivar o role da org ativa.

```tsx
// app/(dashboard)/layout.tsx — Server Component wrapper
export default function DashboardLayout({ children }) {
  return <DashboardShell>{children}</DashboardShell>
}

// components/layout/dashboard-shell.tsx — Client Component
;('use client')
function DashboardShell({ children }) {
  const { activeOrg, isLoading } = useOrgs()
  if (isLoading) return <LoadingSkeleton />
  return <AppShell role={activeOrg?.role ?? 'VIEWER'}>{children}</AppShell>
}
```

O role vem da lista de orgs do usuário (que inclui o role de cada membership), filtrado pela org ativa. Não precisa de endpoint extra.

---

## Proxy.ts (Atualizado)

```
Rotas públicas: /login, /register, /api/auth
  → NextResponse.next()

Sem sessão (cookie better-auth.session_token):
  → redirect /login

Rotas auth-only: /onboarding, /select-org, /accept-invitation
  → NextResponse.next() (tem sessão, não precisa de org)

Sem org ativa (cookie bens-active-org):
  → redirect /select-org

Tudo OK:
  → NextResponse.next()
```

O proxy lê o cookie `bens-active-org` (setado pelo frontend). Check otimista apenas — a validação real acontece no `tenant-middleware` do server.

---

## Estrutura de Arquivos

### Novos

```
apps/web/src/
├── app/
│   ├── (onboarding)/
│   │   ├── layout.tsx                ← layout limpo centralizado
│   │   ├── onboarding/
│   │   │   └── page.tsx              ← criar org
│   │   ├── select-org/
│   │   │   └── page.tsx              ← selecionar org
│   │   └── accept-invitation/
│   │       └── page.tsx              ← aceitar convite
├── features/
│   └── org/
│       ├── components/
│       │   ├── org-switcher.tsx       ← dropdown sidebar
│       │   ├── org-card.tsx           ← card de org reutilizável
│       │   └── create-org-form.tsx    ← form do onboarding
│       └── hooks/
│           └── use-orgs.ts            ← { orgs, activeOrg, isLoading, switchOrg }
├── lib/
│   ├── org-avatar.ts                  ← cor por hash + iniciais
│   └── org-cookie.ts                  ← setActiveOrgCookie / clearActiveOrgCookie
├── components/layout/
│   └── dashboard-shell.tsx            ← wrapper client que resolve role real
```

### Modificados

```
apps/web/src/
├── proxy.ts                           ← adicionar checks de org ativa via cookie bens-active-org
├── components/layout/sidebar.tsx      ← trocar "Bens" por OrgSwitcher
├── app/(dashboard)/layout.tsx         ← usar DashboardShell ao invés de AppShell direto
├── features/auth/hooks/use-auth.ts    ← register/login onSuccess: check invites, set cookie, redirect logic
```

### Backend (packages/auth)

```
packages/auth/src/
├── index.ts                           ← configurar organization({ creatorRole, memberRoleValues })
```

---

## APIs (Better Auth Organization Plugin)

| Ação                    | Client Method                          | Endpoint                                | Usado em                     |
| ----------------------- | -------------------------------------- | --------------------------------------- | ---------------------------- |
| Criar org               | `organization.create()`                | POST /organization/create               | /onboarding                  |
| Setar org ativa         | `organization.setActive()`             | POST /organization/set-active           | Onboarding, Switcher, Select |
| Listar orgs do user     | `organization.list()`                  | GET /organization/list                  | Switcher, Select-org         |
| Aceitar convite         | `organization.acceptInvitation()`      | POST /organization/accept-invitation    | /accept-invitation           |
| Listar convites do user | `organization.listUserInvitations()`   | GET /organization/list-user-invitations | Pós-registro (check)         |
| Validar slug            | `organization.checkOrganizationSlug()` | POST /organization/check-slug           | Slug validation /onboarding  |

---

## Fora de Escopo (futuro)

- Tela de configurações da organização (`/settings/organization`)
- Tela de gerenciamento de membros (`/settings/members`)
- Envio real de emails de convite (Resend + React Email)
- Transferência de ownership
- Upload de logo da org
- Validação de CNPJ
