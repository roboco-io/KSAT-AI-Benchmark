#!/usr/bin/env python3
"""Offline, deterministic analysis of frozen KSAT answers. No model calls."""
import csv
import hashlib
import itertools
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SEED = 20261122
REPLICATES = 4000


def ratio(a, b):
    return a / b if b else None


def answer(q):
    # Missing execution output must never become a vote or a wrong answer choice.
    return q.get('answer') if q['status'] in ('correct', 'incorrect') else None


def correct(a, q, policy):
    accepted = q.get('accepted_answers', [q['correct_answer']]) if policy == 'adjusted' else [q['correct_answer']]
    return a is not None and a in accepted


def vote(values, strict=False):
    valid = [v for v in values if v is not None]
    if not valid:
        return None
    counts = Counter(valid)
    best = max(counts.values())
    winners = [v for v, n in counts.items() if n == best]
    if len(winners) != 1 or (strict and best <= len(values) / 2):
        return None
    return winners[0]


def load(year):
    data = json.loads((ROOT / 'inputs' / f'{year}-answers.json').read_text())
    dataset = json.loads((ROOT / 'inputs' / f'{year}-ksat.json').read_text())
    questions = dataset['questions']
    ids = [q['id'] for q in questions]
    assert len(ids) == len(set(ids)) == 147
    models = {}
    for m in data['models']:
        qs = {q['id']: q for q in m['questions']}
        assert len(qs) == len(m['questions']) == len(ids) and set(qs) == set(ids)
        for q in questions:
            for key in ('correct_answer', 'subject', 'section', 'source_page', 'points', 'kind'):
                assert qs[q['id']][key] == q[key], (m['model'], q['id'], key)
            assert qs[q['id']]['status'] in ('correct', 'incorrect', 'abstained', 'error', 'pending')
        models[m['model']] = {**m, 'qs': [qs[i] for i in ids]}
    for qid in ids:
        accepted = [m['qs'][ids.index(qid)].get('accepted_answers') for m in models.values()]
        assert all(a == accepted[0] for a in accepted), ('inconsistent accepted answers', qid)
    return dataset, models


def metrics(predictions, qs, policy):
    flags = [int(correct(a, q, policy)) for a, q in zip(predictions, qs)]
    return {'correct': sum(flags), 'n': len(qs), 'accuracy': sum(flags) / len(qs),
            'no_decision': predictions.count(None),
            'points': sum(q['points'] * c for q, c in zip(qs, flags)),
            'max_points': sum(q['points'] for q in qs)}


def bootstrap(delta, questions, dataset, mode):
    """Paired resampling, stratified by subject; page blocks are only proxies."""
    group_for = {qid: g['id'] for g in dataset['solver_groups'] for qid in g['question_ids']}
    strata = defaultdict(lambda: defaultdict(list))
    for i, q in enumerate(questions):
        key = (q['section'], q['source_page']) if mode == 'page' else group_for[q['id']]
        strata[q['subject']][key].append(i)
    rng = random.Random(SEED)
    samples = []
    for _ in range(REPLICATES):
        total = 0.0
        for blocks in strata.values():
            blocks = list(blocks.values())
            selected = [rng.choice(blocks) for _ in blocks]
            total += sum(delta[i] for b in selected for i in b) / sum(map(len, selected)) * sum(map(len, blocks))
        samples.append(total / len(questions))
    samples.sort()
    return {'low': samples[int(REPLICATES * .025)], 'high': samples[int(REPLICATES * .975)],
            'replicates': REPLICATES, 'seed': SEED,
            'blocks_per_subject': {s: len(b) for s, b in strata.items()}}


def analyze_panel(dataset, models, names, policy):
    qs = models[names[0]]['qs']
    predictions = {n: [answer(q) for q in models[n]['qs']] for n in names}
    flags = {n: [int(correct(a, q, policy)) for a, q in zip(predictions[n], qs)] for n in names}
    single = {n: metrics(predictions[n], qs, policy) for n in names}
    best = sorted(names, key=lambda n: (-single[n]['correct'], n))[0]
    plurality = [vote([predictions[n][i] for n in names]) for i in range(len(qs))]
    strict = [vote([predictions[n][i] for n in names], True) for i in range(len(qs))]
    vf = [int(correct(a, q, policy)) for a, q in zip(plurality, qs)]
    delta = [a - b for a, b in zip(vf, flags[best])]
    pairs = []
    for a, b in itertools.combinations(names, 2):
        ea = {i for i, f in enumerate(flags[a]) if not f}
        eb = {i for i, f in enumerate(flags[b]) if not f}
        wa = {i for i in ea if predictions[a][i] is not None}
        wb = {i for i in eb if predictions[b][i] is not None}
        both_wrong = wa & wb
        same = sum(predictions[a][i] == predictions[b][i] for i in both_wrong)
        pairs.append({'a': a, 'b': b, 'noncorrect_a': len(ea), 'noncorrect_b': len(eb),
                      'joint_noncorrect': len(ea & eb), 'error_jaccard': ratio(len(ea & eb), len(ea | eb)),
                      'valid_wrong_jaccard': ratio(len(wa & wb), len(wa | wb)),
                      'independence_expected_joint_noncorrect': len(ea) * len(eb) / len(qs),
                      'both_valid_wrong': len(both_wrong), 'same_wrong': same,
                      'same_wrong_given_both_wrong': ratio(same, len(both_wrong)),
                      'oracle_correct': len(qs) - len(ea & eb)})
    items = []
    for i, q in enumerate(qs):
        wrong = {n: predictions[n][i] for n in names if not flags[n][i] and predictions[n][i] is not None}
        noanswer = [n for n in names if predictions[n][i] is None]
        items.append({**{k: q[k] for k in ('id', 'subject', 'section', 'number', 'source_page', 'correct_answer')},
                      'correct_models': [n for n in names if flags[n][i]], 'wrong_answers': wrong,
                      'no_answer_models': noanswer, 'wrong_choice_counts': dict(Counter(map(str, wrong.values()))),
                      'noncorrect_count': len(wrong) + len(noanswer), 'plurality_answer': plurality[i],
                      'plurality_correct': bool(vf[i])})
    triples = []
    for trio in itertools.combinations(names, 3):
        pred = [vote([predictions[n][i] for n in trio]) for i in range(len(qs))]
        mm = metrics(pred, qs, policy)
        triples.append({'members': list(trio), **mm,
                        'gain_over_best_member': mm['correct'] - max(single[n]['correct'] for n in trio)})
    subjects = {}
    for subject in sorted({q['subject'] for q in qs}):
        ix = [i for i, q in enumerate(qs) if q['subject'] == subject]
        subjects[subject] = {'n': len(ix), 'plurality_correct': sum(vf[i] for i in ix),
                             'best_single_correct': max(sum(flags[n][i] for i in ix) for n in names),
                             'all_noncorrect': sum(all(not flags[n][i] for n in names) for i in ix)}
    return {'members': names, 'policy': policy, 'singles': single,
            'status_counts': {n: dict(Counter(q['status'] for q in models[n]['qs'])) for n in names},
            'best_single': best,
            'plurality': metrics(plurality, qs, policy), 'strict_majority': metrics(strict, qs, policy),
            'oracle_correct': sum(any(flags[n][i] for n in names) for i in range(len(qs))),
            'rescues': sum(d == 1 for d in delta), 'harms': sum(d == -1 for d in delta),
            'gain_ci_page_proxy': bootstrap(delta, qs, dataset, 'page'),
            'gain_ci_solver_group': bootstrap(delta, qs, dataset, 'group'),
            'subjects': subjects, 'pairs': pairs, 'items': sorted(items, key=lambda q: (-q['noncorrect_count'], q['id'])),
            'triples': sorted(triples, key=lambda t: (-t['correct'], t['members']))}


def write_csv(path, rows):
    if not rows:
        return
    with path.open('w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        for row in rows:
            w.writerow({k: json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v for k, v in row.items()})


def main():
    for entry in json.loads((ROOT / 'inputs' / 'manifest.json').read_text()):
        p = ROOT / 'inputs' / Path(entry['snapshot']).name
        assert hashlib.sha256(p.read_bytes()).hexdigest() == entry['snapshot_sha256'], p
    loaded = {y: load(y) for y in (2025, 2026)}
    image = {y: sorted(n for n, m in ms.items() if m['completed'] and m['protocol']['input'] == 'original PDF rendered at 200 DPI')
             for y, (_, ms) in loaded.items()}
    common = sorted(set(image[2025]) & set(image[2026]))
    # Select on 2025 only, then freeze membership before inspecting 2026 performance.
    train_ds, train_ms = loaded[2025]
    eligible = {n: metrics([answer(q) for q in train_ms[n]['qs']], train_ms[n]['qs'], 'official')['correct'] for n in common}
    train_best = sorted(common, key=lambda n: (-eligible[n], n))[0]
    train_triples = []
    for trio in itertools.combinations(common, 3):
        ps = [vote([answer(train_ms[n]['qs'][i]) for n in trio]) for i in range(147)]
        train_triples.append((metrics(ps, train_ms[trio[0]]['qs'], 'official')['correct'], trio))
    frozen_trio = sorted(train_triples, key=lambda t: (-t[0], t[1]))[0][1]
    output = {'seed': SEED, 'bootstrap_replicates': REPLICATES, 'years': {},
              'selection_2025': {'best_single': train_best, 'triple': list(frozen_trio),
                                 'selection_triple_correct': max(t[0] for t in train_triples),
                                 'tie_rule': 'lexicographically smallest sorted model IDs'}}
    out = ROOT / 'outputs'
    out.mkdir(exist_ok=True)
    for year, (ds, ms) in loaded.items():
        high = [n for n in image[year] if metrics([answer(q) for q in ms[n]['qs']], ms[n]['qs'], 'official')['accuracy'] >= .95]
        panels = {'image_all': image[year], 'matched': common, 'high95_descriptive': high,
                  'frozen_2025_triple': list(frozen_trio)}
        if any(not m['completed'] for m in ms.values()):
            panels['incomplete_image_sensitivity'] = sorted(n for n, m in ms.items() if m['protocol']['input'] == 'original PDF rendered at 200 DPI')
        if any(m['protocol']['input'] != 'original PDF rendered at 200 DPI' for m in ms.values()):
            panels['all_inputs_sensitivity'] = sorted(n for n, m in ms.items() if m['completed'])
        result = {}
        for label, names in panels.items():
            result[label] = {}
            for policy in ('official', 'adjusted'):
                p = analyze_panel(ds, ms, names, policy)
                # Preselected reference avoids picking the comparator using target-year scores.
                if label == 'frozen_2025_triple':
                    pred = [vote([answer(ms[n]['qs'][i]) for n in names]) for i in range(147)]
                    qs = ms[train_best]['qs']
                    delta = [int(correct(a, q, policy)) - int(correct(answer(q), q, policy)) for a, q in zip(pred, qs)]
                    p['frozen_reference'] = {'model': train_best, 'correct': sum(correct(answer(q), q, policy) for q in qs),
                                              'rescues': delta.count(1), 'harms': delta.count(-1),
                                              'gain_ci_page_proxy': bootstrap(delta, qs, ds, 'page'),
                                              'gain_ci_solver_group': bootstrap(delta, qs, ds, 'group')}
                result[label][policy] = p
                if policy == 'official':
                    for key in ('pairs', 'items', 'triples'):
                        write_csv(out / f'{year}-{label}-{key}.csv', p[key])
        output['years'][str(year)] = result
    (out / 'analysis.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    for year, panels in output['years'].items():
        for label, policies in panels.items():
            p = policies['official']
            print(year, label, 'models', len(p['members']), 'best', p['singles'][p['best_single']]['correct'],
                  'plurality', p['plurality']['correct'], 'oracle', p['oracle_correct'],
                  'rescue/harm', p['rescues'], p['harms'])


if __name__ == '__main__':
    main()
