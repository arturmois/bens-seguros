# Design: Fluxo de Aceitacao de Convite (Modelo Slack)

**Data:** 2026-04-05
**Status:** Aprovado
**Decisoes:**

- Modelo Slack (pagina dedicada, auto-contida)
- Pular verificacao de email para convidados (convite = verificacao implicita)
- Detectar automaticamente se usuario ja tem conta
- Mensagens de erro diferenciadas sem acao de reenvio automatico

---

## Visao Geral

A pagina `/accept-invitation?id=X` se torna uma experiencia completa e auto-contida. Busca os dados do convite, detecta se o usuario ja tem conta, e mostra o form adequado — tudo sem redirecionar.

## Pesquisa de Mercado

| SaaS       | Pagina dedicada?         | Email pre-preenchido?     | Auto-join? | Verificacao?  |
| ---------- | ------------------------ | ------------------------- | ---------- | ------------- |
| **Slack**  | Sim, com branding da org | Sim (implicito via token) | Sim        | Codigo inline |
| **Notion** | Hibrido (login + token)  | Nao                       | Sim        | OTP           |
| **Linear** | Hibrido (onboarding)     | Nao                       | 1 clique   | OAuth         |
| **Vercel** | Sim (acceptance page)    | Nao                       | 1 clique   | OAuth         |
| **GitHub** | Sim (pagina dedicada)    | Nao                       | 1 clique   | Obrigatoria   |

Padrao escolhido: **Slack** — menor friccao, maior conversao.

## Fluxo do Usuario

```
Clica no link do email
        |
/accept-invitation?id=X
        |
  Busca dados do convite (API publica)
        |
  +-- Convite valido --------------------------+
  |                                            |
  |  Header: "Voce foi convidado para [Org]"   |
  |  Sub: "[Inviter] convidou voce como [Role]"|
  |                                            |
  |  +-- Email ja tem conta? ---+              |
  |  | SIM -> Form de Login     |              |
  |  |   Email (readonly)       |              |
  |  |   Senha                  |              |
  |  |   [Entrar e aceitar]     |              |
  |  |                          |              |
  |  | NAO -> Form de Registro  |              |
  |  |   Email (readonly)       |              |
  |  |   Nome                   |              |
  |  |   Senha                  |              |
  |  |   Confirmar senha        |              |
  |  |   Termos (checkbox)      |              |
  |  |   [Criar conta e entrar] |              |
  |  +--------------------------+              |
  +--------------------------------------------+
        |
  Conta criada/logada + convite aceito
        |
  Redireciona para /dashboard
```

## Estados de Erro

| Cenario                | Mensagem                                                                              | Acao                        |
| ---------------------- | ------------------------------------------------------------------------------------- | --------------------------- |
| Convite expirado       | "Este convite expirou. Entre em contato com quem te convidou para solicitar um novo." | Nenhuma                     |
| Convite ja aceito      | "Voce ja faz parte desta organizacao."                                                | Botao "Ir para o dashboard" |
| Convite nao encontrado | "Este link pode estar incorreto ou o convite foi cancelado."                          | Botao "Ir para login"       |

## Arquitetura Tecnica

### 1. Novo endpoint publico — `GET /api/v1/invitations/:id/public`

Retorna dados do convite sem autenticacao. Dados limitados por seguranca:

```typescript
// Response 200
{
  success: true,
  data: {
    id: string
    email: string
    role: string
    status: "pending" | "accepted" | "canceled"
    expiresAt: string
    organizationName: string
    inviterName: string
    hasAccount: boolean  // checa se email ja existe na tabela User
  }
}

// Response 404
{
  success: false,
  error: { code: "INVITATION_NOT_FOUND", message: "..." }
}
```

Seguranca:

- Rate-limited (evitar enumeracao de convites)
- Nao expoe organizationId, inviterId ou dados internos
- Email parcialmente mascarado? NAO — o usuario ja sabe o email pois recebeu o convite nele

### 2. Novo endpoint — `POST /api/v1/invitations/:id/accept`

Endpoint custom que substitui `authClient.organization.acceptInvitation()`. Faz tudo em um passo.

**Request body (registro):**

```typescript
{
  mode: 'register'
  name: string
  password: string
}
```

**Request body (login):**

```typescript
{
  mode: 'login'
  password: string
}
```

**Fluxo registro (sem conta):**

1. Valida convite (pending, nao expirado)
2. Cria User via Better Auth `auth.api.signUpEmail()`
3. Marca `emailVerified = true` (convite = verificacao implicita)
4. Cria Member na organizacao com o role do convite
5. Atualiza `Invitation.status = 'accepted'`
6. Cria sessao e retorna session token + set-cookie

**Fluxo login (ja tem conta):**

1. Valida convite (pending, nao expirado)
2. Autentica via Better Auth `auth.api.signInEmail()`
3. Cria Member na organizacao com o role do convite
4. Atualiza `Invitation.status = 'accepted'`
5. Retorna sessao + set-cookie

**Response 200:**

```typescript
{
  success: true,
  data: {
    organizationId: string
    role: string
  }
}
```

**Erros possiveis:**

- 400 INVITATION_EXPIRED
- 400 INVITATION_ALREADY_ACCEPTED
- 401 INVALID_CREDENTIALS (login mode)
- 404 INVITATION_NOT_FOUND
- 409 ALREADY_MEMBER
- 422 VALIDATION_ERROR (senha fraca, nome curto)

### 3. Frontend — Reescrita do `/accept-invitation`

A pagina vira auto-contida com 4 estados:

| Estado     | Quando                           | UI                                |
| ---------- | -------------------------------- | --------------------------------- |
| `loading`  | Buscando dados do convite        | Skeleton/spinner                  |
| `register` | Convite valido + email sem conta | Header do convite + form registro |
| `login`    | Convite valido + email com conta | Header do convite + form login    |
| `error`    | Convite invalido/expirado/aceito | Mensagem especifica + acao        |

Componentes:

- `AcceptInvitationContent` — orchestrador (fetch + state machine)
- `InvitationHeader` �� mostra org name, inviter, role
- `InvitationRegisterForm` — form de registro (nome, senha, confirmar, termos)
- `InvitationLoginForm` — form de login (senha)
- `InvitationError` — mensagens de erro diferenciadas

O email vem do endpoint publico e eh exibido como readonly em ambos os forms.

### 4. Verificacao de email

Para usuarios convidados: `emailVerified = true` ao criar conta.
Justificativa: o usuario provou acesso ao email ao receber o convite.

Para usuarios que se registram normalmente (sem convite): fluxo de verificacao continua inalterado.

### 5. O que NAO muda

- `create-invitation` continua criando via Prisma direto
- `list-invitations` e `delete-invitation` nao mudam
- Fluxo de registro normal (sem convite) continua com verificacao de email
- Schema do banco nao muda (campo `inviterId` ja renomeado)

## Consideracoes de Seguranca

- Endpoint publico rate-limited para evitar brute-force/enumeracao
- Senha validada com mesmas regras do registro normal (min 8 chars)
- Convite expira em 7 dias (ja implementado)
- Convite so pode ser aceito uma vez (status muda para 'accepted')
- Session token retornado via httpOnly cookie (padrao Better Auth)

## UX Guidelines Aplicadas (UI/UX Pro Max)

- `progressive-disclosure` — So mostra campos necessarios (nome+senha OU senha)
- `autofill-support` — Email readonly, autocomplete nos campos
- `input-labels` — Labels visiveis em todos os campos
- `error-recovery` — Mensagens de erro com orientacao clara
- `primary-action` — Uma CTA por estado ("Criar conta e entrar" ou "Entrar e aceitar")
- `loading-buttons` — Disable + spinner durante submit
- `deep-linking` — Link do convite funciona em qualquer contexto
