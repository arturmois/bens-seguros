#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { collectCoverage } from './collectors/coverage.mjs'
import { collectDuplication } from './collectors/duplication.mjs'
import { collectESLint } from './collectors/eslint.mjs'
import { collectFileSize } from './collectors/file-size.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')
const OUTPUT_DIR = join(HERE, 'output')
const BASELINE_PATH = join(HERE, 'baseline.json')
const METRICS_PATH = join(OUTPUT_DIR, 'metrics.json')
const REPORT_PATH = join(OUTPUT_DIR, 'report.md')

function parseArgs(argv) {
  const args = { mode: 'check', skip: new Set() }
  for (const arg of argv.slice(2)) {
    if (arg === '--baseline') args.mode = 'baseline'
    else if (arg === '--check') args.mode = 'check'
    else if (arg.startsWith('--skip=')) {
      for (const s of arg.slice(7).split(',')) args.skip.add(s.trim())
    }
  }
  return args
}

async function loadBaseline() {
  try {
    return JSON.parse(await readFile(BASELINE_PATH, 'utf8'))
  } catch {
    return null
  }
}

async function runCollectors(skip) {
  const tasks = [
    ['fileSize', collectFileSize],
    ['eslint', collectESLint],
    ['duplication', collectDuplication],
    ['coverage', collectCoverage],
  ]
  const out = { collectedAt: new Date().toISOString() }
  for (const [name, fn] of tasks) {
    if (skip.has(name)) {
      console.log(`[skip] ${name}`)
      out[name] = { skipped: true }
      continue
    }
    const start = Date.now()
    process.stdout.write(`[run]  ${name} ... `)
    try {
      out[name] = await fn(ROOT)
      console.log(`done (${Date.now() - start}ms)`)
    } catch (err) {
      console.log(`failed: ${err.message}`)
      out[name] = { error: err.message }
    }
  }
  return out
}

function compare(current, baseline) {
  if (!baseline) return { hasBaseline: false, regressions: [] }
  const regressions = []

  if (
    current.fileSize?.violationsCount != null &&
    baseline.fileSize?.violationsCount != null
  ) {
    if (current.fileSize.violationsCount > baseline.fileSize.violationsCount) {
      regressions.push({
        metric: 'fileSize.violationsCount',
        baseline: baseline.fileSize.violationsCount,
        current: current.fileSize.violationsCount,
      })
    }
  }

  if (current.eslint?.errors != null && baseline.eslint?.errors != null) {
    if (current.eslint.errors > baseline.eslint.errors) {
      regressions.push({
        metric: 'eslint.errors',
        baseline: baseline.eslint.errors,
        current: current.eslint.errors,
      })
    }
  }
  if (current.eslint?.warnings != null && baseline.eslint?.warnings != null) {
    if (current.eslint.warnings > baseline.eslint.warnings) {
      regressions.push({
        metric: 'eslint.warnings',
        baseline: baseline.eslint.warnings,
        current: current.eslint.warnings,
      })
    }
  }

  if (
    current.duplication?.percentage != null &&
    baseline.duplication?.percentage != null
  ) {
    if (current.duplication.percentage > baseline.duplication.percentage) {
      regressions.push({
        metric: 'duplication.percentage',
        baseline: baseline.duplication.percentage,
        current: current.duplication.percentage,
      })
    }
  }

  if (current.coverage?.collected && baseline.coverage?.collected) {
    if (current.coverage.lines.pct < baseline.coverage.lines.pct) {
      regressions.push({
        metric: 'coverage.lines.pct',
        baseline: baseline.coverage.lines.pct,
        current: current.coverage.lines.pct,
      })
    }
  }

  return { hasBaseline: true, regressions }
}

function fmtPct(n) {
  return n == null ? 'n/a' : `${n}%`
}

function renderReport(current, baseline, comparison, mode) {
  const lines = []
  lines.push('# Quality Gate Report')
  lines.push('')
  lines.push(`- Modo: \`${mode}\``)
  lines.push(`- Coletado em: ${current.collectedAt}`)
  if (mode === 'check' && !comparison.hasBaseline) {
    lines.push(
      '- ⚠️  Nenhum baseline encontrado. Rode com `--baseline` pra congelar o estado atual.'
    )
  }
  lines.push('')

  lines.push('## Métricas')
  lines.push('')
  lines.push('| Métrica | Atual | Baseline |')
  lines.push('| --- | --- | --- |')

  const fs = current.fileSize || {}
  const fsBase = baseline?.fileSize || {}
  lines.push(
    `| Arquivos > ${fs.limit ?? 200} linhas | ${fs.violationsCount ?? 'n/a'} | ${fsBase.violationsCount ?? 'n/a'} |`
  )
  lines.push(
    `| Total de arquivos TS/TSX | ${fs.totalFiles ?? 'n/a'} | ${fsBase.totalFiles ?? 'n/a'} |`
  )

  const es = current.eslint || {}
  const esBase = baseline?.eslint || {}
  lines.push(
    `| ESLint errors | ${es.errors ?? 'n/a'} | ${esBase.errors ?? 'n/a'} |`
  )
  lines.push(
    `| ESLint warnings | ${es.warnings ?? 'n/a'} | ${esBase.warnings ?? 'n/a'} |`
  )

  const dup = current.duplication || {}
  const dupBase = baseline?.duplication || {}
  lines.push(
    `| Duplicação (%) | ${fmtPct(dup.percentage)} | ${fmtPct(dupBase.percentage)} |`
  )
  lines.push(
    `| Linhas duplicadas | ${dup.duplicatedLines ?? 'n/a'} | ${dupBase.duplicatedLines ?? 'n/a'} |`
  )

  const cov = current.coverage || {}
  const covBase = baseline?.coverage || {}
  if (cov.collected) {
    lines.push(
      `| Cobertura — linhas | ${fmtPct(cov.lines?.pct)} | ${fmtPct(covBase.lines?.pct)} |`
    )
    lines.push(
      `| Cobertura — branches | ${fmtPct(cov.branches?.pct)} | ${fmtPct(covBase.branches?.pct)} |`
    )
  } else {
    lines.push(`| Cobertura | não coletada | ${fmtPct(covBase?.lines?.pct)} |`)
  }
  lines.push('')

  if (mode === 'check' && comparison.hasBaseline) {
    if (comparison.regressions.length === 0) {
      lines.push('## ✅ Sem regressões')
    } else {
      lines.push('## ❌ Regressões detectadas')
      lines.push('')
      lines.push('| Métrica | Baseline | Atual |')
      lines.push('| --- | --- | --- |')
      for (const r of comparison.regressions) {
        lines.push(`| ${r.metric} | ${r.baseline} | ${r.current} |`)
      }
    }
    lines.push('')
  }

  if ((es.topRules?.length ?? 0) > 0) {
    lines.push('## ESLint — top 15 regras violadas')
    lines.push('')
    lines.push('| Regra | Ocorrências |')
    lines.push('| --- | --- |')
    for (const t of es.topRules) lines.push(`| \`${t.rule}\` | ${t.count} |`)
    lines.push('')
  }

  const violations = fs.violations ?? []
  if (violations.length > 0) {
    lines.push(`## Arquivos acima de ${fs.limit} linhas (top 25)`)
    lines.push('')
    lines.push('| Linhas | Arquivo |')
    lines.push('| ---: | --- |')
    for (const v of violations.slice(0, 25)) {
      lines.push(`| ${v.lines} | \`${v.path}\` |`)
    }
    if (violations.length > 25) {
      lines.push(`| ... | _e mais ${violations.length - 25} arquivos_ |`)
    }
    lines.push('')
  }

  if (cov.collected && (cov.perWorkspace?.length ?? 0) > 0) {
    lines.push('## Cobertura por workspace')
    lines.push('')
    lines.push('| Workspace | Linhas |')
    lines.push('| --- | ---: |')
    for (const w of cov.perWorkspace) {
      lines.push(`| \`${w.workspace}\` | ${fmtPct(w.linesPct)} |`)
    }
    lines.push('')
  } else if (!cov.collected) {
    lines.push('## Cobertura — não coletada')
    lines.push('')
    lines.push(`> ${cov.reason ?? 'Sem dados de coverage disponíveis.'}`)
    lines.push('')
  }

  return lines.join('\n')
}

async function main() {
  const args = parseArgs(process.argv)
  await mkdir(OUTPUT_DIR, { recursive: true })

  const current = await runCollectors(args.skip)
  await writeFile(METRICS_PATH, JSON.stringify(current, null, 2))

  const baseline = args.mode === 'baseline' ? null : await loadBaseline()
  const comparison = compare(current, baseline)

  const report = renderReport(current, baseline, comparison, args.mode)
  await writeFile(REPORT_PATH, report)

  if (args.mode === 'baseline') {
    await writeFile(BASELINE_PATH, JSON.stringify(current, null, 2))
    console.log('')
    console.log(`✓ Baseline gravado em ${BASELINE_PATH}`)
    console.log(`✓ Relatório em ${REPORT_PATH}`)
    return 0
  }

  console.log('')
  console.log(`✓ Métricas em ${METRICS_PATH}`)
  console.log(`✓ Relatório em ${REPORT_PATH}`)
  if (comparison.hasBaseline && comparison.regressions.length > 0) {
    console.log(
      `✗ ${comparison.regressions.length} regressão(ões) detectada(s)`
    )
    return 1
  }
  return 0
}

main()
  .then((code) => process.exit(code ?? 0))
  .catch((err) => {
    console.error(err)
    process.exit(2)
  })
