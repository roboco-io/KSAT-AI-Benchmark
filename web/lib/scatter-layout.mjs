// Pure scatter layout: pixel positions and non-overlapping label placement.
const LABEL_H = 14;
const POINT_R = 7;
const GAP = 2;
const OFF = POINT_R + GAP;

function domain(values) {
 let lo = Math.min(...values), hi = Math.max(...values);
 if (lo === hi) return null;
 const m = (hi - lo) * 0.05;
 return [lo - m, hi + m];
}

function scaler(values, a, b, flip) {
 const d = domain(values);
 if (!d) return () => (a + b) / 2;
 const [lo, hi] = d;
 return v => {
  const t = (v - lo) / (hi - lo);
  return flip ? b - t * (b - a) : a + t * (b - a);
 };
}

// Candidate label boxes: right, left, above, below, diagonals, then farther rings.
function candidates(x, y, w) {
 const list = [];
 const make = (anchor, labelX, cy) => {
  const left = anchor === 'start' ? labelX : anchor === 'end' ? labelX - w : labelX - w / 2;
  list.push({anchor, labelX, labelY: cy + 4, l: left, r: left + w, t: cy - LABEL_H / 2, b: cy + LABEL_H / 2});
 };
 for (const ring of [0, 1, 2]) {
  const e = ring * LABEL_H;
  make('start', x + OFF, y + (ring ? e : 0));
  if (ring) make('start', x + OFF, y - e);
  make('end', x - OFF, y + (ring ? e : 0));
  if (ring) make('end', x - OFF, y - e);
  make('middle', x, y - OFF - LABEL_H / 2 - e);
  make('middle', x, y + OFF + LABEL_H / 2 + e);
  make('start', x + POINT_R - 1, y - OFF - LABEL_H / 2 + 2 - e);
  make('end', x - POINT_R + 1, y - OFF - LABEL_H / 2 + 2 - e);
  make('start', x + POINT_R - 1, y + OFF + LABEL_H / 2 - 2 + e);
  make('end', x - POINT_R + 1, y + OFF + LABEL_H / 2 - 2 + e);
 }
 return list;
}

function rectOverlapArea(a, b) {
 const w = Math.min(a.r, b.r) - Math.max(a.l, b.l);
 const h = Math.min(a.b, b.b) - Math.max(a.t, b.t);
 return w > 0 && h > 0 ? w * h : 0;
}

function circleHit(r, p) {
 const cx = Math.max(r.l, Math.min(p.x, r.r));
 const cy = Math.max(r.t, Math.min(p.y, r.b));
 const d2 = (cx - p.x) ** 2 + (cy - p.y) ** 2;
 // penalty grows with how deep the circle is inside the box
 return d2 < POINT_R * POINT_R ? 1 + (POINT_R - Math.sqrt(d2)) : 0;
}

function cost(c, placed, pts, W, H) {
 let s = 0;
 const out = Math.max(0, -c.l) + Math.max(0, c.r - W) + Math.max(0, -c.t) + Math.max(0, c.b - H);
 if (out > 0) s += 1000 + out;
 for (const p of placed) s += rectOverlapArea(c, p);
 for (const p of pts) s += circleHit(c, p);
 return s;
}

export function scatterLayout(points, opts) {
 const {width, height, pad, xLog, yLog, labelWidth} = opts;
 const kept = points.filter(p => Number.isFinite(p.x) && Number.isFinite(p.y)
  && (!xLog || p.x > 0) && (!yLog || p.y > 0));
 const tx = v => (xLog ? Math.log10(v) : v);
 const ty = v => (yLog ? Math.log10(v) : v);
 const sx = scaler(kept.map(p => tx(p.x)), pad, width - pad, false);
 const sy = scaler(kept.map(p => ty(p.y)), pad, height - pad, true);
 const px = kept.map(p => ({id: p.id, x: sx(tx(p.x)), y: sy(ty(p.y))}));

 const order = px.map((_, i) => i).sort((i, j) =>
  px[i].y - px[j].y || px[i].x - px[j].x || (px[i].id < px[j].id ? -1 : px[i].id > px[j].id ? 1 : 0) || i - j);
 const placed = [];
 const result = new Array(px.length);
 for (const i of order) {
  const p = px[i];
  const w = labelWidth(p.id);
  let best = null, bestCost = Infinity;
  for (const c of candidates(p.x, p.y, w)) {
   const k = cost(c, placed, px, width, height);
   if (k < bestCost) { best = c; bestCost = k; }
   if (k === 0) break;
  }
  placed.push(best);
  result[i] = {id: p.id, x: p.x, y: p.y, labelX: best.labelX, labelY: best.labelY, anchor: best.anchor};
 }
 return result;
}

function clean(v) { return Number(v.toPrecision(12)); }

export function axisTicks(min, max, log) {
 if (!(max > min)) return Number.isFinite(min) ? [min] : [];
 if (log) {
  if (!(min > 0)) return [];
  const decades = Math.log10(max / min);
  const steps = decades <= 2 ? [1, 2, 5] : decades <= 4 ? [1, 3] : [1];
  const out = [];
  for (let e = Math.floor(Math.log10(min)) - 1; e <= Math.ceil(Math.log10(max)) + 1; e++) {
   for (const s of steps) {
    const v = clean(s * 10 ** e);
    if (v >= min && v <= max) out.push(v);
   }
  }
  return out;
 }
 const span = max - min;
 const e0 = Math.floor(Math.log10(span));
 let best = null;
 for (let e = e0 - 2; e <= e0 + 1; e++) {
  for (const m of [1, 2, 2.5, 5]) {
   const step = m * 10 ** e;
   const first = Math.ceil(min / step - 1e-9), last = Math.floor(max / step + 1e-9);
   const n = last - first + 1;
   if (n < 4 || n > 6) continue;
   const score = Math.abs(n - 5) - step * 1e-12;
   if (!best || score < best.score) best = {score, step, first, last};
  }
 }
 if (!best) return [clean(min), clean(max)];
 const out = [];
 for (let k = best.first; k <= best.last; k++) out.push(clean(k * best.step));
 return out;
}
