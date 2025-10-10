#!/usr/bin/env python3
"""
개선된 프롬프트 테스트 - 첫 3문제만
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

# 첫 3문제만 추출
questions = exam_data["questions"][:3]
passages_map = {p['passage_id']: p['passage_text'] for p in exam_data.get('passages', [])}

print("=" * 80)
print("🧪 개선된 프롬프트 테스트 - GPT-5 (첫 3문제)")
print("=" * 80)

# GPT-5 모델 생성
api_key = os.getenv("OPENAI_API_KEY")
model = OpenAIModel(api_key=api_key, model_name="gpt-5", max_tokens=4096, temperature=1)

# 각 문제 테스트
for i, question in enumerate(questions, 1):
    q_num = question['question_number']
    q_text = question['question_text']
    choices = question['choices']
    correct_answer = question['correct_answer']

    # passage_id로 지문 조회
    passage = None
    if question.get('passage_id'):
        passage = passages_map.get(question['passage_id'])

    print(f"\n{'='*80}")
    print(f"📝 문제 {q_num}번")
    print(f"{'='*80}")
    print(f"질문: {q_text}")
    print(f"정답: {correct_answer}번")

    # 모델로 문제 풀이
    response = model.solve_question(q_text, choices, passage)

    is_correct = response.answer == correct_answer
    status = "✅ 정답" if is_correct else f"❌ 오답 (선택: {response.answer}번)"

    print(f"결과: {status}")
    print(f"시간: {response.time_taken:.2f}초")
    print(f"\n[추론]")
    print(response.reasoning[:500] + "..." if len(response.reasoning) > 500 else response.reasoning)

print(f"\n{'='*80}")
print("✅ 테스트 완료")
print(f"{'='*80}")
