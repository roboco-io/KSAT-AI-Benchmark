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

    def _validate_reasoning_answer_consistency(
        self,
        question_text: str,
        reasoning: str,
        answer: int
    ) -> tuple[int, str]:
        """reasoning과 answer의 일치 여부 검증 및 수정

        Args:
            question_text: 질문 텍스트
            reasoning: 추론 내용
            answer: 선택한 답

        Returns:
            (수정된 답, 경고 메시지) 튜플
        """
        # 부정형 질문인지 확인
        negative_patterns = ["않는", "아닌", "틀린", "잘못", "부적절", "올바르지", "맞지", "적절하지", "일치하지"]
        is_negative_question = any(pattern in question_text for pattern in negative_patterns)

        # reasoning에서 각 선택지에 대한 평가 추출
        negative_keywords = ["부적절", "틀리", "어긋남", "불일치", "잘못", "반대", "상충", "모순", "근거 없", "무관"]
        positive_keywords = ["적절", "맞", "일치", "부합", "타당", "합리", "정확"]

        warning = ""

        # reasoning에서 답 번호와 관련된 평가 찾기
        import re

        # "X번은 부적절", "X번이 틀리", "X번의 서술은 잘못" 등의 패턴 찾기
        for i in range(1, 6):
            # 해당 번호에 대한 평가 찾기
            patterns = [
                rf'{i}번[은는이가]?\s*[^.]*?({"|".join(negative_keywords)})',
                rf'{i}[은는이가]?\s*[^.]*?({"|".join(negative_keywords)})',
            ]

            found_negative = False
            for pattern in patterns:
                if re.search(pattern, reasoning):
                    found_negative = True
                    break

            # 부정형 질문인데 reasoning에서 i번을 부적절하다고 했으면, answer가 i여야 함
            if is_negative_question and found_negative and answer != i:
                warning = f"⚠️ 검증: reasoning에서 {i}번을 부적절/틀렸다고 판단했으나, answer는 {answer}번으로 선택됨. {i}번으로 수정 제안."
                # 자동 수정은 하지 않고 경고만 (false positive 가능성)
                # return i, warning

        return answer, warning
    
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
                # GPT-5: CoT 강화 프롬프트 (구조화된 분석)
                system_prompt = """당신은 대한민국 수능 국어 문제를 푸는 AI입니다.

아래와 같은 JSON 형식으로만 답변하세요:

{"answer": 3, "reasoning": "답을 선택한 이유..."}

🎯 **필수 문제 풀이 절차 - 단계별로 반드시 따르세요**:

📌 **STEP 1: 질문 유형 파악**
   - "~하지 않는 것은?" / "~아닌 것은?" / "~적절하지 않은 것은?" → **부정형 질문** (틀린 것 찾기)
   - "~맞는 것은?" / "~일치하는 것은?" / "~적절한 것은?" → **긍정형 질문** (맞는 것 찾기)

📌 **STEP 2: 각 선택지를 순차적으로 검토**
   반드시 1번부터 5번까지 **모든 선택지**를 검토하세요.

   각 선택지마다:
   1) 선택지 내용을 정확히 파악
   2) 지문에서 관련 내용 찾기
   3) 선택지와 지문 내용이 일치하는지 판단
   4) 결과 기록: "1번: O (일치)" 또는 "1번: X (불일치)"

   ⚠️ 중요:
   - "누구나 쉽게"처럼 **지문에 없는 표현**은 불일치입니다
   - "기억한" vs "기억할" 같은 미세한 차이는 일치로 봅니다
   - **지문에 명시되지 않은 내용**을 선택지가 주장하면 불일치입니다

📌 **STEP 3: 답 선택**
   - **부정형 질문**: X(불일치) 선택지 중에서 선택
   - **긍정형 질문**: O(일치) 선택지 중에서 선택

📌 **STEP 4: 최종 검증**
   "질문이 부정형인데 X 선택지를 골랐는가?" 확인
   "질문이 긍정형인데 O 선택지를 골랐는가?" 확인

💡 **reasoning 작성 형식 예시**:
"[질문 유형: 부정형 - 일치하지 않는 것 찾기]

1번: 지문에 '일반적인 독서에서도 유용'이라 명시 → O (일치)
2번: 지문에 '밑줄 외 다른 기호 사용 가능'이라 명시 → O (일치)
3번: 지문에 '누구나 쉽게 사용'이라는 표현 없음 → X (불일치) ✓
4번: 지문에 '다시 찾아보는 데 용이'라 명시 → O (일치)
5번: '기억한' vs '기억할'은 미세한 차이로 본질적으로 같음 → O (일치)

부정형 질문이므로 X(불일치) 선택지인 3번이 정답"

🚨 **절대 금지사항**:
- 지문에 없는 내용을 임의로 추론하지 마세요
- 미세한 언어 차이("~한" vs "~할")에 집착하지 마세요
- 모든 선택지를 검토하지 않고 답을 선택하지 마세요"""
            else:
                # 기존 모델용 개선된 프롬프트
                system_prompt = """당신은 대한민국 수능 문제를 푸는 AI입니다.

문제를 신중하게 분석하고 반드시 JSON 형식으로 답변하세요:

{
  "answer": 3,
  "reasoning": "답을 선택한 상세한 이유를 설명합니다..."
}

중요 지침:
1. **지문 내용에만 근거**하여 답변하세요
   - 지문에 명시된 내용을 우선하세요
   - 외부 지식을 과도하게 의존하지 마세요

2. **핵심 논지와 맥락을 파악**하세요
   - "~라고 오해되어 온 경향", "~라고 보았다" 같은 한정어를 주의하세요
   - 전체 문맥을 고려하여 판단하세요

3. **형식 준수**
   - 반드시 JSON 형식으로만 답변하세요
   - answer는 1~5 사이의 숫자여야 합니다
   - reasoning은 구체적이고 논리적이어야 합니다"""

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
                    answer=-1,
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
                answer = int(result.get('answer', -1))
                reasoning = result.get('reasoning', '')

                # 답 검증
                if not (1 <= answer <= 5):
                    # 텍스트에서 답 추출 시도
                    answer = self._extract_answer_from_text(content) or -1

                if not (1 <= answer <= 5):
                    return ModelResponse(
                        answer=-1,
                        reasoning=reasoning or content,
                        time_taken=time_taken,
                        raw_response=content,
                        model_name=self.model_name,
                        success=False,
                        error="유효하지 않은 답 번호"
                    )

                # GPT-5인 경우 reasoning-answer 일치 검증
                if is_gpt5:
                    validated_answer, warning = self._validate_reasoning_answer_consistency(
                        question_text, reasoning, answer
                    )
                    if warning:
                        # 경고를 reasoning에 추가
                        reasoning = f"{warning}\n\n{reasoning}"

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
                answer = self._extract_answer_from_text(content) or -1

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
                answer=-1,
                reasoning="",
                time_taken=time_taken,
                raw_response="",
                model_name=self.model_name,
                success=False,
                error=str(e)
            )

