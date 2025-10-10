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

        특히 수학 문제에서 "**수정 후:**", "**최종 답변:**" 같은
        마크다운 헤더와 함께 여러 JSON 블록을 출력하는 경우 첫 번째 유효한 JSON만 추출합니다.

        Args:
            text: 응답 텍스트

        Returns:
            JSON 문자열 또는 None
        """
        # 마크다운 제거 (안전한 방식)
        # 1. 코드 블록 제거
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)

        # 2. 줄 단위 마크다운 헤더만 제거 (JSON 내부 보호)
        # "**수정 후:**", "**최종 답변:**" 같은 패턴 (줄 시작 또는 개행 뒤에만)
        text = re.sub(r'(?:^|\n)\s*\*\*[^*\n]+\*\*:?\s*(?:\n|$)', '\n', text, flags=re.MULTILINE)
        text = re.sub(r'(?:^|\n)#{1,6}\s+[^\n]+\n', '\n', text, flags=re.MULTILINE)

        # 첫 번째 유효한 JSON 블록 찾기 (여러 JSON 블록이 있을 수 있음)
        search_start = 0
        while True:
            first_brace = text.find('{', search_start)
            if first_brace == -1:
                break

            # 중첩된 {} 고려하여 매칭되는 } 찾기
            brace_count = 0
            json_end = -1
            for i in range(first_brace, len(text)):
                if text[i] == '{':
                    brace_count += 1
                elif text[i] == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        json_end = i
                        break

            if json_end == -1:
                # 매칭되는 }를 찾지 못함
                break

            json_str = text[first_brace:json_end+1]

            # 유효성 검사
            if '"answer"' in json_str and '"reasoning"' in json_str:
                # JSON 파싱 테스트
                try:
                    parsed = json.loads(json_str)
                    # answer가 1-5 범위인지 확인
                    answer = parsed.get('answer')
                    if isinstance(answer, int) and 1 <= answer <= 5:
                        # 유효한 JSON 발견! 즉시 반환
                        return json_str
                except (json.JSONDecodeError, ValueError, KeyError) as e:
                    # LaTeX 수식의 백슬래시 escape 문제일 수 있음
                    # \( → \\(, \) → \\), \frac → \\frac 등
                    # 간단한 휴리스틱: JSON 문자열 내부의 unescaped 백슬래시 처리
                    try:
                        # reasoning 필드 내부의 백슬래시만 escape
                        # 단, 이미 escape된 것(\\", \\n 등)은 유지
                        fixed_json = self._fix_latex_backslashes(json_str)
                        parsed = json.loads(fixed_json)
                        answer = parsed.get('answer')
                        if isinstance(answer, int) and 1 <= answer <= 5:
                            return fixed_json
                    except (json.JSONDecodeError, ValueError, KeyError):
                        # 백슬래시 fix로도 안 되면 다음 JSON 블록 시도
                        pass

            # 다음 JSON 블록 찾기
            search_start = json_end + 1

        return None

    def _fix_latex_backslashes(self, json_str: str) -> str:
        """LaTeX 수식의 백슬래시를 escape하여 valid JSON으로 변환

        Solar-Pro가 수학 문제에서 LaTeX 수식을 출력할 때
        백슬래시를 escape하지 않아 invalid JSON이 생성되는 문제 해결.

        예: \( \sqrt{5} \) → \\( \\sqrt{5} \\)

        Args:
            json_str: JSON 문자열 (백슬래시가 escape되지 않을 수 있음)

        Returns:
            백슬래시가 escape된 JSON 문자열
        """
        # LaTeX 수식에 자주 사용되는 패턴들을 escape
        # \( → \\(
        # \) → \\)
        # \[ → \\[
        # \] → \\]
        # \frac → \\frac
        # \sqrt → \\sqrt
        # \times → \\times
        # \cdot → \\cdot
        # 등등

        # 이미 escape된 백슬래시는 유지하면서, LaTeX 패턴만 escape
        # 정규식: 백슬래시 뒤에 LaTeX 명령어나 괄호가 오는 경우
        patterns = [
            (r'\\(?=[(\)\[\]])', r'\\\\'),  # \(, \), \[, \]
            (r'\\(?=frac|sqrt|times|cdot|alpha|beta|gamma|delta|theta|pi|sigma|sum|int|lim|infty)', r'\\\\'),  # LaTeX 명령어
            (r'\\(?=to|neq|leq|geq|pm|mp|approx)', r'\\\\'),  # 수학 기호
        ]

        result = json_str
        for pattern, replacement in patterns:
            result = re.sub(pattern, replacement, result)

        return result

