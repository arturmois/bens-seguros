# F02. Import/Export de Dados (CSV/Excel)

> **Esforco:** G (1-2 semanas) | **Impacto:** Aquisicao (deal-breaker) | **Prioridade:** Mes 2

---

## Descricao

Import em massa de clientes, apolices e comissoes via CSV/Excel. Export de relatorios filtrados em CSV.

## Por Que

Corretora que migra de planilha ou outro sistema precisa trazer dados existentes. Sem isso, barreira de entrada e inaceitavel para qualquer corretora real.

## Problema que Resolve

Onboarding impossivel para corretoras com carteira existente (100% do mercado-alvo).

## Implementacao

### Export (mais simples — fazer primeiro)

#### Backend

```typescript
// apps/server/src/routes/v1/client-routes.ts
// GET /api/v1/clients/export?format=csv
app.get('/export', {
  preHandler: [requireAuth, requireAbility('read', 'Client')],
  handler: async (request, reply) => {
    const clients = await listClients.execute(filters)
    const csv = generateCsv(clients, CLIENT_EXPORT_COLUMNS)
    reply
      .header('Content-Type', 'text/csv')
      .header('Content-Disposition', 'attachment; filename=clientes.csv')
      .send(csv)
  },
})
```

#### Frontend

```typescript
// Botao de export na toolbar da tabela
<Button onClick={() => downloadCsv('/api/v1/clients/export', 'clientes.csv')}>
  <Download className="h-4 w-4" />
  Exportar CSV
</Button>
```

### Import (mais complexo)

#### Backend

```typescript
// POST /api/v1/clients/import
// Aceita multipart/form-data com arquivo CSV
// Processa via BullMQ job (nao bloquear request)

// Fluxo:
// 1. Upload arquivo -> validar formato
// 2. Parse CSV -> validar cada linha com Zod schema
// 3. Criar job BullMQ com dados parseados
// 4. Worker processa em batch (50 por vez)
// 5. Retornar resultado: { total, created, errors[] }
```

#### Validacao

```typescript
const clientImportRowSchema = z.object({
  name: z.string().min(2),
  document: z.string().min(11).max(14),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.enum(['LEAD', 'CLIENT', 'FORMER_CLIENT']).default('CLIENT'),
})
```

#### Frontend

```
features/clients/components/
  import-dialog.tsx      (~150 linhas)
    - Upload area (drag & drop)
    - Preview das primeiras 5 linhas
    - Mapeamento de colunas (auto-detect)
    - Progresso de importacao
    - Resultado (criados / erros)
```

### Entidades para Import/Export

| Entidade  | Export          | Import | Prioridade |
| --------- | --------------- | ------ | ---------- |
| Clientes  | Sim             | Sim    | 1          |
| Apolices  | Sim             | Sim    | 2          |
| Comissoes | Sim (ja existe) | Nao    | -          |
| Propostas | Sim             | Nao    | 3          |

### Template CSV

Disponibilizar template em `GET /api/v1/clients/import/template` com headers corretos e 1 linha de exemplo.

## Criterios de Aceite

- [ ] Export CSV funcional para clientes, apolices, propostas
- [ ] Import CSV para clientes com validacao Zod
- [ ] Import via BullMQ (nao bloqueia request)
- [ ] Preview das primeiras linhas antes de confirmar
- [ ] Resultado com contagem: criados, duplicados, erros
- [ ] Erro por linha com mensagem clara
- [ ] Template CSV disponivel para download
- [ ] RBAC: apenas ADMIN+ pode importar
