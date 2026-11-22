"""Export static research figures from analysis.json; requires matplotlib."""
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / 'outputs' / 'analysis.json').read_text())
names = data['years']['2025']['matched']['official']['members']
short = {'claude-fable-5-1': 'Fable', 'claude-haiku-5-5': 'Haiku',
         'claude-opus-5-5': 'Opus', 'claude-sonnet-5-5': 'Sonnet',
         'gemini-4-argon': 'Argon', 'gpt-6-astra': 'Astra',
         'gpt-6-luna': 'Luna', 'gpt-6.1-sol': 'Sol', 'kimi-k3': 'Kimi'}
plt.rcParams.update({'font.size': 10, 'svg.fonttype': 'none'})
fig, axes = plt.subplots(1, 2, figsize=(13, 6), layout='constrained')
for ax, year in zip(axes, ('2025', '2026')):
    pairs = data['years'][year]['matched']['official']['pairs']
    lookup = {frozenset((p['a'], p['b'])): p['error_jaccard'] for p in pairs}
    matrix = [[float('nan') if a == b or lookup[frozenset((a, b))] is None
               else lookup[frozenset((a, b))] for b in names] for a in names]
    im = ax.imshow(matrix, vmin=0, vmax=1, cmap='Blues')
    ax.set_xticks(range(len(names)), [short[n] for n in names], rotation=45, ha='right')
    ax.set_yticks(range(len(names)), [short[n] for n in names])
    ax.set_title(f'{year} KSAT: matched 9 models, official key')
    for i, row in enumerate(matrix):
        for j, val in enumerate(row):
            if val == val:
                ax.text(j, i, f'{val:.2f}', ha='center', va='center', fontsize=8,
                        color='white' if val > .6 else '#18334a')
fig.colorbar(im, ax=axes, shrink=.7, label='Noncorrect-set Jaccard (includes abstention)')
fig.suptitle('Shared failures vary by model pair; this does not establish shared training data', fontsize=12)
for ext in ('svg', 'png'):
    fig.savefig(ROOT / 'outputs' / f'error-overlap.{ext}', dpi=180)
plt.close(fig)

fig, ax = plt.subplots(figsize=(8, 4.5), layout='constrained')
labels = ['Best single\n(same-year)', 'Plurality', 'Strict majority', 'Oracle\n(unattainable selector)']
for offset, year, color in [(-.18, '2025', '#277da8'), (.18, '2026', '#de7d33')]:
    p = data['years'][year]['image_all']['official']
    values = [p['singles'][p['best_single']]['correct'], p['plurality']['correct'],
              p['strict_majority']['correct'], p['oracle_correct']]
    bars = ax.bar([i + offset for i in range(4)], values, width=.35, label=f'{year} (n={len(p["members"])} models)', color=color)
    ax.bar_label(bars, padding=2)
ax.set_xticks(range(4), labels)
ax.set_ylim(0, 157)
ax.set_ylabel('Correct items / 147 unique questions')
ax.set_title('Adding votes did not beat the best observed single model')
ax.legend(loc='lower left')
for ext in ('svg', 'png'):
    fig.savefig(ROOT / 'outputs' / f'voting-performance.{ext}', dpi=180)
plt.close(fig)
