# Auditoria de Produção — MEDIUM

> Itens que devem ser corrigidos no **primeiro mês** após o lançamento.
> Data da auditoria: 22/03/2026

---

## M1. Tags `<img>` sem Next.js Image

**Severidade:** MEDIUM (performance)
**Arquivos:**

- `apps/web/src/features/chat/components/chat-header.tsx` linha 146-150
- `apps/web/src/features/chat/components/contact-profile.tsx` linha 55-59

**Problema:**
Imagens de perfil de contato usam `<img>` nativo:

```tsx
<img
  src={contact.profilePicUrl}
  alt={displayName}
  className="h-full w-full rounded-full object-cover"
/>
```

**Impacto:**

- Sem otimização automática (WebP/AVIF)
- Sem lazy loading nativo
- Sem prevenção de CLS (falta width/height)

**Correção:**
Substituir por `next/image` com `fill` prop:

```tsx
<Image
  src={contact.profilePicUrl}
  alt={displayName}
  fill
  className="rounded-full object-cover"
/>
```

Nota: para URLs externas, adicionar o domínio em `next.config.ts` > `images.remotePatterns`.

---

## M2. Falta Redis caching para dados estáticos

**Severidade:** MEDIUM (performance)
**Arquivos afetados:** Route handlers diversos

**Problema:**
Dados que mudam raramente são buscados do PostgreSQL a cada request:

- Lista de seguradoras (fixture data)
- Membros da organização (role-based notifications)

**Impacto:** Carga desnecessária no banco de dados, latência extra em cada request.

**Correção:**
Implementar cache layer com Redis:

```typescript
// Seguradoras: cache 24h
const insurers = await redis.get(`insurers:${orgId}`)
if (!insurers) {
  const data = await prisma.insurer.findMany({ where: { organizationId } })
  await redis.set(`insurers:${orgId}`, JSON.stringify(data), 'EX', 86400)
}

// Members: cache 1h
const members = await redis.get(`members:${orgId}`)
```

Invalidar cache nos endpoints de criação/atualização das respectivas entidades.

---

## M3. Workers sem timeout/concurrency config

**Severidade:** MEDIUM (estabilidade)
**Arquivos:**

- `apps/worker/src/` (ERP workers)
- `apps/chat-worker/src/` (chat workers)
- `apps/chat-server/src/infra/queue/queue-producer.ts`

**Problema:**
Queue producer configura retry (`attempts: 3`, `exponential backoff`), mas:

- Sem `timeout` nos jobs (podem ficar travados indefinidamente)
- Sem `concurrency` nos workers (podem sobrecarregar)
- Sem `maxStalledCount` (jobs stalled repetem sem limite)

**Correção:**

```typescript
// No producer - adicionar timeout:
await queue.add(queueName, data, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  timeout: 30000, // 30s max por job
})

// No worker - adicionar concurrency:
const worker = new Worker(queueName, processor, {
  concurrency: 5,
  maxStalledCount: 2,
  stalledInterval: 5000,
})
```

---

## M4. Falta dynamic imports em componentes pesados

**Severidade:** MEDIUM (performance)
**Arquivos afetados:** Bundle do `apps/web`

**Problema:**
Componentes pesados são importados estaticamente:

- Recharts (charts do dashboard) — importado no bundle principal
- Chat components (com lógica Socket.IO) — carregados mesmo sem visitar /chat
- Formulários complexos (ProposalForm, ClaimForm) — carregados antecipadamente

**Impacto:** Bundle inicial maior, TTI (Time to Interactive) mais alto.

**Correção:**

```typescript
import dynamic from 'next/dynamic'

const DashboardCharts = dynamic(
  () => import('@/features/dashboard/components/dashboard-charts'),
  { loading: () => <DashboardSkeleton /> }
)

const ChatPanel = dynamic(
  () => import('@/features/chat/components/chat-panel'),
  { loading: () => <ChatSkeleton /> }
)
```

---

## M5. channel-qr-dialog.tsx com 401 linhas

**Severidade:** MEDIUM (manutenibilidade)
**Arquivo:** `apps/web/src/features/channels/components/channel-qr-dialog.tsx`
**Contagem:** 401 linhas (limite: 200)

**Problema:**
Componente com lógica de QR code e pairing code em um único arquivo. Funciona mas ultrapassa o limite de 200 linhas do CLAUDE.md.

**Correção:**
Extrair em 3 arquivos:

- `channel-qr-dialog.tsx` (parent) — gerencia tab state e socket subscriptions (~100 linhas)
- `channel-qr-tab.tsx` — renderiza QR code e estado de conexão (~130 linhas)
- `channel-pairing-tab.tsx` — input de telefone e pairing code (~130 linhas)

---

## M6. Falta formulário de configuração AI Agent

**Severidade:** MEDIUM (feature incompleta)
**Local:** Settings > Canais
**Referência:** `project_fase6_missing_ai_agent_form.md` (memory)

**Problema:**
A Fase 6 (AI Notifications) não incluiu o formulário UI para configurar o agente AI por canal. O backend suporta configuração via API, mas o frontend não tem a interface.

**Correção:**
Adicionar tab "AI Agente" no `channel-form-sheet.tsx` com:

- Toggle para habilitar/desabilitar AI
- Seleção de modelo (Claude Sonnet, etc)
- Prompt de sistema customizável
- Configuração de horário de atendimento automático

---

## M7. Seções "Membros" e "Organização" marcadas "em breve"

**Severidade:** MEDIUM (feature incompleta)
**Arquivo:** `apps/web/src/features/settings/` (Settings page)

**Problema:**
Duas seções de Configurações estão desabilitadas com label "(em breve)":

- **Membros:** Convidar/remover membros, alterar roles
- **Organização:** Editar nome, slug, configurações gerais

**Impacto:** Para produção, o OWNER precisa ao menos poder convidar membros da equipe.

**Correção:**
Priorizar "Membros" para MVP:

- Listar membros da organização
- Convidar por email (Better Auth invitation flow já existe no backend)
- Alterar role (OWNER, ADMIN, MANAGER, COMMERCIAL, VIEWER)
- Remover membro
