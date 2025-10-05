#!/usr/bin/env python3
"""
JSON 파싱 결과를 YAML 형식으로 변환

LLM 파서가 생성한 JSON을 수능 평가 시스템에서 사용할 YAML 형식으로 변환합니다.
"""

import json
import yaml
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime


def convert_json_to_yaml(
    json_path: str,
    output_path: str,
    exam_id: str = None,
    subject: str = None,
    year: int = None,
    title: str = None
) -> str:
    """JSON 파싱 결과를 YAML로 변환
    
    Args:
        json_path: 입력 JSON 파일 경로
        output_path: 출력 YAML 파일 경로
        exam_id: 시험 ID (예: 2025-korean-sat)
        subject: 과목 (예: korean, math, english)
        year: 연도
        title: 시험 제목
    
    Returns:
        생성된 YAML 파일 경로
    """
    
    # JSON 로드
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    metadata = data.get('exam_metadata', {})
    source_file = metadata.get('source_file', '')
    
    # 기본값 설정
    if not year:
        # 파일명에서 연도 추출 시도
        try:
            year = int(source_file.split('_')[0]) if source_file else datetime.now().year
        except:
            year = datetime.now().year
    
    if not subject:
        # 파일명에서 과목 추출 시도
        if '국어' in source_file:
            subject = 'korean'
        elif '수학' in source_file:
            subject = 'math'
        elif '영어' in source_file:
            subject = 'english'
        else:
            subject = 'unknown'
    
    if not exam_id:
        exam_id = f"{year}-{subject}-sat"
    
    if not title:
        title = f"{year}학년도 수능 {subject.upper()}"
    
    # YAML 구조 생성
    yaml_data = {
        'exam_id': exam_id,
        'title': title,
        'subject': subject,
        'year': year,
        'parsing_info': {
            'method': metadata.get('parsing_method', 'llm'),
            'model': metadata.get('model', 'gpt-4o'),
            'parsed_at': datetime.now().isoformat()
        },
        'questions': []
    }
    
    # 지문 그룹 맵 생성 (문제 번호 범위로 접근)
    passage_map = {}
    for pg in data.get('passage_groups', []):
        # range가 "1~3" 형식이거나 리스트일 수 있음
        range_str = pg.get('range', '')
        if isinstance(range_str, str) and '~' in range_str:
            start, end = map(int, range_str.split('~'))
            for i in range(start, end + 1):
                passage_map[i] = pg
        elif isinstance(range_str, list) and len(range_str) == 2:
            for i in range(range_str[0], range_str[1] + 1):
                passage_map[i] = pg
    
    # 문제 변환
    for q in data.get('questions', []):
        q_num = q.get('question_number', q.get('number', 0))
        
        # 지문 연결
        passage_info = passage_map.get(q_num)
        passage_text = passage_info.get('content', '') if passage_info else None
        
        # 선택지 처리 (options 또는 choices)
        choices = q.get('choices', q.get('options', []))
        
        # 선택지에서 번호 제거
        cleaned_choices = []
        for choice in choices:
            # ①②③④⑤ 또는 숫자. 제거
            cleaned = choice.strip()
            if cleaned and len(cleaned) > 0:
                # 첫 글자가 원 안 숫자나 '①' 같은 기호면 제거
                if cleaned[0] in '①②③④⑤':
                    cleaned = cleaned[1:].strip()
                # 숫자. 형식 제거
                if cleaned and cleaned[0].isdigit() and len(cleaned) > 1 and cleaned[1] in '.':
                    cleaned = cleaned[2:].strip()
            cleaned_choices.append(cleaned)
        
        question_data = {
            'question_id': f"q{q_num}",
            'question_number': q_num,
            'question_text': q.get('question_text', q.get('question', '')),
            'passage': passage_text,
            'choices': cleaned_choices,
            'correct_answer': None,  # 정답은 별도로 제공되어야 함
            'points': q.get('points', 2),  # 기본 2점
            'explanation': None
        }
        
        yaml_data['questions'].append(question_data)
    
    # YAML 저장 (한글 유지)
    with open(output_path, 'w', encoding='utf-8') as f:
        yaml.dump(
            yaml_data,
            f,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
            width=1000  # 긴 텍스트가 줄바꿈되지 않도록
        )
    
    print(f"✅ YAML 변환 완료: {output_path}")
    print(f"   - 시험 ID: {exam_id}")
    print(f"   - 과목: {subject}")
    print(f"   - 문제 수: {len(yaml_data['questions'])}개")
    
    return output_path


def main():
    """테스트 실행"""
    json_path = "/Users/dohyunjung/Workspace/roboco-io/KSAT-AI-Benchmark/exams/parsed/2025-korean-test.json"
    yaml_path = "/Users/dohyunjung/Workspace/roboco-io/KSAT-AI-Benchmark/exams/parsed/2025-korean-sat.yaml"
    
    convert_json_to_yaml(
        json_path=json_path,
        output_path=yaml_path,
        exam_id="2025-korean-sat-sample",
        subject="korean",
        year=2025,
        title="2025학년도 수능 국어영역 (샘플 - 첫 3페이지)"
    )
    
    # YAML 확인
    with open(yaml_path, 'r', encoding='utf-8') as f:
        print("\n" + "="*100)
        print("📄 생성된 YAML 미리보기:")
        print("="*100)
        lines = f.readlines()[:50]
        print(''.join(lines))
        if len(lines) == 50:
            print("...")


if __name__ == "__main__":
    main()

