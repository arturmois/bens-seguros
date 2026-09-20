/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'routes-no-db',
      comment:
        'HTTP routes must not import @repo/db (roadmap §8). Warn until T6.3.',
      severity: 'warn',
      from: { path: '^apps/server/src/routes' },
      to: { path: '@repo/db|packages/db' },
    },
    {
      name: 'no-circular',
      comment:
        'Core module import cycles. Today: proposal⇄contact, proposal⇄policy, proposal⇄document, goal⇄dashboard.',
      severity: 'warn',
      from: { path: '^packages/core/src/modules' },
      to: { circular: true },
    },
    {
      name: 'no-core-infrastructure-from-apps',
      comment:
        'Apps must not import core module infrastructure. Allowlisted: container-registrations.ts and bootstrap/ until T6.1/T6.2.',
      severity: 'warn',
      from: {
        path: '^apps/server/src',
        pathNot: 'container-registrations\\.ts$|src/bootstrap/',
      },
      to: {
        path: '@repo/core/workspace/infrastructure|packages/core/src/modules/.+/infrastructure',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules|dist|\\.next|generated|coverage',
    },
    exclude: {
      path: 'node_modules|dist|\\.next|generated|coverage|\\.spec\\.ts$',
    },
    extraExtensionsToScan: ['.cjs'],
    tsPreCompilationDeps: true,
    combinedDependencies: true,
    tsConfig: { fileName: 'tsconfig.json' },
  },
}
