import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLegacyMath} from '../../web/lib/legacy-math.mjs';
import {renderMathSegments} from '../../web/lib/math-content.mjs';

test('old prose renders roots, grouped powers, derivatives and sums without rewriting Korean',()=>{
 const cases=[['5^(1/3)×25^(1/3)=5이다.',String.raw`$5^{\frac{1}{3}}\times 25^{\frac{1}{3}}=5$이다.`],['주어진 극한은 f′(2)=3×2²−8=4이다.',String.raw`주어진 극한은 $f'(2)=3\times 2^{2}-8=4$이다.`],['√3×3^(-1/2)=1이다.',String.raw`$\sqrt{3}\times 3^{-\frac{1}{2}}=1$이다.`],['2Σa_k=10이므로 Σa_k=5이다.',String.raw`$2\sum a_k=10$이므로 $\sum a_k=5$이다.`]];
 for(const [source,wanted] of cases){const actual=normalizeLegacyMath(source);assert.equal(actual,wanted);assert.ok(renderMathSegments(actual).some(s=>s.type==='math'));}
});
test('existing delimited LaTeX stays byte-identical and mixed prose gets formatted once',()=>{
 const source=String.raw`기존 $\frac{1}{2}$, 추가 x²=4이다. \(y=2\)`;
 const actual=normalizeLegacyMath(source);
 assert.ok(actual.includes(String.raw`$\frac{1}{2}$`));assert.ok(actual.includes(String.raw`\(y=2\)`));assert.equal(normalizeLegacyMath(actual),actual);
});
test('malformed expressions, prose, HTML and unsupported English are retained safely',()=>{
 for(const source of ['풀이를 읽을 수 없어 기권합니다.','reasoning is unavailable','<img src=x onerror=alert(1)>','닫히지 않은 $x^2','x^(1/2'])assert.equal(normalizeLegacyMath(source),source);
});
test('formatting preserves a wrong submitted expression instead of correcting its maths',()=>{
 assert.equal(normalizeLegacyMath('9^(1/2)=3√3이다.'),String.raw`$9^{\frac{1}{2}}=3\sqrt{3}$이다.`);
});
test('fraction normalization keeps exponent and product precedence',()=>{
 assert.equal(normalizeLegacyMath('3/2²=0.75이다.'),String.raw`$3/2^{2}=0.75$이다.`);
 assert.equal(normalizeLegacyMath('x^1/2=y이다.'),String.raw`$x^1/2=y$이다.`);
});
test('logarithm subscripts, integral limits and inequalities remain whole expressions',()=>{
 assert.equal(normalizeLegacyMath('a=log_2(10)이므로 a>0이다.'),String.raw`$a=\log _2(10)$이므로 $a>0$이다.`);
 assert.equal(normalizeLegacyMath('∫₀ᵃf(x)dx=0이다.'),String.raw`$\int _{0}^{a}f(x)dx=0$이다.`);
 assert.equal(normalizeLegacyMath('값은 1이다. a>0이다.'),String.raw`값은 $1$이다. $a>0$이다.`);
});
test('decimal fractions and full script operands retain mathematical meaning',()=>{
 assert.equal(normalizeLegacyMath('1/2.5=0.4이다.'),String.raw`$\frac{1}{2.5}=0.4$이다.`);
 assert.equal(normalizeLegacyMath('1.5/2=0.75이다.'),String.raw`$\frac{1.5}{2}=0.75$이다.`);
 assert.equal(normalizeLegacyMath('x^10+a_10=2이다.'),String.raw`$x^{10}+a_{10}=2$이다.`);
 assert.equal(normalizeLegacyMath('lim_(x→0) f(x)=1이다.'),String.raw`$\lim _{x\to 0} f(x)=1$이다.`);
 assert.equal(normalizeLegacyMath('Σ_(k=1)^n k=10이다.'),String.raw`$\sum _{k=1}^n k=10$이다.`);
});
test('ambiguous radical scope and digit-group commas never receive guessed operands',()=>{
 for(const source of ['√sin(x)','√cos(x)','√ln(x)','√log_2(x)','√x^2','√f(x)','√2x'])assert.equal(normalizeLegacyMath(source),source);
 assert.equal(normalizeLegacyMath('1,000/2=500이다.'),'$1,000/2=500$이다.');
 assert.equal(normalizeLegacyMath('1/2,000=x이다.'),'$1/2,000=x$이다.');
});

test('published math explanations remain idempotent and retain every Korean prose character',async()=>{
 const {readFileSync}=await import('node:fs');
 for(const suffix of ['', '-2025']){
  const data=JSON.parse(readFileSync(new URL(`../../web/public/data/benchmark-comparison${suffix}.json`,import.meta.url)));
  for(const model of data.models)for(const question of model.questions.filter(q=>q.subject==='math')){
   const source=question.explanation||'',formatted=normalizeLegacyMath(source),context=`${model.model} ${question.id}`;
   assert.equal(normalizeLegacyMath(formatted),formatted,context);
   assert.equal((formatted.match(/[가-힣]/g)||[]).join(''),(source.match(/[가-힣]/g)||[]).join(''),context);
   assert.doesNotThrow(()=>renderMathSegments(formatted),context);
  }
 }
});
