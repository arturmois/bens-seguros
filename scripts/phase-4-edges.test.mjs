import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
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

test('attach-proposal-document exports AttachProposalDocument', () => {
  const text = readRepo(
    'packages/core/src/modules/sales/proposals/application/attach-proposal-document.ts'
  )
  assert.match(text, /export class AttachProposalDocument/)
})

test('upload-document.ts has no sales or AutoComplete import', () => {
  const text = readRepo(
    'packages/core/src/modules/document/application/upload-document.ts'
  )
  assert.doesNotMatch(text, /AutoCompleteChecklistItems/)
  assert.doesNotMatch(text, /modules\/sales/)
})

test('document module has zero sales imports', () => {
  const dir = join(root, 'packages/core/src/modules/document')
  for (const file of walkTs(dir)) {
    const text = readFileSync(file, 'utf8')
    const fromSales = text.match(/from ['"][^'"]*sales[^'"]*['"]/g) ?? []
    assert.equal(
      fromSales.length,
      0,
      `${file} imports sales: ${fromSales.join(', ')}`
    )
  }
})

test('uploadDocument operationId stays on POST /api/v1/documents/upload', () => {
  const text = readRepo(
    'apps/server/src/routes/v1/documents/upload-document.ts'
  )
  assert.match(text, /operationId:\s*'uploadDocument'/)
  assert.match(text, /method:\s*'POST'/)
  assert.match(text, /url:\s*'\/api\/v1\/documents\/upload'/)
})

test('forbidden-deps drops proposal document cycle', () => {
  const text = readRepo('docs/architecture/forbidden-deps.md')
  assert.doesNotMatch(text, /proposal⇄document/)
})

test('capture-lead exports CaptureLead', () => {
  const text = readRepo(
    'packages/core/src/modules/sales/leads/application/capture-lead.ts'
  )
  assert.match(text, /export class CaptureLead/)
})

test('ContactRepository declares findByPhone', () => {
  const text = readRepo(
    'packages/core/src/modules/sales/leads/domain/contact-repository.ts'
  )
  assert.match(
    text,
    /findByPhone\(\s*phone:\s*string,\s*organizationId:\s*string\s*\)/
  )
})

test('MemberRepository declares findOldestActive', () => {
  const text = readRepo(
    'packages/core/src/modules/workspace/members/domain/member-repository.ts'
  )
  assert.match(text, /findOldestActive\(organizationId: string\)/)
})

test('create-lead.ts has no @repo/db import', () => {
  const text = readRepo('apps/server/src/routes/internal/leads/create-lead.ts')
  assert.doesNotMatch(text, /from ['"]@repo\/db/)
  assert.doesNotMatch(text, /createTenantClient/)
})

test('chat-worker capture-lead path and body keys unchanged', () => {
  const text = readRepo('apps/chat-worker/src/tools/capture-lead.ts')
  assert.match(text, /\/api\/internal\/leads/)
  assert.match(text, /clientName/)
  assert.match(text, /clientPhone/)
  assert.match(text, /insuranceType/)
  assert.match(text, /notes/)
  assert.match(text, /source/)
})

test('internal list and update-client routes have no @repo/db', () => {
  for (const relative of [
    'apps/server/src/routes/internal/leads/list-proposals.ts',
    'apps/server/src/routes/internal/leads/list-policies.ts',
    'apps/server/src/routes/internal/leads/update-client.ts',
  ]) {
    const text = readRepo(relative)
    assert.doesNotMatch(text, /from ['"]@repo\/db/)
    assert.doesNotMatch(text, /createTenantClient/)
  }
})

test('internal list and update operationIds stay on the same method and URL', () => {
  const proposals = readRepo(
    'apps/server/src/routes/internal/leads/list-proposals.ts'
  )
  assert.match(proposals, /operationId:\s*'listInternalProposals'/)
  assert.match(proposals, /method:\s*'GET'/)
  assert.match(proposals, /url:\s*'\/api\/internal\/proposals'/)
  const policies = readRepo(
    'apps/server/src/routes/internal/leads/list-policies.ts'
  )
  assert.match(policies, /operationId:\s*'listInternalPolicies'/)
  assert.match(policies, /method:\s*'GET'/)
  assert.match(policies, /url:\s*'\/api\/internal\/policies'/)
  const clients = readRepo(
    'apps/server/src/routes/internal/leads/update-client.ts'
  )
  assert.match(clients, /operationId:\s*'updateClientInternal'/)
  assert.match(clients, /method:\s*'PUT'/)
  assert.match(clients, /url:\s*'\/api\/internal\/clients\/:id'/)
})
