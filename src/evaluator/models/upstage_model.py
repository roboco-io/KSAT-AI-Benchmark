#!/usr/bin/env python3
"""Upstage Solar 모델 구현"""

import time
from typing import Optional
from openai import OpenAI
import json
import re

from ..base_model import BaseModel, ModelResponse


class UpstageModel(BaseModel):
    """Upstage Solar 모델 (OpenAI 호환 API)"""
    
    def __init__(self, api_key: str, model_name: str = "solar-pro", **kwargs):
        super().__init__(api_key, model_name, **kwargs)
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.upstage.ai/v1/solar"
        )
    
    def solve_question(
        self,
        question_text: str,
        choices: list[str],
        passage: Optional[str] = None,
        **kwargs
    ) -> ModelResponse:
        """Solar로 문제 풀이"""
        
        start_time = time.time()
        
        try:
            # 개선된 프롬프트 (JSON 엄격 모드)
            system_prompt = """당신은 대한민국 수능 문제를 푸는 AI입니다.

⚠️ 중요: 반드시 아래 JSON 형식으로만 답변하세요. JSON 앞뒤에 다른 텍스트를 절대 추가하지 마세요.

{
  "answer": 3,
  "reasoning": "답을 선택한 상세한 이유를 설명합니다..."
}

출력 규칙 (매우 중요):
- JSON만 출력하세요
- 마크다운 코드 블록(```)을 사용하지 마세요
- "다음과 같습니다", "해설:" 같은 추가 설명을 넣지 마세요
- 첫 글자부터 마지막 글자까지 오직 JSON만 출력하세요

답변 지침:
1. **지문에 명시된 내용에만 근거**하여 답변하세요
   - 지문의 내용을 우선하세요
   - 외부 지식을 과도하게 의존하지 마세요

2. **핵심 논지와 전체 맥락을 파악**하세요
   - "~라고 오해되어 온 경향", "~라고 보았다" 같은 한정어를 주의하세요
   - 부분적 표현보다 전체 문맥을 우선하세요

3. **형식 준수**
   - answer는 1~5 사이의 숫자여야 합니다
   - reasoning은 구체적이고 논리적이어야 합니다"""

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
            )
            
            time_taken = time.time() - start_time
            
            # 응답 파싱
            content = response.choices[0].message.content

            # 1차 시도: 그대로 파싱
            try:
                result = json.loads(content)
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

            # 2차 시도: JSON 부분만 추출 (Solar-Pro 특화)
            extracted_json = self._extract_json_from_text(content)
            if extracted_json:
                try:
                    result = json.loads(extracted_json)
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

            # 3차 시도: 텍스트에서 답 추출
            answer = self._extract_answer_from_text(content) or 0

            return ModelResponse(
                answer=answer,
                reasoning=content,
                time_taken=time_taken,
                raw_response=content,
                model_name=self.model_name,
                success=(1 <= answer <= 5),
                error=None if (1 <= answer <= 5) else "JSON 파싱 실패"
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

    def _extract_json_from_text(self, text: str) -> Optional[str]:
        """텍스트에서 JSON 부분만 추출 (Solar-Pro 특화)

        Solar-Pro가 JSON 앞뒤에 추가 텍스트를 포함하는 경우가 많아서,
        정규식으로 JSON 부분만 추출합니다.

        Args:
            text: 응답 텍스트

        Returns:
            JSON 문자열 또는 None
        """
        # 마크다운 코드 블록 제거
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)

        # 패턴 1: { "answer": ... } 형식 찾기 (가장 일반적)
        # 중첩된 {} 처리를 위해 재귀적 패턴 사용하지 않고 간단한 방법 사용
        match = re.search(r'\{\s*"answer"\s*:\s*\d+\s*,\s*"reasoning"\s*:\s*"[^"]*(?:"[^"]*)*"\s*\}', text, re.DOTALL)
        if match:
            return match.group(0)

        # 패턴 2: 첫 번째 { 부터 마지막 } 까지 추출
        # (reasoning에 긴 텍스트가 있을 수 있으므로)
        first_brace = text.find('{')
        if first_brace != -1:
            # 중첩된 {} 고려하여 매칭되는 } 찾기
            brace_count = 0
            for i in range(first_brace, len(text)):
                if text[i] == '{':
                    brace_count += 1
                elif text[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        json_str = text[first_brace:i+1]
                        # 간단한 유효성 검사
                        if '"answer"' in json_str and '"reasoning"' in json_str:
                            return json_str
                        break

        return None

