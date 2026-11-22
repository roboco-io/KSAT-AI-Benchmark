import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const publication = new URL('../../web/public/research/contamination/', import.meta.url);
const signed = value => `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value).toFixed(2)}`;

test('publication preserves the report, inputs and outputs byte for byte', () => {
  for (const file of ['README.md', 'analyze.py', 'logit.py', 'inputs/manifest.json', 'inputs/2027-answers.json', 'inputs/human/exam-level.csv', 'outputs/summary.json', 'outputs/contrasts.csv']) {
    assert.deepEqual(readFileSync(new URL(file, publication)), readFileSync(new URL(file, import.meta.url)), file);
  }
  const report = JSON.parse(readFileSync(new URL('report.json', publication)));
  const readme = readFileSync(new URL('README.md', import.meta.url), 'utf8');
  for (const section of report.sections) assert.ok(readme.includes(section.text), section.heading);
  assert.ok(!readme.includes('~'), 'tilde breaks GFM rendering');
});

test('report and dashboard summary quote the adjusted estimates of the analysis output', () => {
  const analysis = JSON.parse(readFileSync(new URL('outputs/summary.json', import.meta.url)));
  const summary = JSON.parse(readFileSync(new URL('summary.json', publication)));
  const readme = readFileSync(new URL('README.md', import.meta.url), 'utf8');
  const main = analysis.difficulty_adjusted.adjusted_position_fe;
  assert.deepEqual(summary.rows[1], { label: '난이도 보정', models: 6, effectPp: main.public_effect_pp, ci95Pp: main.public_effect_pp_ci95 });
  for (const key of ['unadjusted_same_model', 'adjusted_position_fe', 'adjusted_coarse_fe', 'adjusted_position_fe_without_ceiling_models']) {
    const result = analysis.difficulty_adjusted[key];
    for (const value of [result.public_effect_pp, ...result.public_effect_pp_ci95]) assert.ok(readme.includes(signed(value)), `${key} ${value}`);
  }
});

test('static export contains the report and resolves its research links', () => {
  const html = readFileSync(new URL('web/out/research/contamination.html', root), 'utf8');
  const home = readFileSync(new URL('web/out/index.html', root), 'utf8');
  assert.match(home, /href="\/KSAT-AI-Benchmark\/research\/contamination.html"/);
  assert.match(html, /AI는 이미 공개된 수능에서 점수가 더 높은가/);
  for (const id of ['s01', 's05', 's09', 'research-downloads']) assert.ok(html.includes(`id="${id}"`), id);
  const links = [...html.matchAll(/(?:href|src)="(\/KSAT-AI-Benchmark\/research\/contamination\/[^"#]+)"/g)];
  assert.ok(links.length >= 10);
  for (const [, link] of links) assert.ok(existsSync(new URL(`web/out${link.replace('/KSAT-AI-Benchmark', '')}`, root)), link);
});
