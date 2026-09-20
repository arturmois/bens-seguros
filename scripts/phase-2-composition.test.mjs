import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const clientModule = join(root, 'packages/core/src/modules/client')
const clientRoutes = join(root, 'apps/server/src/routes/v1/clients')

function readRepo(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function walkTs(dir) {
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

test('get-client.ts has no tsyringe', () => {
  const text = readRepo(
    'packages/core/src/modules/client/application/get-client.ts'
  )
  assert.doesNotMatch(text, /tsyringe/)
  assert.doesNotMatch(text, /@injectable/)
  assert.doesNotMatch(text, /@inject/)
})

test('modules/client has no tsyringe import', () => {
  for (const file of walkTs(clientModule)) {
    const text = readFileSync(file, 'utf8')
    assert.doesNotMatch(
      text,
      /from ['"]tsyringe['"]/,
      `${relative(root, file)} imports tsyringe`
    )
  }
})

test('v1 client routes have no container.resolve', () => {
  for (const file of walkTs(clientRoutes)) {
    const text = readFileSync(file, 'utf8')
    assert.doesNotMatch(
      text,
      /container\.resolve/,
      `${relative(root, file)} still calls container.resolve`
    )
  }
})

test('getClientRoute calls clients.getClient.execute', () => {
  const text = readRepo('apps/server/src/routes/v1/clients/get-client.ts')
  assert.match(text, /export function getClientRoute\(/)
  assert.match(text, /clients: ClientsApi/)
  assert.match(text, /clients\.getClient\.execute/)
  assert.doesNotMatch(text, /container\.resolve/)
})

const ROUTES_WITHOUT_CONTAINER = [
  'create-client.ts',
  'list-clients.ts',
  'update-client.ts',
  'delete-client.ts',
  'lgpd-delete-client.ts',
  'export-clients.ts',
  'import-clients.ts',
]

test('client route files take ClientsApi and do not import container', () => {
  for (const name of ROUTES_WITHOUT_CONTAINER) {
    const text = readRepo(`apps/server/src/routes/v1/clients/${name}`)
    assert.match(
      text,
      /clients: ClientsApi/,
      `${name} missing ClientsApi param`
    )
    assert.doesNotMatch(
      text,
      /import \{[^}]*\bcontainer\b[^}]*\} from '@repo\/core'/,
      `${name} still imports container from @repo/core`
    )
    assert.doesNotMatch(
      text,
      /\bcontainer\b/,
      `${name} still mentions container`
    )
  }
})

test('app.ts registers createClientRoutes with ClientsApi', () => {
  const text = readRepo('apps/server/src/app.ts')
  assert.match(text, /createClientRoutes\(clients\)/)
  assert.doesNotMatch(text, /register\(clientRoutes\)/)
})

const DROPPED_REGISTERS = [
  'GetClient',
  'CreateClient',
  'ListClients',
  'UpdateClient',
  'DeleteClient',
  'ExportClientsCsv',
  'ParseClientImport',
]

test('container keeps ClientRepository token and drops client use-case class registers', () => {
  const text = readRepo('apps/server/src/container-registrations.ts')
  assert.match(text, /container\.register\('ClientRepository'/)
  for (const name of DROPPED_REGISTERS) {
    assert.doesNotMatch(
      text,
      new RegExp(`container\\.register\\(${name}[,\\s]`),
      `still registers ${name}`
    )
  }
})

const APPLICATION_NEW = [
  ['get-client.spec.ts', 'GetClient'],
  ['create-client.spec.ts', 'CreateClient'],
  ['list-clients.spec.ts', 'ListClients'],
  ['update-client.spec.ts', 'UpdateClient'],
  ['lgpd-delete-client.spec.ts', 'LgpdDeleteClient'],
  ['parse-client-import.spec.ts', 'ParseClientImport'],
]

test('client application specs construct with new', () => {
  for (const [file, className] of APPLICATION_NEW) {
    const text = readRepo(
      `packages/core/src/modules/client/application/${file}`
    )
    assert.match(
      text,
      new RegExp(`new ${className}\\(`),
      `${file} does not construct ${className} with new`
    )
  }
})

test('client route specs pass fake ClientsApi and skip mockResolve', () => {
  const testsDir = join(clientRoutes, '__tests__')
  for (const file of walkTs(testsDir)) {
    if (!file.endsWith('.spec.ts')) continue
    const text = readFileSync(file, 'utf8')
    const rel = relative(root, file)
    assert.match(
      text,
      /createFakeClientsApi\s*\(/,
      `${rel} does not pass a fake ClientsApi`
    )
    assert.match(
      text,
      /,\s*clients\)/,
      `${rel} does not pass the fake ClientsApi into the route under test`
    )
    assert.doesNotMatch(
      text,
      /\bmockResolve\b/,
      `${rel} still uses mockResolve`
    )
    assert.doesNotMatch(
      text,
      /container\.resolve/,
      `${rel} still stubs via container.resolve`
    )
  }
})

const OPERATION_IDS = [
  ['get-client.ts', 'GET', '/api/v1/clients/:id', 'getClient'],
  ['list-clients.ts', 'GET', '/api/v1/clients', 'listClients'],
  ['create-client.ts', 'POST', '/api/v1/clients', 'createClient'],
  ['update-client.ts', 'PUT', '/api/v1/clients/:id', 'updateClient'],
  ['delete-client.ts', 'DELETE', '/api/v1/clients/:id', 'deleteClient'],
  [
    'lgpd-delete-client.ts',
    'POST',
    '/api/v1/clients/:id/lgpd-delete',
    'lgpdDeleteClient',
  ],
  ['export-clients.ts', 'GET', '/api/v1/clients/export', 'exportClients'],
  [
    'import-clients.ts',
    'GET',
    '/api/v1/clients/import/template',
    'importTemplateClients',
  ],
]

test('client operationIds stay on the same method and URL', () => {
  for (const [file, method, url, operationId] of OPERATION_IDS) {
    const text = readRepo(`apps/server/src/routes/v1/clients/${file}`)
    assert.match(
      text,
      new RegExp(`method:\\s*'${method}'`),
      `${file} method is not ${method}`
    )
    assert.match(
      text,
      new RegExp(`url:\\s*'${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`),
      `${file} url is not ${url}`
    )
    assert.match(
      text,
      new RegExp(`operationId:\\s*'${operationId}'`),
      `${file} operationId is not ${operationId}`
    )
  }
})

const PRISMA_WORKSPACE_REPOS = [
  'PrismaOrganizationRepository',
  'PrismaMemberRepository',
  'PrismaInvitationRepository',
]

test('workspace index does not export Prisma adapters', () => {
  const text = readRepo('packages/core/src/modules/workspace/index.ts')
  for (const name of PRISMA_WORKSPACE_REPOS) {
    assert.doesNotMatch(
      text,
      new RegExp(`export \\{ ${name} \\}`),
      `workspace index still exports ${name}`
    )
  }
})

test('core exports workspace/infrastructure re-exports three Prisma repos', () => {
  const pkg = JSON.parse(readRepo('packages/core/package.json'))
  const target = pkg.exports && pkg.exports['./workspace/infrastructure']
  assert.ok(target, 'missing exports["./workspace/infrastructure"]')
  const resolved =
    typeof target === 'string' ? target : target.default || target.import
  const barrel = readRepo(String(resolved).replace(/^\.\//, 'packages/core/'))
  for (const name of PRISMA_WORKSPACE_REPOS) {
    assert.match(
      barrel,
      new RegExp(`export \\{ ${name} \\}`),
      `${resolved} does not re-export ${name}`
    )
  }
})

test('container-registrations imports workspace Prisma from infrastructure subpath', () => {
  const text = readRepo('apps/server/src/container-registrations.ts')
  assert.match(text, /from '@repo\/core\/workspace\/infrastructure'/)
  const coreImport = text.match(/import \{([\s\S]*?)\} from '@repo\/core'/)
  assert.ok(coreImport, 'missing @repo/core import')
  for (const name of PRISMA_WORKSPACE_REPOS) {
    assert.match(text, new RegExp(`${name}`), `missing ${name}`)
    assert.doesNotMatch(
      coreImport[1],
      new RegExp(`\\b${name}\\b`),
      `${name} still imported from @repo/core`
    )
  }
})

test('cruiser rule no-core-infrastructure-from-apps is warn with allowlist', () => {
  const text = readRepo('.dependency-cruiser.cjs')
  assert.match(text, /name:\s*'no-core-infrastructure-from-apps'/)
  assert.match(text, /severity:\s*'warn'/)
  assert.match(text, /apps\/server\/src/)
  assert.match(text, /infrastructure/)
  assert.match(text, /container-registrations/)
  assert.match(text, /src\/bootstrap\//)
})

test('canary reports no-core-infrastructure-from-apps', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arch-infra-canary-'))
  try {
    const routeDir = join(dir, 'apps/server/src/routes/v1')
    mkdirSync(routeDir, { recursive: true })
    writeFileSync(
      join(routeDir, 'canary-forbidden-infrastructure-import.ts'),
      "import { PrismaMemberRepository } from '@repo/core/workspace/infrastructure'\nexport const ping = PrismaMemberRepository\n"
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
    assert.match(output, /no-core-infrastructure-from-apps/, output)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('container-registrations is allowlisted for workspace infrastructure', () => {
  const bin = join(root, 'node_modules/.bin/depcruise')
  const result = spawnSync(
    bin,
    [
      '--config',
      '.dependency-cruiser.cjs',
      'apps/server/src/container-registrations.ts',
    ],
    { cwd: root, encoding: 'utf8', timeout: 30_000 }
  )
  const output = `${result.stdout}\n${result.stderr}`
  assert.doesNotMatch(output, /no-core-infrastructure-from-apps/, output)
})

test('forbidden-deps documents infrastructure allowlist until T6', () => {
  const text = readRepo('docs/architecture/forbidden-deps.md')
  assert.match(text, /container-registrations\.ts/)
  assert.match(text, /bootstrap\//)
  assert.match(text, /T6\.1\/T6\.2/)
})

test('bens-ddd-module names composeClients for modules/client', () => {
  const text = readRepo('.claude/skills/bens-ddd-module/SKILL.md')
  assert.match(text, /composeClients/)
  assert.match(text, /modules\/client/)
  assert.match(text, /MUST NOT use `@injectable\(\)`/)
})
