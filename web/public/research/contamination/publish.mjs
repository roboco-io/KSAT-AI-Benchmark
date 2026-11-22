// Publish the frozen contamination study to the website bundle. Copies files only; never calls models.
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const source = path.dirname(fileURLToPath(import.meta.url));
const destination = path.resolve(source, '../../web/public/research/contamination');
const readme = await readFile(path.join(source, 'README.md'), 'utf8');
const analysis = JSON.parse(await readFile(path.join(source, 'outputs/summary.json'), 'utf8'));

// The report page shows README.md section by section. "재현" holds a code block and is rendered by the page itself.
const [head, ...rest] = readme.split(/\n(?=## )/);
const [titleLine, ...introLines] = head.trim().split('\n');
const sections = rest.map(block => block.trim()).filter(block => !block.startsWith('## 재현'))
  .map((text, index) => ({ id: `s${String(index + 1).padStart(2, '0')}`, heading: text.split('\n')[0].slice(3), text }));
const report = { title: titleLine.replace(/^# /, ''), intro: introLines.join('\n').trim(), sections };

const files = ['README.md', 'analyze.py', 'logit.py', 'snapshot.mjs', 'publish.mjs', 'publication.test.mjs'];
for (const directory of ['inputs', 'inputs/human', 'outputs']) {
  for (const entry of (await readdir(path.join(source, directory), { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isFile()) files.push(`${directory}/${entry.name}`);
  }
}
const manifest = [];
for (const file of files) {
  const target = path.join(destination, file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(source, file), target);
  manifest.push({ file, sha256: createHash('sha256').update(await readFile(target)).digest('hex') });
}
const adjusted = analysis.difficulty_adjusted;
const row = (label, r) => ({ label, models: r.n_models, effectPp: r.public_effect_pp, ci95Pp: r.public_effect_pp_ci95 });
const summary = {
  title: report.title, publishedAt: '2026-11-22', panelModels: analysis.panel.length, questionsPerYear: 147,
  rows: [row('보정 없음', adjusted.unadjusted_same_model), row('난이도 보정', adjusted.adjusted_position_fe),
    row('천장 모델 제외', adjusted.adjusted_position_fe_without_ceiling_models)],
};
await writeFile(path.join(destination, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(destination, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(path.join(destination, 'files.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Published contamination study: ${files.length} files, ${sections.length} sections`);
