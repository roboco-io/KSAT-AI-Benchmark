// Publish the frozen research bundle. Never reads live model results or calls models.
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const source = path.dirname(fileURLToPath(import.meta.url));
const destination = path.resolve(source, '../../web/public/research/common-errors');
const ledger = JSON.parse(await readFile(path.join(source, 'ledger.json'), 'utf8'));
const analysis = JSON.parse(await readFile(path.join(source, 'outputs/analysis.json'), 'utf8'));
const files = ['REPORT.md', 'README.md', 'ledger.json', 'analyze.py', 'verify.py', 'test_analyze.py', 'plot.py', 'render_report.py', 'publish.mjs', 'publication.test.mjs'];
for (const directory of ['inputs', 'outputs']) {
  for (const name of (await readdir(path.join(source, directory))).sort()) files.push(`${directory}/${name}`);
}
const manifest = [];
for (const file of files) {
  const target = path.join(destination, file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(source, file), target);
  manifest.push({ file, sha256: createHash('sha256').update(await readFile(target)).digest('hex') });
}
const summary = {
  title: '고득점 AI들은 같은 수능 문제에서 틀리는가?',
  publishedAt: '2026-11-22',
  questionsPerYear: 147,
  years: [2025, 2026].map(year => {
    const panel = analysis.years[year].image_all.official;
    return { year, models: panel.members.length, bestSingle: panel.singles[panel.best_single].correct,
      plurality: panel.plurality.correct, strictMajority: panel.strict_majority.correct, oracle: panel.oracle_correct };
  }),
};
await writeFile(path.join(destination, 'report.json'), `${JSON.stringify(ledger, null, 2)}\n`);
await writeFile(path.join(destination, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(path.join(destination, 'files.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Published frozen research bundle: ${files.length} files, ${ledger.claims.length} claims`);
