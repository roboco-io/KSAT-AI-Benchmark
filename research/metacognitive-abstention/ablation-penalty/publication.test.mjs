import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../../../', import.meta.url);
const publication = new URL('../../../web/public/research/penalty-abstention/', import.meta.url);

test('publication preserves penalty-abstention frozen runs, outputs, and scripts byte-for-byte', () => {
  assert.ok(existsSync(new URL('report.json', publication)), 'published report.json is missing');
  assert.ok(existsSync(new URL('summary.json', publication)), 'published summary.json is missing');
  assert.ok(existsSync(new URL('files.json', publication)), 'published files.json is missing');
  for (const file of [
    'PLAN.md',
    'REPORT.md',
    'analyze_ablation.py',
    'verify_ablation.py',
    'runs/penalty_1__deepseek-v4.1-flash.json',
    'runs/penalty_3__deepseek-v4.1-flash.json',
    'runs/penalty_1__gpt-6-luna.json',
    'runs/penalty_3__gpt-6-luna.json',
    'runs/penalty_1__claude-haiku-5-5.json',
    'runs/penalty_3__claude-haiku-5-5.json',
    'outputs/ablation_analysis.json',
    'outputs/verification.json',
    'outputs/condition_summary.csv',
    'outputs/subject_elasticity.csv',
    'outputs/new_abstentions.csv',
    'outputs/fig_ablation1_elasticity_and_utility.png',
    'outputs/fig_ablation2_selectivity_and_domains.png',
    'outputs/social-thumbnail.png',
  ]) {
    assert.deepEqual(
      readFileSync(new URL(file, publication)),
      readFileSync(new URL(file, import.meta.url)),
      file
    );
  }
});

test('dashboard summary matches outputs/ablation_analysis.json exactly', () => {
  const analysis = JSON.parse(readFileSync(new URL('outputs/ablation_analysis.json', import.meta.url), 'utf8'));
  const summary = JSON.parse(readFileSync(new URL('summary.json', publication), 'utf8'));
  assert.equal(summary.nQuestions, 80);
  assert.equal(summary.nModels, 3);
  assert.equal(analysis.n_questions, 80);
  const ds = summary.models.find(m => m.model === 'deepseek-v4.1-flash');
  const luna = summary.models.find(m => m.model === 'gpt-6-luna');
  const haiku = summary.models.find(m => m.model === 'claude-haiku-5-5');
  assert.deepEqual([ds.c0Abstained, ds.c1Abstained, ds.c2Abstained], [0, 38, 42]);
  assert.deepEqual([luna.c0Abstained, luna.c1Abstained, luna.c2Abstained], [11, 18, 23]);
  assert.deepEqual([haiku.c0Abstained, haiku.c1Abstained, haiku.c2Abstained], [12, 19, 39]);
  assert.deepEqual(
    [
      summary.domainEcrPct.baseline.nonfigureSocial,
      summary.domainEcrPct.penalty1.nonfigureSocial,
      summary.domainEcrPct.penalty3.nonfigureSocial,
    ],
    [1.9, 30.4, 51.5]
  );
});

test('static export contains the penalty-abstention report, social thumbnail, and resolves all links', () => {
  const html = readFileSync(new URL('web/out/research/penalty-abstention.html', root), 'utf8');
  const home = readFileSync(new URL('web/out/index.html', root), 'utf8');
  assert.match(home, /href="\/KSAT-AI-Benchmark\/research\/penalty-abstention\.html"/);
  assert.match(html, /오답에 감점을 주면 AI는 기권할까/);
  for (const heading of ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'research-downloads']) {
    assert.ok(html.includes(`id="${heading}"`), `missing heading id="${heading}"`);
  }
  const links = [...html.matchAll(/(?:href|src)="(\/KSAT-AI-Benchmark\/research\/penalty-abstention\/[^"#]+)"/g)];
  assert.ok(links.length >= 14, `expected >= 14 asset links, got ${links.length}`);
  for (const [, link] of links) {
    assert.ok(
      existsSync(new URL(`web/out${link.replace('/KSAT-AI-Benchmark', '')}`, root)),
      `unresolved asset link: ${link}`
    );
  }
  assert.match(html, /https:\/\/roboco\.io\/KSAT-AI-Benchmark\/images\/research-penalty-abstention-social\.png/);
  assert.ok(
    existsSync(new URL('web/out/images/research-penalty-abstention-social.png', root)),
    'missing exported social thumbnail'
  );
});
