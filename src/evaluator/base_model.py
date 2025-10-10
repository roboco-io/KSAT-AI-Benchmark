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
            choices: 선택지 리스트
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

        # 질문 유형 분석 추가
        question_type = self._analyze_question_type(question_text)
        prompt += f"⚠️ 주의: {question_type}\n\n"

        # 선택지
        prompt += "선택지:\n"
        for i, choice in enumerate(choices, 1):
            prompt += f"{i}. {choice}\n"

        return prompt
    
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

