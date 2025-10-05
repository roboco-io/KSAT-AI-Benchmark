#!/usr/bin/env python3
"""
수능 PDF 파싱 메인 CLI

LLM을 사용하여 PDF를 파싱하고 YAML로 변환하는 전체 파이프라인을 실행합니다.

사용법:
    python parse_exam.py <pdf_path> [옵션]
    
예시:
    # 전체 파싱 (텍스트 기반)
    python parse_exam.py exams/pdf/2025/국어영역_문제지_홀수형.pdf
    
    # Vision API 사용
    python parse_exam.py exams/pdf/2025/수학영역_문제지_홀수형.pdf --vision
    
    # 특정 페이지만 파싱
    python parse_exam.py exams/pdf/2025/국어영역_문제지_홀수형.pdf --pages 1-5
"""

import argparse
import sys
from pathlib import Path
from datetime import datetime
import json

# 프로젝트 루트를 sys.path에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from src.parser.llm_parser import LLMParser
from src.parser.json_to_yaml import convert_json_to_yaml


def parse_page_range(page_str: str) -> tuple:
    """페이지 범위 문자열 파싱
    
    Args:
        page_str: "1-5" 또는 "1,3,5" 형식
    
    Returns:
        (start, end) 튜플 또는 None
    """
    if not page_str:
        return None
    
    if '-' in page_str:
        parts = page_str.split('-')
        return (int(parts[0]), int(parts[1]))
    
    # 단일 페이지나 콤마 구분은 시작-끝 범위로 변환
    pages = [int(p.strip()) for p in page_str.split(',')]
    return (min(pages), max(pages))


def detect_subject(filename: str) -> str:
    """파일명에서 과목 감지"""
    filename_lower = filename.lower()
    
    if '국어' in filename or 'korean' in filename_lower:
        return 'korean'
    elif '수학' in filename or 'math' in filename_lower:
        return 'math'
    elif '영어' in filename or 'english' in filename_lower:
        return 'english'
    elif '사회' in filename or 'social' in filename_lower:
        return 'social'
    elif '과학' in filename or 'science' in filename_lower:
        return 'science'
    elif '한국사' in filename or 'history' in filename_lower:
        return 'history'
    else:
        return 'unknown'


def main():
    parser = argparse.ArgumentParser(
        description='LLM 기반 수능 PDF 파서',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
예시:
  %(prog)s exams/pdf/2025/국어영역_문제지_홀수형.pdf
  %(prog)s exams/pdf/2025/수학영역_문제지_홀수형.pdf --vision --pages 1-10
  %(prog)s exams/pdf/2025/영어영역_문제지.pdf --model gpt-4o --output custom.yaml
        """
    )
    
    parser.add_argument(
        'pdf_path',
        type=str,
        help='파싱할 PDF 파일 경로'
    )
    
    parser.add_argument(
        '--vision',
        action='store_true',
        help='Vision API 사용 (기본: 텍스트 기반)'
    )
    
    parser.add_argument(
        '--pages',
        type=str,
        help='파싱할 페이지 범위 (예: 1-5, 1,3,5)'
    )
    
    parser.add_argument(
        '--model',
        type=str,
        default='gpt-4o',
        help='사용할 OpenAI 모델 (기본: gpt-4o, 향후: gpt-5)'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        help='출력 YAML 파일 경로 (기본: 자동 생성)'
    )
    
    parser.add_argument(
        '--exam-id',
        type=str,
        help='시험 ID (기본: 자동 생성)'
    )
    
    parser.add_argument(
        '--subject',
        type=str,
        choices=['korean', 'math', 'english', 'social', 'science', 'history'],
        help='과목 (기본: 파일명에서 자동 감지)'
    )
    
    parser.add_argument(
        '--year',
        type=int,
        help='시험 연도 (기본: 파일명에서 추출 또는 현재 연도)'
    )
    
    parser.add_argument(
        '--keep-json',
        action='store_true',
        help='중간 JSON 파일 유지 (기본: 삭제)'
    )
    
    args = parser.parse_args()
    
    # 경로 검증
    pdf_path = Path(args.pdf_path)
    if not pdf_path.exists():
        print(f"❌ 오류: PDF 파일을 찾을 수 없습니다: {pdf_path}")
        sys.exit(1)
    
    if not pdf_path.suffix.lower() == '.pdf':
        print(f"❌ 오류: PDF 파일이 아닙니다: {pdf_path}")
        sys.exit(1)
    
    # 페이지 범위 파싱
    page_range = parse_page_range(args.pages)
    
    # 과목 및 연도 감지
    subject = args.subject or detect_subject(pdf_path.name)
    year = args.year
    
    if not year:
        # 파일명에서 연도 추출 시도
        try:
            # "2025/국어영역..." 형식에서 추출
            if pdf_path.parent.name.isdigit():
                year = int(pdf_path.parent.name)
            else:
                year = datetime.now().year
        except:
            year = datetime.now().year
    
    # 출력 경로 설정
    if args.output:
        yaml_path = Path(args.output)
    else:
        # exams/parsed/YEAR-SUBJECT-sat.yaml
        parsed_dir = project_root / "exams" / "parsed"
        parsed_dir.mkdir(parents=True, exist_ok=True)
        
        yaml_filename = f"{year}-{subject}-sat"
        if page_range:
            yaml_filename += f"-p{page_range[0]}-{page_range[1]}"
        yaml_filename += ".yaml"
        
        yaml_path = parsed_dir / yaml_filename
    
    # 중간 JSON 경로
    json_path = yaml_path.with_suffix('.json')
    
    # exam_id 생성
    exam_id = args.exam_id or f"{year}-{subject}-sat"
    if page_range:
        exam_id += f"-sample"
    
    print("\n" + "="*100)
    print("🚀 수능 PDF 파싱 파이프라인 시작")
    print("="*100)
    print(f"📄 입력 PDF: {pdf_path}")
    print(f"🎯 과목: {subject.upper()}")
    print(f"📅 연도: {year}")
    print(f"📄 페이지: {page_range or '전체'}")
    print(f"🤖 모델: {args.model}")
    print(f"👁️  Vision API: {'사용' if args.vision else '미사용 (텍스트 기반)'}")
    print(f"💾 출력 YAML: {yaml_path}")
    print("="*100 + "\n")
    
    try:
        # Step 1: PDF → JSON (LLM 파싱)
        print("📍 Step 1: PDF 파싱 (LLM)")
        llm_parser = LLMParser(model=args.model)
        
        json_result = llm_parser.parse_pdf(
            pdf_path=str(pdf_path),
            use_vision=args.vision,
            page_range=page_range,
            output_path=str(json_path)
        )
        
        # Step 2: JSON → YAML 변환
        print("\n📍 Step 2: YAML 변환")
        
        # 시험 제목 생성
        if page_range:
            title = f"{year}학년도 수능 {subject.upper()} (페이지 {page_range[0]}-{page_range[1]})"
        else:
            title = f"{year}학년도 수능 {subject.upper()}"
        
        convert_json_to_yaml(
            json_path=str(json_path),
            output_path=str(yaml_path),
            exam_id=exam_id,
            subject=subject,
            year=year,
            title=title
        )
        
        # Step 3: 정리
        if not args.keep_json:
            json_path.unlink()
            print(f"\n🗑️  중간 JSON 파일 삭제: {json_path}")
        
        # 완료
        print("\n" + "="*100)
        print("✅ 파싱 완료!")
        print("="*100)
        print(f"📁 출력 파일: {yaml_path}")
        print(f"📊 문제 수: {len(json_result['questions'])}개")
        print(f"📦 Exam ID: {exam_id}")
        
        if args.keep_json:
            print(f"📄 JSON 파일: {json_path}")
        
        print("\n다음 단계:")
        print("  1. 생성된 YAML 파일 검토 및 정답 입력")
        print("  2. git commit & push → GitHub Actions가 자동으로 평가 실행")
        print("  3. GitHub Pages에서 결과 확인")
        print("="*100 + "\n")
        
    except Exception as e:
        print(f"\n❌ 파싱 실패: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

