import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)

function readRepo(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function loadCruiserConfig() {
  return require(join(root, '.dependency-cruiser.cjs'))
}

function forbiddenRule(name) {
  const config = loadCruiserConfig()
  assert.ok(Array.isArray(config.forbidden), 'config.forbidden is an array')
  const rule = config.forbidden.find((entry) => entry.name === name)
  assert.ok(rule, `missing forbidden rule ${name}`)
  return rule
}

function validateJobSteps(yaml) {
  const jobMatch = yaml.match(/\n  validate:\n([\s\S]*?)(?:\n  [a-z]|\n*$)/)
  assert.ok(jobMatch, 'missing validate job')
  const body = jobMatch[1]
  const raw = body.split('\n      - ')
  return raw.slice(1).map((block) => {
    const lines = block.split('\n')
    const folded = lines.join('\n')
    const run = folded.match(/run:\s*(.+)/)
    const name = folded.match(/name:\s*(.+)/)
    const continueOnError = /^\s+continue-on-error:\s*true\s*$/m.test(folded)
    return {
      run: run ? run[1].trim() : '',
      name: name ? name[1].trim() : '',
      continueOnError,
    }
  })
}

test('package.json arch:check lists dependency-cruiser and the config flag', () => {
  const pkg = JSON.parse(readRepo('package.json'))
  assert.ok(
    pkg.devDependencies && pkg.devDependencies['dependency-cruiser'],
    'root devDependencies.dependency-cruiser is missing'
  )
  const script = pkg.scripts && pkg.scripts['arch:check']
  assert.ok(script, 'scripts.arch:check is missing')
  assert.match(script, /--config \.dependency-cruiser\.cjs/)
})

test('rule routes-no-db is warn from server routes to db', () => {
  const rule = forbiddenRule('routes-no-db')
  assert.equal(rule.severity, 'warn')
  assert.match(String(rule.from.path), /apps\/server\/src\/routes/)
  assert.match(String(rule.to.path), /@repo\/db|packages\/db/)
})

test('rule no-circular is warn over core modules', () => {
  const rule = forbiddenRule('no-circular')
  assert.equal(rule.severity, 'warn')
  assert.equal(rule.to.circular, true)
  assert.match(String(rule.from.path), /packages\/core\/src\/modules/)
})

test('arch:check prints violations and exits 0', () => {
  const result = spawnSync('pnpm', ['arch:check'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120_000,
  })
  const output = `${result.stdout}\n${result.stderr}`
  assert.equal(result.status, 0, output)
  assert.match(output, /violations/i)
})

test('canary reports routes-no-db', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arch-canary-'))
  try {
    const routeDir = join(dir, 'apps/server/src/routes')
    mkdirSync(routeDir, { recursive: true })
    writeFileSync(
      join(routeDir, 'canary-forbidden-db-import.ts'),
      "import { prisma } from '@repo/db'\nexport const ping = prisma\n"
    )
    writeFileSync(
      join(dir, '.dependency-cruiser.cjs'),
      readRepo('.dependency-cruiser.cjs')
    )
    writeFileSync(join(dir, 'tsconfig.json'), '{}\n')
    const bin = join(root, 'node_modules/.bin/depcruise')
    const result = spawnSync(
      bin,
      ['--config', '.dependency-cruiser.cjs', 'apps/server/src/routes'],
      { cwd: dir, encoding: 'utf8', timeout: 30_000 }
    )
    const output = `${result.stdout}\n${result.stderr}`
    assert.match(output, /routes-no-db/, output)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('forbidden-deps hotspots list routes to db and four core cycles', () => {
  const text = readRepo('docs/architecture/forbidden-deps.md')
  assert.match(text, /routes\/\*\* → @repo\/db/)
  for (const cycle of [
    'proposal⇄contact',
    'proposal⇄policy',
    'proposal⇄document',
    'goal⇄dashboard',
  ]) {
    assert.match(text, new RegExp(cycle))
  }
})

test('CI arch:check continue-on-error', () => {
  const steps = validateJobSteps(readRepo('.github/workflows/ci.yml'))
  const arch = steps.find((step) => step.run === 'pnpm arch:check')
  assert.ok(arch, 'missing CI step run: pnpm arch:check')
  assert.equal(arch.continueOnError, true)
})

test('CI blocking steps after arch:check', () => {
  const steps = validateJobSteps(readRepo('.github/workflows/ci.yml'))
  const archIndex = steps.findIndex((step) => step.run === 'pnpm arch:check')
  assert.notEqual(archIndex, -1, 'missing arch:check step')
  for (const command of ['pnpm lint', 'pnpm typecheck', 'pnpm test']) {
    const index = steps.findIndex((step) => step.run === command)
    assert.notEqual(index, -1, `missing ${command}`)
    assert.ok(
      index > archIndex,
      `${command} must run after arch:check so continue-on-error still reaches it`
    )
  }
})

test('CI blocking steps stay blocking', () => {
  const steps = validateJobSteps(readRepo('.github/workflows/ci.yml'))
  for (const command of ['pnpm lint', 'pnpm typecheck', 'pnpm test']) {
    const step = steps.find((entry) => entry.run === command)
    assert.ok(step, `missing ${command}`)
    assert.equal(
      step.continueOnError,
      false,
      `${command} must not continue-on-error`
    )
  }
})
