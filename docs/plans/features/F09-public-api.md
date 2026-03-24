# F09. API Publica / Integracao com Seguradoras

> **Esforco:** G (4-6 semanas) | **Impacto:** Diferenciacao + Retencao (lock-in positivo) | **Prioridade:** Mes 5-6

---

## Descricao

API REST documentada para que seguradoras enviem status de propostas, sinistros e comissoes automaticamente. Webhooks bidirecionais.

## Por Que

Atualizacao manual de status e o maior custo operacional da corretora. Integracao direta elimina trabalho repetitivo e reduz erros.

## Problema que Resolve

Corretor atualiza manualmente dezenas de propostas/sinistros diariamente com informacoes recebidas por email/portal de cada seguradora.

## Implementacao

### Fase 1: API Publica (Leitura)

Expor endpoints autenticados via API key para sistemas externos:

```
POST /public/v1/auth/token          (gerar API key)
GET  /public/v1/proposals            (listar propostas)
GET  /public/v1/policies             (listar apolices)
GET  /public/v1/claims               (listar sinistros)
GET  /public/v1/commissions          (listar comissoes)
```

**Autenticacao:** API key no header `X-API-Key` + rate limit por key.

### Fase 2: Webhooks de Entrada (Seguradoras → Bens)

```
POST /public/v1/webhooks/proposal-status
POST /public/v1/webhooks/claim-status
POST /public/v1/webhooks/commission-payment

// Payload padronizado:
{
  "event": "proposal.status_changed",
  "data": {
    "externalId": "PORTO-2026-12345",
    "status": "APPROVED",
    "details": { ... }
  },
  "signature": "hmac-sha256-signature"
}
```

### Fase 3: Webhooks de Saida (Bens → Sistemas Externos)

```typescript
// Settings > Integrações > Webhooks
// Configurar URLs para receber eventos:
// - proposal.created, proposal.stage_changed
// - policy.created, policy.expired
// - claim.created, claim.status_changed
// - commission.approved, commission.paid
```

### Fase 4: Conectores de Seguradoras

Conectores especificos para seguradoras brasileiras (quando disponivel):

- Porto Seguro API
- Tokio Marine Portal
- SulAmerica API
- Bradesco Seguros

## Pre-requisitos

- API key management (Settings > API)
- Webhook signature verification
- Mapeamento de IDs internos ↔ externos

## Criterios de Aceite

### Fase 1

- [ ] Endpoints publicos com autenticacao via API key
- [ ] Rate limiting por key (1000 req/hora)
- [ ] Documentacao Swagger/OpenAPI

### Fase 2

- [ ] Webhook receiver com verificacao HMAC
- [ ] Auto-atualizacao de status em propostas/sinistros
- [ ] Log de webhooks recebidos (audit)

### Fase 3

- [ ] UI para configurar webhook URLs
- [ ] Retry com backoff exponencial
- [ ] Log de entregas (sucesso/falha)
