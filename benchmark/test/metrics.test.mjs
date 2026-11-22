import test from 'node:test';
import assert from 'node:assert/strict';
import {metricsFor, metricValue, formatMetric} from '../../web/lib/metrics.mjs';

const base = {id:'m', score:368, costUsd:0.92, wallSeconds:4329, correct:130, incorrect:10, abstained:7, errors:2, total:147,
  inputTokens:1000, outputTokens:500, subjects:{korean:{pct:91,tracks:[]}}};

test('filtered_metrics_only_when_filtered', () => {
  assert.ok(!metricsFor(['korean'], false).some(m => m.key === 'fAccuracy' || m.key === 'fPoints'));
  const f = metricsFor(['korean'], true).map(m => m.key);
  assert.ok(f.includes('fAccuracy') && f.includes('fPoints'));
  const keys = metricsFor(['korean', 'math'], false).map(m => m.key);
  assert.deepEqual(keys, ['score','accuracy','cost','wall','costPerPoint','secPerQuestion','abstention','errors','tokens','subj:korean','subj:math']);
  assert.equal(metricsFor(['korean_history'], false).at(-1).label, '한국사 점수');
});

test('subject_metric', () => {
  assert.equal(metricValue(base, 'subj:korean', null), 91);
  assert.equal(metricValue(base, 'subj:math', null), null);
});

test('accuracy_pct and abstention_pct', () => {
  assert.equal(metricValue(base, 'accuracy', null), 88.4);
  assert.equal(metricValue(base, 'abstention', null), 4.8);
  assert.equal(metricValue({...base, total: 0}, 'accuracy', null), null);
  assert.equal(metricValue({...base, total: 0}, 'abstention', null), null);
  assert.equal(metricValue({...base, total: 0}, 'secPerQuestion', null), null);
});

test('cost_and_wall_are_log_low_better', () => {
  const ms = metricsFor([], false);
  for (const k of ['cost', 'wall']) {
    const m = ms.find(x => x.key === k);
    assert.equal(m.scale, 'log'); assert.equal(m.better, 'low');
  }
});

test('null fields and zero division', () => {
  assert.equal(metricValue(base, 'costPerPoint', null), 0.92 / 368);
  assert.equal(metricValue({...base, score: 0}, 'costPerPoint', null), null);
  assert.equal(metricValue({...base, score: null}, 'costPerPoint', null), null);
  assert.equal(metricValue({...base, costUsd: null}, 'costPerPoint', null), null);
  assert.equal(metricValue(base, 'tokens', null), 1500);
  assert.equal(metricValue({...base, outputTokens: null}, 'tokens', null), null);
  assert.equal(metricValue({...base, score: null}, 'score', null), null);
});

test('fAccuracy_from_rescore', () => {
  assert.equal(metricValue(base, 'fAccuracy', {correct: 1, total: 2, points: 3, maxPoints: 6}), 50);
  assert.equal(metricValue(base, 'fAccuracy', null), null);
  assert.equal(metricValue(base, 'fAccuracy', {correct: 0, total: 0, points: 0, maxPoints: 0}), null);
  assert.equal(metricValue(base, 'fPoints', {correct: 1, total: 2, points: 3, maxPoints: 6}), 3);
  assert.equal(metricValue(base, 'fPoints', null), null);
});

test('format', () => {
  assert.equal(formatMetric('cost', 0.3), '$0.30');
  assert.equal(formatMetric('cost', 0.0025), '$0.0025');
  assert.equal(formatMetric('costPerPoint', 1.234), '$1.23');
  assert.equal(formatMetric('score', null), '–');
  assert.equal(formatMetric('wall', 45), '45초');
  assert.equal(formatMetric('wall', 1020), '17분');
  assert.equal(formatMetric('wall', 4329), '1시간 12분');
  assert.equal(formatMetric('wall', 3600), '1시간');
  assert.equal(formatMetric('accuracy', 88.4), '88.4%');
  assert.equal(formatMetric('tokens', 1234567), '1,234,567');
  assert.equal(formatMetric('score', 367.6), '368');
  assert.equal(formatMetric('subj:math', 91), '91');
});

test('period4_metric', () => {
  const ks = metricsFor(['korean', 'social'], false).map(m => m.key);
  assert.ok(ks.includes('period4'));
  assert.ok(!metricsFor(['korean', 'math'], false).some(m => m.key === 'period4'));
  const p = metricsFor(['science'], false).find(m => m.key === 'period4');
  assert.equal(p.label, '4교시 득점률'); assert.equal(p.better, 'high');
  assert.equal(metricValue({...base, period4: {score: 37, max: 50}}, 'period4', null), 74);
  assert.equal(metricValue({...base, period4: null}, 'period4', null), null);
  const empty = {...base, total: 0, correct: 0, abstained: 0, wallSeconds: null};
  assert.equal(metricValue(empty, 'accuracy', null), null);
  assert.equal(metricValue(empty, 'abstention', null), null);
  assert.equal(metricValue({...base, total: 0}, 'secPerQuestion', null), null);
});
