#!/usr/bin/env python3
"""
기본 AI 모델 인터페이스

모든 AI 모델이 구현해야 하는 기본 인터페이스를 정의합니다.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from dataclasses import dataclass
import time


@dataclass
class ModelResponse:
    """모델 응답 데이터 클래스"""
    answer: int  # 선택한 답 (1-5)
    reasoning: str  # 답을 선택한 이유
    time_taken: float  # 소요 시간 (초)
    raw_response: str  # 원본 응답
    model_name: str  # 모델 이름
    success: bool = True  # 성공 여부
    error: Optional[str] = None  # 에러 메시지


class BaseModel(ABC):
    """모든 AI 모델의 기본 클래스"""
    
    def __init__(self, api_key: str, model_name: str, **kwargs):
        """
        Args:
            api_key: API 키
            model_name: 모델 이름
            **kwargs: 추가 설정
        """
        self.api_key = api_key
        self.model_name = model_name
        self.config = kwargs
        
        # 기본 설정
        self.temperature = kwargs.get('temperature', 0.1)
        self.max_tokens = kwargs.get('max_tokens', 2000)
        self.timeout = kwargs.get('timeout', 60)
    
    @abstractmethod
    def solve_question(
        self,
        question_text: str,
        choices: list[str],
        passage: Optional[str] = None,
        **kwargs
    ) -> ModelResponse:
        """문제를 풀고 답안을 반환
        
        Args:
            question_text: 문제 텍스트
            choices: 선택지 리스트 (5개)
            passage: 지문 (있는 경우)
            **kwargs: 추가 정보
        
        Returns:
            ModelResponse 객체
        """
        pass
    
    def _analyze_question_type(self, question_text: str) -> str:
        """질문 유형 분석 (긍정형/부정형)

        Args:
            question_text: 질문 텍스트

        Returns:
            질문 유형 설명
        """
        # 부정형 질문 패턴
        negative_patterns = [
            "않는", "아닌", "틀린", "잘못", "부적절",
            "올바르지", "맞지", "적절하지", "일치하지"
        ]

        is_negative = any(pattern in question_text for pattern in negative_patterns)

        if is_negative:
            return "이 문제는 '틀린 것', '일치하지 않는 것', '적절하지 않은 것'을 찾는 **부정형 질문**입니다. 각 선택지를 검토하여 지문과 맞지 않거나 틀린 선택지를 찾아야 합니다."
        else:
            return "이 문제는 '맞는 것', '일치하는 것', '적절한 것'을 찾는 **긍정형 질문**입니다. 각 선택지를 검토하여 지문과 일치하거나 맞는 선택지를 찾아야 합니다."

    def _build_prompt(
        self,
        question_text: str,
        choices: list[str],
        passage: Optional[str] = None
    ) -> str:
        """문제를 프롬프트로 변환

        Args:
            question_text: 문제 텍스트
            choices: 선택지 리스트 (주관식의 경우 비어있음)
            passage: 지문

        Returns:
            프롬프트 문자열
        """
        prompt = ""

        # 지문이 있으면 먼저 추가
        if passage:
            prompt += f"다음 지문을 읽고 문제를 푸세요:\n\n{passage}\n\n"

        # 문제
        prompt += f"문제: {question_text}\n\n"

        # 주관식 vs 객관식 판별
        is_subjective = not choices or len(choices) == 0

        if is_subjective:
            # 주관식 문제
            prompt += "⚠️ 주의: 이 문제는 **주관식 문제**입니다.\n"
            prompt += "- answer 필드에 계산한 숫자 답을 입력하세요 (예: 32, 5.5, -10 등)\n"
            prompt += "- 답이 정수가 아닌 경우 소수점 형태로 입력하세요\n"
            prompt += "- 답이 없거나 특수한 경우 reasoning에만 설명하고 answer는 0으로 입력하세요\n\n"
        else:
            # 객관식 문제
            # 질문 유형 분석 추가
            question_type = self._analyze_question_type(question_text)
            prompt += f"⚠️ 주의: {question_type}\n\n"

            # 선택지
            prompt += "선택지:\n"
            for i, choice in enumerate(choices, 1):
                prompt += f"{i}. {choice}\n"

        return prompt
    
    def _extract_json_from_text(self, text: str, is_subjective: bool = False) -> Optional[str]:
        """텍스트에서 JSON 부분만 추출 (중첩된 중괄호, 마크다운 처리)

        Claude와 같은 모델들이 JSON 앞뒤에 추가 텍스트나 마크다운을 포함하는 경우가 많아서,
        강력한 파싱 로직으로 JSON 부분만 정확히 추출합니다.

        Args:
            text: 응답 텍스트
            is_subjective: 주관식 문제 여부 (True면 answer 검증 완화)

        Returns:
            JSON 문자열 또는 None
        """
        import re
        import json

        # 1단계: 마크다운 코드 블록 제거
        text = re.sub(r'```json\s*', '', text)
        text = re.sub(r'```\s*', '', text)

        # 2단계: 줄 단위 마크다운 헤더 제거 (JSON 내부는 보호)
        text = re.sub(r'(?:^|\n)\s*\*\*[^*\n]+\*\*:?\s*(?:\n|$)', '\n', text, flags=re.MULTILINE)
        text = re.sub(r'(?:^|\n)#{1,6}\s+[^\n]+\n', '\n', text, flags=re.MULTILINE)

        # 3단계: 첫 번째 유효한 JSON 블록 찾기 (중첩된 중괄호 처리)
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
                break

            json_str = text[first_brace:json_end+1]

            # 4단계: 유효성 검사 - answer와 reasoning 필드가 있는지 확인
            if '"answer"' in json_str and '"reasoning"' in json_str:
                try:
                    parsed = json.loads(json_str)
                    answer = parsed.get('answer')

                    if is_subjective:
                        # 주관식: answer가 숫자(정수/실수) 또는 문자열이면 OK
                        if isinstance(answer, (int, float, str)):
                            return json_str
                    else:
                        # 객관식: answer가 1-5 사이의 정수여야 함
                        if isinstance(answer, int) and 1 <= answer <= 5:
                            return json_str
                except (json.JSONDecodeError, ValueError):
                    pass

            # 다음 JSON 블록 찾기
            search_start = json_end + 1

        return None

    def _extract_answer_from_text(self, text: str) -> Optional[int]:
        """텍스트에서 답 번호 추출 (1-5)

        Args:
            text: 응답 텍스트

        Returns:
            답 번호 (1-5) 또는 None
        """
        # 여러 패턴 시도
        import re

        # "답: 3", "정답: 3", "Answer: 3" 등
        patterns = [
            r'(?:답|정답|answer)(?:\s*:?\s*)(\d)',
            r'선택(?:\s*:?\s*)(\d)',
            r'^(\d)(?:\s*번)?$',  # 단순히 숫자만
            r'(\d)\s*번(?:이|을|이다)',
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                answer = int(match.group(1))
                if 1 <= answer <= 5:
                    return answer

        return None
    
    def __str__(self) -> str:
        return f"{self.__class__.__name__}({self.model_name})"
    
    def __repr__(self) -> str:
        return self.__str__()

