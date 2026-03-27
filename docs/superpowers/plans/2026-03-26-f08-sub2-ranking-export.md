# F08 Sub-projeto 2 — Ranking + Export PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add broker ranking widget to the dashboard and an "Exportar PDF" button that generates a management report with all dashboard metrics.

**Architecture:** Ranking data added to the existing `/stats/dashboard` endpoint. Dashboard report PDF uses `@react-pdf/renderer` (same as F03). Frontend adds a ranking table component and export button with mutation hook.

**Tech Stack:** Prisma, @react-pdf/renderer, React Query, Tailwind CSS

**Run commands:**

- Tests: `pnpm test`
- Build: `pnpm build`
- Server: `cd apps/server && pnpm build`
- Web: `pnpm build --filter=@app/web`

---

## File Structure

**Backend:**

- Modify: `apps/server/src/routes/v1/stats-helpers.ts` — add ranking query + export to DashboardData
- Modify: `apps/server/src/routes/v1/stats-routes.ts` — add POST /dashboard/pdf endpoint
- Create: `apps/server/src/pdf-templates/dashboard-report-pdf.tsx` — management report template

**Frontend:**

- Modify: `apps/web/src/features/dashboard/types/index.ts` — add RankingEntry type
- Create: `apps/web/src/features/dashboard/components/broker-ranking.tsx` — ranking table widget
- Create: `apps/web/src/features/dashboard/hooks/use-export-dashboard-pdf.ts` — export mutation
- Modify: `apps/web/src/features/dashboard/components/dashboard-content.tsx` — add ranking + export button

---

### Task 1: Backend — Add ranking query to stats-helpers

**Files:**

- Modify: `apps/server/src/routes/v1/stats-helpers.ts`

- [ ] **Step 1: Read the current stats-helpers.ts**

Read `apps/server/src/routes/v1/stats-helpers.ts` completely (373 lines).

- [ ] **Step 2: Add RankingEntry interface and ranking query**

Add to `stats-helpers.ts`:

1. Add `RankingEntry` interface:

```typescript
interface RankingEntry {
  readonly salespersonId: string
  readonly salespersonName: string
  readonly policiesIssued: number
  readonly totalPremiumCents: number
  readonly averageTicketCents: number
}
```

2. Add `ranking` field to `DashboardData` interface:

```typescript
readonly ranking: readonly RankingEntry[]
```

3. Create a `fetchRanking` function:

```typescript
async function fetchRanking(
  orgId: string,
  currentFrom: Date
): Promise<readonly RankingEntry[]> {
  const results = await prisma.$queryRaw<
    Array<{
      salespersonId: string
      salespersonName: string
      policiesIssued: number
      totalPremiumCents: bigint
    }>
  >`
    SELECT
      p."salespersonId",
      COALESCE(m."name", 'Desconhecido') as "salespersonName",
      COUNT(*)::int as "policiesIssued",
      COALESCE(SUM(p."premiumValueInCents"), 0) as "totalPremiumCents"
    FROM "Policy" p
    LEFT JOIN "Member" m ON m."userId" = p."salespersonId" AND m."organizationId" = p."organizationId"
    WHERE p."organizationId" = ${orgId}
      AND p."createdAt" >= ${currentFrom}
      AND p."deletedAt" IS NULL
    GROUP BY p."salespersonId", m."name"
    ORDER BY COALESCE(SUM(p."premiumValueInCents"), 0) DESC
    LIMIT 10
  `

  return results.map((r) => ({
    salespersonId: r.salespersonId,
    salespersonName: r.salespersonName,
    policiesIssued: r.policiesIssued,
    totalPremiumCents: Number(r.totalPremiumCents),
    averageTicketCents:
      r.policiesIssued > 0
        ? Math.round(Number(r.totalPremiumCents) / r.policiesIssued)
        : 0,
  }))
}
```

4. Call `fetchRanking` in `buildDashboardData` and include in return:

```typescript
const [chartResults, comparisonData, ranking] = await Promise.all([
  fetchChartData(orgId, ranges),
  fetchComparisonData(orgId, ranges),
  fetchRanking(orgId, ranges.currentFrom),
])

// ... existing code ...

return {
  // ... existing fields ...
  ranking,
}
```

- [ ] **Step 3: Verify build and tests**

Run: `cd /home/artur/projects && pnpm build --filter=@app/server && pnpm test`

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/v1/stats-helpers.ts
git commit -m "feat(server): add broker ranking query to dashboard stats (F08)"
```

---

### Task 2: Backend — Dashboard report PDF template

**Files:**

- Create: `apps/server/src/pdf-templates/dashboard-report-pdf.tsx`

- [ ] **Step 1: Read existing PDF templates for reference**

Read `apps/server/src/pdf-templates/proposal-quote-pdf.tsx` and `apps/server/src/pdf-templates/pdf-styles.ts` for patterns (imports, styles, layout).

- [ ] **Step 2: Create the dashboard report PDF template**

Create `apps/server/src/pdf-templates/dashboard-report-pdf.tsx`. The template renders a formal management report with:

- Header: org name + "RELATORIO GERENCIAL" + period
- Section 1: KPI table (4 rows: propostas, apolices, sinistros, comissoes — each with current, previous, change%)
- Section 2: Financial metrics table (premio total, ticket medio, comissoes a receber)
- Section 3: Ranking table (corretor, emitidas, premio, ticket)
- Footer: generated date + user name

Use the existing `PdfHeader` and `PdfFooter` from the shared templates. Use `styles` from `pdf-styles.ts`.

The component should accept a props interface:

```typescript
interface DashboardReportPdfProps {
  readonly organization: {
    readonly name: string
    readonly logoUrl: string | null
  }
  readonly period: string
  readonly generatedBy: string
  readonly comparison: {
    readonly proposals: {
      current: number
      previous: number
      changePercent: number
    }
    readonly policies: {
      current: number
      previous: number
      changePercent: number
    }
    readonly claims: {
      current: number
      previous: number
      changePercent: number
    }
    readonly commissionsPending: {
      current: number
      previous: number
      changePercent: number
    }
  }
  readonly totalPremium: {
    current: number
    previous: number
    changePercent: number
  }
  readonly averageTicket: {
    current: number
    previous: number
    changePercent: number
  }
  readonly commissionsReceivable: number
  readonly ranking: ReadonlyArray<{
    salespersonName: string
    policiesIssued: number
    totalPremiumCents: number
    averageTicketCents: number
  }>
}
```

Use `Document`, `Page`, `View`, `Text` from `@react-pdf/renderer`. Format currency with `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Show change% with +/- prefix.

Keep the file under 200 lines. If it grows, extract the ranking table section into a helper function within the same file.

- [ ] **Step 3: Verify build**

Run: `cd /home/artur/projects/apps/server && pnpm build`

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/pdf-templates/dashboard-report-pdf.tsx
git commit -m "feat(server): add dashboard management report PDF template (F08)"
```

---

### Task 3: Backend — Export PDF endpoint

**Files:**

- Modify: `apps/server/src/routes/v1/stats-routes.ts`

- [ ] **Step 1: Read current stats-routes.ts**

Read `apps/server/src/routes/v1/stats-routes.ts` (23 lines currently).

- [ ] **Step 2: Add POST /dashboard/pdf endpoint**

Add a new POST endpoint below the existing GET. Follow the same pattern as the F03 PDF endpoints (proposal-routes.ts):

```typescript
import { renderToBuffer } from '@react-pdf/renderer'
import { container } from '@repo/core'
import type { DocumentRepository, StorageProvider } from '@repo/core'
import { prisma } from '@repo/db'
import { DashboardReportPdf } from '../../pdf-templates/dashboard-report-pdf.js'

// Inside statsRoutes function, after the GET endpoint:

app.post(
  '/api/v1/stats/dashboard/pdf',
  { preHandler: [requireAbility('read', 'Client')] },
  async (request: FastifyRequest, reply: FastifyReply) => {
    const { preset } = dashboardStatsQuerySchema.parse(request.query)
    const orgId = request.organizationId!

    const data = await buildDashboardData(orgId, preset)

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, logo: true },
    })

    if (!org) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ORGANIZATION_NOT_FOUND',
          message: 'Organizacao nao encontrada',
        },
      })
    }

    const storage = container.resolve<StorageProvider>('StorageProvider')
    let logoUrl: string | null = null
    if (org.logo) {
      logoUrl = await storage.getSignedUrl(org.logo)
    }

    const presetLabels: Record<string, string> = {
      '7d': 'Ultimos 7 dias',
      '30d': 'Ultimos 30 dias',
      '90d': 'Ultimos 90 dias',
      '6m': 'Ultimos 6 meses',
    }

    const buffer = Buffer.from(
      await renderToBuffer(
        DashboardReportPdf({
          organization: { name: org.name, logoUrl },
          period: presetLabels[preset] ?? preset,
          generatedBy: request.user!.name ?? 'Usuario',
          comparison: data.comparison,
          totalPremium: data.totalPremium,
          averageTicket: data.averageTicket,
          commissionsReceivable: data.commissionsReceivable,
          ranking: data.ranking,
        })
      )
    )

    const fileName = `relatorio-gerencial-${preset}.pdf`
    const storageKey = `organizations/${orgId}/reports/${fileName}`
    await storage.upload(storageKey, buffer, 'application/pdf')

    const documentRepo =
      container.resolve<DocumentRepository>('DocumentRepository')
    await documentRepo.create({
      organizationId: orgId,
      entityType: 'CLIENT',
      entityId: orgId,
      type: 'OTHER',
      fileName,
      mimeType: 'application/pdf',
      sizeBytes: buffer.length,
      storageKey,
      createdBy: request.user!.id,
    })

    const url = await storage.getSignedUrl(storageKey)
    return reply.send({ success: true, data: { url } })
  }
)
```

Note: Uses `entityType: 'CLIENT'` and `entityId: orgId` since dashboard reports are org-level, not entity-specific. `type: 'OTHER'` since there's no dedicated DocumentType for reports.

- [ ] **Step 3: Verify build and tests**

Run: `cd /home/artur/projects && pnpm build --filter=@app/server && pnpm test`

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/v1/stats-routes.ts
git commit -m "feat(server): add POST /stats/dashboard/pdf export endpoint (F08)"
```

---

### Task 4: Frontend — Types + ranking component + export hook

**Files:**

- Modify: `apps/web/src/features/dashboard/types/index.ts`
- Create: `apps/web/src/features/dashboard/components/broker-ranking.tsx`
- Create: `apps/web/src/features/dashboard/hooks/use-export-dashboard-pdf.ts`

- [ ] **Step 1: Add RankingEntry type**

Add to `apps/web/src/features/dashboard/types/index.ts`:

```typescript
export interface RankingEntry {
  readonly salespersonId: string
  readonly salespersonName: string
  readonly policiesIssued: number
  readonly totalPremiumCents: number
  readonly averageTicketCents: number
}
```

And add `ranking: RankingEntry[]` to the `DashboardStats` interface.

- [ ] **Step 2: Create broker ranking component**

```typescript
// apps/web/src/features/dashboard/components/broker-ranking.tsx
'use client'

import { Trophy } from 'lucide-react'

import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/formatters'

import type { RankingEntry } from '../types'

interface BrokerRankingProps {
  readonly ranking: RankingEntry[] | undefined
  readonly isLoading: boolean
  readonly visible: boolean
}

export function BrokerRanking({ ranking, isLoading, visible }: BrokerRankingProps) {
  if (!visible) return null

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-4" />
            Ranking de Corretores
          </CardTitle>
        </CardHeader>
        <CardPanel>
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardPanel>
      </Card>
    )
  }

  if (!ranking || ranking.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="size-4" />
            Ranking de Corretores
          </CardTitle>
        </CardHeader>
        <CardPanel>
          <p className="text-muted-foreground text-sm">
            Nenhuma apolice emitida no periodo.
          </p>
        </CardPanel>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-4" />
          Ranking de Corretores
        </CardTitle>
      </CardHeader>
      <CardPanel className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead className="text-right">Emitidas</TableHead>
              <TableHead className="text-right">Premio Total</TableHead>
              <TableHead className="text-right">Ticket Medio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.map((entry, index) => (
              <TableRow key={entry.salespersonId}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{entry.salespersonName}</TableCell>
                <TableCell className="text-right">{entry.policiesIssued}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(entry.totalPremiumCents)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(entry.averageTicketCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardPanel>
    </Card>
  )
}
```

- [ ] **Step 3: Create export mutation hook**

```typescript
// apps/web/src/features/dashboard/hooks/use-export-dashboard-pdf.ts
'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { api, ApiError } from '@/lib/api-client'

import type { DashboardPreset } from '../types'

interface ExportResponse {
  readonly url: string
}

export function useExportDashboardPdf() {
  return useMutation({
    mutationFn: async (preset: DashboardPreset) => {
      const response = await api.post<ExportResponse>(
        `/api/v1/stats/dashboard/pdf?preset=${preset}`,
        {}
      )
      return response.data
    },
    onSuccess: (data) => {
      window.open(data.url, '_blank')
      toast.success('Relatorio gerado com sucesso')
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message)
        return
      }
      toast.error('Erro ao gerar relatorio')
    },
  })
}
```

- [ ] **Step 4: Verify build**

Run: `cd /home/artur/projects && pnpm build --filter=@app/web`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/types/index.ts apps/web/src/features/dashboard/components/broker-ranking.tsx apps/web/src/features/dashboard/hooks/use-export-dashboard-pdf.ts
git commit -m "feat(web): add BrokerRanking component and export PDF hook (F08)"
```

---

### Task 5: Frontend — Integrate ranking and export into dashboard

**Files:**

- Modify: `apps/web/src/features/dashboard/components/dashboard-content.tsx`

- [ ] **Step 1: Read current dashboard-content.tsx**

Read `apps/web/src/features/dashboard/components/dashboard-content.tsx` (95 lines).

- [ ] **Step 2: Add ranking widget and export button**

Import and add:

1. `BrokerRanking` component — placed between the charts row and the trend chart
2. Export PDF button — placed in the header next to the period filter
3. `useExportDashboardPdf` hook
4. Role check via `useOrgs` hook — ranking visible only for OWNER/ADMIN/MANAGER

```typescript
// Add imports:
import { Download, Loader2 as Spinner } from 'lucide-react'
import { useOrgs } from '@/features/org/hooks/use-orgs'
import { BrokerRanking } from './broker-ranking'
import { useExportDashboardPdf } from '../hooks/use-export-dashboard-pdf'

// Inside DashboardContent component:
const { activeOrg } = useOrgs()
const exportPdf = useExportDashboardPdf()
const canSeeRanking = activeOrg?.role === 'OWNER' || activeOrg?.role === 'ADMIN' || activeOrg?.role === 'MANAGER'

// In the header div (where period filter is):
<div className="flex items-center justify-end gap-2">
  <Button
    variant="outline"
    size="sm"
    onClick={() => exportPdf.mutate(preset)}
    disabled={exportPdf.isPending || isLoading}
  >
    {exportPdf.isPending ? (
      <Spinner className="mr-2 size-4 animate-spin" />
    ) : (
      <Download className="mr-2 size-4" />
    )}
    Exportar PDF
  </Button>
  <DashboardPeriodFilter preset={preset} onPresetChange={setPreset} />
</div>

// After the 3-column grid (conversion/claims/alerts) and before TrendChart:
<BrokerRanking
  ranking={data?.ranking}
  isLoading={isLoading}
  visible={canSeeRanking}
/>
```

- [ ] **Step 3: Verify the file is under 200 lines**

Run: `wc -l apps/web/src/features/dashboard/components/dashboard-content.tsx`

- [ ] **Step 4: Verify build**

Run: `cd /home/artur/projects && pnpm build --filter=@app/web`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/dashboard/components/dashboard-content.tsx
git commit -m "feat(web): integrate broker ranking and export PDF button into dashboard (F08)"
```

---

### Task 6: Final verification + backlog update

- [ ] **Step 1: Run full test suite, lint, and build**

Run: `cd /home/artur/projects && pnpm test && pnpm lint && pnpm build`

- [ ] **Step 2: Update feature backlog**

In `docs/plans/features/README.md`, update F08 entry in Concluidas table to reflect both sub-projetos are done.

- [ ] **Step 3: Commit**

```bash
git add docs/plans/features/README.md
git commit -m "docs: mark F08 advanced dashboard as fully implemented (sub-projetos 1+2)"
```
