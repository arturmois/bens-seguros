# F04. Alertas e Notificacoes Proativas

> **Esforco:** M (3-5 dias) | **Impacto:** Retencao (principal motivo para voltar 3x/dia) | **Prioridade:** Semana 3-4

---

## Descricao

Sistema de alertas configuráveis dentro do dashboard: apolice vencendo, sinistro parado, comissao pendente, renovacao proxima.

## Por Que

Insurance e um negocio de datas. Perder renovacao = perder cliente. Sinistro parado = reclamacao. Com 3 acessos/dia, alertas in-app sao mais eficazes que email.

## Problema que Resolve

Corretor depende de memoria/agenda para acompanhar prazos criticos. Nenhum sistema avisa proativamente.

## Tipos de Alerta

| Alerta             | Condicao                                 | Destinatario           | Prioridade |
| ------------------ | ---------------------------------------- | ---------------------- | ---------- |
| Apolice vencendo   | 30/15/7 dias antes do vencimento         | Corretor responsavel   | ALTA       |
| Apolice vencida    | Data de vencimento passou                | Corretor + MANAGER     | CRITICA    |
| Sinistro parado    | Sem atualizacao ha X dias (configuravel) | Corretor responsavel   | MEDIA      |
| Comissao pendente  | PENDING_COMMERCIAL ha >7 dias            | COMMERCIAL responsavel | MEDIA      |
| Comissao atrasada  | APPROVED ha >30 dias sem pagamento       | ADMIN + OWNER          | ALTA       |
| Proposta estagnada | Mesmo estagio ha >15 dias                | Corretor responsavel   | BAIXA      |
| Renovacao proxima  | 60 dias antes do vencimento da apolice   | Corretor responsavel   | MEDIA      |

## Implementacao

### Etapa 1: Worker Jobs (BullMQ)

```typescript
// apps/worker/src/processors/alerts-processor.ts
// Job repetitivo: roda 1x/dia as 08:00

async function processAlerts(organizationId: string) {
  // 1. Apolices vencendo em 30/15/7 dias
  const expiringPolicies = await prisma.policy.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
      endDate: { gte: today, lte: addDays(today, 30) },
    },
  })

  for (const policy of expiringPolicies) {
    const daysUntilExpiry = differenceInDays(policy.endDate, today)
    if ([30, 15, 7].includes(daysUntilExpiry)) {
      await createNotification({
        type: 'POLICY_EXPIRING',
        title: `Apolice vence em ${daysUntilExpiry} dias`,
        entityId: policy.id,
        userId: policy.salespersonId,
      })
    }
  }

  // 2. Sinistros parados
  // 3. Comissoes pendentes
  // 4. Propostas estagnadas
}
```

### Etapa 2: Dashboard Alert Widget

```typescript
// features/dashboard/components/alerts-widget.tsx
// Card no dashboard com badges e contagem

<AlertsWidget>
  <AlertItem
    icon={<AlertTriangle />}
    title="3 apolices vencem esta semana"
    action="/policies?filter=expiring"
    severity="high"
  />
  <AlertItem
    icon={<Clock />}
    title="2 sinistros sem atualizacao ha 10 dias"
    action="/claims?filter=stalled"
    severity="medium"
  />
</AlertsWidget>
```

### Etapa 3: Badge no Menu

```typescript
// Sidebar: badge vermelho em "Apolices" quando tem alertas
<NavItem href="/policies" badge={expiringCount}>
  Apolices
</NavItem>
```

### Etapa 4: Configuracao (futuro)

Settings > Notificacoes:

- Toggle por tipo de alerta
- Configurar dias de antecedencia
- Configurar destinatarios por role

## Pre-requisitos

- Worker de policy-expiry ja existe (expandir)
- Sistema de notificacoes ja existe (Notification model + Socket.IO)

## Criterios de Aceite

- [ ] Job diario verifica apolices vencendo em 30/15/7 dias
- [ ] Job verifica sinistros parados ha >7 dias
- [ ] Job verifica comissoes pendentes ha >7 dias
- [ ] Notificacoes criadas e visíveis no sino (bell icon)
- [ ] Widget de alertas no dashboard
- [ ] Badge no menu lateral para modulos com alertas
- [ ] Nao duplicar alertas (idempotente)
