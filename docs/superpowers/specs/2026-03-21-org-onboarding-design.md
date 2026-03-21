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
3. Sistema checa `authClient.organization.listUserInvitations()`
4. Sem convites pendentes → redireciona para `/onboarding`
5. Usuário preenche nome da corretora + slug (auto-gerado)
6. `authClient.organization.create()` → `authClient.organization.setActive()`
7. Member criado com role OWNER
8. Redirect para `/` (dashboard)

### Fluxo 2: Usuário Convidado

```
Email (link) → /accept-invitation?id=xxx → /register ou /login → aceita invite → /
```

1. OWNER/ADMIN envia convite por email
2. Email contém link `/accept-invitation?id={invitationId}`
3. Se não tem conta → redireciona para `/register` com `?invitationId=xxx` preservado
4. Se já tem conta → redireciona para `/login` com `?invitationId=xxx` preservado
5. Após autenticar → auto-aceita via `authClient.organization.acceptInvitation()`
6. `authClient.organization.setActive()` com a org do convite
7. Redirect para `/` (dashboard)

### Fluxo 3: Login com Múltiplas Orgs

```
/login → (checa última org ativa) → / ou /select-org
```

1. Usuário faz login em `/login`
2. Após login, `onSuccess` verifica se `session.activeOrganizationId` existe
3. Se última org é válida (usuário é membro ativo) → redirect para `/`
4. Se inválida ou ausente → redirect para `/select-org`
5. Em `/select-org`, cards mostram todas as orgs do usuário
6. Ao clicar → `authClient.organization.setActive()` → redirect para `/`

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
  - Validação de unicidade via debounce (500ms) com indicador visual (checkmark/x)
  - Regex: `[a-z0-9-]`, mín 3 chars
- Botão "Criar corretora" (loading state durante submit)
- Texto informativo: "Você será o administrador (Owner) desta organização"

**Proteções:**

- Rota protegida (requer sessão)
- Se já tem org → redirect para `/`
- Toast de erro em caso de falha

### Tela /select-org

Layout centralizado, lista de cards clicáveis:

- Título "Selecione uma organização"
- Subtítulo "Escolha a corretora que deseja acessar"
- Cards com: avatar (iniciais + cor), nome, slug, badge da role, chevron
- Hover: borda teal + shadow
- Clique → `setActive()` + redirect para `/`

**Quando aparece:**

- Login com última org inválida (removido, org desativada)
- Login sem `activeOrganizationId` na session
- Nunca aparece se tem 1 org (auto-seleciona)
- Nunca aparece se última org é válida

### Tela /accept-invitation

Página intermediária para aceitar convites:

- Recebe `?id={invitationId}` na URL
- Se não autenticado → redirect para `/login?invitationId=xxx`
- Se autenticado → chama `authClient.organization.acceptInvitation({ invitationId })`
- Sucesso → `setActive()` com a org do convite → redirect para `/`
- Erro (expirado, já aceito) → mensagem de erro com link para `/`

### Org Switcher (sidebar)

Componente no topo do sidebar, substituindo o logo "Bens":

**Estado fechado:**

- Avatar com iniciais da org (2 primeiras letras) + cor gerada por hash do id
- Nome da org (truncado com ellipsis)
- Role do usuário naquela org
- Chevron down

**Dropdown aberto:**

- Org ativa com checkmark
- Separador
- Outras orgs disponíveis (avatar + nome + role), hover com background
- Separador
- Botão "+ Criar nova organização" (abre `/onboarding`)

**Ao trocar de org:**

1. `authClient.organization.setActive({ organizationId })`
2. `queryClient.clear()` (previne data leakage entre orgs)
3. `router.push('/')` (dashboard da nova org)

**Sidebar colapsado (w-16):**

- Mostra apenas o avatar com iniciais
- Dropdown abre posicionado à direita do sidebar

---

## Proxy.ts (Atualizado)

```
Rotas públicas: /login, /register, /api/auth
  → NextResponse.next()

Sem sessão (cookie):
  → redirect /login

Rotas auth-only: /onboarding, /select-org, /accept-invitation
  → NextResponse.next() (tem sessão, não precisa de org)

Sem org ativa (cookie activeOrganizationId):
  → redirect /select-org

Tudo OK:
  → NextResponse.next()
```

O proxy faz check otimista via cookies. A validação real (membro ativo, org existe) acontece no `tenant-middleware` do server.

---

## Estrutura de Arquivos

### Novos

```
apps/web/src/
├── app/
│   ├── (auth)/
│   │   └── accept-invitation/
│   │       └── page.tsx
│   ├── (onboarding)/
│   │   ├── layout.tsx
│   │   ├── onboarding/
│   │   │   └── page.tsx
│   │   └── select-org/
│   │       └── page.tsx
├── features/
│   └── org/
│       ├── components/
│       │   ├── org-switcher.tsx
│       │   ├── org-card.tsx
│       │   └── create-org-form.tsx
│       └── hooks/
│           └── use-orgs.ts
├── lib/
│   └── org-avatar.ts
```

### Modificados

```
apps/web/src/
├── proxy.ts                           ← adicionar checks de org ativa
├── components/layout/sidebar.tsx      ← trocar "Bens" por OrgSwitcher
├── app/(dashboard)/layout.tsx         ← buscar role real da sessão
├── features/auth/hooks/use-auth.ts    ← adicionar dados de org/redirect logic
```

---

## APIs (Better Auth Organization Plugin)

| Ação                    | Client Method                        | Endpoint                                | Usado em                     |
| ----------------------- | ------------------------------------ | --------------------------------------- | ---------------------------- |
| Criar org               | `organization.create()`              | POST /organization/create               | /onboarding                  |
| Setar org ativa         | `organization.setActive()`           | POST /organization/set-active           | Onboarding, Switcher, Select |
| Listar orgs do user     | `organization.list()`                | GET /organization/list                  | Switcher, Select-org         |
| Aceitar convite         | `organization.acceptInvitation()`    | POST /organization/accept-invitation    | /accept-invitation           |
| Listar convites do user | `organization.listUserInvitations()` | GET /organization/list-user-invitations | Pós-registro (check)         |

---

## Ponto de Atenção: Roles

Better Auth usa 3 roles (`owner`, `admin`, `member`). Nosso sistema usa 5 (`OWNER`, `ADMIN`, `MANAGER`, `COMMERCIAL`, `VIEWER`).

**Solução:** Usar o campo `role` da tabela `Member` diretamente via Prisma (já existe no schema com o enum `Role`). O Better Auth cria o member via plugin, mas o role real é gerenciado pelo nosso sistema CASL. Na criação via onboarding, o role é OWNER. Em convites, o role é definido pelo convidador.

Pode ser necessário configurar `organization({ memberRoleValues: ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'] })` ou fazer a atribuição de role via hook pós-criação do member.

---

## Fora de Escopo (futuro)

- Tela de configurações da organização (`/settings/organization`)
- Tela de gerenciamento de membros (`/settings/members`)
- Envio real de emails de convite (Resend + React Email)
- Transferência de ownership
- Upload de logo da org
- Validação de CNPJ
