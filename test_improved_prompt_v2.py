#!/usr/bin/env python3
"""
개선된 프롬프트 테스트 v2 - 문제 1, 3, 5번 (이전 오답 문제)
"""

import yaml
import os
from dotenv import load_dotenv
from src.evaluator.models.openai_model import OpenAIModel

# .env 로드
load_dotenv()

# 시험 파일 로드
with open("exams/parsed/2025-korean-sat.yaml", "r", encoding="utf-8") as f:
    exam_data = yaml.safe_load(f)

# 이전에 틀린 문제 (1, 3, 5번)만 추출
test_question_numbers = [1, 3, 5]
questions = [q for q in exam_data["questions"] if q['question_number'] in test_question_numbers]
passages_map = {p['passage_id']: p['passage_text'] for p in exam_data.get('passages', [])}

print("=" * 100)
print("🧪 개선된 프롬프트 테스트 v2 - GPT-5 (문제 1, 3, 5번)")
print("=" * 100)
print("\n이전 결과:")
print("  - 문제 1: 5번 선택 (정답: 3번) ❌")
print("  - 문제 3: 4번 선택 (정답: 5번) ❌")
print("  - 문제 5: 4번 선택 (정답: 5번) ❌")
print("\n개선 사항:")
print("  1. 질문 유형(긍정/부정) 명시")
print("  2. reasoning-answer 일치 검증 로직")
print("  3. 미세한 언어 차이 경고")
print("=" * 100)

# GPT-5 모델 생성
api_key = os.getenv("OPENAI_API_KEY")
model = OpenAIModel(api_key=api_key, model_name="gpt-5", max_tokens=4096, temperature=1)

# 각 문제 테스트
results = []
for i, question in enumerate(questions, 1):
    q_num = question['question_number']
    q_text = question['question_text']
    choices = question['choices']
    correct_answer = question['correct_answer']

    # passage_id로 지문 조회
    passage = None
    if question.get('passage_id'):
        passage = passages_map.get(question['passage_id'])

    print(f"\n{'='*100}")
    print(f"📝 문제 {q_num}번")
    print(f"{'='*100}")
    print(f"질문: {q_text}")
    print(f"정답: {correct_answer}번")

    # 모델로 문제 풀이
    response = model.solve_question(q_text, choices, passage)

    is_correct = response.answer == correct_answer
    status = "✅ 정답" if is_correct else f"❌ 오답 (선택: {response.answer}번)"

    results.append({
        'question_number': q_num,
        'correct': is_correct,
        'answer': response.answer,
        'correct_answer': correct_answer
    })

    print(f"결과: {status}")
    print(f"시간: {response.time_taken:.2f}초")
    print(f"\n[추론]")
    print(response.reasoning[:800] + "..." if len(response.reasoning) > 800 else response.reasoning)

print(f"\n{'='*100}")
print("📊 테스트 결과 요약")
print(f"{'='*100}")

correct_count = sum(1 for r in results if r['correct'])
total_count = len(results)

print(f"정답: {correct_count}/{total_count} ({correct_count/total_count*100:.1f}%)")
print(f"\n상세:")
for r in results:
    status = "✅" if r['correct'] else "❌"
    print(f"  문제 {r['question_number']}번: {status} (선택: {r['answer']}번, 정답: {r['correct_answer']}번)")

print(f"\n{'='*100}")

# 개선 효과 계산
print(f"\n🎯 개선 효과:")
print(f"  - 이전: 0/3 (0%)")
print(f"  - 현재: {correct_count}/3 ({correct_count/3*100:.1f}%)")
if correct_count > 0:
    print(f"  - 향상: +{correct_count}문제")
print(f"{'='*100}\n")
