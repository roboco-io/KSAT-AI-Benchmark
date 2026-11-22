import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const publication = new URL('../../web/public/research/common-errors/', import.meta.url);

test('publication preserves every research claim and frozen input', () => {
  assert.ok(existsSync(new URL('report.json', publication)), 'published report is missing');
  const original = JSON.parse(readFileSync(new URL('ledger.json', import.meta.url)));
  const published = JSON.parse(readFileSync(new URL('report.json', publication)));
  assert.deepEqual(published.claims, original.claims);
  for (const file of ['REPORT.md', 'analyze.py', 'inputs/manifest.json', 'inputs/2026-answers.json', 'outputs/analysis.json', 'outputs/error-overlap.png', 'outputs/2026-image_all-pairs.csv']) {
    assert.deepEqual(readFileSync(new URL(file, publication)), readFileSync(new URL(file, import.meta.url)), file);
  }
});

test('dashboard summary is derived from official completed-image panels', () => {
  assert.ok(existsSync(new URL('summary.json', publication)), 'published summary is missing');
  const summary = JSON.parse(readFileSync(new URL('summary.json', publication)));
  assert.deepEqual(summary.years.map(y => [y.year, y.models, y.bestSingle, y.plurality]), [[2025, 9, 146, 146], [2026, 10, 147, 146]]);
  assert.equal(summary.questionsPerYear, 147);
});

test('static export contains the report and resolves its research links', () => {
  const html = readFileSync(new URL('web/out/research/common-errors.html', root), 'utf8');
  const home = readFileSync(new URL('web/out/index.html', root), 'utf8');
  assert.match(home, /id="research"/);
  assert.match(home, /href="\/KSAT-AI-Benchmark\/research\/common-errors.html"/);
  assert.match(html, /고득점 AI들은 같은 수능 문제에서 틀리는가/);
  for (const heading of ['c01', 'c07', 'c09', 'c12', 'c14', 'research-downloads']) assert.ok(html.includes(`id="${heading}"`));
  const links = [...html.matchAll(/(?:href|src)="(\/KSAT-AI-Benchmark\/research\/common-errors\/[^"#]+)"/g)];
  assert.ok(links.length > 20);
  for (const [, link] of links) assert.ok(existsSync(new URL(`web/out${link.replace('/KSAT-AI-Benchmark', '')}`, root)), link);
});
