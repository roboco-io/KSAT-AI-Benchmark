#!/usr/bin/env python3
"""
LLM 기반 수능 PDF 파서

OpenAI GPT-5 (또는 GPT-4o)를 사용하여 PDF를 지능적으로 파싱합니다.
- Vision API로 PDF 이미지 분석
- 텍스트 추출 및 구조화
- 지문, 문제, 선택지 자동 분리
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import pdfplumber
from pdf2image import convert_from_path
from openai import OpenAI
import base64
from io import BytesIO


class LLMParser:
    """LLM을 활용한 지능형 PDF 파서"""
    
    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "gpt-4o",  # GPT-5 출시 시 "gpt-5"로 변경
        temperature: float = 0.1,
        max_tokens: int = 4000,
    ):
        """
        Args:
            api_key: OpenAI API 키 (없으면 환경변수에서 가져옴)
            model: 사용할 모델 (gpt-4o, gpt-4-turbo, 또는 향후 gpt-5)
            temperature: 생성 온도 (낮을수록 일관적)
            max_tokens: 최대 토큰 수
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API 키가 필요합니다. OPENAI_API_KEY 환경변수를 설정하세요.")
        
        self.client = OpenAI(api_key=self.api_key)
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        print(f"🤖 LLM Parser 초기화 완료 (모델: {self.model})")
    
    def _convert_pdf_to_images(self, pdf_path: str, page_range: Optional[tuple] = None) -> List:
        """PDF를 이미지로 변환
        
        Args:
            pdf_path: PDF 파일 경로
            page_range: 변환할 페이지 범위 (start, end) tuple, None이면 전체
        
        Returns:
            PIL Image 객체 리스트
        """
        print(f"📄 PDF를 이미지로 변환 중... ({page_range or '전체 페이지'})")
        
        kwargs = {"dpi": 200}  # 고해상도로 변환
        if page_range:
            kwargs["first_page"] = page_range[0]
            kwargs["last_page"] = page_range[1]
        
        images = convert_from_path(pdf_path, **kwargs)
        print(f"✅ {len(images)}개 페이지 변환 완료")
        return images
    
    def _image_to_base64(self, image) -> str:
        """PIL Image를 base64 문자열로 변환"""
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        return base64.b64encode(buffered.getvalue()).decode()
    
    def _extract_text_from_page(self, pdf_path: str, page_num: int) -> str:
        """PDF 페이지에서 텍스트 추출 (참고용)"""
        with pdfplumber.open(pdf_path) as pdf:
            if page_num <= len(pdf.pages):
                return pdf.pages[page_num - 1].extract_text()
        return ""
    
    def parse_page_with_vision(
        self,
        image_base64: str,
        context: str = "",
        page_num: int = 1
    ) -> Dict[str, Any]:
        """Vision API로 페이지 분석
        
        Args:
            image_base64: Base64로 인코딩된 이미지
            context: 이전 페이지의 컨텍스트
            page_num: 페이지 번호
        
        Returns:
            파싱된 구조화된 데이터
        """
        
        system_prompt = """당신은 대한민국 수능 시험지를 분석하는 전문가입니다.

수능 시험지의 구조:
1. 지문 그룹: [N~M] 다음 글을 읽고...
2. 지문 텍스트: 긴 지문이나 시, 소설 등
3. 문제: 숫자. 형식으로 시작 (예: 1. 윗글의 내용과...)
4. 선택지: ①②③④⑤ 원 안 숫자
5. 배점: [N점] 형식

당신의 임무:
- 페이지 이미지를 분석하여 구조화된 JSON 형식으로 변환
- 지문, 문제, 선택지를 정확히 구분
- 2단 레이아웃을 고려하여 올바른 읽기 순서로 정렬
- 문제가 페이지를 넘어가면 이를 표시"""

        user_prompt = f"""페이지 {page_num}를 분석해주세요.

다음 JSON 형식으로 응답하세요:
{{
  "page_number": {page_num},
  "passage_groups": [
    {{
      "range": [1, 3],
      "instruction": "다음 글을 읽고 물음에 답하시오.",
      "passage_text": "지문 전체 텍스트..."
    }}
  ],
  "questions": [
    {{
      "question_number": 1,
      "question_text": "윗글의 내용과 일치하지 않는 것은?",
      "choices": [
        "선택지 1 텍스트",
        "선택지 2 텍스트",
        "선택지 3 텍스트",
        "선택지 4 텍스트",
        "선택지 5 텍스트"
      ],
      "points": 2,
      "is_continued": false
    }}
  ],
  "notes": "페이지 특이사항"
}}

{f'이전 페이지 컨텍스트: {context}' if context else ''}

주의사항:
- 모든 텍스트를 정확히 추출하세요
- 2단 구성이면 좌측 → 우측 순서로
- 문제가 완전하지 않으면 is_continued: true로 표시
- 없는 내용은 빈 배열로 표시
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
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
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            print(f"✅ 페이지 {page_num} 파싱 완료")
            return result
            
        except Exception as e:
            print(f"❌ 페이지 {page_num} 파싱 실패: {e}")
            return {
                "page_number": page_num,
                "passage_groups": [],
                "questions": [],
                "notes": f"파싱 오류: {str(e)}"
            }
    
    def parse_text_with_llm(
        self,
        text: str,
        page_num: int,
        context: str = ""
    ) -> Dict[str, Any]:
        """추출된 텍스트를 LLM으로 구조화 (Vision API 대안)
        
        Args:
            text: PDF에서 추출한 텍스트
            page_num: 페이지 번호
            context: 이전 컨텍스트
        
        Returns:
            구조화된 데이터
        """
        
        system_prompt = """당신은 대한민국 수능 시험지 텍스트를 구조화하는 전문가입니다.

입력: PDF에서 추출한 원시 텍스트 (2단 레이아웃으로 인해 순서가 뒤섞임)
출력: 구조화된 JSON

수능 패턴:
- 지문 그룹: [N~M] 다음 글을 읽고 물음에 답하시오.
- 문제: 숫자. 형식 (예: 1. 윗글의...)
- 선택지: ①②③④⑤
- 배점: [N점]

주의: "홀수형", 페이지 번호 등 메타 정보는 제거하세요."""

        user_prompt = f"""다음 텍스트를 구조화해주세요 (페이지 {page_num}):

{text}

{f'이전 페이지 컨텍스트: {context}' if context else ''}

JSON 형식으로 응답하세요:
{{
  "passage_groups": [...],
  "questions": [...],
  "notes": "..."
}}"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            print(f"✅ 페이지 {page_num} 텍스트 구조화 완료")
            return result
            
        except Exception as e:
            print(f"❌ 페이지 {page_num} 구조화 실패: {e}")
            return {
                "passage_groups": [],
                "questions": [],
                "notes": f"오류: {str(e)}"
            }
    
    def parse_pdf(
        self,
        pdf_path: str,
        use_vision: bool = True,
        page_range: Optional[tuple] = None,
        output_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """PDF 전체 파싱
        
        Args:
            pdf_path: PDF 파일 경로
            use_vision: Vision API 사용 여부 (False면 텍스트만 사용)
            page_range: 파싱할 페이지 범위
            output_path: 결과 저장 경로 (JSON)
        
        Returns:
            전체 파싱 결과
        """
        print(f"\n{'='*100}")
        print(f"🚀 PDF 파싱 시작: {pdf_path}")
        print(f"{'='*100}\n")
        
        all_passage_groups = []
        all_questions = []
        context = ""
        
        if use_vision:
            # Vision API 사용
            images = self._convert_pdf_to_images(pdf_path, page_range)
            
            for i, image in enumerate(images, start=page_range[0] if page_range else 1):
                print(f"\n📄 페이지 {i}/{len(images)} 처리 중...")
                image_base64 = self._image_to_base64(image)
                
                result = self.parse_page_with_vision(image_base64, context, i)
                
                all_passage_groups.extend(result.get("passage_groups", []))
                all_questions.extend(result.get("questions", []))
                
                # 다음 페이지를 위한 컨텍스트 준비
                if result.get("questions"):
                    last_q = result["questions"][-1]
                    if last_q.get("is_continued"):
                        context = f"마지막 문제 {last_q['question_number']}번이 계속됩니다."
        else:
            # 텍스트 기반 파싱
            with pdfplumber.open(pdf_path) as pdf:
                pages = pdf.pages
                if page_range:
                    pages = pages[page_range[0]-1:page_range[1]]
                
                for i, page in enumerate(pages, start=page_range[0] if page_range else 1):
                    print(f"\n📄 페이지 {i} 처리 중...")
                    text = page.extract_text()
                    
                    result = self.parse_text_with_llm(text, i, context)
                    
                    all_passage_groups.extend(result.get("passage_groups", []))
                    all_questions.extend(result.get("questions", []))
        
        # 결과 정리
        final_result = {
            "exam_metadata": {
                "source_file": Path(pdf_path).name,
                "parsing_method": "vision" if use_vision else "text",
                "model": self.model,
                "page_range": page_range or "all"
            },
            "passage_groups": all_passage_groups,
            "questions": all_questions,
            "total_questions": len(all_questions)
        }
        
        # 파일 저장
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(final_result, f, ensure_ascii=False, indent=2)
            print(f"\n💾 결과 저장: {output_path}")
        
        print(f"\n{'='*100}")
        print(f"✅ 파싱 완료!")
        print(f"   - 지문 그룹: {len(all_passage_groups)}개")
        print(f"   - 문제: {len(all_questions)}개")
        print(f"{'='*100}\n")
        
        return final_result


def main():
    """테스트 실행"""
    import sys
    
    parser = LLMParser()
    
    # 국어 첫 3페이지만 테스트
    pdf_path = "/Users/dohyunjung/Workspace/roboco-io/KSAT-AI-Benchmark/exams/pdf/2025/국어영역_문제지_홀수형.pdf"
    output_path = "/Users/dohyunjung/Workspace/roboco-io/KSAT-AI-Benchmark/exams/parsed/2025-korean-test.json"
    
    result = parser.parse_pdf(
        pdf_path=pdf_path,
        use_vision=False,  # 먼저 텍스트 기반으로 테스트 (비용 절감)
        page_range=(1, 3),
        output_path=output_path
    )
    
    print("\n📊 파싱 결과 샘플:")
    print(json.dumps(result, ensure_ascii=False, indent=2)[:1000])
    print("...")


if __name__ == "__main__":
    main()

