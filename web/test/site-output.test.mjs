// 정적 빌드 결과(web/out)를 검사한다. `cd web && npm run build` 뒤에 실행한다.
// 기대값은 web/public/data/benchmark-comparison*.json 에서 읽어, 데이터가 다시 생성돼도 깨지지 않게 한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'out');
const skip = existsSync(out) ? false : 'web/out 이 없습니다. 먼저 `cd web && npm run build` 를 실행하세요.';

const data = JSON.parse(readFileSync(join(root, 'public/data/benchmark-comparison.json'), 'utf8'));
const model = data.models[0];
const modelId = encodeURIComponent(model.model);
const questionId = encodeURIComponent(model.questions[0].id);
const read = (rel) => readFileSync(join(out, rel), 'utf8');

test('routes_exist', { skip }, () => {
  const routes = [
    'index.html', '2025.html', '2026.html', '2027.html',
    `2026/models/${modelId}.html`, '2026/questions.html',
    `2026/questions/${questionId}.html`, '2026/compare.html',
  ];
  for (const rel of routes) assert.ok(existsSync(join(out, rel)), `${rel} 가 없습니다`);
});

test('home_has_anchors', { skip }, () => {
  const html = read('index.html');
  assert.ok(html.includes('id="research"'), 'id="research" 앵커가 없습니다');
  assert.ok(html.includes('id="comparison"'), 'id="comparison" 앵커가 없습니다');
});

test('method_note_kept', { skip }, () => {
  assert.ok(read('2026.html').includes('정답률과 원점수의 차이'));
});

test('no_question_payload_on_home', { skip }, () => {
  const size = statSync(join(out, '2026.html')).size;
  assert.ok(size < 600 * 1024, `2026.html 이 ${size} 바이트로 600 KB 이상입니다`);
});

test('legacy_pages_kept', { skip }, () => {
  for (const rel of [
    'archive.html', 'debates/english-q37.html',
    'research/common-errors.html', 'research/contamination.html',
    'research/metacognitive-abstention.html',
  ]) assert.ok(existsSync(join(out, rel)), `${rel} 가 없습니다`);
});

test('year_pages_have_index_copy', { skip }, () => {
  for (const name of readdirSync(out)) {
    if (!/^\d{4}\.html$/.test(name)) continue;
    const year = name.replace('.html', '');
    if (!existsSync(join(out, year))) continue;
    assert.ok(existsSync(join(out, year, 'index.html')), `${year}/index.html 이 없습니다`);
  }
});
