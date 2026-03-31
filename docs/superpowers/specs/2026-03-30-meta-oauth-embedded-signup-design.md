# Meta OAuth + Embedded Signup — Design Spec

> Refatoração do fluxo de conexão Meta: de credenciais manuais per-tenant para OAuth centralizado via Facebook Login for Business + Embedded Signup.

## 1. Resumo Executivo

Migrar de "cada tenant cria seu próprio Facebook App" para um modelo onde o SaaS (Bens Seguros) possui **um Facebook App centralizado**. Clientes conectam via Facebook Login — zero campos técnicos. WhatsApp usa Embedded Signup (Fase 2). Baileys (QR Code) continua como alternativa.

**Decisões-chave:**

- **Abordagem B** — Facebook Login for Business + Channel.config encriptado (sem nova entidade)
- **Implementação do zero** — sem migração de canais existentes
- **Fases:** 1A (infra/crypto) → 1B (OAuth Messenger+Instagram) → 2 (WhatsApp Embedded Signup)

## 2. Arquitetura

### 2.1 Modelo Centralizado

```
┌─────────────────────────────────────────────────────────────┐
│  META PLATFORM                                               │
│                                                               │
│  Facebook App "Bens Seguros" (ID: 1558286935264766)          │
│  Produtos: Messenger │ Instagram │ WhatsApp (Fase 2)         │
│  Permissões: pages_messaging, pages_manage_metadata,         │
│    pages_read_engagement, instagram_basic,                    │
│    instagram_manage_messages                                  │
│  Webhook: POST → https://api.bensseguros.com.br/chat/webhook/meta │
│  HMAC: App Secret único (env META_APP_SECRET)                │
└──────────┬──────────────────────┬────────────────────────────┘
      OAuth Code              Webhook Events
           │                       │
           ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│  BACKEND                                                     │
│                                                               │
│  chat-server (3002)        chat-worker (BullMQ)              │
│  /meta/auth/*              Broker Factory                    │
│  /meta/assets              ├─ MessengerBroker                │
│  /meta/connect             ├─ InstagramBroker                │
│  /meta/disconnect          ├─ MetaBroker (WhatsApp Cloud)    │
│  /meta/status/:id          ├─ BaileysBroker (QR Code)        │
│  /meta/reconnect/:id       └─ WebChatBroker                  │
│  /chat/webhook/meta                                          │
│                            Cron: Token Refresh (diário)      │
│                                                               │
│  MongoDB — Channel.config (AES-256-GCM encrypted)            │
└─────────────────────────────────────────────────────────────┘
           ▲
           │  Facebook Login Popup
┌─────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js)                                          │
│  Conectar Messenger / Instagram / WhatsApp                   │
│  1. GET /meta/auth/url → popup                               │
│  2. Callback → POST /meta/auth/callback                      │
│  3. GET /meta/assets → lista Pages                           │
│  4. POST /meta/connect → vincula canal                       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Mudanças vs Atual

| Aspecto       | Atual                                   | Proposto                         |
| ------------- | --------------------------------------- | -------------------------------- |
| Facebook App  | 1 por tenant                            | 1 do SaaS (centralizado)         |
| Conexão       | 4 campos manuais                        | 1 clique (OAuth)                 |
| App Secret    | Per-tenant no MongoDB (plaintext)       | 1 em env var (META_APP_SECRET)   |
| Token         | Plaintext no MongoDB                    | AES-256-GCM encrypted            |
| Token Refresh | Nenhum                                  | Cron automático diário           |
| Webhook HMAC  | Lookup per-channel no DB                | 1 secret global (env)            |
| Discovery     | Manual (user digita Page ID)            | Auto (/me/accounts)              |
| Status        | 3 (CONNECTED, DISCONNECTED, QR_PENDING) | 5 (+TOKEN_EXPIRED, NEEDS_REAUTH) |

## 3. Fluxo OAuth — Messenger + Instagram (Fase 1)

### 3.1 Sequência Completa

1. **User clica "Conectar Messenger"** no dashboard
2. **Frontend chama `GET /meta/auth/url`** com `{ channelType: 'MESSENGER' }`
3. **Backend gera URL** do Facebook Login for Business + state anti-CSRF (encrypted: tenantId + nonce + expiresAt)
4. **Frontend abre popup** `window.open(url)`
5. **User autentica no Facebook**, concede permissões, seleciona Pages
6. **Meta redireciona** para callback URL com `?code=XXX&state=YYY`
7. **Frontend envia `POST /meta/auth/callback`** com `{ code, state }`
8. **Backend:**
   - Valida state (decrypt, verifica nonce + expiry)
   - Troca code → short-lived token: `GET /oauth/access_token?client_id=APP_ID&client_secret=APP_SECRET&code=XXX&redirect_uri=CALLBACK`
   - Troca short → long-lived token (60 dias): `GET /oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=SHORT`
   - Salva sessão OAuth temporária no Redis (TTL 10min): `{ longLivedToken, metaUserId, expiresAt }`
   - Retorna `{ success, sessionId }`
9. **Frontend chama `GET /meta/assets`** com `{ sessionId }`
10. **Backend busca Pages**: `GET /me/accounts?fields=id,name,access_token,instagram_business_account&access_token=LONG_LIVED`
11. **Frontend mostra dropdown** de Pages (com Instagram Business Account se existir)
12. **User seleciona Page** + nome do canal
13. **Frontend envia `POST /meta/connect`** com `{ sessionId, pageId, channelType, name }`
14. **Backend:**
    - Recupera sessão do Redis
    - Encrypta Page Access Token (AES-256-GCM)
    - Cria Channel no MongoDB
    - Subscribe page a webhooks: `POST /{pageId}/subscribed_apps`
    - Limpa sessão Redis
    - Retorna channel criado

### 3.2 Instagram — Diferenças

O fluxo é **idêntico** ao Messenger, com:

- `channelType: 'INSTAGRAM'`, `brokerType: 'INSTAGRAM'`
- Asset discovery: usa `instagram_business_account.id` retornado pelo `/me/accounts`
- Page subscription: mesmo endpoint `POST /{pageId}/subscribed_apps` — Instagram webhooks são roteados via Page
- Requisito: Instagram account deve ser Business/Professional e vinculada a uma Facebook Page

### 3.3 Endpoints Backend

| Método | Rota                         | Descrição                                                   | Auth         |
| ------ | ---------------------------- | ----------------------------------------------------------- | ------------ |
| `GET`  | `/meta/auth/url`             | Gera URL do Facebook Login + state anti-CSRF                | JWT (tenant) |
| `POST` | `/meta/auth/callback`        | Recebe code, troca por long-lived token, salva sessão Redis | JWT (tenant) |
| `GET`  | `/meta/assets`               | Lista Pages + Instagram accounts disponíveis                | JWT (tenant) |
| `POST` | `/meta/connect`              | Vincula asset ao canal, encrypt token, subscribe webhook    | JWT (tenant) |
| `POST` | `/meta/disconnect`           | Revoga permissões, limpa token, desconecta                  | JWT (tenant) |
| `GET`  | `/meta/status/:channelId`    | Status da integração (token válido, scopes, expiração)      | JWT (tenant) |
| `POST` | `/meta/reconnect/:channelId` | Re-auth quando token expirado (reabre Facebook Login)       | JWT (tenant) |

### 3.4 Webhook — Simplificação

**Antes (per-tenant secret):**

1. Parse JSON para extrair accountId
2. Query MongoDB por metaPageId
3. Extrair metaAppSecret do config
4. Validar HMAC com secret do tenant

- 1 query ao DB por webhook event

**Depois (app secret global):**

1. Validar HMAC com `env.META_APP_SECRET`
2. Parse JSON + route por object type
3. Query MongoDB por accountId (já existe)

- HMAC antes de parse = mais seguro

## 4. Fluxo WhatsApp Embedded Signup (Fase 2)

### 4.1 Sequência

1. **User clica "Conectar WhatsApp"** → dialog de escolha: Cloud API vs QR Code
2. **Se Cloud API:** Frontend carrega Facebook JS SDK (script async)
3. **Frontend chama `FB.login()`** com config Embedded Signup:
   ```json
   {
     "config_id": "CFG_WA",
     "response_type": "code",
     "override_default_response_type": true,
     "extras": {
       "setup": {},
       "featureType": "whatsapp_embedded_signup",
       "sessionInfoVersion": "3"
     }
   }
   ```
4. **Meta abre wizard** (4 passos): Login → Business Portfolio → WABA + display name → Verificar phone (OTP)
5. **Callback retorna:** `{ authResponse: { code }, status: 'connected' }` + sessionInfo event com `{ phone_number_id, waba_id }`
6. **Frontend envia `POST /meta/whatsapp/connect`** com `{ code, phoneNumberId, wabaId }`
7. **Backend:**
   - Troca code → Business Integration System User Token (**não expira**): `GET /oauth/access_token?client_id=APP_ID&client_secret=APP_SECRET&code=XXX`
   - Registra phone: `POST /{phoneNumberId}/register` com `{ messaging_product: "whatsapp", pin: "000000" }`
   - Subscribe WABA a webhooks: `POST /{wabaId}/subscribed_apps`
   - Encrypta token (AES-256-GCM)
   - Cria Channel com `connectionMethod: 'embedded_signup'`, `tokenExpiresAt: null`

### 4.2 Diferenças-Chave vs OAuth (Fase 1)

| Aspecto             | Messenger/Instagram (OAuth)       | WhatsApp (Embedded Signup)                              |
| ------------------- | --------------------------------- | ------------------------------------------------------- |
| Trigger             | Backend gera URL → popup redirect | Frontend chama FB.login() direto (JS SDK)               |
| Dialog              | Facebook Login padrão             | Wizard 4 passos                                         |
| Code exchange       | Via redirect callback URL         | Via JS callback (authResponse.code)                     |
| Token type          | Long-lived Page Token (60 dias)   | Business Integration System User Token (**não expira**) |
| Refresh necessário? | Sim (cron diário)                 | Não                                                     |
| Assets              | Pages + Instagram Accounts        | WABA + Phone Number (criados no wizard)                 |
| Passo extra         | Subscribe page webhooks           | Register phone + subscribe WABA webhooks                |

### 4.3 Coexistência com Baileys

O usuário escolhe como conectar WhatsApp:

- **QR Code (Baileys):** `brokerType: BAILEYS`, conexão pessoal, sem custo Meta, já funciona
- **Cloud API (Embedded Signup):** `brokerType: META`, número comercial verificado, custo por conversa (Meta paga direto)

Endpoint adicional (Fase 2): `POST /meta/whatsapp/connect`. Demais endpoints (disconnect, status, reconnect) reutilizados da Fase 1.

## 5. Modelo de Dados

### 5.1 Channel Schema — Evolução

**Campos removidos:**

- `config.metaAppId` → env `META_APP_ID` (app centralizado)
- `config.metaAppSecret` → env `META_APP_SECRET` (app centralizado)

**Campos encriptados:**

- `config.metaToken` → `EncryptedField { ciphertext, iv, tag }` (AES-256-GCM)

**Campos novos:**

- `connectionMethod: 'oauth' | 'embedded_signup' | 'qr_code' | 'manual'`
- `metaUserId: String` — Facebook User ID de quem autorizou (audit trail)
- `tokenExpiresAt: Date | null` — quando o token expira (null = não expira)
- `scopes: String[]` — permissões concedidas
- `config.metaWabaId: String` — WhatsApp Business Account ID (Fase 2)

**Status expandido:**

- Existentes: `CONNECTED`, `DISCONNECTED`, `QR_PENDING`
- Novos: `TOKEN_EXPIRED`, `NEEDS_REAUTH`

### 5.2 Env Vars Novas

```bash
# App centralizado (Fase 1A)
META_APP_ID=1558286935264766
META_APP_SECRET=abc123...
META_OAUTH_REDIRECT_URI=https://api.bensseguros.com.br/meta/auth/callback

# Frontend (Fase 1B)
NEXT_PUBLIC_META_APP_ID=1558286935264766

# WhatsApp (Fase 2)
META_WA_CONFIG_ID=config_id_fb_login_for_business
NEXT_PUBLIC_META_WA_CONFIG_ID=config_id_whatsapp
```

Adicionadas ao `packages/env/src/index.ts` com validação Zod.

## 6. Segurança

### 6.1 Criptografia de Tokens

**Escrita (connect/refresh):**
Meta API retorna token → `encrypt(plainToken, key)` → `{ ciphertext, iv, tag }` → MongoDB

**Leitura (broker/webhook):**
MongoDB → `decrypt(config.metaToken, key)` → plainToken → Bearer header → descartado

**Chave:** `env.ENCRYPTION_KEY` (AES-256-GCM, 32 bytes / 64 hex chars) — já existente em `packages/shared/src/crypto.ts`.

### 6.2 Gaps Resolvidos

- Token encriptado no DB (AES-256-GCM)
- App Secret removido do DB → env var
- State anti-CSRF no OAuth (nonce + expiry, encrypted, single-use, TTL 5min)
- Token refresh automático (cron BullMQ diário)
- Webhook HMAC simplificado (1 secret global)
- Revogação no disconnect (`DELETE /me/permissions`)
- Segregação por tenantId (mantida)

### 6.3 Regras de Implementação

- Pino redaction: `['metaToken', 'access_token', 'fb_exchange_token', 'client_secret', 'code', 'config.metaToken', '*.metaToken', '*.access_token', '*.code']`
- API response: nunca retornar token decriptado
- Redis sessão OAuth: TTL 10 min
- State token: TTL 5 min, single-use
- Broker recebe token decriptado em runtime, não persiste
- Frontend: zero credenciais (só sessionId)
- Audit: log connect/disconnect/refresh (sem secrets)

## 7. Token Refresh

### 7.1 Cron Job

- **App:** `apps/chat-worker`
- **Queue:** BullMQ repeatable job `CHAT_QUEUES.META_TOKEN_REFRESH`
- **Schedule:** `0 3 * * *` (3h da manhã, diário)
- **Retry:** 3 tentativas com backoff exponencial (1min, 5min, 30min)
- **Concurrency:** 1 (serializado para evitar rate limit)

### 7.2 Lógica

1. Query: `Channel.find({ connectionMethod: 'oauth', status: 'CONNECTED', tokenExpiresAt: { $lt: now + 7d } })`
2. Para cada canal: decrypt token → `GET /oauth/access_token?grant_type=fb_exchange_token&...` → encrypt novo token → update Channel
3. **Sucesso:** atualiza `config.metaToken` + `tokenExpiresAt`
4. **Falha:** status → `TOKEN_EXPIRED` ou `NEEDS_REAUTH`
5. **Skip:** `connectionMethod: 'embedded_signup'` (token não expira) e `connectionMethod: 'qr_code'` (sem token Meta)

## 8. Observabilidade

### 8.1 Logs Estruturados (Pino)

| Event                       | Level | Campos                                                             |
| --------------------------- | ----- | ------------------------------------------------------------------ |
| `meta.channel.connected`    | info  | tenantId, channelId, channelType, connectionMethod, pageId, scopes |
| `meta.channel.disconnected` | info  | tenantId, channelId, revokedPermissions                            |
| `meta.token.refreshed`      | info  | tenantId, channelId, newExpiresAt, previousExpiresAt               |
| `meta.token.refresh_failed` | warn  | tenantId, channelId, errorCode, errorMessage, newStatus            |
| `meta.webhook.received`     | info  | object, accountId, messageCount                                    |
| `meta.webhook.hmac_failed`  | warn  | accountId, object                                                  |

Nunca logado: `metaToken`, `access_token`, `code`, `app_secret`.

### 8.2 Métricas e Alertas (Futuro)

Métricas: `meta.oauth.success_count`, `meta.oauth.failure_count`, `meta.token.refresh_count`, `meta.token.expired_count`, `meta.webhook.received_count`, `meta.webhook.hmac_failure_count`.

Alertas: token expirado sem refresh > 48h, webhook HMAC failure rate > 5%, OAuth callback error rate > 10%, token refresh failure 3x consecutivas.

Não bloqueia V1 — logs estruturados são suficientes.

## 9. UX / Frontend

### 9.1 Jornada do Usuário

**Channels Page** → Cards de canal (WhatsApp, Messenger, Instagram, Web Chat) com botão "Conectar"

**WhatsApp** → Dialog de escolha: Cloud API (Embedded Signup) ou QR Code (Baileys existente)

**Messenger/Instagram** → Popup Facebook Login → Seleção de Page (Sheet com dropdown) → Canal conectado

### 9.2 Componentes

| Componente                   | Ação          | Descrição                                          |
| ---------------------------- | ------------- | -------------------------------------------------- |
| `channels-page.tsx`          | REWRITE       | Cards de canal + tabela de conectados              |
| `meta-oauth-button.tsx`      | NOVO          | Botão "Conectar com Facebook" — inicia popup OAuth |
| `meta-asset-select.tsx`      | NOVO          | Sheet com dropdown de Pages/IG                     |
| `whatsapp-method-dialog.tsx` | NOVO          | Dialog QR Code vs Cloud API                        |
| `meta-embedded-signup.tsx`   | NOVO (Fase 2) | FB JS SDK + FB.login() para Embedded Signup        |
| `channel-status-badge.tsx`   | UPDATE        | +TOKEN_EXPIRED, +NEEDS_REAUTH                      |
| `use-meta-oauth.ts`          | NOVO          | Hook: popup, callback, polling de assets           |
| `channel-form-sheet.tsx`     | REMOVIDO      | Formulário manual substituído por OAuth            |

### 9.3 Estados do Canal

- **CONNECTED** (verde) — Funcionando
- **TOKEN_EXPIRED** (amarelo) — Botão "Reconectar"
- **NEEDS_REAUTH** (vermelho) — Permissão revogada
- **DISCONNECTED** (cinza) — Desconectado manual
- **QR_PENDING** (roxo) — Aguardando scan (Baileys)

## 10. Plano de Implementação

### Fase 1A — Criptografia + Infra Base (~2-3 dias)

| #   | Tarefa                                                                                             | Onde                          | Depende |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------- | ------- |
| 1   | Adicionar `META_APP_ID`, `META_APP_SECRET`, `META_OAUTH_REDIRECT_URI` ao `@repo/env`               | packages/env                  | —       |
| 2   | Evoluir Channel schema: `connectionMethod`, `metaUserId`, `tokenExpiresAt`, `scopes`, novos status | packages/db-chat              | —       |
| 3   | Helper `encryptToken()` / `decryptToken()` wrapper sobre crypto.ts                                 | packages/shared               | —       |
| 4   | Broker factory: decrypt token antes de passar ao broker                                            | apps/chat-worker              | 3       |
| 5   | Webhook HMAC: usar `env.META_APP_SECRET` (global)                                                  | apps/chat-server              | 1       |
| 6   | Pino redaction paths para tokens e secrets                                                         | apps/chat-server, chat-worker | —       |
| 7   | Remover campos `metaAppId`, `metaAppSecret` do channel config/frontend                             | full-stack                    | 1, 5    |

### Fase 1B — Facebook Login OAuth (~4-5 dias)

| #   | Tarefa                                                                                                                                                 | Onde             | Depende  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------- | -------- |
| 8   | `meta-oauth-service.ts` — gera URL, valida state, code→token, refresh                                                                                  | apps/chat-server | 1A       |
| 9   | `meta-assets-service.ts` — lista Pages, IG accounts via /me/accounts                                                                                   | apps/chat-server | 1A       |
| 10  | `meta-connect-service.ts` — vincula asset, encrypt token, subscribe webhook                                                                            | apps/chat-server | 3, 8     |
| 11  | Rotas Fastify: `/meta/auth/url`, `/meta/auth/callback`, `/meta/assets`, `/meta/connect`, `/meta/disconnect`, `/meta/status/:id`, `/meta/reconnect/:id` | apps/chat-server | 8, 9, 10 |
| 12  | Token refresh job (BullMQ repeatable, cron diário)                                                                                                     | apps/chat-worker | 8        |
| 13  | Rewrite `channels-page.tsx` — cards + tabela                                                                                                           | apps/web         | 11       |
| 14  | `meta-oauth-button.tsx` + `use-meta-oauth.ts` — popup + callback                                                                                       | apps/web         | 11       |
| 15  | `meta-asset-select.tsx` — sheet com dropdown de Pages                                                                                                  | apps/web         | 14       |
| 16  | Update `channel-status-badge.tsx` — TOKEN_EXPIRED, NEEDS_REAUTH                                                                                        | apps/web         | —        |

### Fase 2 — WhatsApp Embedded Signup (~3-4 dias)

| #   | Tarefa                                                                       | Onde             | Depende |
| --- | ---------------------------------------------------------------------------- | ---------------- | ------- |
| 17  | `META_WA_CONFIG_ID` + `NEXT_PUBLIC_META_WA_CONFIG_ID` no @repo/env           | packages/env     | —       |
| 18  | `meta-whatsapp-service.ts` — code→BISU token, register phone, subscribe WABA | apps/chat-server | 1A, 1B  |
| 19  | Rota `POST /meta/whatsapp/connect`                                           | apps/chat-server | 18      |
| 20  | `whatsapp-method-dialog.tsx` — escolha QR Code vs Cloud API                  | apps/web         | —       |
| 21  | `meta-embedded-signup.tsx` — FB JS SDK, FB.login() com config WA             | apps/web         | 19, 20  |

### Pré-requisitos Externos (Meta Dashboard)

| Ação                                                      | Quando               | Estimativa  |
| --------------------------------------------------------- | -------------------- | ----------- |
| Configurar Facebook Login for Business (Configuration ID) | Antes da Fase 1B     | 1 hora      |
| Adicionar OAuth redirect URI ao app                       | Antes da Fase 1B     | 5 min       |
| Business Verification                                     | Antes do App Review  | 2-7 dias    |
| App Review (5 permissões)                                 | Para Advanced Access | 2-7 dias    |
| Registro como Tech Provider (WhatsApp)                    | Antes da Fase 2      | 3-4 semanas |

Iniciar Business Verification e App Review em paralelo com a Fase 1A. Tech Provider em paralelo com Fase 1B.

## 11. Tutorial: Configurar App Centralizado na Meta

### Etapa 1 — Business Verification (2-7 dias)

1. Acesse **Meta Business Suite → Configurações → Informações da empresa**
2. Preencha: Nome legal, endereço, telefone da empresa
3. Acesse **Central de Segurança → Iniciar verificação**
4. Upload de documento: **CNPJ (Cartão CNPJ da Receita Federal)** ou contrato social
5. Verificação do domínio: adicionar meta-tag ou DNS TXT em `bensseguros.com.br`
6. Verificação por telefone ou e-mail da empresa
7. Aguardar aprovação (2-7 dias úteis)

> O nome legal deve bater EXATAMENTE com o documento enviado. Discrepâncias causam rejeição.

### Etapa 2 — Ativar 2FA na Conta Admin

1. Facebook → **Configurações → Segurança e login → Autenticação de dois fatores**
2. Ativar via app autenticador (Google Authenticator, Authy, etc.)

### Etapa 3 — Configurar o Facebook App

**3.1 Configurações Básicas:**

1. **App Dashboard → Configurações → Básico**
2. Anotar **App ID** → será `META_APP_ID`
3. Anotar **App Secret** → será `META_APP_SECRET`
4. Preencher: URL da Política de Privacidade e Termos de Serviço
5. Preencher: Ícone do app (1024x1024 PNG) + Domínio do app

**3.2 Adicionar Produtos:**

1. **App Dashboard → Adicionar produto**
2. Adicionar: **Facebook Login for Business**, **Messenger**, **Instagram**
3. (Fase 2) Adicionar: **WhatsApp**

**3.3 Facebook Login for Business — Configuration:**

1. **Facebook Login for Business → Configurações**
2. Adicionar URI de redirecionamento OAuth:
   - Produção: `https://api.bensseguros.com.br/meta/auth/callback`
   - Dev: `http://localhost:3002/meta/auth/callback`
3. Criar Configuration:
   - Name: `Bens Seguros - Messenger & Instagram`
   - Token type: `User token`
   - Assets: `Pages`
   - Permissions: `pages_messaging`, `pages_manage_metadata`, `pages_read_engagement`, `instagram_basic`, `instagram_manage_messages`
4. Anotar o **Configuration ID** gerado

**3.4 Webhooks:**

1. **Messenger → Configurações → Webhooks**
2. Callback URL: `https://api.bensseguros.com.br/chat/webhook/meta`
3. Verify Token: valor de `META_WEBHOOK_VERIFY_TOKEN`
4. Subscription fields: `messages`, `messaging_postbacks`
5. Clicar **Verificar e salvar**

### Etapa 4 — App Review (2-7 dias)

1. **App Dashboard → App Review → Permissões e Recursos**
2. Solicitar Advanced Access para:
   - `pages_messaging` — Enviar/receber mensagens via Messenger
   - `pages_manage_metadata` — Subscribe page a webhooks
   - `pages_read_engagement` — Ler informações da Page
   - `instagram_basic` — Acessar dados da conta Instagram Business
   - `instagram_manage_messages` — Enviar/receber DMs no Instagram
3. Para cada permissão, preparar:
   - Descrição do uso
   - Gravação de tela (screencast) mostrando o fluxo end-to-end
   - URL de teste (staging)
4. Submeter e aguardar (2-7 dias úteis)

> Enquanto em Development Mode, testar com contas que têm role no app. Adicionar testers em: App Dashboard → Roles → Testers.

### Etapa 5 — Publicar o App

1. Após App Review aprovado → **App Dashboard → Go Live**
2. Confirmar Privacy Policy URL e Terms URL preenchidos
3. App muda de Development para Live

### Etapa 6 — Tech Provider WhatsApp (Fase 2)

1. Adicionar produto **WhatsApp** ao app
2. **WhatsApp → Quickstart → Partner Solutions** → configurar como Tech Provider
3. Aceitar **Partner Solution Terms**
4. Criar Facebook Login for Business Configuration para WhatsApp:
   - Name: `Bens Seguros - WhatsApp`
   - Token type: `Business Integration System User token`
   - Assets: `WhatsApp Business Accounts`
   - Permissions: `whatsapp_business_management`, `whatsapp_business_messaging`
5. Anotar **Configuration ID** → `META_WA_CONFIG_ID`
6. Configurar webhook para WhatsApp (mesmo endpoint, subscription: `messages`)
7. Aguardar aprovação (~3-4 semanas)

### Env Vars Resultantes

```bash
# Meta App Centralizado (Fase 1A)
META_APP_ID=1558286935264766
META_APP_SECRET=abc123...seu_app_secret
META_OAUTH_REDIRECT_URI=https://api.bensseguros.com.br/meta/auth/callback

# Webhook (já existente)
META_WEBHOOK_VERIFY_TOKEN=seu_verify_token_aqui

# Criptografia (já existente)
ENCRYPTION_KEY=64_hex_chars_aqui

# Frontend (Fase 1B)
NEXT_PUBLIC_META_APP_ID=1558286935264766

# WhatsApp (Fase 2)
# META_WA_CONFIG_ID=config_id_do_fb_login_for_business
# NEXT_PUBLIC_META_WA_CONFIG_ID=config_id_whatsapp
```

## 12. Limitações Conhecidas da Meta Platform

- Tokens não herdam permissões adicionadas depois da geração — precisa regenerar
- Instagram requer App Review para `instagram_manage_messages`
- Instagram account deve ser Business/Professional e vinculada a uma Facebook Page
- WhatsApp Embedded Signup cria novo WABA — números precisam ser migrados se já estiverem em outro WABA
- Phone number só pode estar em 1 WABA por vez
- Webhook verify token é global (GET request não identifica tenant) — ok com app centralizado
- `GET /me/accounts` não retorna Pages vinculadas a Meta Business Account sem permissão `business_management`
- Long-lived Page tokens expiram em 60 dias — refresh obrigatório
- Business Integration System User tokens (WhatsApp) não expiram
- Rate limits da Meta Graph API: 200 calls/user/hour (sufficient para OAuth/discovery)
