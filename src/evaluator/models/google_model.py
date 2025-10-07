#!/usr/bin/env python3
"""Google Gemini 모델 구현"""

import time
from typing import Optional
import google.generativeai as genai
import json
import re

from ..base_model import BaseModel, ModelResponse


class GoogleModel(BaseModel):
    """Google Gemini 모델"""
    
    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash-exp", **kwargs):
        super().__init__(api_key, model_name, **kwargs)
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
    
    def solve_question(
        self,
        question_text: str,
        choices: list[str],
        passage: Optional[str] = None,
        **kwargs
    ) -> ModelResponse:
        """Gemini로 문제 풀이"""
        
        start_time = time.time()
        
        try:
            # 프롬프트 구성
            system_instruction = """당신은 대한민국 수능 문제를 푸는 AI입니다.

문제를 신중하게 분석하고 다음 형식으로 답변하세요:

{
  "answer": 3,
  "reasoning": "답을 선택한 상세한 이유를 설명합니다..."
}

주의사항:
- answer는 1~5 사이의 숫자여야 합니다
- reasoning은 구체적이고 논리적이어야 합니다
- 지문이 있다면 반드시 지문 내용을 근거로 답변하세요"""

            user_prompt = self._build_prompt(question_text, choices, passage)
            full_prompt = f"{system_instruction}\n\n{user_prompt}"
            
            # 안전 필터 설정 (수능 문제 평가를 위해 모든 카테고리 비활성화)
            safety_settings = {
                'HARM_CATEGORY_HARASSMENT': 'BLOCK_NONE',
                'HARM_CATEGORY_HATE_SPEECH': 'BLOCK_NONE',
                'HARM_CATEGORY_SEXUALLY_EXPLICIT': 'BLOCK_NONE',
                'HARM_CATEGORY_DANGEROUS_CONTENT': 'BLOCK_NONE',
            }

            # API 호출
            response = self.model.generate_content(
                full_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=self.temperature,
                    max_output_tokens=self.max_tokens,
                ),
                safety_settings=safety_settings
            )
            
            time_taken = time.time() - start_time
            
            # 응답 파싱
            content = response.text
            
            # JSON 추출 시도
            json_match = re.search(r'\{[^}]+\}', content, re.DOTALL)
            if json_match:
                try:
                    result = json.loads(json_match.group())
                    answer = int(result.get('answer', 0))
                    reasoning = result.get('reasoning', '')
                    
                    if not (1 <= answer <= 5):
                        answer = self._extract_answer_from_text(content) or 0
                    
                    return ModelResponse(
                        answer=answer,
                        reasoning=reasoning or content,
                        time_taken=time_taken,
                        raw_response=content,
                        model_name=self.model_name,
                        success=(1 <= answer <= 5),
                        error=None if (1 <= answer <= 5) else "유효하지 않은 답"
                    )
                except (json.JSONDecodeError, ValueError):
                    pass
            
            # JSON 파싱 실패시 텍스트에서 추출
            answer = self._extract_answer_from_text(content) or 0
            
            return ModelResponse(
                answer=answer,
                reasoning=content,
                time_taken=time_taken,
                raw_response=content,
                model_name=self.model_name,
                success=(1 <= answer <= 5),
                error=None if (1 <= answer <= 5) else "답 추출 실패"
            )
        
        except Exception as e:
            time_taken = time.time() - start_time
            return ModelResponse(
                answer=0,
                reasoning="",
                time_taken=time_taken,
                raw_response="",
                model_name=self.model_name,
                success=False,
                error=str(e)
            )

