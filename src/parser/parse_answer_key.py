#!/usr/bin/env python3
"""
정답표 PDF 파싱 및 YAML 업데이트

정답표 PDF를 LLM으로 파싱하여 문제 번호-정답 매핑을 추출하고,
기존 시험 YAML 파일의 correct_answer 필드를 자동으로 업데이트합니다.

사용법:
    python parse_answer_key.py <answer_key_pdf> <exam_yaml>
    
예시:
    python parse_answer_key.py exams/pdf/2025/수학영역_정답표.pdf exams/parsed/2025-math-sat.yaml
"""

import argparse
import sys
import json
from pathlib import Path
import yaml
import pdfplumber
from openai import OpenAI
import os
from typing import Dict, List


def extract_answer_key_with_llm(pdf_path: str, api_key: str = None, use_vision: bool = True) -> Dict[int, int]:
    """LLM을 사용하여 정답표에서 정답 추출
    
    Args:
        pdf_path: 정답표 PDF 경로
        api_key: OpenAI API 키
        use_vision: Vision API 사용 여부
    
    Returns:
        {문제번호: 정답번호} 딕셔너리
    """
    
    api_key = api_key or os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OpenAI API 키가 필요합니다.")
    
    client = OpenAI(api_key=api_key)
    
    # Vision API 사용 시 PDF를 이미지로 변환
    if use_vision:
        from pdf2image import convert_from_path
        import base64
        from io import BytesIO
        
        print("🖼️  PDF를 이미지로 변환 중...")
        images = convert_from_path(pdf_path, dpi=300)
        print(f"✅ {len(images)}개 페이지 변환 완료")
        
        # 첫 페이지를 base64로 변환
        if not images:
            raise ValueError("PDF에서 이미지를 추출할 수 없습니다.")
        
        buffered = BytesIO()
        images[0].save(buffered, format="PNG")
        image_base64 = base64.b64encode(buffered.getvalue()).decode()
        
        # Vision API로 정답 추출
        system_prompt = """당신은 수능 정답표를 분석하는 전문가입니다.

정답표의 형식:
- 문제 번호와 정답이 표 형식으로 제공됨
- 정답은 숫자 (1, 2, 3, 4, 5) 형식
- 홀수형/짝수형으로 나뉠 수 있음

당신의 임무:
- 정답표 이미지를 분석하여 모든 문제의 정답을 추출
- JSON 형식으로 반환: {"문제번호": 정답번호}
- 문제번호와 정답은 모두 정수
- 홀수형의 정답만 추출 (짝수형 무시)"""

        user_prompt = """정답표 이미지를 분석하여 모든 문제의 정답을 추출해주세요.

JSON 형식으로 응답하세요:
{{
  "answers": {{
    "1": 3,
    "2": 5,
    "3": 2,
    ...
  }}
}}

주의사항:
- 모든 문제 번호와 정답을 빠짐없이 포함
- 정답은 1~5 사이의 숫자
- 문제 번호는 순차적 (1, 2, 3, ...)
- 홀수형 정답만 추출
"""

        print("🤖 Vision API로 정답표 분석 중...")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/png;base64,{image_base64}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
    else:
        # 텍스트 기반 파싱 (레거시)
        text = ""
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        
        if not text.strip():
            raise ValueError("PDF에서 텍스트를 추출할 수 없습니다. --vision 옵션을 사용하세요.")
        
        print(f"📄 PDF 텍스트 추출 완료 ({len(text)} 글자)")
        
        system_prompt = """당신은 수능 정답표를 분석하는 전문가입니다.

정답표의 형식:
- 문제 번호와 정답이 표 형식으로 제공됨
- 정답은 숫자 (1, 2, 3, 4, 5) 형식

당신의 임무:
- 정답표에서 문제 번호와 정답을 추출
- JSON 형식으로 반환: {"문제번호": 정답번호}
- 문제번호와 정답은 모두 정수"""

        user_prompt = f"""다음 정답표에서 모든 문제의 정답을 추출해주세요:

{text}

JSON 형식으로 응답하세요:
{{
  "answers": {{
    "1": 3,
    "2": 5,
    ...
  }}
}}"""

        print("🤖 LLM으로 정답 분석 중...")
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
    
    # 응답 처리 (Vision과 Text 공통)
    try:
        result = json.loads(response.choices[0].message.content)
        answers = result.get("answers", {})
        
        # 문자열 키를 정수로 변환
        answer_map = {}
        for k, v in answers.items():
            try:
                q_num = int(k)
                answer = int(v)
                if 1 <= answer <= 5:
                    answer_map[q_num] = answer
                else:
                    print(f"⚠️  문제 {q_num}번 정답이 범위를 벗어남: {answer}")
            except ValueError:
                print(f"⚠️  잘못된 데이터: {k}={v}")
        
        print(f"✅ {len(answer_map)}개 문제 정답 추출 완료")
        return answer_map
        
    except Exception as e:
        print(f"❌ 정답 추출 실패: {e}")
        import traceback
        traceback.print_exc()
        return {}


def update_yaml_with_answers(yaml_path: str, answer_map: Dict[int, int]) -> int:
    """YAML 파일의 correct_answer 필드 업데이트
    
    Args:
        yaml_path: 시험 YAML 파일 경로
        answer_map: {문제번호: 정답번호} 딕셔너리
    
    Returns:
        업데이트된 문제 수
    """
    
    # YAML 로드
    with open(yaml_path, 'r', encoding='utf-8') as f:
        exam_data = yaml.safe_load(f)
    
    # 정답 업데이트
    updated_count = 0
    for question in exam_data.get('questions', []):
        q_num = question.get('question_number')
        if q_num in answer_map:
            question['correct_answer'] = answer_map[q_num]
            updated_count += 1
            print(f"  ✓ 문제 {q_num}번: 정답 {answer_map[q_num]}번")
    
    # YAML 저장
    with open(yaml_path, 'w', encoding='utf-8') as f:
        yaml.dump(
            exam_data,
            f,
            allow_unicode=True,
            default_flow_style=False,
            sort_keys=False,
            width=1000
        )
    
    return updated_count


def main():
    parser = argparse.ArgumentParser(
        description='정답표 PDF 파싱 및 YAML 업데이트',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  %(prog)s exams/pdf/2025/수학영역_정답표.pdf exams/parsed/2025-math-sat-p1-2.yaml
  %(prog)s exams/pdf/2025/국어영역_정답표.pdf exams/parsed/2025-korean-sat.yaml
        """
    )
    
    parser.add_argument(
        'answer_pdf',
        type=str,
        help='정답표 PDF 파일 경로'
    )
    
    parser.add_argument(
        'exam_yaml',
        type=str,
        help='업데이트할 시험 YAML 파일 경로'
    )
    
    parser.add_argument(
        '--api-key',
        type=str,
        help='OpenAI API 키 (기본: 환경변수 OPENAI_API_KEY)'
    )
    
    parser.add_argument(
        '--vision',
        action='store_true',
        default=True,
        help='Vision API 사용 (기본값, 정답표가 이미지인 경우 필수)'
    )
    
    parser.add_argument(
        '--text',
        action='store_true',
        help='텍스트 기반 파싱 사용 (Vision API 대신)'
    )
    
    args = parser.parse_args()
    
    # 파일 검증
    answer_pdf = Path(args.answer_pdf)
    exam_yaml = Path(args.exam_yaml)
    
    if not answer_pdf.exists():
        print(f"❌ 정답표 PDF를 찾을 수 없습니다: {answer_pdf}")
        sys.exit(1)
    
    if not exam_yaml.exists():
        print(f"❌ 시험 YAML 파일을 찾을 수 없습니다: {exam_yaml}")
        sys.exit(1)
    
    print("\n" + "="*100)
    print("🔑 정답표 파싱 및 YAML 업데이트")
    print("="*100)
    print(f"📄 정답표 PDF: {answer_pdf}")
    print(f"📝 시험 YAML: {exam_yaml}")
    print("="*100 + "\n")
    
    try:
        # Step 1: 정답표 파싱
        print("📍 Step 1: 정답표 파싱")
        use_vision = not args.text  # --text 옵션이 없으면 Vision API 사용
        answer_map = extract_answer_key_with_llm(str(answer_pdf), args.api_key, use_vision)
        
        if not answer_map:
            print("❌ 정답을 추출할 수 없습니다.")
            sys.exit(1)
        
        print(f"\n추출된 정답:")
        for q_num in sorted(answer_map.keys())[:10]:
            print(f"  {q_num}번: {answer_map[q_num]}번")
        if len(answer_map) > 10:
            print(f"  ... 외 {len(answer_map) - 10}개")
        
        # Step 2: YAML 업데이트
        print(f"\n📍 Step 2: YAML 파일 업데이트")
        updated_count = update_yaml_with_answers(str(exam_yaml), answer_map)
        
        # 완료
        print("\n" + "="*100)
        print("✅ 업데이트 완료!")
        print("="*100)
        print(f"📊 업데이트된 문제: {updated_count}개")
        print(f"📁 파일: {exam_yaml}")
        print("\n다음 단계:")
        print("  1. YAML 파일 확인")
        print("  2. git commit & push")
        print("="*100 + "\n")
        
    except Exception as e:
        print(f"\n❌ 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

