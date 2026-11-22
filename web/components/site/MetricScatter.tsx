'use client';

import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { axisTicks, scatterLayout } from '@/lib/scatter-layout.mjs';
import { formatMetric } from '@/lib/metrics.mjs';
import type { Metric } from '@/lib/site-types.mjs';
import styles from './MetricScatter.module.css';

interface Props {
  points: { id: string; x: number | null; y: number | null }[];
  xMetric: Metric;
  yMetric: Metric;
  picked: string[];
  onPick: (id: string) => void;
}

const ML = 52;
const MR = 16;
const MT = 12;
const MB = 44;
const PAD = 12;
const NARROW = 640;

function drawable(v: number | null, log: boolean): v is number {
  return v !== null && Number.isFinite(v) && (!log || v > 0);
}

// Mirrors the axis scale used by scatterLayout (5% margin around the data range).
function axisMap(values: number[], log: boolean, a: number, b: number, flip: boolean) {
  const t = (v: number) => (log ? Math.log10(v) : v);
  const ts = values.map(t);
  const lo = Math.min(...ts);
  const hi = Math.max(...ts);
  const m = (hi - lo) * 0.05;
  return (v: number) => {
    if (hi === lo) return (a + b) / 2;
    const f = (t(v) - (lo - m)) / (hi - lo + 2 * m);
    return flip ? b - f * (b - a) : a + f * (b - a);
  };
}

export function MetricScatter({ points, xMetric, yMetric, picked, onPick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [tip, setTip] = useState<string | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (w > 0) setWidth(w);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const xLog = xMetric.scale === 'log';
  const yLog = yMetric.scale === 'log';
  const valid = points.filter(
    (p): p is { id: string; x: number; y: number } => drawable(p.x, xLog) && drawable(p.y, yLog),
  );
  const dropped = points.length - valid.length;

  if (valid.length === 0) {
    return <div className={styles.empty}>표시할 모델이 없다.</div>;
  }

  const height = Math.round(Math.min(440, Math.max(280, width * 0.6)));
  const pw = Math.max(40, width - ML - MR);
  const ph = Math.max(40, height - MT - MB);
  const placed = scatterLayout(valid, {
    width: pw,
    height: ph,
    pad: PAD,
    xLog,
    yLog,
    labelWidth: (id: string) => id.length * 6.6 + 4,
  });
  const byId = new Map(valid.map((p) => [p.id, p]));

  const xs = valid.map((p) => p.x);
  const ys = valid.map((p) => p.y);
  const mapX = axisMap(xs, xLog, PAD, pw - PAD, false);
  const mapY = axisMap(ys, yLog, PAD, ph - PAD, true);
  const xTicks = axisTicks(Math.min(...xs), Math.max(...xs), xLog);
  const yTicks = axisTicks(Math.min(...ys), Math.max(...ys), yLog);

  const narrow = width < NARROW;
  const best3 = new Set(
    [...valid]
      .sort((a, b) => (yMetric.better === 'high' ? b.y - a.y : a.y - b.y))
      .slice(0, 3)
      .map((p) => p.id),
  );
  const hasPick = picked.length > 0;

  const hint = (m: Metric, axis: 'x' | 'y') =>
    m.better === 'low' ? (axis === 'x' ? '← 낮을수록 좋음' : '↓ 낮을수록 좋음') : axis === 'x' ? '높을수록 좋음 →' : '↑ 높을수록 좋음';
  const title = (m: Metric, log: boolean) => `${m.label}${log ? ' (로그 눈금)' : ''}`;

  const tipFor = tip ? placed.find((p) => p.id === tip) : undefined;
  const tipSrc = tip ? byId.get(tip) : undefined;
  let tipStyle: { left: number; top: number } | undefined;
  if (tipFor) {
    const tw = 190;
    const left = Math.min(Math.max(ML + tipFor.x + 12, 4), Math.max(4, width - tw - 4));
    const top = Math.min(Math.max(MT + tipFor.y - 52, 4), height - 56);
    tipStyle = { left, top };
  }

  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPick(id);
    }
  };

  return (
    <div className={styles.wrap} ref={ref} onMouseLeave={() => setTip(null)}>
      <svg
        className={styles.svg}
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        aria-label={`산점도. 가로축 ${title(xMetric, xLog)}, 세로축 ${title(yMetric, yLog)}. 모델 ${valid.length}개.`}
      >
        <g transform={`translate(${ML} ${MT})`}>
          {xTicks.map((t) => (
            <g key={`x${t}`}>
              <line className={styles.grid} x1={mapX(t)} x2={mapX(t)} y1={0} y2={ph} />
              <text className={styles.tick} x={mapX(t)} y={ph + 16} textAnchor="middle">
                {formatMetric(xMetric.key, t)}
              </text>
            </g>
          ))}
          {yTicks.map((t) => (
            <g key={`y${t}`}>
              <line className={styles.grid} x1={0} x2={pw} y1={mapY(t)} y2={mapY(t)} />
              <text className={styles.tick} x={-8} y={mapY(t) + 4} textAnchor="end">
                {formatMetric(yMetric.key, t)}
              </text>
            </g>
          ))}
          <line className={styles.axis} x1={0} x2={pw} y1={ph} y2={ph} />
          <line className={styles.axis} x1={0} x2={0} y1={0} y2={ph} />
          <text className={styles.title} x={pw / 2} y={ph + 36} textAnchor="middle">
            {title(xMetric, xLog)} · {hint(xMetric, 'x')}
          </text>
          <text className={styles.title} x={-ph / 2} y={-ML + 12} transform="rotate(-90)" textAnchor="middle">
            {title(yMetric, yLog)} · {hint(yMetric, 'y')}
          </text>
          {placed.map((p) => {
            const isPicked = picked.includes(p.id);
            const showLabel = !narrow || isPicked || best3.has(p.id);
            const cls = [styles.point, hasPick ? (isPicked ? styles.picked : styles.dim) : ''].join(' ');
            return (
              <g
                key={p.id}
                className={cls}
                role="button"
                tabIndex={0}
                aria-pressed={isPicked}
                aria-label={p.id}
                onClick={() => onPick(p.id)}
                onKeyDown={(e) => onKey(e, p.id)}
                onMouseEnter={() => setTip(p.id)}
                onFocus={() => setTip(p.id)}
                onBlur={() => setTip(null)}
              >
                <circle className={styles.hit} cx={p.x} cy={p.y} r={22} />
                <circle className={styles.dot} cx={p.x} cy={p.y} r={6} />
                <circle className={styles.ring} cx={p.x} cy={p.y} r={9} />
                {showLabel && (
                  <text className={styles.label} x={p.labelX} y={p.labelY} textAnchor={p.anchor}>
                    {p.id}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>
      {tipStyle && tipSrc && (
        <div className={styles.tip} style={tipStyle} role="status">
          <div className={styles.tipId}>{tipSrc.id}</div>
          <div>
            {xMetric.label}: {formatMetric(xMetric.key, tipSrc.x)}
          </div>
          <div>
            {yMetric.label}: {formatMetric(yMetric.key, tipSrc.y)}
          </div>
        </div>
      )}
      {dropped > 0 && <p className={styles.note}>값이 없는 모델 {dropped}개는 표시하지 않았다.</p>}
    </div>
  );
}
