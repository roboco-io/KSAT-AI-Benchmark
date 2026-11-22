// 공유 썸네일(Open Graph 이미지)의 HTML을 만든다. 숫자와 과목은 export 데이터에서 읽는다.
// 사용법:
//   node web/scripts/social-card.mjs <1-3교시 JSON> <4교시 JSON 또는 -> <출력 HTML>
//   "<Chrome>" --headless=new --hide-scrollbars --force-device-scale-factor=2 \
//     --window-size=1200,630 --screenshot=web/public/images/<파일>.png <출력 HTML>
import { readFileSync, writeFileSync } from 'node:fs';
import { buildYearView } from '../lib/year-view.mjs';

const [mainPath, p4Path, outPath] = process.argv.slice(2);
if (!mainPath || !outPath) throw new Error('usage: social-card.mjs <main.json> <period4.json|-> <out.html>');
const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const view = buildYearView(read(mainPath), p4Path && p4Path !== '-' ? read(p4Path) : null);
const logo = readFileSync(new URL('../public/images/roboco-logo.svg', import.meta.url), 'utf8').replace(/<\?xml[^>]*>/, '').replace(/<!--[\s\S]*?-->/g, '');

const LABEL = { korean: '국어', math: '수학', english: '영어', korean_history: '한국사', social: '사회탐구', science: '과학탐구' };
const models = view.models.filter((m) => m.score !== null);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// 한 가지 색의 밝기로 점수를 나타낸다: 40점 이하가 가장 어둡고 100점이 가장 밝다.
const cell = (pct) => {
  if (pct == null) return '<td class="na">–</td>';
  const t = Math.max(0, Math.min(1, (pct - 40) / 60));
  const l = 20 + t * 44;
  return `<td style="background:hsl(217 78% ${l.toFixed(1)}%);color:${t > 0.62 ? '#08101f' : '#e8eefb'}">${pct}</td>`;
};
const rows = models.map((m) => `<tr><th>${esc(m.id)}</th>${view.subjects.map((s) => cell(m.subjects[s]?.pct)).join('')}</tr>`).join('');
const periods = view.subjects.some((s) => ['korean_history', 'social', 'science'].includes(s)) ? '1-4교시 전 과목' : '1-3교시';
const rowH = Math.min(30, Math.floor(470 / Math.max(models.length, 1)));

writeFileSync(outPath, `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{background:#0c111b;color:#e9edf5;font-family:-apple-system,"Apple SD Gothic Neo","Pretendard","Noto Sans KR",sans-serif;display:grid;grid-template-columns:486px 1fr;gap:34px;padding:46px 48px 42px}
.left{display:flex;flex-direction:column;min-width:0}
.badge{align-self:flex-start;font-size:19px;font-weight:700;color:#0c111b;background:#7eaaff;border-radius:6px;padding:6px 14px;letter-spacing:-.01em}
h1{font-size:74px;line-height:1.1;font-weight:800;letter-spacing:-.045em;margin-top:26px}
.sub{font-size:25px;font-weight:700;margin-top:26px;color:#e9edf5;letter-spacing:-.02em}
.chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:13px}
.chips span{font-size:19px;font-weight:600;color:#c9d6f2;border:1.5px solid #34425e;border-radius:5px;padding:4px 10px}
.count{font-size:25px;font-weight:700;color:#7eaaff;margin-top:20px;letter-spacing:-.02em}
.foot{margin-top:auto;display:flex;align-items:center;gap:15px}
.foot svg{width:60px;height:46px;fill:#fff;flex:none}
.foot b{display:block;font-size:24px;font-weight:800;letter-spacing:-.02em}
.foot small{display:block;font-size:16.5px;color:#9aa6bb;margin-top:1px}
.right{min-width:0;display:flex;flex-direction:column;justify-content:center}
.cap{font-size:15.5px;color:#9aa6bb;margin-bottom:9px;display:flex;justify-content:space-between}
table{border-collapse:separate;border-spacing:3px;width:100%;table-layout:fixed;font-variant-numeric:tabular-nums}
thead th{font-size:16px;font-weight:700;color:#c9d6f2;text-align:center;padding:0 0 4px}
thead th:first-child{width:212px}
tbody th{font-size:15.5px;font-weight:600;text-align:right;padding-right:11px;color:#e9edf5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:-.03em}
td{height:${rowH - 3}px;text-align:center;font-size:14.5px;font-weight:700;border-radius:3px}
td.na{background:#161d2a;color:#5d6a80}
</style></head><body>
<div class="left">
  <span class="badge">${view.year}학년도 수능 · 시험 당일 AI 수험</span>
  <h1>AI가 수능을<br>풀면?</h1>
  <p class="sub">${periods}</p>
  <div class="chips">${view.subjects.map((s) => `<span>${LABEL[s]}</span>`).join('')}</div>
  <p class="count">${models.length}개 모델 비교</p>
  <div class="foot">${logo}<div><b>KSAT AI Benchmark</b><small>roboco.io/KSAT-AI-Benchmark</small></div></div>
</div>
<div class="right">
  <div class="cap"><span>과목별 점수 (100점 환산)</span><span>밝을수록 높은 점수</span></div>
  <table><thead><tr><th></th>${view.subjects.map((s) => `<th>${LABEL[s]}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>
</div>
</body></html>`);
console.log(`social-card: ${view.year}학년도, 모델 ${models.length}개, 과목 ${view.subjects.length}개 → ${outPath}`);
