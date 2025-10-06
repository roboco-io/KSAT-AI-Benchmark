#!/usr/bin/env python3
"""
평가 결과 요약 및 분석 도구

results/ 디렉토리의 모든 평가 결과를 읽어서 요약 테이블을 출력합니다.
"""

import yaml
from pathlib import Path
from typing import Dict, List, Any, Optional
from collections import defaultdict
import argparse
import sys


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


def print_leaderboard(results: Dict[str, List[Dict]]):
    """전체 리더보드 출력 (모델별 평균 성적)"""

    print("\n" + "="*100)
    print("🏆 전체 리더보드 (모델별 평균 성적)")
    print("="*100)

    # 모델별 통계 수집
    model_stats = defaultdict(lambda: {
        'total_accuracy': 0,
        'total_score_rate': 0,
        'total_time': 0,
        'count': 0,
        'exams': []
    })

    for exam_id, exam_results in results.items():
        for result in exam_results:
            model_name = result['model_name']
            summary = result['summary']

            model_stats[model_name]['total_accuracy'] += summary['accuracy']
            model_stats[model_name]['total_score_rate'] += summary.get('score_rate', 0)
            model_stats[model_name]['total_time'] += sum(r['time_taken'] for r in result['results'])
            model_stats[model_name]['count'] += 1
            model_stats[model_name]['exams'].append(exam_id)

    # 평균 계산 및 정렬
    leaderboard = []
    for model_name, stats in model_stats.items():
        count = stats['count']
        leaderboard.append({
            'model': model_name,
            'avg_accuracy': stats['total_accuracy'] / count,
            'avg_score_rate': stats['total_score_rate'] / count,
            'avg_time': stats['total_time'] / count,
            'eval_count': count,
            'exams': stats['exams']
        })

    # 정확도 순으로 정렬
    leaderboard.sort(key=lambda x: x['avg_accuracy'], reverse=True)

    # 테이블 출력
    print(f"\n{'순위':<6} {'모델':<30} {'평균 정답률':<15} {'평균 점수율':<15} {'평균 시간':<15} {'평가 횟수':<10}")
    print("-" * 100)

    for rank, entry in enumerate(leaderboard, 1):
        medal = "🥇" if rank == 1 else "🥈" if rank == 2 else "🥉" if rank == 3 else f"{rank:2d}."
        print(f"{medal:<6} {entry['model']:<30} {entry['avg_accuracy']:>6.2f}%{'':<8} "
              f"{entry['avg_score_rate']:>6.2f}%{'':<8} {entry['avg_time']:>7.1f}초{'':<6} "
              f"{entry['eval_count']:>3}회")

    print("="*100)


def print_subject_analysis(results: Dict[str, List[Dict]]):
    """과목별 분석"""

    print("\n" + "="*100)
    print("📊 과목별 모델 성능 분석")
    print("="*100)

    # 과목별로 결과 분류
    subject_results = defaultdict(lambda: defaultdict(list))

    for exam_id, exam_results in results.items():
        for result in exam_results:
            subject = result.get('subject', 'unknown')
            model_name = result['model_name']
            subject_results[subject][model_name].append(result)

    # 과목별 출력
    for subject, models in sorted(subject_results.items()):
        subject_name = {
            'korean': '국어',
            'math': '수학',
            'english': '영어',
            'science': '과학',
            'social': '사회'
        }.get(subject, subject.upper())

        print(f"\n📚 {subject_name}")
        print(f"{'모델':<30} {'평균 정답률':<15} {'평균 점수율':<15}")
        print("-" * 65)

        # 모델별 평균 계산
        model_avgs = []
        for model_name, model_results in models.items():
            avg_accuracy = sum(r['summary']['accuracy'] for r in model_results) / len(model_results)
            avg_score_rate = sum(r['summary'].get('score_rate', 0) for r in model_results) / len(model_results)
            model_avgs.append({
                'model': model_name,
                'accuracy': avg_accuracy,
                'score_rate': avg_score_rate
            })

        # 정확도 순 정렬
        model_avgs.sort(key=lambda x: x['accuracy'], reverse=True)

        for entry in model_avgs:
            print(f"{entry['model']:<30} {entry['accuracy']:>6.2f}%{'':<8} {entry['score_rate']:>6.2f}%")

    print("\n" + "="*100)


def print_detailed_stats(results: Dict[str, List[Dict]]):
    """상세 통계"""

    print("\n" + "="*100)
    print("📈 상세 통계")
    print("="*100)

    total_exams = len(results)
    total_evaluations = sum(len(r) for r in results.values())

    # 모델별 카운트
    model_counts = defaultdict(int)
    for exam_results in results.values():
        for result in exam_results:
            model_counts[result['model_name']] += 1

    print(f"\n총 평가된 시험: {total_exams}개")
    print(f"총 평가 횟수: {total_evaluations}회")
    print(f"평가된 모델 수: {len(model_counts)}개")

    print(f"\n모델별 평가 횟수:")
    for model, count in sorted(model_counts.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {model}: {count}회")

    print("="*100)


def filter_results(results: Dict[str, List[Dict]], model: Optional[str] = None,
                   subject: Optional[str] = None, year: Optional[str] = None) -> Dict[str, List[Dict]]:
    """결과 필터링"""

    filtered = defaultdict(list)

    for exam_id, exam_results in results.items():
        for result in exam_results:
            # 모델 필터
            if model and result['model_name'] != model:
                continue

            # 과목 필터
            if subject and result.get('subject') != subject:
                continue

            # 연도 필터
            if year and not exam_id.startswith(year):
                continue

            filtered[exam_id].append(result)

    return dict(filtered)


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description='KSAT AI Benchmark 평가 결과 요약 및 분석',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  %(prog)s                          - 전체 요약
  %(prog)s --detailed               - 상세 분석 포함
  %(prog)s --leaderboard            - 리더보드만 표시
  %(prog)s --subject korean         - 국어 과목만 분석
  %(prog)s --model gpt-5            - 특정 모델만 분석
  %(prog)s --year 2025              - 특정 연도만 분석
        """
    )

    parser.add_argument(
        '--detailed', '-d',
        action='store_true',
        help='상세 분석 포함 (과목별, 통계 등)'
    )

    parser.add_argument(
        '--leaderboard', '-l',
        action='store_true',
        help='리더보드만 표시'
    )

    parser.add_argument(
        '--model', '-m',
        type=str,
        help='특정 모델만 분석'
    )

    parser.add_argument(
        '--subject', '-s',
        type=str,
        choices=['korean', 'math', 'english', 'science', 'social'],
        help='특정 과목만 분석'
    )

    parser.add_argument(
        '--year', '-y',
        type=str,
        help='특정 연도만 분석 (예: 2025)'
    )

    args = parser.parse_args()

    # 결과 로드
    results = load_results()

    if not results:
        print("⚠️  평가 결과가 없습니다.")
        print("   평가를 먼저 실행하세요: make gpt-5 2025 korean")
        return

    # 필터 적용
    if args.model or args.subject or args.year:
        results = filter_results(results, args.model, args.subject, args.year)
        if not results:
            print("⚠️  필터 조건에 맞는 결과가 없습니다.")
            return

    # 출력
    if args.leaderboard:
        print_leaderboard(results)
    elif args.detailed:
        print_summary(results)
        print_leaderboard(results)
        print_subject_analysis(results)
        print_detailed_stats(results)
    else:
        print_summary(results)
        print_leaderboard(results)


if __name__ == "__main__":
    main()

