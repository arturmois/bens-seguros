import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function readRepo(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function validateJobBody(yaml) {
  const jobMatch = yaml.match(/\n  validate:\n([\s\S]*?)(?:\n  [a-z]|\n*$)/)
  assert.ok(jobMatch, 'missing validate job')
  return jobMatch[1]
}

function validateJobSteps(yaml) {
  const body = validateJobBody(yaml)
  const raw = body.split('\n      - ')
  return raw.slice(1).map((block) => {
    const folded = block.split('\n').join('\n')
    const run = folded.match(/run:\s*(.+)/)
    const continueOnError = /^\s+continue-on-error:\s*true\s*$/m.test(folded)
    return {
      run: run ? run[1].trim() : '',
      continueOnError,
    }
  })
}

function pgUser(connection) {
  const match = String(connection).match(/:\/\/([^:/@]+)/)
  return match ? match[1] : ''
}

function readPostgresInitSql(compose) {
  const mount = compose.match(/(\S+):\/docker-entrypoint-initdb\.d/)
  assert.ok(
    mount,
    'postgres service must mount docker-entrypoint-initdb.d for first-volume init'
  )
  const hostPath = mount[1].replace(/^\.\//, '')
  const abs = join(root, hostPath)
  const info = statSync(abs)
  if (info.isFile()) return readFileSync(abs, 'utf8')
  const files = readdirSync(abs).filter((name) => name.endsWith('.sql'))
  assert.ok(files.length > 0, 'init directory has no .sql files')
  return files.map((name) => readFileSync(join(abs, name), 'utf8')).join('\n')
}

test('CI postgres service image is postgres 18', () => {
  const job = validateJobBody(readRepo('.github/workflows/ci.yml'))
  const image = job.match(/image:\s*(\S+)/)
  assert.ok(image, 'validate job has no service image')
  assert.equal(image[1].startsWith('postgres:18'), true, image[1])
})

test('CI DATABASE_URL is app_user and DATABASE_ADMIN_URL is bens', () => {
  const job = validateJobBody(readRepo('.github/workflows/ci.yml'))
  const databaseUrls = [...job.matchAll(/DATABASE_URL:\s*(\S+)/g)].map(
    (match) => match[1]
  )
  const adminUrls = [...job.matchAll(/DATABASE_ADMIN_URL:\s*(\S+)/g)].map(
    (match) => match[1]
  )
  assert.ok(
    databaseUrls.some((value) => pgUser(value) === 'app_user'),
    'validate job DATABASE_URL user must be app_user'
  )
  assert.ok(
    adminUrls.some((value) => pgUser(value) === 'bens'),
    'validate job DATABASE_ADMIN_URL user must be bens'
  )
})

test('CI db:push:dev before test without continue-on-error', () => {
  const yaml = readRepo('.github/workflows/ci.yml')
  const job = validateJobBody(yaml)
  assert.match(
    job,
    /pg_isready/,
    'postgres service must use pg_isready healthcheck'
  )
  const steps = validateJobSteps(yaml)
  const pushIndex = steps.findIndex((step) => /db:push:dev/.test(step.run))
  const testIndex = steps.findIndex((step) => step.run === 'pnpm test')
  assert.notEqual(pushIndex, -1, 'missing db:push:dev step')
  assert.notEqual(testIndex, -1, 'missing pnpm test step')
  assert.equal(steps[pushIndex].continueOnError, false)
  assert.ok(pushIndex < testIndex, 'db:push:dev must run before pnpm test')
})

test('vitest core:db include glob', () => {
  const text = readRepo('packages/core/vitest.config.ts')
  assert.match(text, /name:\s*['"]core:db['"]/)
  const dbBlock = text.split(/name:\s*['"]core:db['"]/)[1]
  assert.ok(dbBlock, 'core:db project block is missing')
  assert.match(dbBlock, /\*\*\/\*\.db\.spec\.ts/)
})

test('CLAUDE.md compose prerequisite for db specs', () => {
  const text = readRepo('CLAUDE.md')
  assert.match(text, /docker compose up -d/)
  assert.match(text, /\*\.db\.spec\.ts/)
})

test('unit project dummy DATABASE_URL excludes db specs', () => {
  const text = readRepo('packages/core/vitest.config.ts')
  assert.match(text, /include:\s*\[['"]src\/\*\*\/\*\.spec\.ts['"]/)
  assert.match(text, /exclude:[\s\S]*\*\.db\.spec\.ts/)
  assert.match(
    text,
    /DATABASE_URL:\s*['"]postgresql:\/\/test:test@localhost:5432\/test['"]/
  )
})

test('CI lint typecheck test stay blocking', () => {
  const steps = validateJobSteps(readRepo('.github/workflows/ci.yml'))
  for (const command of ['pnpm lint', 'pnpm typecheck', 'pnpm test']) {
    const step = steps.find((entry) => entry.run === command)
    assert.ok(step, `missing CI step run: ${command}`)
    assert.equal(step.continueOnError, false, command)
  }
})

test('CI arch:check continue-on-error remains true', () => {
  const steps = validateJobSteps(readRepo('.github/workflows/ci.yml'))
  const arch = steps.find((step) => step.run === 'pnpm arch:check')
  assert.ok(arch, 'missing CI step run: pnpm arch:check')
  assert.equal(arch.continueOnError, true)
})

test('compose app_user and env.example split URLs', () => {
  const compose = readRepo('docker-compose.yml')
  const envExample = readRepo('.env.example')
  const sql = readPostgresInitSql(compose)
  assert.match(sql, /CREATE ROLE\s+app_user/)
  assert.match(sql, /NOSUPERUSER/)
  assert.match(sql, /\bLOGIN\b/)
  const databaseUrl = envExample
    .split('\n')
    .find((line) => line.startsWith('DATABASE_URL='))
  const adminUrl = envExample
    .split('\n')
    .find((line) => line.startsWith('DATABASE_ADMIN_URL='))
  assert.ok(databaseUrl, 'DATABASE_URL is missing or commented in .env.example')
  assert.ok(
    adminUrl,
    'DATABASE_ADMIN_URL is missing or commented in .env.example'
  )
  assert.equal(pgUser(databaseUrl.slice('DATABASE_URL='.length)), 'app_user')
  assert.equal(pgUser(adminUrl.slice('DATABASE_ADMIN_URL='.length)), 'bens')
})
