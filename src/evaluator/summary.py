#!/usr/bin/env python3
"""
평가 결과 요약 도구

results/ 디렉토리의 모든 평가 결과를 읽어서 요약 테이블을 출력합니다.
"""

import yaml
from pathlib import Path
from typing import Dict, List, Any
from collections import defaultdict


def load_results() -> Dict[str, List[Dict]]:
    """모든 평가 결과 로드
    
    Returns:
        {exam_id: [result1, result2, ...]} 딕셔너리
    """
    results_dir = Path("results")
    if not results_dir.exists():
        print("❌ results/ 디렉토리가 없습니다.")
        return {}
    
    results = defaultdict(list)
    
    for exam_dir in results_dir.iterdir():
        if not exam_dir.is_dir():
            continue
        
        exam_id = exam_dir.name
        
        for result_file in exam_dir.glob("*.yaml"):
            with open(result_file, 'r', encoding='utf-8') as f:
                result_data = yaml.safe_load(f)
                results[exam_id].append(result_data)
    
    return dict(results)


def print_summary(results: Dict[str, List[Dict]]):
    """결과 요약 출력"""
    
    print("\n" + "="*100)
    print("📊 KSAT AI Benchmark - 평가 결과 요약")
    print("="*100)
    
    for exam_id, exam_results in results.items():
        if not exam_results:
            continue
        
        # 첫 번째 결과에서 시험 정보 가져오기
        first_result = exam_results[0]
        exam_title = first_result.get('exam_title', exam_id)
        subject = first_result.get('subject', 'unknown')
        
        print(f"\n📚 {exam_title}")
        print(f"   과목: {subject.upper()}")
        print(f"   평가 모델: {len(exam_results)}개")
        print()
        
        # 테이블 헤더
        print(f"{'모델':<30} {'정답률':<15} {'점수':<15} {'평가 시간':<15}")
        print("-" * 80)
        
        # 정확도 순으로 정렬
        sorted_results = sorted(
            exam_results,
            key=lambda x: x['summary']['accuracy'],
            reverse=True
        )
        
        for result in sorted_results:
            model_name = result['model_name']
            summary = result['summary']
            
            accuracy = summary['accuracy']
            correct = summary['correct_answers']
            total = summary['total_questions']
            score = summary['total_score']
            max_score = summary['max_score']
            
            # 평가 시간 계산
            total_time = sum(r['time_taken'] for r in result['results'])
            
            print(f"{model_name:<30} {accuracy:>5.1f}% ({correct}/{total}){'':<3} {score:>3}/{max_score:<3}점{'':<4} {total_time:>6.1f}초")
    
    print("\n" + "="*100)
    
    # 전체 통계
    total_exams = len(results)
    total_evaluations = sum(len(r) for r in results.values())
    
    print(f"📈 전체 통계")
    print(f"   - 평가된 시험: {total_exams}개")
    print(f"   - 총 평가 횟수: {total_evaluations}회")
    print("="*100 + "\n")


def main():
    """메인 함수"""
    results = load_results()
    
    if not results:
        print("⚠️  평가 결과가 없습니다.")
        print("   평가를 먼저 실행하세요: make evaluate EXAM=...")
        return
    
    print_summary(results)


if __name__ == "__main__":
    main()

