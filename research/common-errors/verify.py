"""Independently reconstruct every exported panel from frozen inputs."""
import hashlib
import itertools
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
result = json.loads((ROOT / 'outputs' / 'analysis.json').read_text())
panels = 0
for year, groups in result['years'].items():
    frozen = json.loads((ROOT / 'inputs' / f'{year}-answers.json').read_text())
    models = {m['model']: m for m in frozen['models']}
    dataset = json.loads((ROOT / 'inputs' / f'{year}-ksat.json').read_text())
    ids = [q['id'] for q in dataset['questions']]
    qmap = {m: {q['id']: q for q in d['questions']} for m, d in models.items()}
    for label, policies in groups.items():
        for policy, p in policies.items():
            members = p['members']
            right, answers, predicted, vote_right, strict_right = {}, {}, {}, {}, {}
            for qid in ids:
                reference = qmap[members[0]][qid]
                key = reference.get('accepted_answers', [reference['correct_answer']]) if policy == 'adjusted' else [reference['correct_answer']]
                aa = {n: (qmap[n][qid]['answer'] if qmap[n][qid]['status'] in ('correct', 'incorrect') else None) for n in members}
                rr = {n: aa[n] is not None and aa[n] in key for n in members}
                counter = Counter(a for a in aa.values() if a is not None)
                ordered = counter.most_common()
                v = ordered[0][0] if ordered and (len(ordered) == 1 or ordered[0][1] > ordered[1][1]) else None
                predicted[qid] = v
                vote_right[qid] = v is not None and v in key
                strict_right[qid] = vote_right[qid] and ordered[0][1] > len(members) / 2
                right[qid], answers[qid] = rr, aa
            assert p['oracle_correct'] == sum(any(rr.values()) for rr in right.values())
            for n in members:
                assert p['singles'][n]['correct'] == sum(rr[n] for rr in right.values())
            for row in p['items']:
                qid = row['id']
                assert row['plurality_answer'] == predicted[qid]
                assert row['plurality_correct'] == vote_right[qid]
                assert set(row['correct_models']) == {n for n in members if right[qid][n]}
            assert p['plurality']['correct'] == sum(vote_right.values())
            assert p['strict_majority']['correct'] == sum(strict_right.values())
            assert p['rescues'] == sum(vote_right[qid] and not right[qid][p['best_single']] for qid in ids)
            assert p['harms'] == sum(not vote_right[qid] and right[qid][p['best_single']] for qid in ids)
            for pair in p['pairs']:
                a, b = pair['a'], pair['b']
                joint = [qid for qid in ids if not right[qid][a] and not right[qid][b]]
                valid = [qid for qid in joint if answers[qid][a] is not None and answers[qid][b] is not None]
                assert pair['joint_noncorrect'] == len(joint)
                assert pair['both_valid_wrong'] == len(valid)
                assert pair['same_wrong'] == sum(answers[qid][a] == answers[qid][b] for qid in valid)
            assert len(p['triples']) == len(list(itertools.combinations(members, 3)))
            panels += 1
for entry in json.loads((ROOT / 'inputs' / 'manifest.json').read_text()):
    p = ROOT / 'inputs' / Path(entry['snapshot']).name
    assert hashlib.sha256(p.read_bytes()).hexdigest() == entry['snapshot_sha256']
print(f'Independent reconstruction: {panels} panel/policy combinations verified; 4 snapshot hashes verified')
