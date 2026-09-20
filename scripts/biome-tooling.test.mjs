import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function readRepo(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function loadBiomeConfig() {
  return JSON.parse(readRepo('biome.json'))
}

function biomeBin() {
  return join(root, 'node_modules/.bin/biome')
}

function validateJobSteps(yaml) {
  const jobMatch = yaml.match(/\n  validate:\n([\s\S]*?)(?:\n  [a-z]|\n*$)/)
  assert.ok(jobMatch, 'missing validate job')
  const body = jobMatch[1]
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

function walkRules(node, acc = []) {
  if (!node || typeof node !== 'object') return acc
  for (const [key, value] of Object.entries(node)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      acc.push([key, value])
      walkRules(value, acc)
    } else {
      acc.push([key, value])
    }
  }
  return acc
}

function findRule(config, name) {
  const rules = config.linter && config.linter.rules
  const entries = walkRules(rules)
  const hit = entries.find(([key]) => key === name)
  return hit ? hit[1] : undefined
}

function ruleLevel(value) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'level' in value) return value.level
  return undefined
}

function biomeCheckInTree(files) {
  const dir = mkdtempSync(join(tmpdir(), 'biome-canary-'))
  try {
    const config = JSON.parse(readRepo('biome.json'))
    if (config.vcs) config.vcs.useIgnoreFile = false
    writeFileSync(join(dir, 'biome.json'), JSON.stringify(config, null, 2))
    for (const [relativePath, contents] of Object.entries(files)) {
      const full = join(dir, relativePath)
      mkdirSync(dirname(full), { recursive: true })
      writeFileSync(full, contents)
    }
    const result = spawnSync(biomeBin(), ['check', '.'], {
      cwd: dir,
      encoding: 'utf8',
      timeout: 30_000,
    })
    return {
      status: result.status,
      output: `${result.stdout}\n${result.stderr}`,
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('pnpm lint is biome check not eslint', () => {
  const pkg = JSON.parse(readRepo('package.json'))
  const script = pkg.scripts && pkg.scripts.lint
  assert.ok(script, 'scripts.lint is missing')
  assert.match(script, /biome check/)
  assert.doesNotMatch(script, /eslint/)

  const fakeDir = mkdtempSync(join(tmpdir(), 'fake-eslint-'))
  try {
    const fakeEslint = join(fakeDir, 'eslint')
    writeFileSync(fakeEslint, '#!/bin/sh\necho invoked-eslint >&2\nexit 99\n')
    chmodSync(fakeEslint, 0o755)
    const result = spawnSync('pnpm', ['run', 'lint'], {
      cwd: root,
      encoding: 'utf8',
      timeout: 120_000,
      env: { ...process.env, PATH: `${fakeDir}:${process.env.PATH}` },
    })
    const output = `${result.stdout}\n${result.stderr}`
    assert.doesNotMatch(output, /invoked-eslint/)
    assert.notEqual(result.status, 99)
    assert.equal(result.status, 0, output)
  } finally {
    rmSync(fakeDir, { recursive: true, force: true })
  }
})

test('package.json lint script is biome check', () => {
  const pkg = JSON.parse(readRepo('package.json'))
  const script = pkg.scripts && pkg.scripts.lint
  assert.ok(script, 'scripts.lint is missing')
  assert.match(script, /biome check/)
  assert.doesNotMatch(script, /eslint/)
  assert.doesNotMatch(script, /turbo lint/)
})

test('package.json format script is biome', () => {
  const pkg = JSON.parse(readRepo('package.json'))
  const script = pkg.scripts && pkg.scripts.format
  assert.ok(script, 'scripts.format is missing')
  assert.match(script, /biome/)
  assert.doesNotMatch(script, /prettier/)
})

test('lint-staged uses biome not eslint or prettier', () => {
  const pkg = JSON.parse(readRepo('package.json'))
  const staged = pkg['lint-staged']
  assert.ok(staged && typeof staged === 'object', 'lint-staged is missing')
  const commands = Object.values(staged).flat()
  assert.ok(commands.length > 0, 'lint-staged has no commands')
  for (const command of commands) {
    assert.match(String(command), /biome/)
    assert.doesNotMatch(String(command), /eslint/)
    assert.doesNotMatch(String(command), /prettier/)
  }
})

test('biome.json javascript formatter pin', () => {
  const config = loadBiomeConfig()
  const js = config.javascript && config.javascript.formatter
  assert.ok(js, 'javascript.formatter is missing')
  const lineWidth =
    (config.formatter && config.formatter.lineWidth) ?? js.lineWidth
  assert.equal(lineWidth, 80)
  assert.equal(js.quoteStyle, 'single')
  assert.equal(js.trailingCommas, 'es5')
  assert.equal(js.semicolons, 'asNeeded')
})

test('biome.json recommended false', () => {
  const config = loadBiomeConfig()
  assert.equal(
    config.linter && config.linter.rules && config.linter.rules.recommended,
    false
  )
})

test('biome.json mapped lint rules', () => {
  const config = loadBiomeConfig()
  assert.equal(ruleLevel(findRule(config, 'noExplicitAny')), 'error')
  const noConsole = findRule(config, 'noConsole')
  assert.equal(ruleLevel(noConsole), 'error')
  const allow =
    noConsole && typeof noConsole === 'object'
      ? noConsole.options?.allow
      : undefined
  assert.ok(Array.isArray(allow), 'noConsole.options.allow is missing')
  assert.ok(allow.includes('warn'), 'noConsole allow must include warn')
  assert.ok(allow.includes('error'), 'noConsole allow must include error')
  assert.ok(!allow.includes('log'), 'noConsole allow must not include log')
  assert.equal(ruleLevel(findRule(config, 'noUnusedVariables')), 'error')
  const unusedPlain = biomeCheckInTree({
    'canary-unused.ts': 'const leftover = 1\n',
  })
  assert.match(unusedPlain.output, /noUnusedVariables/, unusedPlain.output)
  const unusedUnderscore = biomeCheckInTree({
    'canary-unused-underscore.ts': 'const _leftover = 1\n',
  })
  assert.doesNotMatch(
    unusedUnderscore.output,
    /noUnusedVariables/,
    unusedUnderscore.output
  )
})

test('canary reports noExplicitAny', () => {
  const { output } = biomeCheckInTree({
    'canary-any.ts': 'export const value: any = 1\n',
  })
  assert.match(output, /noExplicitAny/, output)
})

test('canary reports noConsole for console.log', () => {
  const { output } = biomeCheckInTree({
    'canary-log.ts': 'console.log("x")\n',
  })
  assert.match(output, /noConsole/, output)
})

test('canary allows console.warn and console.error', () => {
  const { output } = biomeCheckInTree({
    'canary-warn-error.ts': 'console.warn("w")\nconsole.error("e")\n',
  })
  assert.doesNotMatch(output, /noConsole/, output)
})

test('eslint-config and prettier-config directories are gone', () => {
  assert.equal(existsSync(join(root, 'config/eslint-config')), false)
  assert.equal(existsSync(join(root, 'config/prettier-config')), false)
})

test('eslint.config.mjs and prettierrc.mjs are gone', () => {
  assert.equal(existsSync(join(root, 'eslint.config.mjs')), false)
  assert.equal(existsSync(join(root, '.prettierrc.mjs')), false)
})

test('typecheck exits 0', () => {
  const result = spawnSync('pnpm', ['run', 'typecheck'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 300_000,
  })
  const output = `${result.stdout}\n${result.stderr}`
  assert.equal(result.status, 0, output)
})

test('CLAUDE.md lint and format are Biome', () => {
  const text = readRepo('CLAUDE.md')
  const fenceMatch = text.match(/```bash\n([\s\S]*?)```/)
  assert.ok(fenceMatch, 'missing Development Commands fence')
  const fence = fenceMatch[1]
  const lintLine = fence.split('\n').find((line) => /pnpm lint/.test(line))
  const formatLine = fence.split('\n').find((line) => /pnpm format/.test(line))
  assert.ok(lintLine, 'missing pnpm lint line')
  assert.ok(formatLine, 'missing pnpm format line')
  assert.match(lintLine, /biome/i)
  assert.match(formatLine, /biome/i)
  assert.doesNotMatch(lintLine, /eslint/i)
  assert.doesNotMatch(formatLine, /prettier/i)
})

test('CI pnpm lint stays blocking', () => {
  const steps = validateJobSteps(readRepo('.github/workflows/ci.yml'))
  const lint = steps.find((step) => step.run === 'pnpm lint')
  assert.ok(lint, 'missing CI step run: pnpm lint')
  assert.equal(lint.continueOnError, false)
})

test('biome.json enables useSortedClasses', () => {
  const config = loadBiomeConfig()
  const rule = findRule(config, 'useSortedClasses')
  const level = ruleLevel(rule)
  assert.ok(level && level !== 'off', 'useSortedClasses is not enabled')
  const attributes =
    rule && typeof rule === 'object' ? rule.options?.attributes : undefined
  assert.ok(
    Array.isArray(attributes),
    'useSortedClasses options.attributes is missing'
  )
  assert.ok(
    attributes.includes('className'),
    'useSortedClasses must apply to className'
  )
})

test('biome.json ignores node_modules dist next generated', () => {
  const { output } = biomeCheckInTree({
    'node_modules/canary.ts': 'export const value: any = 1\n',
    'dist/canary.ts': 'export const value: any = 1\n',
    '.next/canary.ts': 'export const value: any = 1\n',
    'generated/canary.ts': 'export const value: any = 1\n',
  })
  assert.doesNotMatch(output, /node_modules/, output)
  assert.doesNotMatch(output, /\bdist\b/, output)
  assert.doesNotMatch(output, /\.next/, output)
  assert.doesNotMatch(output, /generated/, output)
})

test('husky pre-commit invokes lint-staged', () => {
  const text = readRepo('.husky/pre-commit')
  assert.match(text, /lint-staged/)
})

test('vscode default formatter is biome', () => {
  const settings = JSON.parse(readRepo('.vscode/settings.json'))
  const biomeId = 'biomejs.biome'
  assert.notEqual(settings['editor.defaultFormatter'], 'esbenp.prettier-vscode')
  assert.equal(settings['[typescript]']?.['editor.defaultFormatter'], biomeId)
  assert.equal(
    settings['[typescriptreact]']?.['editor.defaultFormatter'],
    biomeId
  )
})

test('quality-gates collector does not invoke eslint', () => {
  const text = readRepo('.quality-gates/collectors/eslint.mjs')
  assert.doesNotMatch(text, /execFileSync\(\s*'pnpm',\s*\[[^\]]*eslint/)
  assert.doesNotMatch(text, /'eslint'/)
})

test('biome.json enables noProcessEnv for packages and apps/server', () => {
  const config = loadBiomeConfig()
  const overrides = config.overrides ?? []
  const globs = []
  for (const block of overrides) {
    const wrapped = { linter: block.linter ?? {} }
    if (ruleLevel(findRule(wrapped, 'noProcessEnv')) !== 'error') continue
    globs.push(...[].concat(block.includes ?? []))
  }
  const joined = globs.join(' ')
  assert.match(
    joined,
    /packages/,
    'noProcessEnv error override must include packages/'
  )
  assert.match(
    joined,
    /apps\/server/,
    'noProcessEnv error override must include apps/server/'
  )
})

test('canary packages/core process.env reports noProcessEnv', () => {
  const { output } = biomeCheckInTree({
    'packages/core/canary-env.ts': 'export const foo = process.env.FOO\n',
  })
  assert.match(output, /noProcessEnv/, output)
})

test('packages/env index does not report noProcessEnv', () => {
  const result = spawnSync(biomeBin(), ['check', 'packages/env/src/index.ts'], {
    cwd: root,
    encoding: 'utf8',
    timeout: 30_000,
  })
  const output = `${result.stdout}\n${result.stderr}`
  assert.doesNotMatch(output, /noProcessEnv/, output)
})

test('apps/web NEXT_PUBLIC does not report noProcessEnv', () => {
  const { output } = biomeCheckInTree({
    'apps/web/canary-env.ts':
      'export const url = process.env.NEXT_PUBLIC_API_URL\n',
  })
  assert.doesNotMatch(output, /noProcessEnv/, output)
})

test('packages/db prisma seed does not report noProcessEnv', () => {
  const result = spawnSync(
    biomeBin(),
    ['check', 'packages/db/prisma/seed.ts'],
    {
      cwd: root,
      encoding: 'utf8',
      timeout: 30_000,
    }
  )
  const output = `${result.stdout}\n${result.stderr}`
  assert.doesNotMatch(output, /noProcessEnv/, output)
})
