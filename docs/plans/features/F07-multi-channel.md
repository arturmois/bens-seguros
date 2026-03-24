# F07. Multi-Channel (Web Chat + Instagram + Telegram)

> **Esforco:** G (2-4 semanas por canal) | **Impacto:** Aquisicao + Receita | **Prioridade:** Mes 4-5

---

## Descricao

Expandir alem de WhatsApp para web widget (embed no site da corretora), Instagram DM e Telegram.

## Por Que

- Diversificacao reduz dependencia de WhatsApp (que pode bloquear numeros)
- Web chat captura leads do site da corretora
- Instagram/Telegram atingem publicos diferentes

## Problema que Resolve

Leads que preferem outros canais sao perdidos. Site da corretora nao tem chat.

## Implementacao por Canal

### Canal 1: Web Chat Widget (Prioridade)

Widget embedavel no site da corretora via `<script>` tag.

```html
<!-- No site da corretora -->
<script src="https://chat.bensseg.com/widget.js" data-channel="ch_xxx"></script>
```

**Backend:**

- Novo tipo de channel: `WEB_CHAT`
- Endpoint REST para envio/recebimento sem autenticacao (visitor = anonymous)
- Socket.IO namespace `/widget` com rate limiting

**Frontend:**

- Widget standalone (React, build separado, ~50KB)
- Botao flutuante → chat expandivel
- Campos de captura: nome, email, telefone (lead)
- Integrado ao mesmo ConversationModel do MongoDB

**Esforco:** M (1-2 semanas)

### Canal 2: Instagram DM

Via Meta Graph API (mesma infra do WhatsApp Business).

**Backend:**

- Webhook listener para Instagram messages
- Novo broker: `InstagramBroker` (similar ao `MetaWhatsAppBroker`)
- Channel type: `INSTAGRAM`

**Esforco:** M (1-2 semanas)

### Canal 3: Telegram

Via Telegram Bot API.

**Backend:**

- Webhook ou long polling
- Novo broker: `TelegramBroker`
- Channel type: `TELEGRAM`

**Esforco:** M (1 semana — API mais simples)

## Arquitetura

O `chat-worker` ja tem dual-broker pattern (Baileys + Meta). Expandir para multi-broker:

```typescript
interface MessageBroker {
  sendMessage(
    channel: Channel,
    to: string,
    content: MessageContent
  ): Promise<void>
  handleIncoming(payload: unknown): Promise<IncomingMessage>
}

// Registro:
brokers.set('WHATSAPP_BAILEYS', new BaileysBroker())
brokers.set('WHATSAPP_META', new MetaWhatsAppBroker())
brokers.set('WEB_CHAT', new WebChatBroker())
brokers.set('INSTAGRAM', new InstagramBroker())
brokers.set('TELEGRAM', new TelegramBroker())
```

## Dependencias

- Abstracacao de broker (refatorar chat-worker)
- Channel model aceitar novos tipos

## Criterios de Aceite

### Web Chat

- [ ] Widget embedavel via `<script>` tag
- [ ] Visitor sem autenticacao envia mensagens
- [ ] Captura de lead (nome, email, telefone)
- [ ] Conversas aparecem no mesmo painel do operador
- [ ] AI bot funciona no web chat

### Instagram

- [ ] Webhook recebe DMs
- [ ] Respostas enviadas via Graph API
- [ ] Conversas unificadas no painel

### Telegram

- [ ] Bot registrado e funcional
- [ ] Mensagens bidirecionais
- [ ] Conversas unificadas no painel
