#!/usr/bin/env python3
"""
평가 엔진

YAML 시험 파일을 로드하고 AI 모델로 문제를 풀어 결과를 저장합니다.
"""

import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

from .base_model import BaseModel, ModelResponse
from .models import (
    OpenAIModel,
    AnthropicModel,
    GoogleModel,
    UpstageModel,
    PerplexityModel
)


class Evaluator:
    """평가 엔진"""
    
    def __init__(self, models_config_path: Optional[str] = None):
        """
        Args:
            models_config_path: models.json 파일 경로
        """
        self.models_config_path = models_config_path or "models/models.json"
        self.models: Dict[str, BaseModel] = {}
        self._load_models_config()
    
    def _load_models_config(self):
        """models.json에서 모델 설정 로드"""
        import json
        
        if not Path(self.models_config_path).exists():
            print(f"⚠️  모델 설정 파일이 없습니다: {self.models_config_path}")
            return
        
        with open(self.models_config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        print(f"📋 모델 설정 로드: {len(config.get('models', []))}개 모델")
    
    def create_model(self, provider: str, model_name: str, api_key: str, **kwargs) -> BaseModel:
        """모델 인스턴스 생성
        
        Args:
            provider: 제공자 (openai, anthropic, google, upstage, perplexity)
            model_name: 모델 이름
            api_key: API 키
            **kwargs: 추가 설정
        
        Returns:
            BaseModel 인스턴스
        """
        provider_map = {
            'openai': OpenAIModel,
            'anthropic': AnthropicModel,
            'google': GoogleModel,
            'upstage': UpstageModel,
            'perplexity': PerplexityModel
        }
        
        model_class = provider_map.get(provider.lower())
        if not model_class:
            raise ValueError(f"지원하지 않는 제공자: {provider}")
        
        return model_class(api_key=api_key, model_name=model_name, **kwargs)
    
    def load_exam(self, exam_path: str) -> Dict[str, Any]:
        """시험 YAML 파일 로드
        
        Args:
            exam_path: YAML 파일 경로
        
        Returns:
            시험 데이터 딕셔너리
        """
        with open(exam_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def _solve_single_question(self, model: BaseModel, question: Dict[str, Any], index: int) -> Dict[str, Any]:
        """단일 문제 풀이 (병렬 처리용)

        Args:
            model: AI 모델 인스턴스
            question: 문제 데이터
            index: 문제 인덱스 (1부터 시작)

        Returns:
            문제 풀이 결과
        """
        q_id = question.get('question_id', f'q{index}')
        q_num = question.get('question_number', index)
        q_text = question.get('question_text', '')
        choices = question.get('choices', [])
        passage = question.get('passage')
        correct_answer = question.get('correct_answer')
        points = question.get('points', 2)

        # 문제 풀이
        response = model.solve_question(
            question_text=q_text,
            choices=choices,
            passage=passage
        )

        # 정답 확인
        is_correct = (response.answer == correct_answer) if correct_answer else None

        # 결과 저장
        result = {
            'question_id': q_id,
            'question_number': q_num,
            'answer': response.answer,
            'correct_answer': correct_answer,
            'is_correct': is_correct,
            'reasoning': response.reasoning,
            'time_taken': round(response.time_taken, 2),
            'points': points,
            'earned_points': points if is_correct else 0,
            'success': response.success,
            'error': response.error
        }

        return result

    def evaluate_exam(
        self,
        exam_path: str,
        model: BaseModel,
        output_path: Optional[str] = None,
        parallel: bool = False,
        max_workers: int = 10
    ) -> Dict[str, Any]:
        """시험 평가 실행

        Args:
            exam_path: 시험 YAML 파일 경로
            model: AI 모델 인스턴스
            output_path: 결과 저장 경로 (없으면 자동 생성)
            parallel: 병렬 처리 여부 (기본: False)
            max_workers: 최대 동시 처리 스레드 수 (기본: 10)

        Returns:
            평가 결과 딕셔너리
        """
        print(f"\n{'='*100}")
        print(f"🎯 평가 시작")
        print(f"{'='*100}")
        print(f"📄 시험: {exam_path}")
        print(f"🤖 모델: {model.model_name}")
        if parallel:
            print(f"⚡ 병렬 처리: {max_workers}개 스레드")
        print(f"{'='*100}\n")

        # 시험 로드
        exam_data = self.load_exam(exam_path)
        exam_id = exam_data.get('exam_id', 'unknown')
        questions = exam_data.get('questions', [])

        print(f"📊 문제 수: {len(questions)}개\n")

        start_time = time.time()

        if parallel:
            # 병렬 처리
            results = []
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # 모든 문제를 동시에 제출
                future_to_question = {
                    executor.submit(self._solve_single_question, model, q, i): (i, q)
                    for i, q in enumerate(questions, 1)
                }

                # 완료되는 대로 결과 수집
                for future in as_completed(future_to_question):
                    i, question = future_to_question[future]
                    try:
                        result = future.result()
                        results.append(result)

                        # 진행 상황 출력
                        q_num = result['question_number']
                        points = result['points']
                        is_correct = result['is_correct']
                        answer = result['answer']
                        correct_answer = result['correct_answer']
                        time_taken = result['time_taken']
                        success = result['success']

                        status = "✅" if is_correct else "❌"
                        if not success:
                            status = "⚠️"

                        print(f"📝 문제 {q_num}번 ({points}점): {status} 답: {answer}번 (정답: {correct_answer}번) - {time_taken:.2f}초")

                        if not success:
                            print(f"   ⚠️  에러: {result['error']}")

                    except Exception as e:
                        print(f"❌ 문제 {i}번 처리 중 오류: {e}")

            # 문제 번호 순으로 정렬
            results.sort(key=lambda x: x['question_number'])

        else:
            # 순차 처리 (기존 방식)
            results = []
            for i, question in enumerate(questions, 1):
                q_num = question.get('question_number', i)
                points = question.get('points', 2)

                print(f"📝 문제 {q_num}번 ({points}점)...", end=' ')

                result = self._solve_single_question(model, question, i)
                results.append(result)

                # 진행 상황 출력
                status = "✅" if result['is_correct'] else "❌"
                if not result['success']:
                    status = "⚠️"
                print(f"{status} 답: {result['answer']}번 (정답: {result['correct_answer']}번) - {result['time_taken']:.2f}초")

                if not result['success']:
                    print(f"   ⚠️  에러: {result['error']}")

        total_time = time.time() - start_time

        # 통계 계산
        max_score = sum(r['points'] for r in results)
        correct_count = sum(1 for r in results if r['is_correct'])
        total_score = sum(r['earned_points'] for r in results)
        
        # 최종 결과
        accuracy = (correct_count / len(questions) * 100) if questions else 0
        score_rate = (total_score / max_score * 100) if max_score > 0 else 0
        
        print(f"\n{'='*100}")
        print(f"📊 평가 완료")
        print(f"{'='*100}")
        print(f"정답률: {correct_count}/{len(questions)} ({accuracy:.1f}%)")
        print(f"점수: {total_score}/{max_score}점 ({score_rate:.1f}%)")
        print(f"⏱️  총 소요 시간: {total_time:.1f}초")
        if parallel:
            avg_time_per_question = sum(r['time_taken'] for r in results) / len(results) if results else 0
            speedup = (avg_time_per_question * len(results)) / total_time if total_time > 0 else 1
            print(f"⚡ 속도 향상: {speedup:.1f}배 (병렬 처리)")
        print(f"{'='*100}\n")
        
        # 결과 데이터 구성
        result_data = {
            'exam_id': exam_id,
            'exam_title': exam_data.get('title', ''),
            'subject': exam_data.get('subject', ''),
            'model_name': model.model_name,
            'evaluated_at': datetime.now().isoformat(),
            'summary': {
                'total_questions': len(questions),
                'correct_answers': correct_count,
                'accuracy': round(accuracy, 2),
                'total_score': total_score,
                'max_score': max_score,
                'score_rate': round(score_rate, 2)
            },
            'results': results
        }
        
        # 결과 저장
        if output_path is None:
            # 자동 경로 생성: results/{exam_id}/{model_name}.yaml
            results_dir = Path("results") / exam_id
            results_dir.mkdir(parents=True, exist_ok=True)
            output_path = results_dir / f"{model.model_name.replace('/', '-')}.yaml"
        else:
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            yaml.dump(result_data, f, allow_unicode=True, default_flow_style=False, sort_keys=False)
        
        print(f"💾 결과 저장: {output_path}\n")
        
        return result_data
    
    def evaluate_with_all_models(
        self,
        exam_path: str,
        models_to_use: Optional[List[str]] = None
    ) -> Dict[str, Dict[str, Any]]:
        """모든 모델로 시험 평가
        
        Args:
            exam_path: 시험 YAML 파일 경로
            models_to_use: 사용할 모델 리스트 (None이면 전체)
        
        Returns:
            {model_name: result_data} 딕셔너리
        """
        import json
        
        # 모델 설정 로드
        with open(self.models_config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        models = config.get('models', [])
        if models_to_use:
            models = [m for m in models if m['name'] in models_to_use]
        
        print(f"\n🚀 전체 모델 평가 시작 ({len(models)}개 모델)")
        print(f"📄 시험: {exam_path}\n")
        
        results = {}
        
        for model_config in models:
            provider = model_config['provider']
            model_name = model_config['name']
            model_id = model_config.get('model_id', model_name)  # model_id가 없으면 name 사용
            
            # API 키 가져오기
            api_key_var = f"{provider.upper()}_API_KEY"
            api_key = os.getenv(api_key_var)
            
            if not api_key:
                print(f"⚠️  {model_name} 스킵: {api_key_var} 환경변수 없음")
                continue
            
            try:
                # 모델 생성 (model_id를 전달)
                model = self.create_model(
                    provider=provider,
                    model_name=model_id,  # API용 실제 model_id 전달
                    api_key=api_key
                )
                # 표시용 이름은 model_name 사용
                model.display_name = model_name
                
                # 평가 실행
                result = self.evaluate_exam(exam_path, model)
                results[model_name] = result
                
            except Exception as e:
                print(f"❌ {model_name} 평가 실패: {e}")
                continue
        
        print(f"\n🎉 전체 평가 완료! ({len(results)}/{len(models)}개 성공)\n")
        
        return results

