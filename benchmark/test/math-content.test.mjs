import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMathSegments } from '../../web/lib/math-content.mjs';

// Catch accidental rewriting of Unicode/plain Korean explanations.
test('plain explanations and unmatched delimiters retain their original text', () => {
  for (const text of ['9^(1/4)=√3이므로 값은 1이다.', '한글\n다음 줄', '가격은 \\$5, 미완성 $x', String.raw`닫히지 않은 \(x+1`]) {
    assert.deepEqual(renderMathSegments(text), [{ type: 'text', text }]);
  }
});

// Catch delimiter precedence and incorrect display mode at the user-visible boundary.
test('all four delimiters render inline or display math between Korean text', () => {
  const segments = renderMathSegments(String.raw`풀이 $x^2$ 다음 $$\frac{1}{2}$$ 또는 \(a+b\), \[c=d\] 끝`);
  const math = segments.filter(part => part.type === 'math');
  assert.deepEqual(math.map(part => part.display), [false, true, false, true]);
  assert.equal(segments[0].text, '풀이 ');
  assert.equal(segments.at(-1).text, ' 끝');
  for (const part of math) assert.match(part.html, /class="katex/);
  assert.match(math[1].html, /class="katex-display"/);
  assert.match(math[0].html, /<math xmlns=/);
});

test('escaped dollars and delimiters within braces do not split the expression', () => {
  const segments = renderMathSegments(String.raw`가격 \$5; $\text{cost \$5}+x$ 끝`);
  assert.equal(segments[0].text, String.raw`가격 \$5; `);
  assert.equal(segments.filter(part => part.type === 'math').length, 1);
  assert.equal(segments.at(-1).text, ' 끝');
});

test('invalid LaTeX falls back to its exact source without crashing', () => {
  const text = String.raw`풀이 $\frac{$ 와 \[\unknowncommand{x}\] 끝`;
  assert.deepEqual(renderMathSegments(text), [{ type: 'text', text }]);
  assert.equal(renderMathSegments(String.raw`$\unknowncommand{x}$`)[0].text, String.raw`$\unknowncommand{x}$`);
  const recovered = renderMathSegments(String.raw`실패 $\unknowncommand{x}$ 다음 $x+1$`);
  assert.equal(recovered[0].text, String.raw`실패 $\unknowncommand{x}$ 다음 `);
  assert.equal(recovered[1].type, 'math');
});

test('HTML remains text and trusted LaTeX commands cannot create links or HTML', () => {
  const text = '<img src=x onerror=alert(1)>';
  assert.deepEqual(renderMathSegments(text), [{ type: 'text', text }]);
  const segments = renderMathSegments(String.raw`$\href{javascript:alert(1)}{x}$ $\htmlClass{evil}{x}$`);
  for (const part of segments) {
    if (part.html) {
      assert.doesNotMatch(part.html, /<a\b|href=|class="evil"/);
    }
  }
});

test('legacy auto-wrap is opt-in and does not wrap prose by default', () => {
  const text = String.raw`\frac{1}{2}`;
  assert.deepEqual(renderMathSegments(text), [{ type: 'text', text }]);
  assert.equal(renderMathSegments(text, true)[0].type, 'math');
});
