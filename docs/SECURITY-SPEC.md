# Bens Seguros - Security Specification

> Especificacao de seguranca para protecao de dados sensiveis, LGPD, e comunicacao segura.

---

## 1. Regras Obrigatorias (Sem Opcao)

Aplicar em TODAS as fases de implementacao. Nao negociavel.

| #   | Regra                | Implementacao                                                                                |
| --- | -------------------- | -------------------------------------------------------------------------------------------- |
| S1  | Cache-Control        | `no-store, no-cache, must-revalidate` em todas rotas `/api/*`                                |
| S2  | Pino redaction       | `redact.paths: ['cpf','cnpj','email','phone','password','token','birthDate']` → `[REDACTED]` |
| S3  | Sentry beforeSend    | Strip PII (cpf, email, phone, request body) antes de enviar                                  |
| S4  | MongoDB auth         | Habilitar `--auth` + SSL/TLS em producao. Nunca sem senha                                    |
| S5  | sameSite cookies     | `sameSite: 'lax'`, `httpOnly: true`, `secure: true`                                          |
| S6  | Request body limit   | Fastify `bodyLimit: 10 * 1024 * 1024` (10MB)                                                 |
| S7  | Error messages safe  | Producao: mensagem amigavel. Nunca regex, stack trace, query SQL                             |
| S8  | Zustand sem tokens   | Nunca persistir auth tokens, session IDs, ou secrets no localStorage                         |
| S9  | Presigned URLs 15min | R2 presigned URLs expiram em 15 minutos, GET-only, audit log no acesso                       |
| S10 | File type validation | Validar magic bytes (`file-type` lib), nao apenas extensao. Block executaveis                |
| S11 | Socket.IO rate limit | Max 10 msgs/seg por usuario via rate limiter (bottleneck)                                    |
| S12 | UUIDs everywhere     | Prisma usa CUID. Nunca IDs sequenciais/enumeraveis em URLs                                   |
| S13 | `/docs` protegido    | Swagger/Scalar atras de auth em producao + `X-Robots-Tag: noindex`                           |
| S14 | Content-Type enforce | Mutacoes aceitam apenas `application/json`. Rejeitar `form-urlencoded`                       |
| S15 | DB user restrito     | App user sem DDL (no CREATE/DROP TABLE). AuditLog sem DELETE                                 |
| S16 | DB ports nao-padrao  | PostgreSQL `5439:5432`, MongoDB `27027:27017` em producao                                    |
| S17 | Busca por POST       | Endpoints de busca com PII usam POST (nao GET com query params)                              |

---

## 2. Criptografia de PII (SEC-1)

### Campos Encriptados

| Campo                 | Storage               | Metodo                                                                        |
| --------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `document` (CPF/CNPJ) | PostgreSQL            | Campo `documentEncrypted` (AES-256-GCM) + `documentHash` (SHA-256 para busca) |
| `document` (CPF/CNPJ) | MongoDB (LeadCapture) | Mongoose field-level encryption                                               |
| Baileys credentials   | MongoDB               | Field-level encryption (AES-256)                                              |

### Campos NAO Encriptados (protegidos por RLS + acesso restrito)

- email, phone, address, birthDate, profession, maritalStatus
- Protecao: RLS no PostgreSQL, `tenantId` no MongoDB, acesso ao banco restrito

### Busca por CPF/CNPJ

```ts
// Armazenamento
client.documentEncrypted = encrypt(cpf); // AES-256-GCM
client.documentHash = sha256(normalize(cpf)); // Para busca

// Busca
const hash = sha256(normalize(inputCpf));
const client = await prisma.client.findFirst({
  where: { organizationId, documentHash: hash },
});
```

### Chaves de Criptografia

- `ENCRYPTION_KEY` em `.env` (min 32 chars)
- Nunca commitada no repositorio
- Rotacao: gerar nova chave, re-encriptar campos em batch (job do worker)

---

## 3. Presenter Pattern - PII nas Respostas (SEC-2)

### 3 Niveis de Exposicao

```ts
// List (todas as roles)
ClientPresenter.toList(client) → {
  id, name, type, tags, createdAt,
  document: '***456.789-**',  // mascarado
  // SEM email, phone, address, birthDate
}

// Detail (COMMERCIAL - apenas seus clientes)
ClientPresenter.toDetail(client, 'COMMERCIAL', userId) → {
  id, name, type, tags, createdAt,
  document: salespersonId === userId ? '123.456.789-00' : '***456.789-**',
  email, phone, address, birthDate,
}

// Detail (MANAGER, ADMIN, OWNER)
ClientPresenter.toDetail(client, 'MANAGER') → {
  id, name, type, tags, createdAt,
  document: '123.456.789-00',  // completo
  email, phone, address, birthDate,
}
```

### Regras

- Nunca retornar `documentEncrypted` ou `documentHash` na API
- VIEWER: ve apenas dados mascarados (list level)
- Mesmo padrao para Proposal (mascarar premiumValue para VIEWER)
- Presenter implementado no handler, nunca no use case (domain nao conhece roles de API)

---

## 4. LGPD: Direito de Exclusao (SEC-3)

### Fluxo de Exclusao

```
OWNER/ADMIN → Settings > Clientes > [cliente] > "Exclusao LGPD"
  → Dialog: "Acao irreversivel. Digite o nome do cliente para confirmar"
  → Digita nome → botao "Excluir dados" (destructive)
  → Cria job no worker: lgpd-deletion
```

### Job de Exclusao (Worker)

```ts
async processLgpdDeletion(clientId: string, organizationId: string) {
  // 1. ANONIMIZAR PII no PostgreSQL
  await prisma.client.update({
    where: { id: clientId },
    data: {
      name: 'Cliente removido',
      documentEncrypted: null,
      documentHash: null,
      email: null,
      phone: null,
      address: null,
      birthDate: null,
      profession: null,
      maritalStatus: null,
      tags: [],
      consentLgpd: false,
      deletedAt: new Date(),
    },
  })

  // 2. MANTER registros transacionais (exigencia fiscal 5 anos)
  // Proposals, Policies, Commissions: manter com clientId anonimizado
  // Ja nao tem PII pois client foi anonimizado

  // 3. APAGAR dados do chat (MongoDB)
  const contacts = await Contact.find({ clientId })
  for (const contact of contacts) {
    await Message.deleteMany({ conversationId: { $in: conversationIds } })
    await Conversation.deleteMany({ contactId: contact._id })
  }
  await Contact.deleteMany({ clientId })

  // 4. APAGAR documentos do R2
  const documents = await prisma.document.findMany({
    where: { clientId, organizationId },
  })
  for (const doc of documents) {
    await r2.deleteObject({ Key: doc.storageKey })
  }
  await prisma.document.deleteMany({ where: { clientId } })

  // 5. ANONIMIZAR audit logs
  await prisma.auditLog.updateMany({
    where: { entityType: 'Client', entityId: clientId },
    data: { before: null, after: null }, // Remove snapshots com PII
  })

  // 6. REGISTRAR exclusao
  await prisma.auditLog.create({
    data: {
      organizationId,
      action: 'LGPD_DELETION',
      entityType: 'Client',
      entityId: clientId,
      // SEM PII, apenas registro da acao
    },
  })
}
```

### Regras

- Irreversivel (sem undo)
- Apenas OWNER e ADMIN podem executar
- Confirmacao forte (digitar nome do cliente)
- Registros transacionais mantidos por 5 anos (exigencia fiscal)
- Job assincrono (pode demorar se muitos documentos)

---

## 5. PII para AI Providers (SEC-4)

### Pipeline de Redacao

```ts
function redactPii(text: string): string {
  return text
    .replace(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g, '[CPF]')
    .replace(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g, '[CNPJ]')
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.]+\b/g, '[EMAIL]')
    .replace(/\+?55\s?\(?\d{2}\)?\s?\d{4,5}-?\d{4}/g, '[TELEFONE]')
    .replace(/\d{5}-?\d{3}/g, '[CEP]');
}
```

### Fluxo do Bot

```
Mensagem do cliente: "Meu CPF é 123.456.789-00"
  ↓ redactPii()
Enviado para Claude: "Meu CPF é [CPF]"
  ↓ Claude responde
Resposta: "Recebi. Um atendente irá verificar seus dados."
  ↓ salva no MongoDB (resposta do bot, sem PII)
```

### System Prompt Obrigatorio

```
Voce e um assistente de corretora de seguros.
NUNCA peca CPF, CNPJ, email ou dados pessoais ao cliente.
Se o cliente fornecer dados sensiveis, responda:
"Recebi, obrigado. Um atendente ira verificar seus dados com seguranca."
Oriente o cliente a fornecer dados pessoais apenas ao atendente humano.
```

### Auditoria

- Log de auditoria registra: conversationId, timestamp, provider usado
- NAO registra conteudo das mensagens enviadas para AI
- Usar API key dedicada por org (rastreabilidade)

---

## 6. CSRF Protection (SEC-5)

### 3 Camadas

```ts
// Camada 1: sameSite cookie
// packages/auth/src/index.ts (Better Auth config)
session: {
  cookieOptions: {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
  },
}

// Camada 2: Origin validation middleware
// apps/server/src/middlewares/csrf-middleware.ts
function csrfMiddleware(request, reply, done) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.origin || request.headers.referer
    const allowed = process.env.FRONTEND_URL

    if (!origin || !origin.startsWith(allowed)) {
      return reply.status(403).send({
        success: false,
        error: { code: 'CSRF_REJECTED', message: 'Origin not allowed' },
      })
    }
  }
  done()
}

// Camada 3: Content-Type enforcement
// apps/server/src/middlewares/content-type-middleware.ts
function contentTypeMiddleware(request, reply, done) {
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const ct = request.headers['content-type']
    if (ct && !ct.includes('application/json') && !ct.includes('multipart/form-data')) {
      return reply.status(415).send({
        success: false,
        error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Only JSON accepted' },
      })
    }
  }
  done()
}
```

---

## 7. Pino Log Redaction

```ts
// apps/server/src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  redact: {
    paths: [
      'cpf',
      'cnpj',
      'document',
      'email',
      'phone',
      'birthDate',
      'password',
      'token',
      'secret',
      'authorization',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.cpf',
      'req.body.cnpj',
      'req.body.document',
      'req.body.email',
      'req.body.phone',
    ],
    censor: '[REDACTED]',
  },
});
```

---

## 8. Sentry PII Filtering

```ts
// apps/web/src/lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  beforeSend(event) {
    // Strip PII from request body
    if (event.request?.data) {
      try {
        const data = JSON.parse(event.request.data);
        const piiFields = ['cpf', 'cnpj', 'document', 'email', 'phone', 'password', 'birthDate'];
        for (const field of piiFields) {
          if (data[field]) data[field] = '[REDACTED]';
        }
        event.request.data = JSON.stringify(data);
      } catch {}
    }

    // Strip PII from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((b) => {
        if (b.data?.url?.includes('cpf=')) {
          b.data.url = b.data.url.replace(/cpf=[^&]+/, 'cpf=[REDACTED]');
        }
        return b;
      });
    }

    // User context: only id + role, no email
    if (event.user) {
      event.user = { id: event.user.id };
    }

    return event;
  },
});
```

---

## 9. Seguranca de Documentos (R2)

### Upload

```ts
// Validacao no handler antes de salvar
const ALLOWED_MIME = {
  DRIVER_LICENSE: ['image/jpeg', 'image/png', 'application/pdf'],
  VEHICLE_REGISTRATION: ['image/jpeg', 'image/png', 'application/pdf'],
  POLICY_PDF: ['application/pdf'],
  CLAIM_PHOTO: ['image/jpeg', 'image/png'],
  CONTRACT: ['application/pdf'],
  OTHER: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword'],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
```

### Download (Presigned URL)

```ts
// Antes de gerar presigned URL:
// 1. Verificar que usuario pertence a org do documento
// 2. Verificar que usuario tem acesso a entidade pai (proposal, policy, claim)
// 3. COMMERCIAL: apenas documentos de seus proposals
// 4. Gerar URL com 15min TTL, GET-only
// 5. Registrar ACCESS_DOCUMENT no audit log
```

### R2 Bucket Config

- ACL: private (nunca public)
- Server-side encryption: AES-256
- CORS: apenas `FRONTEND_URL`
- Lifecycle: nenhum (TTL controlado pela app)

---

## 10. React Query Cache (Frontend)

### Mascaramento no Cache

```ts
// apps/web/src/features/clients/hooks/use-clients.ts
export function useClients(filters) {
  return useQuery({
    queryKey: ['clients', filters],
    queryFn: () => api.listClients(filters),
    // API ja retorna mascarado via Presenter (SEC-2)
    // Nao precisa mascarar no frontend se backend ja faz
  });
}
```

### Regras

- Backend Presenter ja mascara PII em list endpoints (SEC-2)
- Detail endpoint retorna PII completo apenas para roles permitidas
- React Query DevTools: desabilitar em producao (`ReactQueryDevtools` apenas em dev)
- Ao trocar de org: `queryClient.clear()` (limpa cache de outra org)
- Ao logout: `queryClient.clear()` (limpa tudo)

```tsx
// apps/web/src/providers/index.tsx
const queryClient = new QueryClient();

// Em producao: sem DevTools
{
  process.env.NODE_ENV === 'development' && <ReactQueryDevtools />;
}
```

---

## 11. Decisoes Registradas

| #      | Decisao                                                                               |
| ------ | ------------------------------------------------------------------------------------- |
| SEC-1  | CPF/CNPJ encriptado (AES-256) + hash SHA-256 para busca. Demais PII protegido por RLS |
| SEC-2  | Presenter por contexto + role: list mascarado, detail conforme permissao              |
| SEC-3  | LGPD: anonimizacao de PII + retencao fiscal 5 anos + delete chat/docs/R2              |
| SEC-4  | Redacao automatica de PII antes de enviar para AI. System prompt proibe pedir dados   |
| SEC-5  | CSRF: sameSite lax + Origin check + Content-Type enforcement (3 camadas)              |
| S1-S17 | 17 regras obrigatorias (cache, logs, auth, limites, validacao)                        |
