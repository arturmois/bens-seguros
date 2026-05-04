import { execFileSync } from 'node:child_process';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

export async function collectDuplication(root) {
  const outDir = join(root, '.quality-gates', 'output', 'jscpd');
  await mkdir(outDir, { recursive: true });

  try {
    execFileSync(
      'pnpm',
      [
        'exec',
        'jscpd',
        '--silent',
        '--reporters',
        'json',
        '--output',
        outDir,
        '--ignore',
        '**/node_modules/**,**/dist/**,**/.next/**,**/.turbo/**,**/generated/**,**/build/**,**/coverage/**,**/_reference/**,**/api/endpoints/**,**/api/model/**,**/api/schemas/**,**/*.spec.ts,**/*.test.ts,**/*.d.ts',
        '--pattern',
        '{apps,packages}/**/*.{ts,tsx}',
        '.',
      ],
      {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 100 * 1024 * 1024,
      },
    );
  } catch (err) {
    return {
      percentage: null,
      duplicatedLines: null,
      totalLines: null,
      clones: null,
      error: err.message?.slice(0, 500) ?? 'jscpd execution failed',
    };
  }

  let report;
  try {
    const raw = await readFile(join(outDir, 'jscpd-report.json'), 'utf8');
    report = JSON.parse(raw);
  } catch (err) {
    return {
      percentage: null,
      duplicatedLines: null,
      totalLines: null,
      clones: null,
      error: `Failed to read jscpd report: ${err.message}`,
    };
  }

  const total = report?.statistics?.total ?? {};
  return {
    percentage: typeof total.percentage === 'number'
      ? Number(total.percentage.toFixed(2))
      : Number(parseFloat(total.percentage ?? 0).toFixed(2)),
    duplicatedLines: total.duplicatedLines ?? 0,
    totalLines: total.lines ?? 0,
    clones: Array.isArray(report?.duplicates) ? report.duplicates.length : 0,
  };
}
