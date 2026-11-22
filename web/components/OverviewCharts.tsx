'use client';
import { useState } from 'react';
import type { BenchmarkComparison } from './benchmark-types';

// First-screen summary for general readers: headline numbers, an accuracy ranking, and cost against accuracy.
// Single series throughout (one accent color); models are named in text, never by color.
type Row = { id: string; label: string; provider: string; accuracy: number; correct: number; total: number; cost: number; seconds: number; done: boolean };
const providerLabels: Record<string, string> = { openai: 'OpenAI', anthropic: 'Anthropic', deepseek: 'DeepSeek', zai: 'Z.ai', qwen: 'Qwen', moonshot: 'Moonshot AI', google: 'Google', upstage: 'Upstage', lgai: 'LG AI Research' };
const pct = (value: number) => `${value.toFixed(1)}%`;
const usd = (value: number) => value >= 10 ? `$${value.toFixed(1)}` : `$${value.toFixed(2)}`;
const minutes = (seconds: number) => `${Math.round(seconds / 60)}분`;

function rowsOf(data: BenchmarkComparison): Row[] {
  return data.requested_models.flatMap(model => {
    const result = data.models.find(item => item.model === model.id);
    if (!result || !(model.state === 'complete' || model.state === 'partial') || !result.questions.some(q => q.status !== 'pending')) return [];
    const s = result.summary;
    return [{ id: model.id, label: model.label, provider: providerLabels[model.provider] ?? model.provider, accuracy: s.accuracy, correct: s.correct, total: s.total_questions, cost: s.estimated_cost_usd, seconds: s.solve_time_seconds ?? s.wall_time_seconds, done: model.state === 'complete' && result.completed === true }];
  });
}

function Tooltip({ row }: { row: Row }) {
  return <span className="chart-tooltip" role="status"><strong>{row.label}</strong><span>{row.provider}{row.done ? '' : ' · 중간 집계'}</span><span>정답률 {pct(row.accuracy)} ({row.correct}/{row.total}문항)</span><span>API 환산 {usd(row.cost)} · 풀이 {minutes(row.seconds)}</span></span>;
}

export function OverviewCharts({ data, onPick }: { data: BenchmarkComparison; onPick: (modelId: string) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  const rows = rowsOf(data).sort((a, b) => b.accuracy - a.accuracy || a.cost - b.cost);
  if (!rows.length) return null;
  const done = rows.filter(row => row.done);
  const top = rows[0].accuracy, leaders = rows.filter(row => row.accuracy === top);
  const sortedAcc = done.map(row => row.accuracy).sort((a, b) => a - b);
  const median = sortedAcc.length ? (sortedAcc[(sortedAcc.length - 1) >> 1] + sortedAcc[sortedAcc.length >> 1]) / 2 : null;
  const cheapHigh = done.filter(row => row.accuracy >= 90).sort((a, b) => a.cost - b.cost)[0];

  // Scatter geometry: log-scaled cost on x, accuracy on y (floor at the nearest 10 below the lowest score).
  const W = 640, H = 300, L = 48, R = 16, T = 14, B = 40;
  const costs = rows.map(row => Math.max(row.cost, 0.01));
  const lo = Math.floor(Math.log10(Math.min(...costs))), hi = Math.ceil(Math.log10(Math.max(...costs)));
  const yMin = Math.max(0, Math.floor(Math.min(...rows.map(row => row.accuracy)) / 10) * 10);
  const x = (cost: number) => L + (Math.log10(Math.max(cost, 0.01)) - lo) / Math.max(hi - lo, 1) * (W - L - R);
  const y = (acc: number) => T + (100 - acc) / (100 - yMin) * (H - T - B);
  const xTicks = Array.from({ length: hi - lo + 1 }, (_, i) => 10 ** (lo + i));
  const yTicks = Array.from({ length: (100 - yMin) / 10 + 1 }, (_, i) => yMin + i * 10);
  // Direct labels only on the cost-accuracy frontier: no other model is both cheaper and at least as accurate.
  // Labels that would overlap an earlier label or a dot are flipped to the left, or dropped (hover still names them).
  const frontierRows = rows.filter(row => !rows.some(other => other !== row && other.cost < row.cost && other.accuracy >= row.accuracy)).sort((a, b) => a.cost - b.cost);
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const labels = new Map<string, 'start' | 'end'>();
  for (const row of frontierRows) {
    const cx = x(row.cost), cy = y(row.accuracy), w = row.label.length * 5.8 + 4;
    for (const side of ['start', 'end'] as const) {
      const box = side === 'start' ? { x0: cx + 8, x1: cx + 8 + w, y0: cy - 7, y1: cy + 7 } : { x0: cx - 8 - w, x1: cx - 8, y0: cy - 7, y1: cy + 7 };
      const hitsLabel = placed.some(p => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0);
      const hitsDot = rows.some(other => other !== row && x(other.cost) > box.x0 - 5 && x(other.cost) < box.x1 + 5 && y(other.accuracy) > box.y0 - 5 && y(other.accuracy) < box.y1 + 5);
      if (box.x0 >= L && box.x1 <= W - R && !hitsLabel && !hitsDot) { placed.push(box); labels.set(row.id, side); break; }
    }
  }
  const hovered = rows.find(row => row.id === hover);

  return <section className="overview" aria-labelledby="overview-title">
    <h2 id="overview-title" className="sr-only">한눈에 보기</h2>
    <div className="stat-tiles">
      <div className="stat-tile"><span>최고 정답률</span><strong>{pct(top)}</strong><small>{leaders.slice(0, 3).map(row => row.label).join(', ')}{leaders.length > 3 ? ` 외 ${leaders.length - 3}개` : ''}</small></div>
      <div className="stat-tile"><span>평가 완료 모델 정답률 중앙값</span><strong>{median == null ? '—' : pct(median)}</strong><small>{done.length}개 모델 기준</small></div>
      {cheapHigh && <div className="stat-tile"><span>정답률 90% 이상 중 가장 저렴</span><strong>{usd(cheapHigh.cost)}</strong><small>{cheapHigh.label} · {pct(cheapHigh.accuracy)} (API 환산)</small></div>}
      <div className="stat-tile"><span>평가 완료</span><strong>{done.length}<em> / {data.requested_models.length}</em></strong><small>모델</small></div>
    </div>
    <div className="overview-charts">
      <figure className="chart-card">
        <figcaption><strong>모델별 정답률</strong><span>막대를 누르면 아래 표에서 그 모델의 상세 기록을 엽니다.</span></figcaption>
        <ol className="rank-bars">{rows.map((row, index) => <li key={row.id}>
          <button type="button" onClick={() => onPick(row.id)} onMouseEnter={() => setHover(row.id)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(row.id)} onBlur={() => setHover(null)} aria-label={`${index + 1}위 ${row.label}, 정답률 ${pct(row.accuracy)}, ${row.correct}/${row.total}문항${row.done ? '' : ', 중간 집계'}`}>
            <span className="rank-label"><b>{row.label}</b><small>{row.provider}{row.done ? '' : ' · 중간'}</small></span>
            <span className="rank-track"><span className="rank-fill" style={{ width: `${row.accuracy}%` }} /></span>
            <span className="rank-value">{pct(row.accuracy)}<small>{row.correct}/{row.total}</small></span>
          </button>
          {hover === row.id && <Tooltip row={row} />}
        </li>)}</ol>
      </figure>
      <figure className="chart-card">
        <figcaption><strong>비용 대비 정답률</strong><span>가로축은 API 환산 비용(로그 눈금)입니다. 구독으로 실행한 모델도 같은 기준으로 환산했으며 실제 청구액이 아닙니다. 이름은 더 싸면서 더 정확한 모델이 없는 모델에만, 겹치지 않는 경우에 붙였습니다. 점에 마우스를 올리면 모델 정보가 나옵니다.</span></figcaption>
        <div className="scatter-wrap">
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="모델별 API 환산 비용과 정답률 산점도">
            {yTicks.map(tick => <g key={tick}><line className="grid" x1={L} x2={W - R} y1={y(tick)} y2={y(tick)} /><text className="axis" x={L - 6} y={y(tick) + 4} textAnchor="end">{tick}%</text></g>)}
            {xTicks.map(tick => <g key={tick}><line className="grid" x1={x(tick)} x2={x(tick)} y1={T} y2={H - B} /><text className="axis" x={x(tick)} y={H - B + 16} textAnchor="middle">{tick >= 1 ? `$${tick}` : `$${tick.toFixed(Math.abs(Math.log10(tick)))}`}</text></g>)}
            <text className="axis" x={(L + W - R) / 2} y={H - 6} textAnchor="middle">API 환산 비용 (USD)</text>
            {rows.map(row => <g key={row.id} className={`dot${hover === row.id ? ' active' : ''}${row.done ? '' : ' partial'}`} onMouseEnter={() => setHover(row.id)} onMouseLeave={() => setHover(null)} onClick={() => onPick(row.id)}>
              <circle className="hit" cx={x(row.cost)} cy={y(row.accuracy)} r={12} />
              <circle className="mark" cx={x(row.cost)} cy={y(row.accuracy)} r={5} />
              {labels.has(row.id) && <text className="dot-label" x={x(row.cost) + (labels.get(row.id) === 'start' ? 9 : -9)} y={y(row.accuracy) + 4} textAnchor={labels.get(row.id)}>{row.label}</text>}
            </g>)}
          </svg>
          {hovered && <div className="scatter-tooltip" style={{ left: `${x(hovered.cost) / W * 100}%`, top: `${y(hovered.accuracy) / H * 100}%` }}><Tooltip row={hovered} /></div>}
        </div>
      </figure>
    </div>
  </section>;
}
