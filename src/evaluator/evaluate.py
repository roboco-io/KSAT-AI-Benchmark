#!/usr/bin/env python3
"""
평가 CLI 도구

사용법:
    python evaluate.py <exam_yaml> [옵션]
    python evaluate.py --all  # 모든 시험 평가
"""

import argparse
import sys
from pathlib import Path
import os
from typing import List

# 프로젝트 루트를 sys.path에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.evaluator.evaluator import Evaluator


def parse_question_numbers(question_spec: str) -> List[int]:
    """문제 번호 범위 파싱

    Args:
        question_spec: 문제 번호 지정 (예: "1-5", "1,3,5", "1-3,7,10-12")

    Returns:
        문제 번호 리스트

    Examples:
        >>> parse_question_numbers("1-5")
        [1, 2, 3, 4, 5]
        >>> parse_question_numbers("1,3,5")
        [1, 3, 5]
        >>> parse_question_numbers("1-3,7,10-12")
        [1, 2, 3, 7, 10, 11, 12]
    """
    question_numbers = set()

    for part in question_spec.split(','):
        part = part.strip()
        if '-' in part:
            # 범위 지정 (예: "1-5")
            start, end = part.split('-')
            question_numbers.update(range(int(start), int(end) + 1))
        else:
            # 단일 번호 (예: "3")
            question_numbers.add(int(part))

    return sorted(list(question_numbers))


def main():
    parser = argparse.ArgumentParser(
        description='KSAT AI 평가 도구',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  # 특정 시험 평가 (OpenAI GPT-4o)
  %(prog)s exams/parsed/2025-math-sat-p1-2.yaml --model gpt-4o

  # 특정 문제만 평가 (1-5번)
  %(prog)s exams/parsed/2025-korean-sat.yaml --model gpt-5 --questions "1-5"

  # 여러 문제 선택 (1, 3, 5번)
  %(prog)s exams/parsed/2025-korean-sat.yaml --model gpt-5 -q "1,3,5"

  # 범위 조합 (1-3번, 7번, 10-12번)
  %(prog)s exams/parsed/2025-korean-sat.yaml --model gpt-5 -q "1-3,7,10-12"

  # 모든 모델로 평가
  %(prog)s exams/parsed/2025-korean-sat.yaml --all-models

  # 모든 시험 평가
  %(prog)s --all

  # 특정 제공자 모델들만
  %(prog)s exams/parsed/2025-math-sat-p1-2.yaml --provider openai
        """
    )
    
    parser.add_argument(
        'exam',
        nargs='?',
        type=str,
        help='평가할 시험 YAML 파일 경로'
    )
    
    parser.add_argument(
        '--all',
        action='store_true',
        help='exams/parsed/의 모든 시험 평가'
    )
    
    parser.add_argument(
        '--model',
        type=str,
        help='사용할 모델 이름 (예: gpt-4o, claude-3-5-sonnet-20241022)'
    )
    
    parser.add_argument(
        '--provider',
        type=str,
        choices=['openai', 'anthropic', 'google', 'upstage', 'perplexity'],
        help='특정 제공자의 모델들만 사용'
    )
    
    parser.add_argument(
        '--all-models',
        action='store_true',
        help='모든 모델로 평가'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        help='결과 저장 경로 (기본: results/{exam_id}/{model_name}.yaml)'
    )
    
    parser.add_argument(
        '--models-config',
        type=str,
        default='models/models.json',
        help='모델 설정 파일 경로 (기본: models/models.json)'
    )

    parser.add_argument(
        '--parallel',
        action='store_true',
        help='병렬 처리로 평가 (속도 향상)'
    )

    parser.add_argument(
        '--max-workers',
        type=int,
        default=10,
        help='병렬 처리 시 최대 동시 스레드 수 (기본: 10)'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        dest='verbose',
        help='상세 로그 활성화 (문제별 API 요청/응답, logs/ 디렉토리에 저장)'
    )

    parser.add_argument(
        '--debug',
        action='store_true',
        dest='verbose',
        help='--verbose의 별칭 (하위 호환성)'
    )

    parser.add_argument(
        '--questions', '-q',
        type=str,
        help='평가할 문제 번호 지정 (예: "1-5", "1,3,5", "1-3,7-10")'
    )

    args = parser.parse_args()
    
    # 환경변수 로드
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print("✅ .env 파일 로드 완료")
    except ImportError:
        print("⚠️  python-dotenv가 설치되지 않았습니다. .env 파일을 사용하려면 'pip install python-dotenv'를 실행하세요.")
    except Exception as e:
        print(f"⚠️  .env 파일 로드 실패: {e}")

    # 문제 번호 파싱
    question_numbers = None
    if args.questions:
        try:
            question_numbers = parse_question_numbers(args.questions)
            print(f"📝 평가할 문제: {question_numbers} ({len(question_numbers)}개)")
        except Exception as e:
            print(f"❌ 오류: 문제 번호 파싱 실패: {e}")
            print(f"   올바른 형식: '1-5', '1,3,5', '1-3,7-10' 등")
            sys.exit(1)

    # 평가기 생성
    evaluator = Evaluator(models_config_path=args.models_config, enable_debug=args.verbose)
    
    # 시험 파일 목록 생성
    exam_files = []
    
    if args.all:
        # exams/parsed/의 모든 YAML 파일
        parsed_dir = Path('exams/parsed')
        if parsed_dir.exists():
            exam_files = list(parsed_dir.glob('*.yaml'))
        else:
            print(f"❌ 오류: {parsed_dir} 디렉토리가 없습니다.")
            sys.exit(1)
    elif args.exam:
        exam_files = [Path(args.exam)]
    else:
        print("❌ 오류: 시험 파일을 지정하거나 --all 옵션을 사용하세요.")
        parser.print_help()
        sys.exit(1)
    
    # 파일 존재 확인
    for exam_file in exam_files:
        if not exam_file.exists():
            print(f"❌ 오류: 파일을 찾을 수 없습니다: {exam_file}")
            sys.exit(1)
    
    print(f"\n{'='*100}")
    print(f"🎯 KSAT AI 평가 시작")
    print(f"{'='*100}")
    print(f"📄 시험 파일: {len(exam_files)}개")
    print(f"{'='*100}\n")
    
    # 평가 실행
    for exam_file in exam_files:
        print(f"\n📚 시험: {exam_file.name}")
        
        if args.all_models:
            # 모든 모델로 평가
            models_to_use = None
            if args.provider:
                # 특정 제공자만
                import json
                with open(args.models_config, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                models_to_use = [
                    m['name'] for m in config.get('models', [])
                    if m['provider'] == args.provider
                ]
            
            evaluator.evaluate_with_all_models(
                exam_path=str(exam_file),
                models_to_use=models_to_use,
                question_numbers=question_numbers
            )
        
        elif args.model:
            # 특정 모델로 평가
            import json
            with open(args.models_config, 'r', encoding='utf-8') as f:
                config = json.load(f)
            
            # 모델 설정 찾기
            model_config = None
            for m in config.get('models', []):
                if m['name'] == args.model:
                    model_config = m
                    break
            
            if not model_config:
                print(f"❌ 오류: 모델을 찾을 수 없습니다: {args.model}")
                print(f"사용 가능한 모델:")
                for m in config.get('models', []):
                    print(f"  - {m['name']} ({m['provider']})")
                sys.exit(1)
            
            # API 키 가져오기
            provider = model_config['provider']
            model_id = model_config.get('model_id', args.model)  # model_id가 없으면 name 사용
            api_key_var = f"{provider.upper()}_API_KEY"
            api_key = os.getenv(api_key_var)
            
            if not api_key:
                print(f"❌ 오류: {api_key_var} 환경변수가 설정되지 않았습니다.")
                sys.exit(1)
            
            # 모델 생성 (model_id 사용)
            # model_config에서 추가 설정 추출 (max_tokens, temperature 등)
            model_kwargs = {}
            for key in ['max_tokens', 'temperature', 'timeout', 'top_p', 'top_k']:
                if key in model_config:
                    model_kwargs[key] = model_config[key]

            model = evaluator.create_model(
                provider=provider,
                model_name=model_id,  # API용 실제 model_id 전달
                api_key=api_key,
                **model_kwargs  # models.json의 설정 전달
            )
            # 표시용 이름
            model.display_name = args.model
            
            # 평가 실행
            evaluator.evaluate_exam(
                exam_path=str(exam_file),
                model=model,
                output_path=args.output,
                parallel=args.parallel,
                max_workers=args.max_workers,
                question_numbers=question_numbers
            )
        
        else:
            # 기본: OpenAI GPT-4o
            api_key = os.getenv('OPENAI_API_KEY')
            if not api_key:
                print("❌ 오류: OPENAI_API_KEY 환경변수가 설정되지 않았습니다.")
                print("   --model 또는 --all-models 옵션을 사용하거나 .env 파일을 설정하세요.")
                sys.exit(1)
            
            model = evaluator.create_model(
                provider='openai',
                model_name='gpt-4o',
                api_key=api_key
            )

            evaluator.evaluate_exam(
                exam_path=str(exam_file),
                model=model,
                output_path=args.output,
                parallel=args.parallel,
                max_workers=args.max_workers,
                question_numbers=question_numbers
            )
    
    print(f"\n{'='*100}")
    print(f"🎉 모든 평가 완료!")
    print(f"{'='*100}")
    print(f"📁 결과 디렉토리: results/")
    print(f"\n다음 단계:")
    print(f"  1. 결과 확인: ls -la results/*/")
    print(f"  2. Git 커밋: git add results/ && git commit -m 'feat: 평가 결과 추가'")
    print(f"  3. GitHub Pages 배포")
    print(f"{'='*100}\n")


if __name__ == "__main__":
    main()

