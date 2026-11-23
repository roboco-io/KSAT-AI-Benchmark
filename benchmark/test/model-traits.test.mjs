import test from 'node:test';
import assert from 'node:assert/strict';
import { modelTraits, soloWrong } from '../../web/lib/model-traits.mjs';

const mk = (id, o = {}) => ({
  id, engine: 'e', effort: null, inputMode: null, score: 300, maxScore: 400, period4: null,
  correct: 100, incorrect: 5, abstained: 0, errors: 0, total: 105, costUsd: 2, wallSeconds: 100,
  subjects: {}, questions: [], limitations: [], ...o,
});
const keys = (m, c) => modelTraits(m, c).map((t) => t.key);
const qs = (...s) => s.map((status, i) => ({ id: `q${i + 1}`, status, answer: 1 }));

test('perfect sentence and order_follows_table', () => {
  const m = mk('a', { score: 400, correct: 147, wallSeconds: 10 });
  const c = [m, mk('b'), mk('c')];
  const t = modelTraits(m, c);
  assert.deepEqual(t[0], { key: 'perfect', tone: 'good', label: '만점', sentence: '147문항을 모두 맞혔다.' });
  assert.deepEqual(t.map((x) => x.key), ['perfect', 'fast']);
});

test('value_needs_90pct_and_half_median_cost', () => {
  const others = [mk('b', { costUsd: 4 }), mk('c', { costUsd: 4 })];
  const ok = mk('a', { score: 360, costUsd: 2 });
  assert.ok(keys(ok, [ok, ...others]).includes('value'));
  assert.ok(!keys(mk('a', { score: 359, costUsd: 2 }), [ok, ...others]).includes('value'));
  const pricey = mk('a', { score: 360, costUsd: 2.1 });
  assert.ok(!keys(pricey, [pricey, ...others]).includes('value'));
});

test('fast and slow boundaries', () => {
  const o = [mk('b', { wallSeconds: 100 }), mk('c', { wallSeconds: 100 })];
  const f = mk('a', { wallSeconds: 50 });
  assert.ok(keys(f, [f, ...o]).includes('fast'));
  const f2 = mk('a', { wallSeconds: 51 });
  assert.ok(!keys(f2, [f2, ...o]).includes('fast'));
  const s = mk('a', { wallSeconds: 300 });
  assert.ok(keys(s, [s, ...o]).includes('slow'));
  const s2 = mk('a', { wallSeconds: 299 });
  assert.ok(!keys(s2, [s2, ...o]).includes('slow'));
});

test('weak_subject_below_60_or_25_under_best', () => {
  const sub = (k, p) => mk('a', { subjects: { korean: { pct: 90, tracks: [] }, ...k } });
  let m = sub({ math: { pct: 59, tracks: [] } });
  assert.ok(keys(m, [m]).includes('weak-math'));
  m = mk('a', { subjects: { korean: { pct: 70, tracks: [] }, math: { pct: 60, tracks: [] } } });
  assert.ok(!keys(m, [m]).some((k) => k.startsWith('weak')));
  m = sub({ math: { pct: 65, tracks: [] } });
  assert.ok(keys(m, [m]).includes('weak-math'));
  m = sub({ math: { pct: 66, tracks: [] } });
  assert.ok(!keys(m, [m]).includes('weak-math'));
  const t = modelTraits(sub({ math: { pct: 50, tracks: [] } }), []).find((x) => x.key === 'weak-math');
  assert.equal(t.label, '수학 약세');
});

test('weak skipped for perfect score', () => {
  const m = mk('a', { score: 400, subjects: { korean: { pct: 100, tracks: [] }, math: { pct: 50, tracks: [] } } });
  assert.ok(!keys(m, [m]).some((k) => k.startsWith('weak')));
});

test('abstains_at_5_not_4', () => {
  assert.ok(keys(mk('a', { abstained: 5 }), []).includes('abstains'));
  assert.ok(!keys(mk('a', { abstained: 4 }), []).includes('abstains'));
});

test('abstains_sentence', () => {
  const t = modelTraits(mk('a', { abstained: 10, correct: 130, incorrect: 7 }), []).find((x) => x.key === 'abstains');
  assert.equal(t.sentence, '10문항에서 답을 내지 않았다. 답한 137문항의 정답률은 94.9%다.');
  assert.equal(t.label, '기권 10문항');
});

test('guesses boundaries', () => {
  assert.ok(keys(mk('a', { incorrect: 10, abstained: 1 }), []).includes('guesses'));
  assert.ok(!keys(mk('a', { incorrect: 10, abstained: 2 }), []).includes('guesses'));
  assert.ok(!keys(mk('a', { incorrect: 9, abstained: 0 }), []).includes('guesses'));
  assert.ok(keys(mk('a', { incorrect: 10, abstained: 0 }), []).includes('guesses'));
});

test('errors at 1 not 0', () => {
  assert.ok(keys(mk('a', { errors: 1 }), []).includes('errors'));
  assert.ok(!keys(mk('a', { errors: 0 }), []).includes('errors'));
});

test('solo-wrong needs 3 and half of wrong', () => {
  const a = mk('a', { incorrect: 6, questions: qs('incorrect', 'incorrect', 'incorrect', 'incorrect', 'incorrect', 'incorrect') });
  const b = mk('b', { questions: qs('correct', 'correct', 'correct', 'incorrect', 'incorrect', 'incorrect') });
  assert.deepEqual(soloWrong(a, [a, b]), ['q1', 'q2', 'q3']);
  assert.ok(keys(a, [a, b]).includes('solo-wrong'));
  const a2 = mk('a', { questions: qs('incorrect', 'incorrect', 'incorrect', 'incorrect', 'incorrect', 'incorrect', 'correct') });
  const b2 = mk('b', { questions: qs('correct', 'correct', 'correct', 'incorrect', 'incorrect', 'incorrect', 'correct') });
  assert.ok(keys(a2, [a2, b2]).includes('solo-wrong'));
  const a3 = mk('a', { questions: qs('incorrect', 'incorrect', 'incorrect', 'incorrect', 'incorrect', 'incorrect', 'incorrect') });
  const b3 = mk('b', { questions: qs('correct', 'correct', 'correct', 'incorrect', 'incorrect', 'incorrect', 'incorrect') });
  assert.ok(!keys(a3, [a3, b3]).includes('solo-wrong'));
  const a4 = mk('a', { questions: qs('incorrect', 'incorrect', 'correct') });
  const b4 = mk('b', { questions: qs('correct', 'correct', 'correct') });
  assert.ok(!keys(a4, [a4, b4]).includes('solo-wrong'));
});

test('single_model_cohort_has_no_solo_wrong', () => {
  const a = mk('a', { questions: qs('incorrect', 'incorrect', 'incorrect') });
  assert.deepEqual(soloWrong(a, [a]), []);
  assert.ok(!keys(a, [a]).includes('solo-wrong'));
});

test('median_ignores_null_cost', () => {
  const a = mk('a', { score: 400, costUsd: 1 });
  const c = [a, mk('b', { costUsd: null }), mk('c', { costUsd: 4 }), mk('d', { costUsd: 4 })];
  assert.ok(keys(a, c).includes('value'));
  // nulls as 0 would make the median 0 and block value; ignoring them gives median 3, so 1.5 passes
  const e = mk('e', { score: 400, costUsd: 1.5 });
  const c2 = [e, mk('b', { costUsd: null }), mk('c', { costUsd: null }), mk('d', { costUsd: 4.5 })];
  assert.ok(keys(e, c2).includes('value'));
});

test('null cost or time gives no value/fast/slow', () => {
  const a = mk('a', { score: 400, costUsd: null, wallSeconds: null });
  const k = keys(a, [a, mk('b')]);
  assert.ok(!k.includes('value') && !k.includes('fast') && !k.includes('slow'));
});

test('period4_only_model_has_no_main_traits_and_is_excluded_from_medians', () => {
  const p = mk('p', { score: null, maxScore: null, costUsd: null, wallSeconds: null, correct: 0, incorrect: 0, abstained: 0, errors: 0, total: 0,
    period4: { score: 10, max: 50 }, subjects: { social: { pct: 20, tracks: [] }, science: { pct: 90, tracks: [] } } });
  const a = mk('a', { score: 400, costUsd: 1, wallSeconds: 10 });
  const c = [a, p, mk('b', { costUsd: 4, wallSeconds: 100 }), mk('d', { costUsd: 4, wallSeconds: 100 })];
  assert.deepEqual(keys(p, c), ['weak-social']);
  assert.ok(keys(a, c).includes('value') && keys(a, c).includes('fast'));
});

test('solo_wrong_ignores_models_lacking_the_question', () => {
  const a = mk('a', { questions: qs('incorrect', 'incorrect', 'incorrect') });
  const b = mk('b', { questions: qs('correct', 'correct', 'correct') });
  const p = mk('p', { questions: [{ id: 'z1', status: 'correct', answer: 1 }] });
  assert.deepEqual(soloWrong(a, [a, b, p]), ['q1', 'q2', 'q3']);
  assert.deepEqual(soloWrong(a, [a, p]), []);
});

test('main_only_model_in_a_combined_year_gets_no_cost_or_time_comparison', () => {
  const full = (id) => mk(id, { main: { score: 300 }, costUsd: 10, wallSeconds: 1000 });
  const partial = mk('p', { score: 390, costUsd: 1, wallSeconds: 10 });
  const cohort = [full('a'), full('b'), full('c'), partial];
  const k = keys(partial, cohort);
  assert.ok(!k.includes('value') && !k.includes('fast'));
  assert.ok(!keys(full('a'), cohort).includes('slow'));
  assert.ok(keys(partial, [mk('a', { costUsd: 10, wallSeconds: 1000 }), mk('b', { costUsd: 10, wallSeconds: 1000 }), partial]).includes('value'));
});
