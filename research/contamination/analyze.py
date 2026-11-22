#!/usr/bin/env python3
"""Offline contamination analysis of frozen KSAT answers. No model calls.

Question: does the same model score higher on exams that were public before its
release (2025, 2026 academic years) than on the 2027 exam, which it solved on the
exam day (2026-11-19) and therefore cannot have seen in training?
delta = accuracy(public year) - accuracy(2027). delta > 0 is the direction that
training-data contamination predicts. Year difficulty is NOT controlled here.
"""
import csv, json, random
from math import comb
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SEED, REPS = 20261122, 10000
YEARS, CLEAN = (2025, 2026, 2027), 2027
SUBJECTS = ('korean', 'math', 'english')

data = {y: json.loads((ROOT / 'inputs' / f'{y}-answers.json').read_text()) for y in YEARS}
runs = {}  # (model, year) -> {'qs': {pos: question}, meta}
for y in YEARS:
    for m in data[y]['models']:
        qs = {q['id'].split('-', 1)[1]: q for q in m['questions']}  # position key: subject-section-qNN
        assert len(qs) == 147
        runs[(m['model'], y)] = {**m, 'qs': qs}
positions = sorted(next(iter(runs.values()))['qs'])
for r in runs.values():  # same exam structure every year -> position-matched comparison is valid
    assert sorted(r['qs']) == positions
ref = {y: next(r for (m, yy), r in runs.items() if yy == y)['qs'] for y in YEARS}
kind_changed = [p for p in positions if len({ref[y][p]['kind'] for y in YEARS}) > 1]
points_changed = [p for p in positions if len({ref[y][p]['points'] for y in YEARS}) > 1]

def ok(r, p): return 1 if r['qs'][p]['status'] == 'correct' else 0  # abstain/error/pending count as not correct
def acc(r, ps): return sum(ok(r, p) for p in ps) / len(ps)
def subj(s): return [p for p in positions if p.startswith(s)]
def exact_p(b, c):  # two-sided exact sign test on discordant pairs
    n = b + c
    return 1.0 if n == 0 else min(1.0, 2 * sum(comb(n, k) for k in range(0, min(b, c) + 1)) / 2 ** n)

models = sorted({m for m, _ in runs})
complete = lambda m, y: (m, y) in runs and runs[(m, y)]['completed'] and runs[(m, y)]['summary']['errors'] == 0
panel = [m for m in models if complete(m, CLEAN) and any(complete(m, y) for y in (2025, 2026))]
same_input = lambda m, y: runs[(m, y)]['protocol'].get('input') == runs[(m, CLEAN)]['protocol'].get('input')

rng = random.Random(SEED)
strata = [subj(s) for s in SUBJECTS]
def draws():  # resample question positions within subject, independently per year
    return {y: [rng.choice(st) for st in strata for _ in st] for y in YEARS}
boots = [draws() for _ in range(REPS)]
def ci(fn):
    v = sorted(fn(b) for b in boots)
    return v[int(.025 * REPS)], v[int(.975 * REPS) - 1]

rows, contrasts = [], []
for m in models:
    for y in YEARS:
        if (m, y) not in runs: continue
        r = runs[(m, y)]; s = r['summary']
        rows.append({'model': m, 'year': y, 'completed': r['completed'], 'started_at': r['started_at'][:10], 'prompt_version': r['prompt_version'] or 1,
                     'input': r['protocol'].get('input'), 'score': s['score'], 'max_score': s['max_score'], 'correct': s['correct'],
                     'abstained': s['abstained'], 'errors': s['errors'],
                     **{f'{x}_acc': round(acc(r, subj(x)), 4) for x in SUBJECTS}, 'acc': round(acc(r, positions), 4)})
for m in panel:
    c = runs[(m, CLEAN)]
    for y in (2025, 2026):
        if not complete(m, y): continue
        p = runs[(m, y)]
        d = acc(p, positions) - acc(c, positions)
        lo, hi = ci(lambda b: acc(p, b[y]) - acc(c, b[CLEAN]))
        b_ = sum(1 for q in positions if ok(p, q) and not ok(c, q)); c_ = sum(1 for q in positions if not ok(p, q) and ok(c, q))
        contrasts.append({'model': m, 'public_year': y, 'same_input_mode': same_input(m, y), 'public_acc': round(acc(p, positions), 4), 'clean_acc': round(acc(c, positions), 4),
                          'delta_pp': round(100 * d, 2), 'ci95_lo_pp': round(100 * lo, 2), 'ci95_hi_pp': round(100 * hi, 2),
                          'public_only_correct': b_, 'clean_only_correct': c_, 'sign_test_p': round(exact_p(b_, c_), 4),
                          **{f'{x}_delta_pp': round(100 * (acc(p, subj(x)) - acc(c, subj(x))), 2) for x in SUBJECTS}})

def pooled(pairs, ya, yb):  # mean over models of acc(ya) - acc(yb), same question resample shared by all models
    f = lambda b: sum(acc(runs[(m, ya)], b[ya] if b else positions) - acc(runs[(m, yb)], b[yb] if b else positions) for m in pairs) / len(pairs)
    lo, hi = ci(f)
    return {'models': pairs, 'n_models': len(pairs), 'delta_pp': round(100 * f(None), 2), 'ci95_pp': [round(100 * lo, 2), round(100 * hi, 2)]}
both = lambda ya, yb: [m for m in models if complete(m, ya) and complete(m, yb) and runs[(m, ya)]['protocol'].get('input') == runs[(m, yb)]['protocol'].get('input')]
summary = {
    'positions_with_kind_change_across_years': kind_changed, 'positions_with_points_change_across_years': len(points_changed),
    'seed': SEED, 'replicates': REPS, 'panel': panel,
    'pooled_2026_minus_2027': pooled(both(2026, 2027), 2026, 2027),
    'pooled_2025_minus_2027': pooled(both(2025, 2027), 2025, 2027),
    'placebo_2025_minus_2026_both_public': pooled(both(2025, 2026), 2025, 2026),
    'ceiling_models_at_or_above_98pct': {y: sum(1 for (m, yy), r in runs.items() if yy == y and r['completed'] and acc(r, positions) >= .98) for y in YEARS},
    'completed_models': {y: sum(1 for (m, yy), r in runs.items() if yy == y and r['completed']) for y in YEARS},
}
below = [m for m in both(2026, 2027) if acc(runs[(m, 2026)], positions) < .98 and acc(runs[(m, 2027)], positions) < .98]
if below: summary['pooled_2026_minus_2027_below_ceiling'] = pooled(below, 2026, 2027)


# ---------------------------------------------------------------------------
# Difficulty adjustment. Per-question human rates exist only for a few subject-years
# (see inputs/human/), so the adjustment uses exam-level indicators: the raw-score
# grade-1 cutoff per elective track (Korean, math) and the grade-1 share (English).
# The slope of model accuracy on these indicators is learned from all years, mostly
# from the two public years; "public" is what remains for 2025/2026 versus 2027.
import numpy as np
import logit

exam = list(csv.DictReader((ROOT / 'inputs' / 'human' / 'exam-level.csv').open()))
def indicator(scn):  # scn: 'mid' | 'low' | 'high' -> {(year, subject, track): value}
    col = {'mid': 'value', 'low': 'value_low', 'high': 'value_high'}[scn]
    return {(int(r['year']), r['subject'], r['track']): float(r[col]) for r in exam}
def h_of(ind, y, p):  # (cutoff covariate per 10 raw points, English covariate as logit of the grade-1 share)
    s, sec = p.split('-')[0], p.split('-')[1]
    if s == 'english':
        v = ind[(y, s, 'english')] / 100
        return 0.0, float(np.log(v / (1 - v)))
    tracks = [v for (yy, ss, t), v in ind.items() if yy == y and ss == s]
    return (ind[(y, s, sec)] if sec != 'common' else sum(tracks) / len(tracks)) / 10, 0.0

points_of = {y: {p: ref[y][p]['points'] for p in positions} for y in YEARS}
cell = lambda p: p.split('-')[0] + ('-common' if p.split('-')[1] in ('common', 'english') else '-elective')
cells = sorted({cell(p) for p in positions})

def design(pmodels, scn='mid', fe='position', with_h=True):
    ind = indicator(scn); rows_, y_, item_ = [], [], []
    for m in pmodels:
        for yr in YEARS:
            if not complete(m, yr): continue
            for p in positions:
                hk, he = h_of(ind, yr, p)
                x = [1.0 if m == mm else 0.0 for mm in pmodels]
                if fe == 'position': x += [1.0 if p == pp else 0.0 for pp in positions[1:]]
                else: x += [1.0 if cell(p) == c else 0.0 for c in cells[1:]] + [float(points_of[yr][p] == 3), float(points_of[yr][p] == 4)]
                if with_h: x += [hk, he]
                x += [0.0 if yr == CLEAN else 1.0]
                rows_.append(x); y_.append(ok(runs[(m, yr)], p)); item_.append((yr, p))
    return np.array(rows_), np.array(y_, float), item_

def ame_pp(X, b):  # average change in P(correct) when the exam is public, in percentage points
    X1, X0 = X.copy(), X.copy(); X1[:, -1] = 1; X0[:, -1] = 0
    return float(100 * (logit.predict(X1, b) - logit.predict(X0, b)).mean())

REG_REPS = 1000
item_strata = {}
for yr in YEARS:
    for s in SUBJECTS: item_strata[(yr, s)] = [(yr, p) for p in subj(s)]
nrng = np.random.default_rng(SEED)
item_weights = []
for _ in range(REG_REPS):  # item-cluster bootstrap: resample questions within year x subject
    w = {}
    for items in item_strata.values():
        for it, c in zip(items, nrng.multinomial(len(items), [1 / len(items)] * len(items))): w[it] = c
    item_weights.append(w)

def regress(pmodels, scn='mid', fe='position', with_h=True, boot=True):
    X, yv, items = design(pmodels, scn, fe, with_h)
    b = logit.fit(X, yv)
    res = {'n_models': len(pmodels), 'n_obs': int(len(yv)), 'public_log_odds': round(float(b[-1]), 3), 'public_effect_pp': round(ame_pp(X, b), 2)}
    if with_h: res['slope_cutoff_per_10_points'] = round(float(b[-3]), 3); res['slope_english_logit_share'] = round(float(b[-2]), 3)
    if boot:
        bs = []
        for w in item_weights:
            wv = np.array([w[it] for it in items], float)
            bb = logit.fit(X, yv, w=wv, b0=b, iters=40)
            bs.append((bb[-1], ame_pp(X, bb), bb[-3] if with_h else 0.0))
        q = lambda k: [round(float(v), 2) for v in np.percentile([t[k] for t in bs], [2.5, 97.5])]
        res['public_log_odds_ci95'] = q(0); res['public_effect_pp_ci95'] = q(1)
        if with_h: res['slope_cutoff_ci95'] = q(2)
    return res

ceiling = [m for m in panel if acc(runs[(m, CLEAN)], positions) >= .98]
summary['difficulty_adjusted'] = {
    'note': 'public_effect_pp > 0 means higher accuracy on public exams after adjustment. Exam-level human indicators only; 2027 indicators are preliminary.',
    'unadjusted_same_model': regress(panel, fe='coarse', with_h=False),
    'adjusted_position_fe': regress(panel, fe='position'),
    'adjusted_coarse_fe': regress(panel, fe='coarse'),
    'adjusted_position_fe_2027_cutoffs_low': regress(panel, scn='low', boot=False),
    'adjusted_position_fe_2027_cutoffs_high': regress(panel, scn='high', boot=False),
    'ceiling_models_excluded': ceiling,
    'adjusted_position_fe_without_ceiling_models': regress([m for m in panel if m not in ceiling], fe='position'),
}

# Difficulty tiers. Per-question human rates are not available for 2027, so tiers use the
# points that the exam setters assigned: 2 points = easy, 3 = medium, 4 = hard (math only).
def tier_delta(pts):
    def f(b):
        ds = []
        for m in panel:
            pub = [(y, p) for y in (2025, 2026) if complete(m, y) for p in (b[y] if b else positions) if points_of[y][p] == pts]
            cl = [p for p in (b[CLEAN] if b else positions) if points_of[CLEAN][p] == pts]
            if not pub or not cl: return None
            ds.append(sum(ok(runs[(m, y)], p) for y, p in pub) / len(pub) - sum(ok(runs[(m, CLEAN)], p) for p in cl) / len(cl))
        return sum(ds) / len(ds)
    v = sorted(x for x in (f(b) for b in boots) if x is not None)
    return {'n_questions_per_year': {y: sum(1 for p in positions if points_of[y][p] == pts) for y in YEARS},
            'public_minus_2027_pp': round(100 * f(None), 2), 'ci95_pp': [round(100 * v[int(.025 * len(v))], 2), round(100 * v[int(.975 * len(v)) - 1], 2)]}
summary['by_points_tier'] = {'easy_2pt': tier_delta(2), 'medium_3pt': tier_delta(3), 'hard_4pt_math_only': tier_delta(4)}

# Secondary check: within one public exam, does the human correct rate of a question predict
# whether a model answers it correctly? Uses every model that completed that year.
def human_rates(y):
    acc_ = {}
    for r in csv.DictReader((ROOT / 'inputs' / 'human' / f'{y}-item-rates.csv').open()):
        v = float(r['value_pct']); v = v if r['metric'] == 'correct_rate' else 100 - v
        acc_.setdefault(f"{r['subject']}-{r['section']}-q{int(r['number']):02d}", []).append(v)
    return {p: sum(v) / len(v) for p, v in acc_.items() if p in positions}
coverage, item_level = {}, {}
for y in YEARS:
    hr = human_rates(y)
    for s in SUBJECTS:
        ps = [p for p in subj(s) if p in hr]
        coverage[f'{y}-{s}'] = {'questions_with_human_rate': len(ps), 'questions_total': len(subj(s))}
        if len(ps) < 20: continue
        ms = [m for m in models if complete(m, y)]
        X = np.array([[1.0 if m == mm else 0.0 for mm in ms] + [float(np.log(max(1, min(99, hr[p])) / (100 - max(1, min(99, hr[p])))))] for m in ms for p in ps])
        yv = np.array([ok(runs[(m, y)], p) for m in ms for p in ps], float)
        b = logit.fit(X, yv); idx = [i for _ in ms for i in range(len(ps))]; bs = []
        for _ in range(REG_REPS):
            c = nrng.multinomial(len(ps), [1 / len(ps)] * len(ps)); bs.append(logit.fit(X, yv, w=np.array([c[i] for i in idx], float), b0=b, iters=40)[-1])
        item_level[f'{y}-{s}'] = {'n_questions': len(ps), 'n_models': len(ms), 'model_errors': int(len(yv) - yv.sum()),
                                  'slope_model_log_odds_per_human_logit': round(float(b[-1]), 3), 'ci95': [round(float(v), 2) for v in np.percentile(bs, [2.5, 97.5])]}
summary['human_item_rate_coverage'] = coverage
summary['item_level_human_difficulty_predicts_model'] = item_level

out = ROOT / 'outputs'; out.mkdir(exist_ok=True)
for name, rs in (('panel.csv', rows), ('contrasts.csv', contrasts)):
    with (out / name).open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rs[0])); w.writeheader(); w.writerows(rs)
(out / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1) + '\n')
for c in contrasts:
    print(f"{c['model']:22s} {c['public_year']} vs 2027  {c['public_acc']:.3f} -> {c['clean_acc']:.3f}  d={c['delta_pp']:+6.2f}pp [{c['ci95_lo_pp']:+.1f},{c['ci95_hi_pp']:+.1f}]  disc {c['public_only_correct']}/{c['clean_only_correct']} p={c['sign_test_p']}  K{c['korean_delta_pp']:+.1f} M{c['math_delta_pp']:+.1f} E{c['english_delta_pp']:+.1f} same_input={c['same_input_mode']}")
print(json.dumps(summary, ensure_ascii=False))
