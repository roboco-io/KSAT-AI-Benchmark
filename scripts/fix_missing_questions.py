#!/usr/bin/env python3
"""비어있는 question_text를 JSON에서 추출하여 YAML에 주입"""

import json
import yaml
from pathlib import Path

project_root = Path(__file__).parent.parent

# 비어있는 문제 번호들
missing_qnums = [10, 11, 12, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 40, 41, 42, 43, 44, 45]

print("=" * 80)
print("📝 비어있는 question_text 수정")
print("=" * 80)
print()

# JSON에서 question_text 읽기
json_file = project_root / "exams/parsed/2025-korean-sat-vision.json"
print(f"📄 JSON 파일 읽기: {json_file}")

with open(json_file, 'r', encoding='utf-8') as f:
    json_data = json.load(f)

# question_number → question_text 매핑
qtext_map = {}
for q in json_data['questions']:
    qnum = q['question_number']
    qtext = q.get('question_text', '')
    if qnum in missing_qnums:
        qtext_map[qnum] = qtext
        print(f"  Q{qnum}: {qtext[:60]}...")

print()
print(f"✅ JSON에서 {len(qtext_map)}개 문제 텍스트 추출 완료")
print()

# YAML 파일 읽기
yaml_file = project_root / "exams/parsed/2025-korean-sat.yaml"
print(f"📄 YAML 파일 읽기: {yaml_file}")

with open(yaml_file, 'r', encoding='utf-8') as f:
    yaml_data = yaml.safe_load(f)

# YAML에 question_text 주입
updated_count = 0
for q in yaml_data['questions']:
    qnum = q['question_number']
    if qnum in qtext_map:
        old_text = q.get('question_text', '')
        new_text = qtext_map[qnum]
        if old_text == '' or old_text is None:
            q['question_text'] = new_text
            updated_count += 1
            print(f"  ✓ Q{qnum} 업데이트: {new_text[:50]}...")

print()
print(f"✅ {updated_count}개 문제 텍스트 업데이트 완료")
print()

# YAML 파일 저장
print(f"💾 YAML 파일 저장: {yaml_file}")
with open(yaml_file, 'w', encoding='utf-8') as f:
    yaml.dump(yaml_data, f, allow_unicode=True, sort_keys=False, default_flow_style=False)

print()
print("=" * 80)
print("✅ 완료!")
print("=" * 80)
print()
print(f"📊 통계:")
print(f"  - 대상 문제: {len(missing_qnums)}개")
print(f"  - JSON에서 추출: {len(qtext_map)}개")
print(f"  - YAML에 주입: {updated_count}개")
