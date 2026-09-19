import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixtures = join(root, 'scripts/fixtures/phase-0-freeze')
const ROADMAP = 'docs/architecture-refactoring-roadmap.md'
const MODULAR_ARCHITECTURE_SHA256 =
  '12ae08d5c505356708c3840bb41023c3ae2307882b72b7c86a473a6816d65853'

function readRepo(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function section(text, startHeading, endHeading) {
  const start = text.indexOf(startHeading)
  assert.notEqual(start, -1, `missing heading ${startHeading}`)
  const from = start + startHeading.length
  const end = endHeading ? text.indexOf(endHeading, from) : -1
  return end === -1 ? text.slice(from) : text.slice(from, end)
}

test('overview Arch pointer names the roadmap', () => {
  const match = readRepo('CLAUDE.md').match(/\*\*Arch:\*\*\s*`([^`]+)`/)
  assert.ok(match, 'CLAUDE.md has no **Arch:** pointer')
  assert.equal(match[1], ROADMAP)
})

test('doc-index row names the roadmap', () => {
  const index = section(readRepo('CLAUDE.md'), '## Doc index', '')
  assert.match(index, /\| `docs\/architecture-refactoring-roadmap\.md` \|/)
})

test('DDD skill bullet names ADR-2 composition and forbids abstract-class tokens', () => {
  const bullet = readRepo('CLAUDE.md')
    .split('\n')
    .find((line) => line.includes('→ skill `bens-ddd-module`'))
  assert.ok(bullet, 'missing bens-ddd-module skill bullet')
  assert.match(bullet, /ADR-2/)
  assert.match(bullet, /composi[cç][aã]o/i)
  assert.doesNotMatch(bullet, /abstract class tokens/i)
  assert.doesNotMatch(bullet, /classes abstratas/i)
})

test('MOD-1 summary row names ADR-2 composition and does not prescribe abstract tokens', () => {
  const row = readRepo('docs/ARCHITECTURE-DECISIONS.md')
    .split('\n')
    .find((line) => /^\|\s*MOD-1\s*\|/.test(line))
  assert.ok(row, 'missing MOD-1 summary-table row')
  assert.match(row, /ADR-2/)
  assert.match(row, /composi[cç][aã]o/i)
  assert.doesNotMatch(row, /classes abstratas/i)
  assert.doesNotMatch(row, /abstract class tokens/i)
})

test('MOD-1 Decisao bullet names explicit composition ADR-2 and links the roadmap', () => {
  const mod1 = section(
    readRepo('docs/ARCHITECTURE-DECISIONS.md'),
    '## MOD-1 — Arquitetura Modular por Bounded Context (2026-09-13)',
    ''
  )
  const decisao = section(mod1, '### Decisão', '### Regras')
  assert.match(decisao, /ADR-2/)
  assert.match(decisao, /composi[cç][aã]o/i)
  assert.match(decisao, /architecture-refactoring-roadmap\.md/)
  assert.doesNotMatch(decisao, /Tokens de DI são classes abstratas/)
})

test('MOD-1 Migracao sequence names the roadmap and not the seven-phase path', () => {
  const mod1 = section(
    readRepo('docs/ARCHITECTURE-DECISIONS.md'),
    '## MOD-1 — Arquitetura Modular por Bounded Context (2026-09-13)',
    ''
  )
  const migracao = section(mod1, '### Migração', '')
  assert.match(migracao, /architecture-refactoring-roadmap\.md/)
  assert.doesNotMatch(migracao, /7 fases incrementais descritas em/)
})

test('live guidance phrases only appear with superseded', () => {
  const files = ['CLAUDE.md', 'docs/ARCHITECTURE-DECISIONS.md']
  const needle = /abstract class tokens|classes abstratas/i
  for (const file of files) {
    for (const line of readRepo(file).split('\n')) {
      if (needle.test(line)) {
        assert.match(
          line,
          /superseded/i,
          `${file} line mentions abstract tokens without superseded: ${line}`
        )
      }
    }
  }
})

test('migration-plan banner states superseded sequencing DI catalogue and roadmap', () => {
  const text = readRepo('docs/architecture/2026-09-13-migration-plan.md')
  const headingAt = text.indexOf('# Migration Plan')
  assert.notEqual(headingAt, -1)
  const banner = text.slice(0, headingAt)
  assert.ok(banner.trim().length > 0, 'file must start with a banner before the title')
  assert.match(banner, /superseded/i)
  assert.match(banner, /sequencing/i)
  assert.match(banner, /\bDI\b/)
  assert.match(banner, /catalogue|catalog/i)
  assert.match(banner, /architecture-refactoring-roadmap\.md/)
})

test('migration-plan body unchanged from the first Migration Plan heading', () => {
  const text = readRepo('docs/architecture/2026-09-13-migration-plan.md')
  const headingAt = text.indexOf('# Migration Plan')
  assert.notEqual(headingAt, -1)
  const body = text.slice(headingAt)
  const snapshot = readFileSync(join(fixtures, 'migration-plan-body.md'), 'utf8')
  assert.equal(body, snapshot)
})

test('modular-architecture unchanged', () => {
  const bytes = readFileSync(
    join(root, 'docs/architecture/2026-09-13-modular-architecture.md')
  )
  const digest = createHash('sha256').update(bytes).digest('hex')
  assert.equal(digest, MODULAR_ARCHITECTURE_SHA256)
})

test('context-map status and tables', () => {
  const text = readRepo('docs/architecture/context-map.md')
  const statusEnd = text.indexOf('\n---\n')
  const status = statusEnd === -1 ? text : text.slice(0, statusEnd)
  assert.match(status, /architecture-refactoring-roadmap\.md/)
  const modules = section(text, '## 1. Módulos', '## 2.')
  const imports = section(text, '## 2. Dependências permitidas', '## 3.')
  assert.equal(
    modules,
    readFileSync(join(fixtures, 'context-map-modules.section.md'), 'utf8')
  )
  assert.equal(
    imports,
    readFileSync(join(fixtures, 'context-map-imports.section.md'), 'utf8')
  )
})
