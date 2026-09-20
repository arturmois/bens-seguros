import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function readRepo(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function walkTs(dir) {
  if (!existsSync(dir)) return []
  const files = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkTs(path))
    } else if (entry.name.endsWith('.ts')) {
      files.push(path)
    }
  }
  return files
}

function moduleHasImport(dir, pattern) {
  const matches = []
  for (const file of walkTs(dir)) {
    const text = readFileSync(file, 'utf8')
    if (pattern.test(text)) matches.push(file)
  }
  return matches
}

test('money.ts exports Cents BasisPoints applyBasisPoints reaisToCents', () => {
  const text = readRepo('packages/core/src/shared-kernel/money.ts')
  assert.match(text, /export type Cents/)
  assert.match(text, /export type BasisPoints/)
  assert.match(text, /export function applyBasisPoints/)
  assert.match(text, /export function reaisToCents/)
})

test('commission-calculator calls applyBasisPoints without BASIS_POINTS_DIVISOR', () => {
  const text = readRepo(
    'packages/core/src/modules/commission/domain/commission-calculator.ts'
  )
  assert.match(text, /applyBasisPoints/)
  assert.doesNotMatch(text, /BASIS_POINTS_DIVISOR/)
})

test('ImportPolicyRow uses reaisToCents not Math.round premioReais', () => {
  const text = readRepo(
    'packages/core/src/modules/sales/policies/application/import-policy-row.ts'
  )
  assert.match(text, /reaisToCents/)
  assert.doesNotMatch(text, /Math\.round\(premioReais \* 100\)/)
})

test('ProposalProps has commissionBasisPoints not commissionPercentageInCents', () => {
  const text = readRepo(
    'packages/core/src/modules/sales/proposals/domain/proposal.ts'
  )
  const propsBlock = text.slice(
    text.indexOf('export interface ProposalProps'),
    text.indexOf('interface CreateProposalInput')
  )
  assert.match(propsBlock, /commissionBasisPoints:\s*number/)
  assert.doesNotMatch(propsBlock, /commissionPercentageInCents/)
})

test('proposal detail schema keeps commissionPercentageInCents', () => {
  const text = readRepo('apps/server/src/routes/v1/proposals/_schemas.ts')
  assert.match(text, /commissionPercentageInCents:\s*z\.number\(\)/)
})

test('proposal mapper maps commissionPercentageInCents column to commissionBasisPoints', () => {
  const text = readRepo(
    'packages/core/src/modules/sales/proposals/infrastructure/proposal-mapper.ts'
  )
  assert.match(
    text,
    /commissionBasisPoints:\s*row\.commissionPercentageInCents/
  )
  assert.match(
    text,
    /commissionPercentageInCents:\s*json\.commissionPercentageInCents/
  )
})

test('commission index exports CreateCommissionForPolicy not OnPolicyIssued', () => {
  const text = readRepo('packages/core/src/modules/commission/index.ts')
  assert.match(text, /CreateCommissionForPolicy/)
  assert.doesNotMatch(text, /OnPolicyIssued/)
})

test('on-policy-issued.ts does not exist', () => {
  assert.equal(
    existsSync(
      join(
        root,
        'packages/core/src/modules/commission/application/on-policy-issued.ts'
      )
    ),
    false
  )
})

test('issue-policy.ts does not import OnPolicyIssued', () => {
  const text = readRepo(
    'packages/core/src/modules/sales/policies/application/issue-policy.ts'
  )
  assert.doesNotMatch(text, /OnPolicyIssued/)
})

test('issuePolicy operationId stays on POST /api/v1/policies', () => {
  const text = readRepo('apps/server/src/routes/v1/policies/issue-policy.ts')
  assert.match(text, /operationId:\s*'issuePolicy'/)
  assert.match(text, /method:\s*'POST'/)
  assert.match(text, /url:\s*'\/api\/v1\/policies'/)
})

test('commission notification templates exist with export names', () => {
  const approved = readRepo(
    'packages/core/src/modules/commission/infrastructure/notifications/commission-approved.ts'
  )
  const rejected = readRepo(
    'packages/core/src/modules/commission/infrastructure/notifications/commission-rejected.ts'
  )
  assert.match(approved, /export function commissionApprovedEmail/)
  assert.match(rejected, /export function commissionRejectedEmail/)
})

test('claim-opened template exists with export name', () => {
  const text = readRepo(
    'packages/core/src/modules/servicing/claims/infrastructure/notifications/claim-opened.ts'
  )
  assert.match(text, /export function claimOpenedEmail/)
})

test('notification email-templates dropped commission and claim files', () => {
  const dir = join(
    root,
    'packages/core/src/modules/notification/infrastructure/email-templates'
  )
  assert.equal(existsSync(join(dir, 'commission-approved.ts')), false)
  assert.equal(existsSync(join(dir, 'commission-rejected.ts')), false)
  assert.equal(existsSync(join(dir, 'claim-opened.ts')), false)
})

test('commission module has zero notification/infrastructure imports', () => {
  const hits = moduleHasImport(
    join(root, 'packages/core/src/modules/commission'),
    /notification\/infrastructure/
  )
  assert.equal(hits.length, 0, hits.join(', '))
})

test('servicing module has zero notification/infrastructure imports', () => {
  const hits = moduleHasImport(
    join(root, 'packages/core/src/modules/servicing'),
    /notification\/infrastructure/
  )
  assert.equal(hits.length, 0, hits.join(', '))
})

test('notification index does not export moved template names', () => {
  const text = readRepo('packages/core/src/modules/notification/index.ts')
  assert.doesNotMatch(text, /commissionApprovedEmail/)
  assert.doesNotMatch(text, /commissionRejectedEmail/)
  assert.doesNotMatch(text, /claimOpenedEmail/)
})

test('owning use cases still call the three moved template functions', () => {
  const approve = readRepo(
    'packages/core/src/modules/commission/application/approve-commission-admin.ts'
  )
  const reject = readRepo(
    'packages/core/src/modules/commission/application/reject-commission.ts'
  )
  const claim = readRepo(
    'packages/core/src/modules/servicing/claims/application/create-claim.ts'
  )
  assert.match(approve, /commissionApprovedEmail/)
  assert.match(reject, /commissionRejectedEmail/)
  assert.match(claim, /claimOpenedEmail/)
})

test('register-claim-from-chat exports RegisterClaimFromChat', () => {
  const text = readRepo(
    'packages/core/src/modules/servicing/claims/application/register-claim-from-chat.ts'
  )
  assert.match(text, /export class RegisterClaimFromChat/)
})

test('internal create-claim.ts has no @repo/db import', () => {
  const text = readRepo('apps/server/src/routes/internal/leads/create-claim.ts')
  assert.doesNotMatch(text, /from ['"]@repo\/db/)
  assert.doesNotMatch(text, /createTenantClient/)
})

test('createInternalClaim operationId stays on POST /api/internal/claims', () => {
  const text = readRepo('apps/server/src/routes/internal/leads/create-claim.ts')
  assert.match(text, /operationId:\s*'createInternalClaim'/)
  assert.match(text, /method:\s*'POST'/)
  assert.match(text, /url:\s*'\/api\/internal\/claims'/)
})

test('register-claim-from-chat.ts comments S9', () => {
  const text = readRepo(
    'packages/core/src/modules/servicing/claims/application/register-claim-from-chat.ts'
  )
  assert.match(text, /S9/)
})

test('getInternalEntitlements on GET entitlements path', () => {
  const text = readRepo(
    'apps/server/src/routes/internal/billing/get-entitlements.ts'
  )
  assert.match(text, /operationId:\s*'getInternalEntitlements'/)
  assert.match(text, /method:\s*'GET'/)
  assert.match(
    text,
    /url:\s*'\/api\/internal\/billing\/entitlements\/:organizationId'/
  )
})

test('internal billing routes have no @repo/db import', () => {
  const dir = join(root, 'apps/server/src/routes/internal/billing')
  for (const file of walkTs(dir)) {
    const text = readFileSync(file, 'utf8')
    assert.doesNotMatch(text, /from ['"]@repo\/db/)
  }
})

test('baileys-manager has no @repo/core or @repo/db import', () => {
  const text = readRepo('apps/chat-worker/src/messaging/baileys-manager.ts')
  assert.doesNotMatch(text, /from ['"]@repo\/core['"]/)
  assert.doesNotMatch(text, /from ['"]@repo\/db['"]/)
})

test('subscription cache prefix stays sub:', () => {
  const text = readRepo('packages/shared/src/billing-cache-constants.ts')
  assert.match(text, /export const SUBSCRIPTION_CACHE_PREFIX = 'sub:'/)
})

test('entitlements route mounted behind HMAC and internal rate limit', () => {
  const text = readRepo('apps/server/src/app.ts')
  const internalStart = text.indexOf('internalApp.addHook')
  const slice = text.slice(internalStart)
  assert.match(slice, /internalAuthMiddleware/)
  assert.match(slice, /createInternalRateLimitHook/)
  assert.match(
    slice,
    /get-entitlements|createInternalBilling|billing\/entitlements/
  )
})

test('worker consumes erp-record-ai-usage', () => {
  const text = readRepo('apps/worker/src/index.ts')
  assert.match(text, /erp-record-ai-usage/)
})

test('record-ai-usage-adapter enqueues erp-record-ai-usage without core or db', () => {
  const text = readRepo('apps/chat-worker/src/ai/record-ai-usage-adapter.ts')
  assert.match(text, /erp-record-ai-usage/)
  assert.doesNotMatch(text, /from ['"]@repo\/core['"]/)
  assert.doesNotMatch(text, /from ['"]@repo\/db['"]/)
})

test('chat-worker package.json has no @repo/core or @repo/db', () => {
  const pkg = JSON.parse(readRepo('apps/chat-worker/package.json'))
  assert.equal(pkg.dependencies['@repo/core'], undefined)
  assert.equal(pkg.dependencies['@repo/db'], undefined)
})

test('chat-worker tsup noExternal drops core and db', () => {
  const text = readRepo('apps/chat-worker/tsup.config.ts')
  assert.doesNotMatch(text, /'@repo\/core'/)
  assert.doesNotMatch(text, /'@repo\/db'/)
})

test('chat-worker ContactSource comes from @repo/shared not @repo/db', () => {
  for (const relative of [
    'apps/chat-worker/src/tools/capture-lead.ts',
    'apps/chat-worker/src/processors/ai-bot-processor.ts',
  ]) {
    const text = readRepo(relative)
    assert.match(
      text,
      /ContactSource.*@repo\/shared|@repo\/shared.*ContactSource/
    )
    assert.doesNotMatch(text, /from ['"]@repo\/db['"]/)
  }
})
