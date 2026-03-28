# Bens Seguros - Chat & Messaging Specification

> Especificacao detalhada do sistema de chat em tempo real.
> Resolve todos os gaps identificados na analise de seguranca e arquitetura.

---

## 1. Modelo de Conversa

### Principio: Conversa = Atendimento Unico

Cada conversa e um atendimento isolado com inicio e fim. Nunca reaberta.

```
Cliente manda msg
  → busca conversa ABERTA do mesmo contato + canal
  → se existe: msg vai pra conversa existente
  → se NAO existe: CRIA nova conversa
  → conversa fechada NUNCA reabre
```

### State Machine (4 estados)

```
                    ┌──────────────┐
  canal com AI ───> │  BOT_ACTIVE  │
                    └──────┬───────┘
                           │ escala (pedido cliente / 3 interacoes / threshold)
                           ▼
  canal sem AI ───> ┌──────────────────┐
                    │  WAITING_HUMAN   │ ← fila visivel para agentes
                    └──────┬───────────┘
                           │ agente clica "Assumir"
                           ▼
                    ┌──────────────────┐
                    │  HUMAN_ACTIVE    │ ← assignedTo = agentId
                    └──────┬───────────┘
                           │ agente fecha OU auto-close 24h
                           ▼
                    ┌──────────────────┐
                    │     CLOSED       │ ← terminal, nunca reabre
                    └──────────────────┘
```

### Transicoes

| De              | Para            | Trigger                                                          |
| --------------- | --------------- | ---------------------------------------------------------------- |
| `BOT_ACTIVE`    | `WAITING_HUMAN` | Cliente pede humano, 3 interacoes sem resolucao, AI indisponivel |
| `WAITING_HUMAN` | `HUMAN_ACTIVE`  | Agente clica "Assumir"                                           |
| `HUMAN_ACTIVE`  | `WAITING_HUMAN` | Agente devolve para fila (limpa `assignedTo`)                    |
| `HUMAN_ACTIVE`  | `CLOSED`        | Agente clica "Finalizar"                                         |
| `BOT_ACTIVE`    | `CLOSED`        | Auto-close 24h sem mensagem                                      |
| `WAITING_HUMAN` | `CLOSED`        | Auto-close 24h sem mensagem                                      |
| `HUMAN_ACTIVE`  | `CLOSED`        | Auto-close 24h sem mensagem                                      |

### Auto-close

- Job BullMQ repeatable: a cada 1h verifica conversas com `updatedAt < now - 24h` e status != CLOSED
- Fecha automaticamente, msg de sistema: "Atendimento encerrado por inatividade"

### Historico

- Nova conversa do mesmo contato: agente ve painel lateral "Historico" com conversas anteriores
- Conversas anteriores colapsadas, clicavel para expandir mensagens
- Nao carrega mensagens antigas automaticamente (lazy load ao expandir)
- Se contato vinculado a Client no ERP: mostra card do cliente + propostas + apolices

---

## 2. Atribuicao de Agente

### Modelo: Fila + Claim Manual

```
Conversa WAITING_HUMAN
  → visivel para todos agentes online da org
  → agente clica "Assumir" → HUMAN_ACTIVE + assignedTo = userId
  → se ninguem assume em 5 min → notificacao para MANAGER/ADMIN
```

### Acoes do Agente

- **Assumir:** claim da conversa
- **Transferir:** muda `assignedTo` para outro agente + msg sistema "Transferido para {nome}"
- **Devolver para fila:** volta `WAITING_HUMAN`, limpa `assignedTo` + msg sistema "Devolvido para fila"
- **Finalizar:** status → `CLOSED` + msg sistema "Atendimento finalizado por {nome}"

### Regras

- Apenas 1 agente por conversa (sem co-atendimento)
- Race condition: `findOneAndUpdate` com condicao `assignedTo: null` (atomico no MongoDB)
- Conversa `WAITING_HUMAN` destaque visual: borda amarela na lista

---

## 3. Brokers e Canais

### Tipos de Canal (4)

| Tipo                  | Broker                   | Protocolo      | Configuracao                              |
| --------------------- | ------------------------ | -------------- | ----------------------------------------- |
| `WHATSAPP` (Baileys)  | BaileysConnectionManager | WebSocket (QR) | QR code em Settings > Canais              |
| `WHATSAPP` (Meta API) | MetaWhatsAppBroker       | Webhook HMAC   | Token + phoneNumberId                     |
| `MESSENGER`           | Meta API                 | Webhook HMAC   | Facebook Page token + page ID             |
| `INSTAGRAM`           | Meta API                 | Webhook HMAC   | Instagram account linked to Facebook Page |
| `WEB_CHAT`            | Socket.IO direto         | WebSocket      | Widget embed + allowed origins            |

### Principio: Multi-canal Independente, 1 Broker por Canal

Cada Canal tem SEU broker. Sem failover entre canais (numeros/paginas diferentes confundiriam o cliente).

### Configuracao por Canal

```
Canal 1: Baileys + numero +55 11 99999-0001 (vendedor Joao)
Canal 2: Meta API WhatsApp + numero +55 11 88888-0000 (comercial principal)
Canal 3: Messenger + Pagina Facebook "Corretora ABC"
Canal 4: Instagram + Conta @corretoraabc
Canal 5: Web Chat + Widget embedado no site
```

### Baileys (WhatsApp)

- Conexao via QR code (admin escaneia em Settings > Canais)
- Sessao persistida em MongoDB (`BaileysAuthState`)
- Reconexao automatica via creds salvas (sem QR novamente)
- Se creds invalidas: status `DISCONNECTED`, admin re-escaneia QR
- Limite: max 10 canais Baileys por org (~100MB RAM cada)
- `BaileysConnectionManager` mantem `Map<channelId, WASocket>` no chat-worker

### Meta API (WhatsApp, Messenger, Instagram)

- Webhook compartilhado: `POST /chat/webhook/meta` com validacao HMAC-SHA256 (`META_APP_SECRET`)
- Roteamento por campo: `entry[].messaging` (Messenger/Instagram) vs `entry[].changes` (WhatsApp)
- Messenger: requer Facebook Page token + subscription `messages`, `messaging_postbacks`
- Instagram: requer Instagram account vinculada a Facebook Page + subscription `messages`
- WhatsApp: requer phoneNumberId + token
- Validacao de credenciais: `POST /chat/channels/validate-meta` (verifica token antes de salvar)
- Sempre online (sem QR, sem sessao)
- Custo por mensagem (WhatsApp); gratuito (Messenger/Instagram dentro de janela 24h)

### Web Chat

- Sem broker externo — conexao direta via Socket.IO entre widget e chat-server
- Widget embedavel: `<script src=".../embed.js" data-channel-id="...">`
- Visitante preenche nome + telefone → contato criado automaticamente
- Allowed origins configuradas por canal (CORS)

### Broker Interface (codigo)

```ts
interface Broker {
  sendMessage(payload: MessagePayload): Promise<MessageResult>
  isConnected(): boolean
}
```

### Regras

- Cada canal opera 100% independente
- Deduplicacao por `externalId` (evita duplicar msg se ambos brokers recebem)
- Admin gerencia canais em Settings > Canais (CRUD)
- Status do canal visivel em tempo real (CONNECTED, DISCONNECTED, QR_PENDING)

---

## 4. Media

### Recebimento: Todos os Tipos

- Aceitar: IMAGE, AUDIO, VIDEO, DOCUMENT do WhatsApp
- Ao receber media: download imediato do broker → upload para R2 → salvar `mediaKey` no Message
- Nunca armazenar URL temporaria do Meta/Baileys (expira em 24h)
- Media vai direto pro R2 desde o dia 1 (sem migration job)

### Envio pelo Agente: Texto + Imagem

- Texto: sempre disponivel
- Imagem: upload via drag-and-drop, clipboard paste, ou botao de upload
- Audio, video, documento: envio futuro (nao no lancamento)
- Limite: imagem max 5MB

### Exibicao no Chat

- Imagens: inline com thumbnail, clicavel para expandir
- Audio: player inline com botao play/pause
- Video: thumbnail + play (abre em modal)
- Documento: icone + nome do arquivo + link download (presigned URL R2, expira 1h)

### Storage

- Bucket R2: `{tenantId}/chat/{conversationId}/{messageId}-{filename}`
- Presigned URLs para download (expiram em 1h)
- TTL das mensagens (730 dias) tambem apaga media associada

---

## 5. Bot AI

### Ativacao

- Bot ativo apenas se Canal tem `aiUserId` configurado
- Nova conversa em canal com AI → status `BOT_ACTIVE`
- Nova conversa em canal sem AI → status `WAITING_HUMAN`

### System Prompt

- Configuravel pelo admin por canal em Settings > Canais > AI
- Default: "Voce e um assistente de uma corretora de seguros. Responda de forma educada e profissional em portugues brasileiro."
- Campos configuraveis: system prompt, temperature, max tokens, provider (claude/openai)

### Contexto

- Ultimas 10 mensagens da conversa enviadas como contexto
- Nome do contato incluido no prompt

### Escalacao para Humano

Bot transfere para `WAITING_HUMAN` quando:

1. Cliente pede explicitamente ("quero falar com atendente/humano/pessoa")
2. Bot detecta que nao consegue resolver (responde com msg de transferencia)
3. Apos 3 interacoes sem resolucao
4. AI provider indisponivel (timeout/erro)

Ao escalar:

- Status → `WAITING_HUMAN`
- Msg sistema: "Transferido para um atendente. Aguarde."
- Notifica agentes online via Socket.IO

### Rate Limits

- Max 20 respostas AI por conversa (evita loop infinito)
- Apos limite: escala para humano automaticamente
- Se AI provider retorna erro: conversa vai direto para `WAITING_HUMAN`

---

## 6. Lead Capture

### Fluxo: Manual com Pre-preenchimento

```
Agente no chat → clica "Capturar Lead" → Sheet lateral abre

Formulario pre-preenchido:
  Nome: "Carlos" (pushName do WhatsApp)
  Telefone: "+5511999990000" (numero do contato)
  Email: (vazio)
  CPF: (vazio - agente preenche)
  Tipo seguro: (dropdown - agente seleciona)
  Valor estimado: (vazio)
  [✓] Cliente autorizou contato (LGPD) ← obrigatorio

Agente completa e salva →
  Cria Client tipo LEAD no PostgreSQL
  Vincula Contact (MongoDB) ao Client (PostgreSQL) via clientId
```

### Contato Ja Vinculado

- Se contato ja vinculado a Client existente: mostra aviso "Este contato ja esta vinculado a Joao Silva"
- Botao "Ver cliente" abre detalhe no ERP

### Proximas Conversas

- Ao abrir conversa de contato vinculado: header mostra card do cliente (nome, tipo, propostas ativas)
- Agente tem contexto imediato

### Regras

- LGPD: checkbox obrigatorio "Cliente autorizou contato"
- CPF validado (formato + digitos verificadores)
- Duplicata: se CPF ja existe na org → erro "Cliente com este CPF ja cadastrado"

---

## 7. Presence e Typing

### Entre Agentes

- Heartbeat Socket.IO a cada 30s: `agent:heartbeat`
- Sem heartbeat por 2 min → agente considerado offline
- Lista de conversas mostra dot verde/cinza por agente online/offline
- Util para saber quem pode assumir conversa

### Typing Indicator

- Agente digitando → `conversation:typing-start` (debounce 2s)
- Broadcast para room da conversa
- Outros agentes veem "{nome} esta digitando..."
- Auto-clear apos 5s sem keystroke

### NAO implementar

- Status online do cliente (WhatsApp nao fornece de forma confiavel via Baileys)
- Last seen do agente (nao relevante para operacao)

---

## 8. Unread Counts

### Calculo

- `UnreadCount` collection: `{ conversationId, userId, count, lastReadAt }`
- Msg recebida → incrementa count para todos agentes da org EXCETO o remetente
- Agente abre conversa → zera count + atualiza `lastReadAt`

### Exibicao

- Lista de conversas: badge numerico por conversa (ex: "3")
- Sidebar: icone Chat com badge total de conversas com nao lidas
- Conversas com nao lidas ordenadas no topo da lista

### Real-time

- Pub/sub `chat:unread-update` atualiza badges via Socket.IO
- Reconexao: client busca unread counts do MongoDB (catch-up)

### Som

- Notificacao sonora ao receber msg em conversa nao focada
- Toggle em Settings do usuario (on/off)

---

## 9. Socket.IO: Tenant Isolation e Missed Events

### Isolamento

- Rooms prefixadas: `tenant:{orgId}:conversation:{conversationId}`
- Ao fazer join: server valida que usuario pertence a org (extrair orgId do JWT, nunca do client)
- Emit sempre via `io.to('tenant:{orgId}:...')`
- Agente ao conectar: join automatico em `tenant:{orgId}:lobby` (recebe eventos gerais da org)

### Auth

- JWT validado no handshake (`socket.handshake.auth.token`)
- orgId extraido do JWT (nunca confiado no client)
- Se JWT expira: Socket.IO desconecta, client reconecta com novo token

### Missed Events (Catch-up)

- Ao reconectar: client envia `lastEventTimestamp`
- Server busca mensagens no MongoDB com `createdAt > lastEventTimestamp`
- Envia batch de catch-up (max 100 msgs)
- Se offline por muito tempo: client faz full reload da lista de conversas

### Eventos Socket.IO

| Evento                          | Direcao         | Payload                         |
| ------------------------------- | --------------- | ------------------------------- |
| `chat:incoming-message`         | Server → Client | message data                    |
| `chat:message-status`           | Server → Client | messageId, status               |
| `chat:send-message`             | Client → Server | conversationId, text, mediaKey? |
| `chat:subscribe-conversation`   | Client → Server | conversationId                  |
| `chat:unsubscribe-conversation` | Client → Server | conversationId                  |
| `chat:assign-conversation`      | Client → Server | conversationId                  |
| `chat:close-conversation`       | Client → Server | conversationId                  |
| `chat:transfer-conversation`    | Client → Server | conversationId, toUserId        |
| `chat:unread-update`            | Server → Client | conversationId, count           |
| `conversation:typing-start`     | Client → Server | conversationId                  |
| `conversation:typing`           | Server → Client | conversationId, userName        |
| `agent:heartbeat`               | Client → Server | —                               |
| `agent:status-update`           | Server → Client | userId, status                  |
| `channel:status`                | Server → Client | channelId, status, qr?          |

---

## 10. Redis Down e Error Recovery

### Principio: MongoDB e fonte da verdade, Redis e acelerador

| Componente  | Redis OK                            | Redis DOWN                                   |
| ----------- | ----------------------------------- | -------------------------------------------- |
| Receber msg | Salva MongoDB + pub/sub → Socket.IO | Salva MongoDB. Frontend nao recebe real-time |
| Enviar msg  | BullMQ enfileira job                | Message fica PENDING no MongoDB              |
| Real-time   | Socket.IO via Redis adapter         | Socket.IO local only (single instance)       |
| Catch-up    | —                                   | Cron job re-enfileira msgs PENDING > 2min    |

### Reconexao

- ioredis tem retry built-in com exponential backoff
- Apos reconnect: BullMQ retoma, pub/sub resubscribe, cron para de compensar
- Sentry alerta erro de conexao Redis

---

## 11. BullMQ: Filas, Retry, DLQ

### Filas

| Fila                    | Funcao                          | Concurrency        |
| ----------------------- | ------------------------------- | ------------------ |
| `chat-send-message`     | Enviar msg via broker           | 5                  |
| `chat-process-incoming` | Persistir msg recebida          | 3                  |
| `chat-ai-bot`           | Gerar resposta AI               | 3                  |
| `chat-auto-close`       | Fechar conversas inativas       | 1 (repeatable: 1h) |
| `chat-dead-letter`      | Jobs falhados para investigacao | — (nao processada) |

### Retry

- 3 tentativas com backoff exponencial (1s, 4s, 16s)
- Erro permanente (numero invalido, conta banida): FAILED imediatamente, sem retry
- Rate limit (429): respeita header `Retry-After` do WhatsApp
- Job timeout: 30s (evita worker travado)

### Dead Letter Queue

- Apos 3 falhas transientes: job move para `chat-dead-letter`
- Message status → `FAILED` no MongoDB
- Pub/sub emite `MESSAGE_STATUS` → frontend mostra icone de erro
- Agente pode clicar "Reenviar" (cria novo job)
- DLQ visivel no Bull Board para admin investigar

### Classificacao de Erros

| Tipo       | Exemplo                                | Acao                           |
| ---------- | -------------------------------------- | ------------------------------ |
| Permanente | Numero invalido, conta banida, blocked | FAILED imediato, sem retry     |
| Transiente | Timeout, 500, rede                     | Retry 3x com backoff           |
| Rate limit | 429                                    | Retry com `Retry-After` header |

---

## 12. Performance e Limites

### Targets

| Metrica                          | Limite                 |
| -------------------------------- | ---------------------- |
| Conversas simultaneas por org    | 50                     |
| Canais Baileys por org           | 10 (~100MB RAM cada)   |
| Canais Meta por org              | ilimitado              |
| Mensagens por segundo por org    | ~10                    |
| Conexoes Socket.IO por org       | 100                    |
| Mensagens por conversa (display) | 1000 (paginacao apos)  |
| Lista de conversas por pagina    | 50 (cursor pagination) |

### MongoDB Indexes

```
conversations: (tenantId, status)
conversations: (tenantId, contactId, channelId) unique
conversations: (tenantId, updatedAt: -1)
messages: (conversationId, createdAt: -1)
messages: (tenantId, createdAt: 1) TTL 730 dias
unread_counts: (conversationId, userId) unique
```

### Otimizacoes

- Lista de mensagens: virtualizacao com `react-window` para conversas 500+ msgs
- Preview de conversa: truncar texto em 100 chars
- Baileys: max 10 canais por org (guardrail de RAM no chat-worker)
- Media: upload direto para R2 (nao passa pelo server, presigned URL)

---

## 13. Tenant Isolation (Seguranca)

### MongoDB

- **TODAS** as collections tem campo `tenantId` obrigatorio
- Toda query inclui `tenantId` no filtro
- Index em `tenantId` como primeiro campo de todos indexes compostos
- Nunca confiar em `tenantId` do client — resolver do JWT/session

### Socket.IO

- Rooms prefixadas: `tenant:{orgId}:*`
- Join validado server-side (orgId do JWT)
- Emit sempre para room especifica (nunca broadcast global)

### API Routes

- Middleware extrai `tenantId` do JWT antes de qualquer query
- Rate limit por `tenantId` (evita 1 tenant impactar outros)

---

## 14. Decisoes Registradas

| #       | Decisao                                                                                 |
| ------- | --------------------------------------------------------------------------------------- |
| CHAT-1  | 4 estados, conversa unica (nunca reabre), auto-close 24h, historico lateral             |
| CHAT-2  | Fila + claim manual, transfer entre agentes, devolver para fila, timeout 5min notifica  |
| CHAT-3  | Multi-canal independente, 1 broker por canal, sem failover entre numeros                |
| CHAT-4  | Receber tudo, enviar texto+imagem, media direto pro R2, presigned URLs                  |
| CHAT-5  | AI com guardrails, escala apos 3 interacoes ou pedido, max 20 respostas/conversa        |
| CHAT-6  | Lead capture manual com pre-preenchimento, LGPD obrigatorio, vincula contact→client     |
| CHAT-7  | Presence entre agentes (heartbeat 30s), typing indicator (debounce 2s)                  |
| CHAT-8  | Unread por conversa + global sidebar + som toggle + catch-up on reconnect               |
| CHAT-9  | Rooms prefixadas tenant, JWT server-side, catch-up max 100 msgs                         |
| CHAT-10 | MongoDB fonte da verdade, Redis acelerador, cron re-enfileira PENDING, Sentry alerta    |
| CHAT-11 | DLQ + FAILED status + reenviar manual, erros permanentes sem retry, 429 com Retry-After |
| CHAT-12 | 50 conversas/org, 10 Baileys/org, 100 Socket.IO/org, virtualizacao 500+ msgs            |
