#!/usr/bin/env python3
"""비어있는 question_text를 PDF에서 Vision API로 추출"""

import os
import sys
from pathlib import Path
import base64
from pdf2image import convert_from_path
import openai
import json

# 프로젝트 루트 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv()

def extract_question_text(pdf_path: str, question_numbers: list[int]) -> dict:
    """PDF에서 특정 문제 번호들의 question_text만 추출"""

    print(f"📄 PDF: {pdf_path}")
    print(f"🔍 추출할 문제: {question_numbers}")
    print()

    # PDF를 이미지로 변환
    print("🖼️  PDF를 이미지로 변환 중...")
    images = convert_from_path(pdf_path, dpi=300)
    print(f"✅ {len(images)}개 페이지 변환 완료")
    print()

    # OpenAI API 키 확인
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        raise ValueError("OPENAI_API_KEY가 설정되지 않았습니다.")

    client = openai.OpenAI(api_key=api_key)

    # 각 페이지를 base64로 인코딩
    image_data_list = []
    for i, image in enumerate(images):
        import io
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        image_data_list.append(img_str)
        print(f"  페이지 {i+1} 인코딩 완료")

    print()
    print("🤖 Vision API로 문제 텍스트 추출 중...")

    # 프롬프트 구성
    prompt = f"""다음 수능 국어 문제지에서 문제 번호 {question_numbers}번들의 question_text만 정확히 추출해주세요.

각 문제는 다음과 같은 구조입니다:
- 문제 번호
- **question_text** (예: "윗글을 읽고...", "다음 중...", "<보기>를 참고하여...")
- 선택지 ①~⑤

중요:
1. question_text만 추출 (선택지는 제외)
2. 지문은 제외 (passage는 이미 있음)
3. "다음 글을 읽고 물음에 답하시오" 같은 공통 안내문은 제외
4. 각 문제의 실제 질문 부분만 추출

다음 JSON 형식으로 응답해주세요:
{{
  "10": "윗글을 바탕으로 <보기>를 이해한 내용으로 적절하지 않은 것은?",
  "11": "윗글에 대한 설명으로 적절하지 않은 것은?",
  ...
}}
"""

    # Vision API 호출
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt}
            ] + [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/png;base64,{img_data}",
                        "detail": "high"
                    }
                } for img_data in image_data_list
            ]
        }
    ]

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        max_tokens=4096,
        temperature=0.1
    )

    result_text = response.choices[0].message.content
    print("✅ Vision API 응답 완료")
    print()

    # JSON 추출
    try:
        # JSON 블록 찾기
        import re
        json_match = re.search(r'\{[\s\S]*\}', result_text)
        if json_match:
            result_json = json.loads(json_match.group())
        else:
            result_json = json.loads(result_text)

        # 문자열 키를 정수로 변환
        result = {int(k): v for k, v in result_json.items()}

        print("📝 추출된 문제 텍스트:")
        for qnum, qtext in sorted(result.items()):
            print(f"  {qnum}번: {qtext[:50]}...")

        return result

    except Exception as e:
        print(f"⚠️  JSON 파싱 실패: {e}")
        print(f"원본 응답:\n{result_text}")
        return {}


if __name__ == "__main__":
    pdf_path = project_root / "exams/pdf/2025/국어영역_문제지_홀수형.pdf"

    # 비어있는 문제 번호들
    missing_questions = [10, 11, 12, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 40, 41, 42, 43, 45]

    result = extract_question_text(str(pdf_path), missing_questions)

    # 결과를 JSON 파일로 저장
    output_file = project_root / "scripts/missing_questions.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print()
    print(f"✅ 결과 저장: {output_file}")
    print(f"   총 {len(result)}개 문제 추출됨")
