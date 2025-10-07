#!/usr/bin/env python3
"""
평가 결과를 웹용 JSON으로 export

웹 프론트엔드가 static하게 로드할 수 있도록 데이터를 JSON으로 변환합니다.
"""

import json
import sys
import yaml
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.evaluator.summary import load_results


def load_enabled_models():
    """models.json에서 활성화된 모델 목록 로드"""
    models_file = project_root / 'models' / 'models.json'
    enabled_models = set()

    try:
        with open(models_file, 'r', encoding='utf-8') as f:
            models_data = json.load(f)
            for model in models_data.get('models', []):
                if model.get('enabled', False):
                    enabled_models.add(model['name'])
    except Exception as e:
        print(f"⚠️  models.json 로드 실패: {e}")

    return enabled_models


def load_exam_data():
    """시험 문제 데이터 로드"""
    exams_dir = project_root / 'exams' / 'parsed'
    exams = {}
    
    if not exams_dir.exists():
        return exams
    
    for yaml_file in exams_dir.glob('*.yaml'):
        try:
            with open(yaml_file, 'r', encoding='utf-8') as f:
                exam_data = yaml.safe_load(f)
                if exam_data and 'exam_id' in exam_data:
                    exams[exam_data['exam_id']] = exam_data
        except Exception as e:
            print(f"⚠️  {yaml_file.name} 로드 실패: {e}")
    
    return exams


def export_to_json():
    """평가 결과를 JSON으로 export"""

    print("📤 평가 결과를 JSON으로 export 중...")

    # 활성화된 모델 목록 로드
    enabled_models = load_enabled_models()
    print(f"   - 활성화된 모델: {len(enabled_models)}개")
    if enabled_models:
        print(f"     {', '.join(sorted(enabled_models))}")

    # 결과 로드
    results = load_results()

    # 시험 문제 데이터 로드
    exams = load_exam_data()

    if not results:
        print("⚠️  평가 결과가 없습니다.")
        return

    # 리더보드 생성
    leaderboard = []
    all_results_list = []

    for exam_id, exam_results in results.items():
        for result in exam_results:
            all_results_list.append(result)

    # 모델별로 그룹화 (활성화된 모델만)
    model_map = {}
    for result in all_results_list:
        model_name = result['model_name']
        # enabled 모델만 포함
        if enabled_models and model_name not in enabled_models:
            continue
        if model_name not in model_map:
            model_map[model_name] = []
        model_map[model_name].append(result)
    
    # 과목별로 결과 분류
    def create_leaderboard(model_map_filtered):
        """주어진 모델 맵으로 리더보드 생성"""
        board = []
        for model_name, model_results in model_map_filtered.items():
            if not model_results:
                continue

            total_questions = sum(r['summary']['total_questions'] for r in model_results)
            correct_answers = sum(r['summary']['correct_answers'] for r in model_results)
            total_score = sum(r['summary']['total_score'] for r in model_results)
            max_score = sum(r['summary']['max_score'] for r in model_results)
            total_time = sum(
                sum(q['time_taken'] for q in r['results'])
                for r in model_results
            )

            accuracy = (correct_answers / total_questions * 100) if total_questions > 0 else 0
            score_rate = (total_score / max_score * 100) if max_score > 0 else 0
            avg_time = total_time / total_questions if total_questions > 0 else 0

            board.append({
                'model_name': model_name,
                'accuracy': round(accuracy, 2),
                'score_rate': round(score_rate, 2),
                'total_score': total_score,
                'max_score': max_score,
                'correct_answers': correct_answers,
                'avg_time': round(avg_time, 2),
                'exams_count': len(model_results),
            })

        board.sort(key=lambda x: x['accuracy'], reverse=True)
        return board

    # 전체 리더보드
    leaderboard = create_leaderboard(model_map)

    # 과목별 리더보드 생성
    subject_leaderboards = {}
    for subject in ['korean', 'math', 'english']:
        subject_model_map = {}
        for model_name, model_results in model_map.items():
            subject_results = [r for r in model_results if r.get('subject') == subject]
            if subject_results:
                subject_model_map[model_name] = subject_results

        if subject_model_map:
            subject_leaderboards[subject] = create_leaderboard(subject_model_map)
    
    # 통계
    total_exams = len(results)
    total_evaluations = len(all_results_list)

    # JSON 데이터 생성
    data = {
        'leaderboard': leaderboard,
        'leaderboardBySubject': subject_leaderboards,  # 과목별 리더보드 추가
        'stats': {
            'totalExams': total_exams,
            'totalEvaluations': total_evaluations,
        },
        'results': all_results_list,
        'exams': exams,  # 시험 문제 데이터 추가
    }
    
    # web/public/data/ 디렉토리 생성
    output_dir = project_root / 'web' / 'public' / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # JSON 파일로 저장
    output_file = output_dir / 'evaluation-data.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ Export 완료: {output_file}")
    print(f"   - 리더보드 엔트리: {len(leaderboard)}개")
    print(f"   - 전체 평가 결과: {total_evaluations}개")


if __name__ == '__main__':
    export_to_json()

