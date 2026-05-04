import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const SCAN_DIRS = ['apps', 'packages'];
const EXCLUDE = new Set(['node_modules', 'dist', '.next', '.turbo', 'generated']);

async function findCoverageSummaries(root) {
  const found = [];
  for (const top of SCAN_DIRS) {
    let workspaces;
    try {
      workspaces = await readdir(join(root, top), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ws of workspaces) {
      if (!ws.isDirectory()) continue;
      const candidate = join(root, top, ws.name, 'coverage', 'coverage-summary.json');
      try {
        await readFile(candidate, 'utf8');
        found.push(candidate);
      } catch {
        // not present, skip
      }
    }
  }
  return found;
}

export async function collectCoverage(root) {
  const files = await findCoverageSummaries(root);
  if (files.length === 0) {
    return {
      collected: false,
      reason: 'Nenhum coverage-summary.json encontrado. Rode com --coverage --coverage.reporter=json-summary',
      perWorkspace: [],
      lines: { pct: null },
      statements: { pct: null },
      branches: { pct: null },
      functions: { pct: null },
    };
  }

  const totals = {
    lines: { covered: 0, total: 0 },
    statements: { covered: 0, total: 0 },
    branches: { covered: 0, total: 0 },
    functions: { covered: 0, total: 0 },
  };
  const perWorkspace = [];

  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const summary = JSON.parse(raw);
    const total = summary.total;
    if (!total) continue;
    for (const key of Object.keys(totals)) {
      totals[key].covered += total[key].covered;
      totals[key].total += total[key].total;
    }
    perWorkspace.push({
      workspace: relative(root, file).split(sep).slice(0, -2).join('/'),
      linesPct: total.lines.pct,
    });
  }

  const pct = (k) =>
    totals[k].total === 0
      ? 0
      : Number(((totals[k].covered / totals[k].total) * 100).toFixed(2));

  return {
    collected: true,
    perWorkspace,
    lines: { pct: pct('lines'), covered: totals.lines.covered, total: totals.lines.total },
    statements: { pct: pct('statements') },
    branches: { pct: pct('branches') },
    functions: { pct: pct('functions') },
  };
}
