"""Render the Korean report from the evidence ledger; no external dependencies."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ledger = json.loads((ROOT / 'ledger.json').read_text())
lines = ['# 고득점 AI들은 같은 수능 문제에서 틀리는가?', '',
         '2026-11-22 · 저장 답안에 대한 탐색 연구 · 추가 모델 호출 없음', '']
for claim in ledger['claims']:
    lines += [claim['text'], '', f'근거: {claim["id"]} / ' + ', '.join(claim['sources']), '']
lines += ['## 근거 자료', '']
for source in ledger['sources']:
    lines += [f'- {source["id"]} ({source["grade"]}): [{source["kind"]}]({source["url"]})', '']
(ROOT / 'REPORT.md').write_text('\n'.join(lines))
