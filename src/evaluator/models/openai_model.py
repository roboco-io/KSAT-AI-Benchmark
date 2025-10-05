#!/usr/bin/env python3
"""OpenAI 모델 구현 (GPT-4, GPT-3.5 등)"""

import time
from typing import Optional
from openai import OpenAI
import json

from ..base_model import BaseModel, ModelResponse


class OpenAIModel(BaseModel):
    """OpenAI GPT 모델"""
    
    def __init__(self, api_key: str, model_name: str = "gpt-4o", **kwargs):
        super().__init__(api_key, model_name, **kwargs)
        self.client = OpenAI(api_key=api_key)
    
    def solve_question(
        self,
        question_text: str,
        choices: list[str],
        passage: Optional[str] = None,
        **kwargs
    ) -> ModelResponse:
        """GPT로 문제 풀이"""
        
        start_time = time.time()
        
        try:
            # 프롬프트 구성
            system_prompt = """당신은 대한민국 수능 문제를 푸는 AI입니다.

문제를 신중하게 분석하고 반드시 JSON 형식으로 답변하세요:

{
  "answer": 3,
  "reasoning": "답을 선택한 상세한 이유를 설명합니다..."
}

주의사항:
- 반드시 JSON 형식으로만 답변하세요
- answer는 1~5 사이의 숫자여야 합니다
- reasoning은 구체적이고 논리적이어야 합니다
- 지문이 있다면 반드시 지문 내용을 근거로 답변하세요"""

            user_prompt = self._build_prompt(question_text, choices, passage)
            
            # API 호출
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens,
                response_format={"type": "json_object"}
            )
            
            time_taken = time.time() - start_time
            
            # 응답 파싱
            content = response.choices[0].message.content
            try:
                result = json.loads(content)
                answer = int(result.get('answer', 0))
                reasoning = result.get('reasoning', '')
                
                # 답 검증
                if not (1 <= answer <= 5):
                    # 텍스트에서 답 추출 시도
                    answer = self._extract_answer_from_text(content) or 0
                
                if not (1 <= answer <= 5):
                    return ModelResponse(
                        answer=0,
                        reasoning=reasoning or content,
                        time_taken=time_taken,
                        raw_response=content,
                        model_name=self.model_name,
                        success=False,
                        error="유효하지 않은 답 번호"
                    )
                
                return ModelResponse(
                    answer=answer,
                    reasoning=reasoning,
                    time_taken=time_taken,
                    raw_response=content,
                    model_name=self.model_name,
                    success=True
                )
                
            except (json.JSONDecodeError, ValueError) as e:
                # JSON 파싱 실패시 텍스트에서 추출 시도
                answer = self._extract_answer_from_text(content) or 0
                
                return ModelResponse(
                    answer=answer,
                    reasoning=content,
                    time_taken=time_taken,
                    raw_response=content,
                    model_name=self.model_name,
                    success=(1 <= answer <= 5),
                    error=None if (1 <= answer <= 5) else f"JSON 파싱 실패: {e}"
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

