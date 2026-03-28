# Per-Tenant Meta App Secret — Design Spec

> Tornar canais Meta (Messenger, Instagram, WhatsApp Meta API) totalmente autonomos por tenant no SaaS.

## Problema

Hoje o `META_APP_SECRET` e uma env global unica. Todos os tenants sao obrigados a usar o mesmo Facebook App da plataforma. O admin precisa intervir manualmente para:

1. Adicionar a pagina/conta do tenant ao Facebook App central
2. Configurar webhook e inscricoes de campos
3. Fornecer o verify token

Isso impede autonomia do tenant e nao escala.

## Decisoes

| Decisao                | Escolha                                                | Motivo                                                    |
| ---------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| HMAC validation        | Parse JSON primeiro, valida HMAC depois                | Sem tenants em prod; padrao da industria (Stripe, Twilio) |
| Verify token           | Global (`META_WEBHOOK_VERIFY_TOKEN`)                   | GET de verificacao nao identifica canal; sem ganho real   |
| App Secret storage     | Plain text no `config` (MongoDB)                       | Consistente com `metaToken` existente                     |
| Escopo                 | Todos os canais Meta (Messenger, Instagram, WA Meta)   | Mesmo webhook, mesmo mecanismo HMAC                       |
| Webhook auto-register  | Automatico (Messenger/WA Meta), instrucoes (Instagram) | Instagram nao permite via API                             |
| Novos campos por canal | `metaAppId` + `metaAppSecret`                          | Necessarios para App Access Token e HMAC                  |

## 1. Novos campos no `config` do canal

Canais Meta passam a ter no `config` (MongoDB Mixed field):

```
Messenger:  { metaAppId, metaAppSecret, metaPageId, metaToken }
Instagram:  { metaAppId, metaAppSecret, metaPageId, metaToken }
WA Meta:    { metaAppId, metaAppSecret, metaToken, metaPhoneNumberId }
```

- `metaAppId` — App ID do Facebook App do tenant
- `metaAppSecret` — Chave Secreta do Aplicativo (App Secret)
- `metaPageId` — Page ID (Messenger) ou Instagram Account ID (Instagram) — ja existe
- `metaToken` — Page Access Token — ja existe
- `metaPhoneNumberId` — Phone Number ID (WA Meta) — ja existe

Nada muda para canais Baileys e Web Chat.

## 2. Webhook flow (novo)

Fluxo atual:

```
POST /chat/webhook/meta
  → Valida HMAC com META_APP_SECRET global
  → Parseia JSON
  → Enfileira job
```

Fluxo novo:

```
POST /chat/webhook/meta
  1. Captura raw body (ja faz hoje)
  2. Parseia JSON para extrair entry[].id (accountId)
  3. Busca canal no MongoDB:
     - Messenger/Instagram: Channel.findOne({ 'config.metaPageId': accountId, isActive: true })
     - WA Meta: Channel.findOne({ 'config.metaPhoneNumberId': accountId, isActive: true })
  4. Se nao encontrou canal → 200 (silencioso, ignora)
  5. Extrai config.metaAppSecret do canal
  6. Valida HMAC-SHA256(raw body, metaAppSecret) contra X-Hub-Signature-256
  7. Se HMAC invalido → 401
  8. Se valido → enfileira PROCESS_INCOMING (fluxo atual continua)
```

### Index necessario

Criar index no model Channel:

```
{ 'config.metaPageId': 1, isActive: 1 }
```

O index em `config.metaPhoneNumberId` tambem, mas WA Meta tem menor volume — pode ser adicionado depois.

### Identificacao do tipo de canal no webhook

O webhook payload traz `object` que identifica a origem:

- `object === 'page'` → Messenger (busca por `config.metaPageId`)
- `object === 'instagram'` → Instagram (busca por `config.metaPageId`)
- Outros (`object !== 'page' && object !== 'instagram'`) → WA Meta (busca por `config.metaPhoneNumberId` usando `entry[].id`)

## 3. Auto-registro do webhook

Ao criar ou atualizar um canal Meta, o backend tenta registrar o webhook automaticamente via Graph API.

### Passo A — Registrar callback URL no App

```
POST https://graph.facebook.com/v25.0/{metaAppId}/subscriptions
  object=page
  callback_url={CHAT_WEBHOOK_PUBLIC_URL}
  verify_token={META_WEBHOOK_VERIFY_TOKEN}
  fields=messages,messaging_postbacks
  access_token={metaAppId}|{metaAppSecret}
```

- App Access Token e gerado por concatenacao: `{metaAppId}|{metaAppSecret}`
- Funciona para todos os tipos (Messenger, Instagram, WA Meta)
- Se a subscription ja existe, o POST a reativa/atualiza

### Passo B — Inscrever Page nos webhooks (so Messenger)

```
POST https://graph.facebook.com/v25.0/{metaPageId}/subscribed_apps
  subscribed_fields=messages,messaging_postbacks
  access_token={metaToken}
```

- Requer permissoes `pages_manage_metadata` + `pages_show_list` no token
- So funciona para Facebook Pages (Messenger)
- **NAO funciona para Instagram** — inscricao de Instagram webhooks so e possivel pelo dashboard do Meta for Developers

### Comportamento

- Executa na criacao do canal e na atualizacao (se `metaAppId`, `metaAppSecret`, ou `metaPageId` mudaram)
- Se falhar: canal e criado normalmente, mas retorna warning no response
- Nao bloqueia criacao — tenant pode ter configurado manualmente
- Response inclui campo `webhookSetup`:
  ```json
  {
    "success": true,
    "data": { ... },
    "meta": {
      "webhookSetup": {
        "appSubscription": "ok" | "failed: <reason>",
        "pageSubscription": "ok" | "failed: <reason>" | "not_applicable"
      }
    }
  }
  ```

### Callback URL

Nova env `CHAT_WEBHOOK_PUBLIC_URL` (opcional). Default: `${CHAT_SERVER_URL}/chat/webhook/meta`.

Necessaria porque em producao o `CHAT_SERVER_URL` pode ser interno (Docker network), mas o webhook precisa da URL publica.

## 4. Frontend — formulario

### Novos campos

O `MetaSocialFields` (Messenger/Instagram) e `WhatsAppFields` (quando broker=META) ganham:

- **App ID** — campo texto
  - Helper: "Encontre em Meta for Developers > seu App > Configuracoes > Basico"
- **App Secret** — campo password (type="password" com toggle de visibilidade)
  - Helper: "Chave Secreta do Aplicativo (mesmo painel, clique Mostrar)"

### Validacao

Schema Zod (`channelFormSchema`) — `metaAppId` e `metaAppSecret` obrigatorios quando:

- `channelType === 'MESSENGER'`
- `channelType === 'INSTAGRAM'`
- `channelType === 'WHATSAPP' && brokerType === 'META'`

### Bloco de instrucoes para Instagram

Apos criacao de canal Instagram, exibir alerta:

> "O webhook foi registrado automaticamente no seu App. Porem, o Instagram requer uma etapa manual: va ao Meta for Developers > seu App > Instagram > Webhooks e ative o campo `messages`."

### Botao "Testar Conexao" (validate-meta)

Continua existindo. Agora tambem valida o App Access Token (`{metaAppId}|{metaAppSecret}`) fazendo uma chamada de teste:

```
GET https://graph.facebook.com/v25.0/{metaAppId}?access_token={metaAppId}|{metaAppSecret}
```

Se retornar sucesso, as credenciais do App estao corretas.

## 5. Envs

| Env                         | Status              | Descricao                                                                                  |
| --------------------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| `META_APP_SECRET`           | **Removida**        | Agora e por canal (`config.metaAppSecret`)                                                 |
| `META_WEBHOOK_VERIFY_TOKEN` | **Mantida**         | Global, usada na verificacao GET do webhook                                                |
| `CHAT_WEBHOOK_PUBLIC_URL`   | **Nova** (opcional) | URL publica do webhook para auto-registro. Default: `${CHAT_SERVER_URL}/chat/webhook/meta` |

### Atualizacoes em arquivos de env

- `.env.example` — remover `META_APP_SECRET`, adicionar `CHAT_WEBHOOK_PUBLIC_URL`
- `.env.example.prod` — idem
- `packages/env/src/index.ts` — remover `META_APP_SECRET`, adicionar `CHAT_WEBHOOK_PUBLIC_URL`

## 6. Documentacao

### `docs/MULTI-CHANNEL-SETUP.md`

Reescrever secoes 2 e 3 (Messenger e Instagram) para refletir autonomia:

- Remover passo "configurar App Secret na VPS" (agora e por canal no form)
- Remover passo "configurar webhook manualmente" (agora e automatico)
- Novo fluxo: tenant cria Facebook App → preenche App ID + Secret + Page ID + Token no form → sistema registra webhook automaticamente
- Instagram: manter instrucao manual para inscricao de webhook no dashboard
- Secao 4 (WhatsApp Meta): adicionar campos App ID + Secret ao fluxo

### `docs/CHAT-SPEC.md`

Atualizar secao "Meta API" para mencionar que App Secret e por canal, nao global.

### `CLAUDE.md`

Nenhuma mudanca necessaria (ja documenta a estrutura correta).

## 7. Arquivos impactados

| Arquivo                                                             | Mudanca                                                                                                                     |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `apps/chat-server/src/infra/http/routes/webhook-routes.ts`          | Inverter fluxo: parse → busca canal → HMAC. Remover refs a `env.META_APP_SECRET`                                            |
| `apps/chat-server/src/infra/http/routes/channel-routes.ts`          | Aceitar `metaAppId`/`metaAppSecret` no create/update. Auto-registrar webhook via Graph API. Retornar `webhookSetup` no meta |
| `apps/web/src/features/channels/components/channel-form-fields.tsx` | Novos campos App ID + App Secret para MetaSocialFields e WhatsAppFields (META)                                              |
| `apps/web/src/features/channels/lib/schemas.ts`                     | Adicionar `metaAppId` e `metaAppSecret` com validacao condicional                                                           |
| `apps/web/src/features/channels/components/channel-form-sheet.tsx`  | Incluir novos campos no payload de create/update                                                                            |
| `apps/web/src/features/channels/types.ts`                           | Atualizar tipos de payload                                                                                                  |
| `packages/env/src/index.ts`                                         | Remover `META_APP_SECRET`, adicionar `CHAT_WEBHOOK_PUBLIC_URL`                                                              |
| `packages/db-chat/src/models/channel.model.ts`                      | Adicionar index `{ 'config.metaPageId': 1, isActive: 1 }`                                                                   |
| `.env.example`                                                      | Remover `META_APP_SECRET`, adicionar `CHAT_WEBHOOK_PUBLIC_URL`                                                              |
| `.env.example.prod`                                                 | Idem                                                                                                                        |
| `.env`                                                              | Remover `META_APP_SECRET` (local dev)                                                                                       |
| `docs/MULTI-CHANNEL-SETUP.md`                                       | Reescrever para autonomia do tenant                                                                                         |
| `docs/CHAT-SPEC.md`                                                 | Atualizar secao Meta API                                                                                                    |

## 8. Fora de escopo

- Criptografia at rest para campos sensiveis (iniciativa separada)
- Cache Redis de `accountId → appSecret` (premature optimization)
- Verify token por canal (sem ganho, GET nao identifica canal)
- Migrar tenants existentes (nao ha tenants em producao)
