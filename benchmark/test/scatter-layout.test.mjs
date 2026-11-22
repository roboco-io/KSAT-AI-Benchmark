import test from 'node:test';
import assert from 'node:assert/strict';
import {scatterLayout, axisTicks} from '../../web/lib/scatter-layout.mjs';

const o = {width: 600, height: 400, pad: 40, xLog: false, yLog: false, labelWidth: () => 60};
const H = 14, R = 7;

function box(p, w) {
 const left = p.anchor === 'start' ? p.labelX : p.anchor === 'end' ? p.labelX - w : p.labelX - w / 2;
 return {l: left, r: left + w, t: p.labelY - 4 - 7, b: p.labelY - 4 + 7};
}
const rectsOverlap = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
const hitsCircle = (r, p) => {
 const cx = Math.max(r.l, Math.min(p.x, r.r)), cy = Math.max(r.t, Math.min(p.y, r.b));
 return (cx - p.x) ** 2 + (cy - p.y) ** 2 < R * R;
};

test('log_scale_positions: 0.1,1,10 equally spaced on log axis', () => {
 const r = scatterLayout([{id: 'a', x: 0.1, y: 1}, {id: 'b', x: 1, y: 2}, {id: 'c', x: 10, y: 3}], {...o, xLog: true});
 assert.ok(Math.abs((r[1].x - r[0].x) - (r[2].x - r[1].x)) < 1e-9);
 assert.ok(r[0].x >= 40 && r[2].x <= 560);
 // y grows upward in data, downward in pixels
 assert.ok(r[2].y < r[0].y);
});

test('labels_do_not_overlap: four coincident-y close points', () => {
 const pts = ['a', 'b', 'c', 'd'].map((id, i) => ({id, x: 5 + i * 0.01, y: 5}));
 pts.push({id: 'far', x: 1, y: 1}, {id: 'far2', x: 9, y: 9});
 const r = scatterLayout(pts, o);
 const boxes = r.map(p => box(p, 60));
 boxes.forEach((b, i) => {
  assert.ok(b.l >= 0 && b.r <= 600 && b.t >= 0 && b.b <= 400, 'inside');
  r.forEach(p => assert.ok(!hitsCircle(b, p), `label ${i} hits point ${p.id}`));
  boxes.forEach((c, j) => { if (i < j) assert.ok(!rectsOverlap(b, c), `labels ${i},${j}`); });
 });
});

test('deep: four models with identical score stay non-overlapping', () => {
 const pts = ['a', 'b', 'c', 'd'].map(id => ({id, x: 3, y: 376}));
 const r = scatterLayout(pts, o);
 assert.equal(r.length, 4);
 const boxes = r.map(p => box(p, 60));
 boxes.forEach((b, i) => {
  r.forEach(p => assert.ok(!hitsCircle(b, p)));
  boxes.forEach((c, j) => { if (i < j) assert.ok(!rectsOverlap(b, c)); });
 });
 const again = scatterLayout(pts, o);
 assert.deepEqual(again, r);
});

test('label_stays_inside_box: point at right edge gets anchor end', () => {
 const r = scatterLayout([{id: 'a', x: 0, y: 0}, {id: 'b', x: 10, y: 5}], o);
 const b = r[1];
 assert.equal(b.anchor, 'end');
 const bx = box(b, 60);
 assert.ok(bx.l >= 0 && bx.r <= 600);
});

test('single_value_domain_centres', () => {
 const r = scatterLayout([{id: 'a', x: 1, y: 1}], o)[0];
 assert.equal(r.x, 300);
 assert.equal(r.y, 200);
 assert.equal(r.anchor, 'start');
 assert.equal(r.labelX, 309);
 assert.equal(r.labelY, 204);
 const l = scatterLayout([{id: 'a', x: 5, y: 7}], {...o, xLog: true, yLog: true})[0];
 assert.equal(l.x, 300);
});

test('nonpositive_on_log_dropped', () => {
 const r = scatterLayout([{id: 'a', x: 0, y: 1}, {id: 'b', x: 2, y: 1}, {id: 'c', x: -1, y: 1}, {id: 'd', x: 4, y: 2}], {...o, xLog: true});
 assert.deepEqual(r.map(p => p.id), ['b', 'd']);
 const y = scatterLayout([{id: 'a', x: 1, y: 0}, {id: 'b', x: 2, y: 3}], {...o, yLog: true});
 assert.deepEqual(y.map(p => p.id), ['b']);
});

test('axisTicks log and linear', () => {
 assert.deepEqual(axisTicks(0.06, 8.5, true), [0.1, 0.3, 1, 3]);
 const wide = axisTicks(0.001, 1000, true);
 assert.deepEqual(wide, [0.001, 0.01, 0.1, 1, 10, 100, 1000]);
 const lin = axisTicks(0, 376, false);
 assert.ok(lin.length >= 4 && lin.length <= 6, String(lin));
 assert.ok(lin.every(t => t >= 0 && t <= 376));
 const f = axisTicks(0.1, 0.9, false);
 assert.ok(f.length >= 4 && f.length <= 6);
 assert.ok(f.every(t => Math.abs(t * 10 - Math.round(t * 10)) < 1e-9 || Math.abs(t * 20 - Math.round(t * 20)) < 1e-9));
 assert.deepEqual(axisTicks(5, 5, false), [5]);
});
