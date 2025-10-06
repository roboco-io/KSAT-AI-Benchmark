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
            # GPT-5 전용 프롬프트와 설정
            is_gpt5 = "gpt-5" in self.model_name.lower()
            
            if is_gpt5:
                # GPT-5: response_format 없이 더 강력한 프롬프트 사용
                system_prompt = """당신은 대한민국 수능 문제를 푸는 AI입니다.

아래와 같은 JSON 형식으로만 답변하세요. 다른 텍스트는 절대 포함하지 마세요:

{"answer": 3, "reasoning": "답을 선택한 이유..."}

규칙:
1. answer는 반드시 1~5 사이의 숫자
2. reasoning은 한글로 구체적이고 논리적으로 작성
3. JSON 외에는 어떤 텍스트도 포함하지 않음"""
            else:
                # 기존 모델용 프롬프트
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
            
            # API 호출 파라미터 설정
            api_params = {
                "model": self.model_name,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
            }
            
            # GPT-5는 max_completion_tokens, temperature=1, response_format 없음
            if is_gpt5:
                api_params["max_completion_tokens"] = self.max_tokens
                api_params["temperature"] = 1  # GPT-5는 1만 지원
                # response_format 사용하지 않음
            else:
                api_params["max_tokens"] = self.max_tokens
                api_params["temperature"] = self.temperature
                api_params["response_format"] = {"type": "json_object"}
            
            response = self.client.chat.completions.create(**api_params)
            
            time_taken = time.time() - start_time
            
            # 응답 파싱
            content = response.choices[0].message.content

            # 빈 응답 처리
            if not content or not content.strip():
                return ModelResponse(
                    answer=0,
                    reasoning="빈 응답",
                    time_taken=time.time() - start_time,
                    raw_response=content or "",
                    model_name=self.model_name,
                    success=False,
                    error="모델이 빈 응답을 반환했습니다"
                )

            # GPT-5의 경우 JSON을 추출하는 더 강력한 로직 사용
            if is_gpt5:
                # JSON 코드 블록이나 다른 텍스트가 포함된 경우 JSON만 추출
                import re

                # 1. 완전한 JSON 객체를 찾기 위한 수동 파싱
                start_idx = content.find('{')
                if start_idx >= 0:
                    brace_count = 0
                    in_string = False
                    escape = False
                    end_idx = start_idx

                    for i in range(start_idx, len(content)):
                        char = content[i]

                        if escape:
                            escape = False
                            continue

                        if char == '\\':
                            escape = True
                            continue

                        if char == '"' and not escape:
                            in_string = not in_string
                            continue

                        if not in_string:
                            if char == '{':
                                brace_count += 1
                            elif char == '}':
                                brace_count -= 1
                                if brace_count == 0:
                                    end_idx = i + 1
                                    break

                    if end_idx > start_idx:
                        content = content[start_idx:end_idx]

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
                
                # reasoning은 content를 그대로 사용 (빈 문자열이 아닌)
                return ModelResponse(
                    answer=answer,
                    reasoning=content if content else f"파싱 실패: {e}",
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

