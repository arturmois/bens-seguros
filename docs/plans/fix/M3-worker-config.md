# M3. Workers sem Timeout/Concurrency

> **Severidade:** MEDIO (estabilidade) | **Esforco:** P (30min) | **Prioridade:** Semana 1 | Quick Win

---

## Problema

BullMQ jobs sem `timeout`, `concurrency` ou `maxStalledCount`. Job travado bloqueia fila inteira.

## Arquivos

- `apps/worker/src/` (ERP workers)
- `apps/chat-worker/src/` (chat workers)
- `apps/chat-server/src/infra/queue/queue-producer.ts`

## Correcao

```typescript
// No producer — adicionar timeout:
await queue.add(queueName, data, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  timeout: 30000, // 30s max por job
})

// No worker — adicionar concurrency:
const worker = new Worker(queueName, processor, {
  connection: redis,
  concurrency: 5,
  maxStalledCount: 2,
  stalledInterval: 5000,
})
```

## Criterios de Aceite

- [ ] Todos jobs tem `timeout: 30000`
- [ ] Workers tem `concurrency: 5`
- [ ] `maxStalledCount: 2` evita loop infinito
- [ ] Job que excede timeout falha graciosamente
