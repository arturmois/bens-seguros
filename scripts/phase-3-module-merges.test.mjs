import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreSrc = join(root, 'packages/core/src')

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

function isDir(relativePath) {
  const path = join(root, relativePath)
  return existsSync(path) && statSync(path).isDirectory()
}

test('old sales module directories are gone', () => {
  for (const name of ['contact', 'proposal', 'policy', 'endorsement']) {
    assert.equal(
      isDir(`packages/core/src/modules/${name}`),
      false,
      `${name} directory still exists`
    )
  }
})

test('sales subfolders exist', () => {
  for (const rel of [
    'packages/core/src/modules/sales/leads',
    'packages/core/src/modules/sales/proposals',
    'packages/core/src/modules/sales/policies',
    'packages/core/src/modules/sales/policies/endorsement',
  ]) {
    assert.equal(isDir(rel), true, `missing ${rel}`)
  }
})

test('sales index exports the four public use cases', () => {
  const text = readRepo('packages/core/src/modules/sales/index.ts')
  for (const name of [
    'CreateContact',
    'CreateProposal',
    'IssuePolicy',
    'CreateEndorsement',
  ]) {
    assert.match(text, new RegExp(name), `sales/index.ts missing ${name}`)
  }
})

test('core barrel exports sales not the four old modules', () => {
  const text = readRepo('packages/core/src/index.ts')
  assert.match(text, /export \* from '\.\/modules\/sales\/index\.js'/)
  for (const name of ['contact', 'proposal', 'policy', 'endorsement']) {
    assert.doesNotMatch(
      text,
      new RegExp(`export \\* from '\\./modules/${name}/index\\.js'`),
      `core barrel still exports modules/${name}`
    )
  }
})

test('proposals import ContactRepository from sales/leads', () => {
  const files = walkTs(join(coreSrc, 'modules/sales/proposals'))
  const hits = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    if (!/ContactRepository/.test(text)) continue
    const importLine = text.match(
      /import[^;]*ContactRepository[^;]*from\s*['"]([^'"]+)['"]/
    )
    if (!importLine) continue
    hits.push({ file: relative(root, file), from: importLine[1] })
    assert.match(
      importLine[1],
      /leads/,
      `${relative(root, file)} ContactRepository from ${importLine[1]}`
    )
    assert.doesNotMatch(importLine[1], /modules\/contact/)
  }
  assert.ok(
    hits.length > 0,
    'no ContactRepository import under sales/proposals'
  )
})

test('policies import ProposalRepository from sales/proposals', () => {
  const policies = join(coreSrc, 'modules/sales/policies')
  const files = walkTs(policies).filter(
    (file) => !file.includes(`${join('policies', 'endorsement')}`)
  )
  const hits = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    const importLine = text.match(
      /import[^;]*ProposalRepository[^;]*from\s*['"]([^'"]+)['"]/
    )
    if (!importLine) continue
    hits.push({ file: relative(root, file), from: importLine[1] })
    assert.match(
      importLine[1],
      /proposals/,
      `${relative(root, file)} ProposalRepository from ${importLine[1]}`
    )
    assert.doesNotMatch(importLine[1], /modules\/proposal/)
  }
  assert.ok(
    hits.length > 0,
    'no ProposalRepository import under sales/policies (excluding endorsement)'
  )
})

test('core test suite exits 0', () => {
  const result = spawnSync('pnpm', ['--filter', '@repo/core', 'test'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 180_000,
  })
  assert.equal(result.status, 0, result.stdout + result.stderr)
})

const SALES_OPERATION_IDS = [
  ['proposals/get-proposal.ts', 'GET', '/api/v1/proposals/:id', 'getProposal'],
  [
    'proposals/create-proposal.ts',
    'POST',
    '/api/v1/proposals',
    'createProposal',
  ],
  ['policies/issue-policy.ts', 'POST', '/api/v1/policies', 'issuePolicy'],
  ['contacts/create-contact.ts', 'POST', '/api/v1/contacts', 'createContact'],
  [
    'endorsements/create-endorsement.ts',
    'POST',
    '/api/v1/endorsements',
    'createEndorsement',
  ],
]

test('sales operationIds stay on the same method and URL', () => {
  for (const [file, method, url, operationId] of SALES_OPERATION_IDS) {
    const text = readRepo(`apps/server/src/routes/v1/${file}`)
    assert.match(text, new RegExp(`method:\\s*'${method}'`))
    assert.match(text, new RegExp(`url:\\s*'${url.replaceAll('/', '\\/')}'`))
    assert.match(text, new RegExp(`operationId:\\s*'${operationId}'`))
  }
})

test('create-proposal.ts still uses tsyringe', () => {
  const text = readRepo(
    'packages/core/src/modules/sales/proposals/application/create-proposal.ts'
  )
  assert.ok(
    /@injectable/.test(text) || /from ['"]tsyringe['"]/.test(text),
    'create-proposal.ts lost tsyringe'
  )
})

test('forbidden-deps drops sales cycles and keeps proposal document', () => {
  const text = readRepo('docs/architecture/forbidden-deps.md')
  const liveTable = text.split('## Core module cycles')[1] ?? text
  assert.doesNotMatch(liveTable, /proposal⇄contact/)
  assert.doesNotMatch(liveTable, /proposal⇄policy/)
  assert.match(liveTable, /proposal⇄document/)
  assert.match(liveTable, /T4\.2/)
})

test('shared-kernel json exports JsonValue and JsonObject', () => {
  const text = readRepo('packages/core/src/shared-kernel/json.ts')
  assert.match(text, /export type JsonValue/)
  assert.match(text, /export type JsonObject/)
})

test('endorsement does not import occurrence', () => {
  const dir = join(coreSrc, 'modules/sales/policies/endorsement')
  for (const file of walkTs(dir)) {
    const text = readFileSync(file, 'utf8')
    assert.doesNotMatch(
      text,
      /from ['"][^'"]*occurrence[^'"]*['"]/,
      `${relative(root, file)} still imports occurrence`
    )
  }
})

test('occurrence does not import JsonValue from policy or sales', () => {
  const next = join(coreSrc, 'modules/servicing/occurrences')
  const prev = join(coreSrc, 'modules/occurrence')
  const dir = existsSync(next) ? next : prev
  assert.equal(existsSync(dir), true, 'occurrence directory missing')
  for (const file of walkTs(dir)) {
    const text = readFileSync(file, 'utf8')
    const importLine = text.match(
      /import[^;]*JsonValue[^;]*from\s*['"]([^'"]+)['"]/
    )
    if (!importLine) continue
    assert.doesNotMatch(
      importLine[1],
      /policy-repository|\/sales\//,
      `${relative(root, file)} JsonValue from ${importLine[1]}`
    )
  }
})

test('policy-repository imports JsonValue from shared-kernel', () => {
  const text = readRepo(
    'packages/core/src/modules/sales/policies/domain/policy-repository.ts'
  )
  const importLine = text.match(
    /import[^;]*JsonValue[^;]*from\s*['"]([^'"]+)['"]/
  )
  assert.ok(importLine, 'policy-repository does not import JsonValue')
  assert.match(importLine[1], /shared-kernel\/json/)
  assert.doesNotMatch(text, /export type JsonValue/)
})

test('old servicing module directories are gone', () => {
  for (const name of ['claim', 'occurrence', 'assistance']) {
    assert.equal(
      isDir(`packages/core/src/modules/${name}`),
      false,
      `${name} directory still exists`
    )
  }
})

test('servicing subfolders exist', () => {
  for (const rel of [
    'packages/core/src/modules/servicing/claims',
    'packages/core/src/modules/servicing/occurrences',
    'packages/core/src/modules/servicing/assistance',
  ]) {
    assert.equal(isDir(rel), true, `missing ${rel}`)
  }
})

test('servicing index exports the three public use cases', () => {
  const text = readRepo('packages/core/src/modules/servicing/index.ts')
  for (const name of ['CreateClaim', 'CreateOccurrence', 'CreateAssistance']) {
    assert.match(text, new RegExp(name), `servicing/index.ts missing ${name}`)
  }
})

test('core barrel exports servicing not the three old modules', () => {
  const text = readRepo('packages/core/src/index.ts')
  assert.match(text, /export \* from '\.\/modules\/servicing\/index\.js'/)
  for (const name of ['claim', 'occurrence', 'assistance']) {
    assert.doesNotMatch(
      text,
      new RegExp(`export \\* from '\\./modules/${name}/index\\.js'`),
      `core barrel still exports modules/${name}`
    )
  }
})

test('create-occurrence imports ClaimRepository from servicing/claims', () => {
  const text = readRepo(
    'packages/core/src/modules/servicing/occurrences/application/create-occurrence.ts'
  )
  const importLine = text.match(
    /import[^;]*ClaimRepository[^;]*from\s*['"]([^'"]+)['"]/
  )
  assert.ok(importLine, 'create-occurrence.ts has no ClaimRepository import')
  assert.match(importLine[1], /servicing\/claims|claims\//)
})

test('performance subfolders exist and old goal dashboard dirs are gone', () => {
  assert.equal(isDir('packages/core/src/modules/goal'), false)
  assert.equal(isDir('packages/core/src/modules/dashboard'), false)
  assert.equal(isDir('packages/core/src/modules/performance/goals'), true)
  assert.equal(isDir('packages/core/src/modules/performance/dashboard'), true)
})

test('billing subfolders exist and old subscription ai-usage dirs are gone', () => {
  assert.equal(isDir('packages/core/src/modules/subscription'), false)
  assert.equal(isDir('packages/core/src/modules/ai-usage'), false)
  assert.equal(isDir('packages/core/src/modules/billing/subscription'), true)
  assert.equal(isDir('packages/core/src/modules/billing/ai-usage'), true)
})

test('platform audit and lookups exist and old dirs are gone', () => {
  assert.equal(isDir('packages/core/src/modules/audit'), false)
  assert.equal(isDir('packages/core/src/modules/cep'), false)
  assert.equal(isDir('packages/core/src/modules/vehicle-lookup'), false)
  assert.equal(isDir('packages/core/src/platform/audit'), true)
  assert.equal(isDir('packages/core/src/platform/lookups/cep'), true)
  assert.equal(isDir('packages/core/src/platform/lookups/vehicle'), true)
})

test('core barrel exports performance billing platform not the seven old modules', () => {
  const text = readRepo('packages/core/src/index.ts')
  assert.match(text, /export \* from '\.\/modules\/performance\/index\.js'/)
  assert.match(text, /export \* from '\.\/modules\/billing\/index\.js'/)
  assert.match(text, /export \* from '\.\/platform\//)
  for (const name of [
    'goal',
    'dashboard',
    'subscription',
    'ai-usage',
    'audit',
    'cep',
    'vehicle-lookup',
  ]) {
    assert.doesNotMatch(
      text,
      new RegExp(`export \\* from '\\./modules/${name}/index\\.js'`),
      `core barrel still exports modules/${name}`
    )
  }
})

test('goals import dashboard from performance/dashboard', () => {
  const files = walkTs(join(coreSrc, 'modules/performance/goals'))
  const hits = []
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    const importLine = text.match(/from\s*['"]([^'"]*dashboard[^'"]*)['"]/)
    if (!importLine) continue
    hits.push(importLine[1])
    assert.match(importLine[1], /dashboard/)
    assert.doesNotMatch(importLine[1], /modules\/dashboard/)
  }
  assert.ok(hits.length > 0, 'no dashboard import under performance/goals')
})

test('forbidden-deps drops goal dashboard cycle', () => {
  const text = readRepo('docs/architecture/forbidden-deps.md')
  const liveTable = text.split('## Core module cycles')[1] ?? text
  assert.doesNotMatch(liveTable, /goal⇄dashboard/)
})

test('platform storage directory still exists', () => {
  assert.equal(isDir('packages/core/src/platform/storage'), true)
})

test('sync-stage-checklist exists and is not on sales index', () => {
  assert.equal(
    existsSync(
      join(
        root,
        'packages/core/src/modules/sales/proposals/application/sync-stage-checklist.ts'
      )
    ),
    true
  )
  const index = readRepo('packages/core/src/modules/sales/index.ts')
  assert.doesNotMatch(index, /sync-stage-checklist/)
})

test('create-proposal calls sync-stage-checklist', () => {
  const text = readRepo(
    'packages/core/src/modules/sales/proposals/application/create-proposal.ts'
  )
  assert.match(text, /sync-stage-checklist/)
  assert.doesNotMatch(
    text,
    /checklistRepo\.createMany\(\s*proposal\.id[\s\S]*itemKey:\s*i\.itemKey/
  )
})

test('advance-proposal-stage calls sync-stage-checklist', () => {
  const text = readRepo(
    'packages/core/src/modules/sales/proposals/application/advance-proposal-stage.ts'
  )
  assert.match(text, /sync-stage-checklist/)
})

test('sync-stage-checklist auto-detect keys stay in order', () => {
  const text = readRepo(
    'packages/core/src/modules/sales/proposals/application/sync-stage-checklist.ts'
  )
  const client = text.search(/['"]client_data['"]/)
  const driver = text.search(/['"]driver_license['"]/)
  const vehicle = text.search(/['"]vehicle_registration['"]/)
  assert.ok(client >= 0, 'missing client_data')
  assert.ok(driver > client, 'driver_license must follow client_data')
  assert.ok(vehicle > driver, 'vehicle_registration must follow driver_license')
})
