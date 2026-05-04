import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

async function findWorkspacesWithLint(root) {
  const found = [];
  for (const top of ['apps', 'packages']) {
    let entries;
    try {
      entries = await readdir(join(root, top), { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgPath = join(root, top, entry.name, 'package.json');
      try {
        const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
        if (pkg.scripts?.lint) {
          found.push({
            name: pkg.name ?? `${top}/${entry.name}`,
            dir: join(root, top, entry.name),
            script: pkg.scripts.lint,
          });
        }
      } catch {
        // skip
      }
    }
  }
  return found;
}

function runEslintInWorkspace(dir) {
  let raw;
  try {
    raw = execFileSync(
      'pnpm',
      [
        'exec',
        'eslint',
        'src',
        '--format',
        'json',
        '--no-error-on-unmatched-pattern',
      ],
      {
        cwd: dir,
        encoding: 'utf8',
        maxBuffer: 100 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
  } catch (err) {
    if (err.stdout && err.stdout.length > 0) raw = err.stdout;
    else throw err;
  }
  const trimmed = raw.trim();
  const start = trimmed.indexOf('[');
  const jsonText = start >= 0 ? trimmed.slice(start) : trimmed;
  return JSON.parse(jsonText);
}

export async function collectESLint(root) {
  const workspaces = await findWorkspacesWithLint(root);
  if (workspaces.length === 0) {
    return {
      errors: 0,
      warnings: 0,
      byRule: {},
      topRules: [],
      perWorkspace: [],
      note: 'Nenhum workspace com script lint encontrado.',
    };
  }

  let errors = 0;
  let warnings = 0;
  const byRule = {};
  const perWorkspace = [];

  for (const ws of workspaces) {
    let parsed;
    try {
      parsed = runEslintInWorkspace(ws.dir);
    } catch (err) {
      perWorkspace.push({
        workspace: ws.name,
        errors: null,
        warnings: null,
        error: err.message?.slice(0, 300) ?? 'eslint failed',
      });
      continue;
    }
    let wsErrors = 0;
    let wsWarnings = 0;
    for (const file of parsed) {
      for (const msg of file.messages) {
        if (msg.severity === 2) {
          errors += 1;
          wsErrors += 1;
        } else if (msg.severity === 1) {
          warnings += 1;
          wsWarnings += 1;
        }
        const ruleId = msg.ruleId || 'parser-error';
        byRule[ruleId] = (byRule[ruleId] || 0) + 1;
      }
    }
    perWorkspace.push({
      workspace: ws.name,
      dir: relative(root, ws.dir).split(sep).join('/'),
      errors: wsErrors,
      warnings: wsWarnings,
    });
  }

  const topRules = Object.entries(byRule)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([rule, count]) => ({ rule, count }));

  return { errors, warnings, byRule, topRules, perWorkspace };
}
