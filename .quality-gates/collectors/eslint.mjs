import { execFileSync } from 'node:child_process'

function runBiomeCheck(root) {
  let raw
  try {
    raw = execFileSync(
      'pnpm',
      ['exec', 'biome', 'check', '.', '--reporter=json'],
      {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 100 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )
  } catch (err) {
    if (err.stdout && err.stdout.length > 0) raw = err.stdout
    else throw err
  }
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const jsonText = start >= 0 ? trimmed.slice(start) : trimmed
  return JSON.parse(jsonText)
}

export async function collectESLint(root) {
  const report = runBiomeCheck(root)
  const diagnostics = report.diagnostics ?? []
  let errors = 0
  let warnings = 0
  const byRule = {}
  for (const diagnostic of diagnostics) {
    const severity = diagnostic.severity
    if (severity === 'error') errors += 1
    else if (severity === 'warning' || severity === 'warn') warnings += 1
    const ruleId = diagnostic.category ?? diagnostic.ruleId ?? 'unknown'
    byRule[ruleId] = (byRule[ruleId] || 0) + 1
  }
  const topRules = Object.entries(byRule)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([rule, count]) => ({ rule, count }))
  return {
    errors,
    warnings,
    byRule,
    topRules,
    perWorkspace: [],
  }
}
