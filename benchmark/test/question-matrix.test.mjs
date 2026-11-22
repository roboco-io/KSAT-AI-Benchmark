import test from 'node:test';
import assert from 'node:assert/strict';
import {questionMatrix, questionDetail, compareData, disagreements, filterQuestions, rescore} from '../../web/lib/question-matrix.mjs';

const q = (id, number, o = {}) => ({id, number, subject: 'korean', section: 'common', kind: 'multiple_choice', points: 2,
  correct_answer: 1, source_page: 3, status: 'correct', answer: 1, explanation: null, time_seconds: 5, ...o});
const model = (id, questions) => ({id, provider: 'p', engine: 'e', questions, limitations: []});
const view = (models) => ({year: 2026, models, pending: [], subjects: ['korean', 'math']});
const none = {subjects: [], minPoints: null, kind: null, minMissShare: null};

test('matrix_columns_ordered_by_section_then_number', () => {
  const v = view([model('a', [q('k-b2', 2, {section: 'b'}), q('k-c2', 2), q('k-a1', 1, {section: 'a'}), q('k-c1', 1), q('m1', 1, {subject: 'math'})])]);
  const m = questionMatrix(v, 'korean');
  assert.deepEqual(m.columns.map((c) => c.id), ['k-c1', 'k-c2', 'k-a1', 'k-b2']);
  assert.deepEqual(m.columns[0], {id: 'k-c1', number: 1, section: 'common', points: 2, missCount: 0});
});

test('miss_count_counts_non_correct', () => {
  const v = view([model('a', [q('x', 1)]), model('b', [q('x', 1, {status: 'incorrect'})]),
    model('c', [q('x', 1, {status: 'abstained'})]), model('d', [q('x', 1, {status: 'error'})])]);
  assert.equal(questionMatrix(v, 'korean').columns[0].missCount, 3);
});

test('cell_null_when_model_lacks_question', () => {
  const v = view([model('a', [q('x', 1), q('y', 2)]), model('b', [q('y', 2, {status: 'incorrect'})])]);
  const m = questionMatrix(v, 'korean');
  assert.deepEqual(m.rows, [{modelId: 'a', cells: ['correct', 'correct']}, {modelId: 'b', cells: [null, 'incorrect']}]);
  assert.deepEqual(questionMatrix(v, 'science'), {columns: [], rows: [{modelId: 'a', cells: []}, {modelId: 'b', cells: []}]});
});

test('detail_unknown_id_null', () => {
  const v = view([model('a', [q('x', 1)])]);
  assert.equal(questionDetail(v, 'nope'), null);
  assert.equal(questionDetail(v, '__proto__'), null);
  const d = questionDetail(v, 'x');
  assert.equal(d.correctAnswer, 1);
  assert.equal(d.sourcePage, 3);
  assert.deepEqual(d.answers, [{modelId: 'a', status: 'correct', answer: 1, explanation: null, timeSeconds: 5}]);
});

test('disagree_on_status_or_answer', () => {
  const v = view([
    model('a', [q('same', 1, {status: 'incorrect', answer: 2}), q('both', 2), q('stat', 3), q('solo', 4)]),
    model('b', [q('same', 1, {status: 'incorrect', answer: 4}), q('both', 2), q('stat', 3, {status: 'abstained', answer: null})]),
  ]);
  const data = compareData(v);
  assert.deepEqual(disagreements(data, ['a', 'b']), ['same', 'stat']);
  assert.deepEqual(disagreements(data, ['a']), []);
  assert.deepEqual(disagreements(data, ['a', 'zzz']), []);
});

test('filter_min_miss_share_0_5', () => {
  const v = view([model('a', [q('one', 1, {status: 'incorrect'}), q('zero', 2)]), model('b', [q('one', 1), q('zero', 2)])]);
  const data = compareData(v);
  assert.deepEqual(filterQuestions(data, {...none, minMissShare: 0.5}), ['one']);
  assert.deepEqual(filterQuestions(data, {...none, minMissShare: 0.51}), []);
});

test('miss share uses only models that have the question', () => {
  const v = view([model('a', [q('x', 1, {status: 'incorrect'})]), model('b', [q('y', 2)])]);
  assert.deepEqual(filterQuestions(compareData(v), {...none, minMissShare: 1}), ['x']);
});

test('filter_empty_matches_all', () => {
  const v = view([model('a', [q('x', 1), q('y', 2, {subject: 'math', points: 4, kind: 'short_answer'})])]);
  const data = compareData(v);
  assert.deepEqual(filterQuestions(data, none), ['x', 'y']);
  assert.deepEqual(filterQuestions(data, {...none, subjects: ['math']}), ['y']);
  assert.deepEqual(filterQuestions(data, {...none, minPoints: 3}), ['y']);
  assert.deepEqual(filterQuestions(data, {...none, minPoints: 4}), ['y']);
  assert.deepEqual(filterQuestions(data, {...none, kind: 'multiple_choice'}), ['x']);
});

test('compareData strips question payloads from models', () => {
  const data = compareData(view([model('a', [q('x', 1)])]));
  assert.equal('questions' in data.models[0], false);
  assert.deepEqual(data.questions[0].answers, {a: ['correct', 1]});
  assert.equal(data.questions[0].kind, 'multiple_choice');
});

test('rescore_skips_models_without_question', () => {
  const v = view([model('a', [q('q1', 1), q('q2', 2, {points: 3, status: 'incorrect'})]), model('b', [q('q1', 1)])]);
  const r = rescore(compareData(v), ['q1', 'q2', 'unknown']);
  assert.deepEqual(r.a, {correct: 1, total: 2, points: 2, maxPoints: 5});
  assert.deepEqual(r.b, {correct: 1, total: 1, points: 2, maxPoints: 2});
  assert.deepEqual(rescore(compareData(v), []).a, {correct: 0, total: 0, points: 0, maxPoints: 0});
});
