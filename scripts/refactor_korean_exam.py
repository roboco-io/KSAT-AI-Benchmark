#!/usr/bin/env python3
"""
국어 시험 YAML 구조 개선 스크립트

기존 구조 (중복 지문):
  questions:
    - passage: "전체 지문 텍스트..."
      question_text: "..."

새 구조 (참조 방식):
  passages:
    - passage_id: p1
      passage_text: "전체 지문 텍스트..."
  questions:
    - passage_id: p1
      question_text: "..."
"""

import sys
import re
from datetime import datetime
from collections import defaultdict

try:
    import yaml
except ImportError:
    print("❌ PyYAML이 설치되지 않았습니다.")
    print("   설치: pip install pyyaml")
    sys.exit(1)


def group_passages(questions):
    """
    같은 지문을 공유하는 문제들을 그룹핑

    Returns:
        dict: {passage_text: [question_numbers]}
    """
    passage_groups = defaultdict(list)

    for q in questions:
        passage = q.get('passage')

        # None이거나 빈 문자열인 경우 처리
        if passage is None or (isinstance(passage, str) and passage.strip() == ''):
            passage_groups[None].append(q['question_number'])
        else:
            # 문자열이 아닌 경우 문자열로 변환
            if not isinstance(passage, str):
                passage = str(passage)
            passage_groups[passage.strip()].append(q['question_number'])

    return passage_groups


def create_passages_section(passage_groups):
    """
    passages 섹션 생성

    Returns:
        list: [{'passage_id': 'p1', 'passage_text': '...', 'question_numbers': [1,2,3]}]
    """
    passages = []
    passage_id_counter = 1

    # None (지문 없음) 제외하고 정렬
    for passage_text, question_numbers in sorted(
        [(p, qns) for p, qns in passage_groups.items() if p is not None],
        key=lambda x: min(x[1])
    ):
        passages.append({
            'passage_id': f'p{passage_id_counter}',
            'passage_text': passage_text,
            'question_numbers': sorted(question_numbers)
        })
        passage_id_counter += 1

    return passages


def update_questions(questions, passages):
    """
    questions 섹션 업데이트: passage → passage_id

    Returns:
        list: 업데이트된 questions
    """
    # passage_text → passage_id 매핑 생성
    passage_to_id = {
        p['passage_text']: p['passage_id']
        for p in passages
    }

    updated_questions = []

    for q in questions:
        passage = q.get('passage')

        # passage_text 추출 (None 처리)
        if passage is None or (isinstance(passage, str) and passage.strip() == ''):
            passage_text = None
        else:
            # 문자열이 아닌 경우 문자열로 변환
            if not isinstance(passage, str):
                passage = str(passage)
            passage_text = passage.strip()

        # passage 필드 제거
        if 'passage' in q:
            del q['passage']

        # passage_id 추가
        if passage_text and passage_text in passage_to_id:
            q['passage_id'] = passage_to_id[passage_text]
        else:
            q['passage_id'] = None

        updated_questions.append(q)

    return updated_questions


def refactor_yaml_structure(input_path, output_path=None):
    """
    YAML 구조 개선 메인 함수
    """
    print(f"\n📖 YAML 파일 로드 중...")

    # YAML 로드
    with open(input_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    # 메타데이터 보존
    new_data = {
        'exam_id': data['exam_id'],
        'title': data['title'],
        'subject': data['subject'],
        'year': data['year'],
        'parsing_info': data['parsing_info']
    }

    # 1. 지문 그룹핑
    print(f"🔍 지문 그룹 분석 중...")
    passage_groups = group_passages(data['questions'])
    print(f"   - 총 문제 수: {len(data['questions'])}개")
    print(f"   - 고유 지문 수: {len([p for p in passage_groups if p is not None])}개")

    # 2. passages 섹션 생성
    print(f"📝 passages 섹션 생성 중...")
    passages = create_passages_section(passage_groups)
    new_data['passages'] = passages

    for p in passages:
        q_range = f"{min(p['question_numbers'])}-{max(p['question_numbers'])}" \
                  if len(p['question_numbers']) > 1 else str(p['question_numbers'][0])
        print(f"   - {p['passage_id']}: 문제 {q_range} ({len(p['question_numbers'])}개)")

    # 3. questions 섹션 업데이트
    print(f"🔄 questions 섹션 업데이트 중...")
    updated_questions = update_questions(data['questions'], passages)
    new_data['questions'] = updated_questions

    # 4. YAML 저장
    print(f"💾 저장 중: {output_path}")
    with open(output_path, 'w', encoding='utf-8') as f:
        yaml.dump(
            new_data,
            f,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
            width=120,
            indent=2
        )

    # 5. 통계 출력
    print(f"\n📊 변환 통계:")
    print(f"   - 원본 크기: {len(open(input_path, 'r', encoding='utf-8').read())} bytes")
    print(f"   - 새 파일 크기: {len(open(output_path, 'r', encoding='utf-8').read())} bytes")

    # 중복 제거 효과
    original_passages_count = len(data['questions'])  # 각 문제마다 지문 포함
    new_passages_count = len(passages)  # 고유 지문만
    reduction = (1 - new_passages_count / original_passages_count) * 100 if original_passages_count > 0 else 0
    print(f"   - 지문 중복 제거: {original_passages_count}개 → {new_passages_count}개 ({reduction:.1f}% 절감)")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python refactor_korean_exam.py <input_yaml> [output_yaml]")
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else None

    if not output_path:
        # 기본 출력: 원본에 -refactored 추가
        output_path = input_path.replace('.yaml', '-refactored.yaml')

    print(f"📄 입력 파일: {input_path}")
    print(f"📝 출력 파일: {output_path}")

    try:
        refactor_yaml_structure(input_path, output_path)
        print(f"\n✅ 변환 완료!")
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        sys.exit(1)
