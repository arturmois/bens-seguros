# F06. Workflow Automation Engine

> **Esforco:** G (3-4 semanas) | **Impacto:** Diferenciacao (unico no mercado BR) | **Prioridade:** Mes 3-4

---

## Descricao

Regras configuraveis: "Quando proposta chega em PAGAMENTO → enviar lembrete ao cliente por WhatsApp", "Quando apolice vence em 30 dias → criar proposta de renovacao automaticamente".

## Por Que

Corretora com 10+ corretores precisa padronizar processos. Automacao reduz erro humano, aumenta conversao e diferencia de concorrentes. Nenhum ERP de seguros BR faz isso.

## Problema que Resolve

- Processos manuais inconsistentes entre corretores
- Oportunidades perdidas por falta de follow-up
- Tarefas repetitivas que tomam tempo

## Modelo de Dados

```typescript
interface WorkflowRule {
  id: string
  organizationId: string
  name: string
  isActive: boolean
  trigger: WorkflowTrigger
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
}

type WorkflowTrigger =
  | { type: 'PROPOSAL_STAGE_CHANGED'; stage: ProposalStage }
  | { type: 'POLICY_EXPIRING'; daysBeforeExpiry: number }
  | { type: 'CLAIM_STATUS_CHANGED'; status: ClaimStatus }
  | { type: 'COMMISSION_STATUS_CHANGED'; status: CommissionStatus }
  | { type: 'SCHEDULE'; cron: string }

type WorkflowAction =
  | { type: 'SEND_WHATSAPP'; template: string; to: 'client' | 'salesperson' }
  | {
      type: 'CREATE_NOTIFICATION'
      message: string
      userId: 'salesperson' | 'managers'
    }
  | { type: 'CREATE_PROPOSAL'; fromPolicy: true } // renovacao
  | { type: 'ASSIGN_TASK'; description: string; assignTo: 'salesperson' }
  | { type: 'SEND_EMAIL'; template: string; to: 'client' | 'salesperson' }
```

## Implementacao (Fases)

### Fase 1: Engine Core (Backend)

1. Schema Prisma para `WorkflowRule`
2. Workflow engine que avalia triggers + conditions + executa actions
3. Integracao com domain events (ProposalStageChanged, PolicyExpiring)
4. Execucao via BullMQ (async, com retry)

### Fase 2: Rules Predefinidas

Templates prontos para ativar com 1 click:

- "Lembrete de pagamento" (proposta em PAGAMENTO ha 3 dias)
- "Renovacao automatica" (apolice vencendo em 60 dias)
- "Follow-up de cotacao" (proposta em COTACAO ha 7 dias)
- "Alerta de sinistro parado" (sem update ha 10 dias)

### Fase 3: UI de Configuracao

```
features/settings/components/
  workflows/
    workflow-list.tsx        (tabela de regras)
    workflow-form.tsx         (criar/editar regra)
    workflow-trigger-step.tsx (selecionar trigger)
    workflow-action-step.tsx  (selecionar action)
    workflow-preview.tsx      (preview do fluxo)
```

### Fase 4: Custom Rules (Futuro)

Builder visual drag & drop para criar regras custom.

## Dependencias

- F04 (Alertas) — sistema de notificacoes
- Chat WhatsApp funcional
- Domain events implementados

## Criterios de Aceite

### Fase 1

- [ ] WorkflowRule model no Prisma
- [ ] Engine avalia triggers e executa actions
- [ ] Execucao via BullMQ
- [ ] Log de execucao (quando rodou, resultado)

### Fase 2

- [ ] 4+ templates predefinidos
- [ ] Ativacao com 1 click
- [ ] Desativacao sem perder config

### Fase 3

- [ ] UI para listar, criar, editar, desativar regras
- [ ] Preview do fluxo antes de salvar
- [ ] RBAC: ADMIN+ para gerenciar workflows
