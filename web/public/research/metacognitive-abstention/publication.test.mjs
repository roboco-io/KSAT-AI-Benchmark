import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const publication = new URL('../../web/public/research/metacognitive-abstention/', import.meta.url);

test('publication preserves frozen inputs, outputs, and scripts byte-for-byte', () => {
  assert.ok(existsSync(new URL('report.json', publication)), 'published report.json is missing');
  assert.ok(existsSync(new URL('summary.json', publication)), 'published summary.json is missing');
  assert.ok(existsSync(new URL('files.json', publication)), 'published files.json is missing');
  for (const file of [
    'REPORT.md',
    'README.md',
    'analyze.py',
    'verify.py',
    'inputs/manifest.json',
    'inputs/figure_dependent.json',
    'outputs/analysis.json',
    'outputs/verification.json',
    'outputs/model_summary.csv',
    'outputs/domain_asymmetry_p4.csv',
    'outputs/subject_breakdown_p4.csv',
    'outputs/abstention_cases.csv',
    'outputs/fig1_selective_tradeoff.png',
    'outputs/fig2_domain_asymmetry.png',
    'outputs/fig3_difficulty_calibration.png',
    'outputs/fig4_abstention_taxonomy.png',
    'outputs/social-thumbnail.png',
  ]) {
    assert.deepEqual(
      readFileSync(new URL(file, publication)),
      readFileSync(new URL(file, import.meta.url)),
      file
    );
  }
});

test('dashboard summary matches outputs/analysis.json exactly', () => {
  const analysis = JSON.parse(readFileSync(new URL('outputs/analysis.json', import.meta.url), 'utf8'));
  const summary = JSON.parse(readFileSync(new URL('summary.json', publication), 'utf8'));
  assert.equal(summary.primaryAbstentions, analysis.total_abstention_instances_primary_image);
  assert.equal(summary.primaryAbstentions, 187);
  assert.equal(summary.p4Questions, 360);
  assert.equal(summary.p4PrimaryModels, 12);
  assert.deepEqual(
    [
      summary.factorial2x2.socialNonFigure.ecr,
      summary.factorial2x2.socialFigure.ecr,
      summary.factorial2x2.scienceNonFigure.ecr,
      summary.factorial2x2.scienceFigure.ecr,
    ],
    [3.9, 23.8, 53.7, 56.1]
  );
  assert.equal(summary.taxonomy.deductive_derivation_block, 82);
  assert.equal(summary.taxonomy.visual_spatial_grounding, 77);
  assert.equal(summary.taxonomy.factual_knowledge_gap, 3);
});

test('static export contains the metacognitive-abstention report and resolves all links', () => {
  const html = readFileSync(new URL('web/out/research/metacognitive-abstention.html', root), 'utf8');
  const home = readFileSync(new URL('web/out/index.html', root), 'utf8');
  assert.match(home, /id="research"/);
  assert.match(home, /href="\/KSAT-AI-Benchmark\/research\/metacognitive-abstention.html"/);
  assert.match(home, /href="\/KSAT-AI-Benchmark\/research\/common-errors.html"/);
  assert.match(html, /자신이 모르는 것/);
  for (const heading of ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c07', 'c08', 'research-downloads']) {
    assert.ok(html.includes(`id="${heading}"`), `missing heading id="${heading}"`);
  }
  const links = [...html.matchAll(/(?:href|src)="(\/KSAT-AI-Benchmark\/research\/metacognitive-abstention\/[^"#]+)"/g)];
  assert.ok(links.length >= 16, `expected >= 16 asset links, got ${links.length}`);
  for (const [, link] of links) {
    assert.ok(
      existsSync(new URL(`web/out${link.replace('/KSAT-AI-Benchmark', '')}`, root)),
      `unresolved asset link: ${link}`
    );
  }
  assert.match(html, /https:\/\/roboco\.io\/KSAT-AI-Benchmark\/images\/research-metacognitive-abstention-social\.png/);
  assert.ok(existsSync(new URL('web/out/images/research-metacognitive-abstention-social.png', root)), 'missing exported social thumbnail');
});
