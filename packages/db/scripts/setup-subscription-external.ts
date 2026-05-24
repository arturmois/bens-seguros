import { prismaAdmin } from '../src/index.js'

// Cria uma Subscription com status=BILLED_EXTERNALLY pra uma Organization que
// ja esta marcada com billingManagedExternally=true (via Fase 1 script
// setup-billing-externally-org.ts). Pre-requisito pra Fase 3 (subscription-
// middleware) — orgs sem Subscription serao bloqueadas em /billing/expired.
//
// Idempotente: re-rodar nao muda nada se a org ja tem Subscription.
//
// Uso (em prod, via SSH):
//   docker compose -f docker-compose.prod.yml exec -T server \
//     pnpm --filter @repo/db exec tsx \
//     scripts/setup-subscription-external.ts \
//       --org-id=<orgId> --plan-slug=business --dry-run
//
//   # Confirmado? Re-rodar sem --dry-run.
//
// Notas:
// - currentPeriodEnd e setado pra 100 anos no futuro (placeholder "nunca
//   expira" — Fase 3+ middleware ignora datas quando status=BILLED_EXTERNALLY,
//   mas a coluna e NOT NULL no schema).
// - billingProvider=MANUAL (enum BillingProvider).
// - externalNotes copiado da Organization se a coluna correspondente existir.
//
// Rollback: DELETE manual ou via Prisma Studio. Nao tem flag --unset porque
// deletar Subscription cascateia pra Invoice/PaymentMethod (vazio agora, mas
// pode existir depois). Pra unset, prefira UPDATE billingManagedExternally=
// false na Organization via setup-billing-externally-org.ts --unset.

interface CliArgs {
  orgId: string | null
  planSlug: string
  dryRun: boolean
}

function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = {
    orgId: null,
    planSlug: 'business',
    dryRun: false,
  }
  for (const arg of argv) {
    if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg.startsWith('--org-id=')) {
      args.orgId = arg.slice('--org-id='.length)
    } else if (arg.startsWith('--plan-slug=')) {
      args.planSlug = arg.slice('--plan-slug='.length)
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
      subscription: {
        select: {
          id: true,
          status: true,
          planId: true,
        },
      },
    },
  })

  if (!org) {
    err(`ERROR: Organization not found: ${args.orgId}`)
    process.exit(1)
  }

  if (org.billingManagedExternally !== true) {
    err(
      `ERROR: Organization "${org.name}" (${org.id}) is not marked as billingManagedExternally. ` +
        `Run setup-billing-externally-org.ts first.`
    )
    process.exit(1)
  }

  out('Organization:')
  out(JSON.stringify(org, null, 2))

  if (org.subscription) {
    out(
      `No change needed — subscription ${org.subscription.id} already exists ` +
        `(status: ${org.subscription.status}). Idempotent.`
    )
    return
  }

  const plan = await prismaAdmin.plan.findUnique({
    where: { slug: args.planSlug },
    select: { id: true, slug: true, name: true },
  })

  if (!plan) {
    err(
      `ERROR: Plan not found: slug="${args.planSlug}". ` +
        `Run pnpm db:seed first to create the plan catalog.`
    )
    process.exit(1)
  }

  out(`Plan target: ${plan.name} (${plan.slug}, ${plan.id})`)

  const now = new Date()
  const farFuture = new Date(now)
  farFuture.setUTCFullYear(now.getUTCFullYear() + 100)

  const createData = {
    organizationId: org.id,
    planId: plan.id,
    status: 'BILLED_EXTERNALLY' as const,
    billingProvider: 'MANUAL' as const,
    currentPeriodStart: now,
    currentPeriodEnd: farFuture,
    billingManagedExternally: true,
    externalNotes: org.externalNotes,
  }

  if (args.dryRun) {
    out('DRY RUN — would create:')
    out(JSON.stringify(createData, null, 2))
    return
  }

  const created = await prismaAdmin.subscription.create({
    data: createData,
    select: {
      id: true,
      organizationId: true,
      planId: true,
      status: true,
      billingProvider: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      billingManagedExternally: true,
    },
  })

  out('Created:')
  out(JSON.stringify(created, null, 2))
}

run()
  .catch((error: unknown) => {
    err(`Script failed: ${String(error)}`)
    process.exit(1)
  })
  .finally(() => {
    void prismaAdmin.$disconnect()
  })
