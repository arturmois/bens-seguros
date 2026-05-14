import { prismaAdmin } from '../src/index.js'

interface AutoDetailsLegacy {
  branch: 'AUTO'
  brand?: string
  model?: string
  vehicle?: string
  [key: string]: unknown
}

interface BackfillStats {
  scanned: number
  updated: number
  skipped: number
}

function isAutoDetails(value: unknown): value is AutoDetailsLegacy {
  if (typeof value !== 'object' || value === null) return false
  if (!('branch' in value)) return false
  return value.branch === 'AUTO'
}

function buildVehicle(details: AutoDetailsLegacy): string | null {
  const merged = `${details.brand ?? ''} ${details.model ?? ''}`
    .replace(/\s+/g, ' ')
    .trim()
  return merged.length > 0 ? merged : null
}

async function backfill(dryRun: boolean): Promise<BackfillStats> {
  const stats: BackfillStats = { scanned: 0, updated: 0, skipped: 0 }

  const proposals = await prismaAdmin.proposal.findMany({
    where: { branch: 'AUTO' },
    select: { id: true, details: true },
  })

  for (const proposal of proposals) {
    stats.scanned++
    if (!isAutoDetails(proposal.details)) {
      stats.skipped++
      continue
    }
    const current = proposal.details
    if (current.vehicle && current.vehicle.trim().length > 0) {
      stats.skipped++
      continue
    }
    const vehicle = buildVehicle(current)
    if (!vehicle) {
      stats.skipped++
      continue
    }

    const nextDetails: Record<string, unknown> = { ...current, vehicle }
    delete nextDetails.brand
    delete nextDetails.model

    if (!dryRun) {
      await prismaAdmin.proposal.update({
        where: { id: proposal.id },
        data: { details: nextDetails },
      })
    }
    stats.updated++
  }

  return stats
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const stats = await backfill(dryRun)
  process.stdout.write(
    `${dryRun ? '[DRY-RUN] ' : ''}backfill-vehicle-field — scanned: ${stats.scanned}, updated: ${stats.updated}, skipped: ${stats.skipped}\n`
  )
  await prismaAdmin.$disconnect()
}

main().catch(async (err: unknown) => {
  process.stderr.write(`backfill-vehicle-field failed: ${String(err)}\n`)
  await prismaAdmin.$disconnect()
  process.exit(1)
})
