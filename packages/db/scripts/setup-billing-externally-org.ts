import { prismaAdmin } from '../src/index.js'

// Marca uma Organization como `billingManagedExternally=true` — cliente legacy
// ou parceiro com acordo comercial fora da plataforma. Idempotente: re-rodar
// não muda nada se a flag já estiver setada. Use `--dry-run` para inspecionar
// sem aplicar.
//
// Uso (em prod, via SSH):
//   docker compose -f docker-compose.prod.yml exec -T server \
//     pnpm --filter @repo/db exec tsx scripts/setup-billing-externally-org.ts \
//       --org-id=<orgId> --notes="Acordo fechado em <data>" --dry-run
//
//   # Confirmado? Re-rodar sem --dry-run.
//
// Rollback: re-rodar com `--unset` em vez de --notes pra zerar a flag.
//   ... scripts/setup-billing-externally-org.ts --org-id=<orgId> --unset

interface CliArgs {
  orgId: string | null
  notes: string | null
  dryRun: boolean
  unset: boolean
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    orgId: null,
    notes: null,
    dryRun: false,
    unset: false,
  }
  for (const arg of argv) {
    if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--unset') {
      args.unset = true
    } else if (arg.startsWith('--org-id=')) {
      args.orgId = arg.slice('--org-id='.length)
    } else if (arg.startsWith('--notes=')) {
      args.notes = arg.slice('--notes='.length)
    }
  }
  return args
}

function out(line: string): void {
  process.stdout.write(`${line}\n`)
}

function err(line: string): void {
  process.stderr.write(`${line}\n`)
}

async function run(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  if (!args.orgId || args.orgId.length === 0) {
    err('ERROR: --org-id=<id> is required')
    process.exit(1)
  }

  const org = await prismaAdmin.organization.findUnique({
    where: { id: args.orgId },
    select: {
      id: true,
      name: true,
      slug: true,
      billingManagedExternally: true,
      externalNotes: true,
    },
  })

  if (!org) {
    err(`ERROR: Organization not found: ${args.orgId}`)
    process.exit(1)
  }

  out('Before:')
  out(JSON.stringify(org, null, 2))

  const targetValue = !args.unset
  const targetNotes = args.unset ? null : args.notes

  if (
    org.billingManagedExternally === targetValue &&
    org.externalNotes === targetNotes
  ) {
    out('No change needed — values already match target. Idempotent.')
    return
  }

  if (args.dryRun) {
    out('DRY RUN — would set:')
    out(
      JSON.stringify(
        {
          billingManagedExternally: targetValue,
          externalNotes: targetNotes,
        },
        null,
        2
      )
    )
    return
  }

  const updated = await prismaAdmin.organization.update({
    where: { id: args.orgId },
    data: {
      billingManagedExternally: targetValue,
      externalNotes: targetNotes,
    },
    select: {
      id: true,
      name: true,
      billingManagedExternally: true,
      externalNotes: true,
    },
  })

  out('After:')
  out(JSON.stringify(updated, null, 2))
}

run()
  .catch((error: unknown) => {
    err(`Script failed: ${String(error)}`)
    process.exit(1)
  })
  .finally(() => {
    void prismaAdmin.$disconnect()
  })
