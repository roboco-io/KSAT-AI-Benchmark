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

# 프로젝트 루트를 sys.path에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.evaluator.evaluator import Evaluator


def main():
    parser = argparse.ArgumentParser(
        description='KSAT AI 평가 도구',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  # 특정 시험 평가 (OpenAI GPT-4o)
  %(prog)s exams/parsed/2025-math-sat-p1-2.yaml --model gpt-4o
  
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
    
    # 평가기 생성
    evaluator = Evaluator(models_config_path=args.models_config)
    
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
                models_to_use=models_to_use
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
            model = evaluator.create_model(
                provider=provider,
                model_name=model_id,  # API용 실제 model_id 전달
                api_key=api_key
            )
            # 표시용 이름
            model.display_name = args.model
            
            # 평가 실행
            evaluator.evaluate_exam(
                exam_path=str(exam_file),
                model=model,
                output_path=args.output,
                parallel=args.parallel,
                max_workers=args.max_workers
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
                max_workers=args.max_workers
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

