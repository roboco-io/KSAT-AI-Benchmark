.PHONY: help install parse-korean parse-math parse-english parse-all answers-korean answers-math answers-all clean test lint

# 기본 타겟
help:
	@echo "KSAT AI Benchmark - Makefile Commands"
	@echo ""
	@echo "📦 설치 및 환경 설정:"
	@echo "  make install          - Python 의존성 설치"
	@echo "  make env              - 환경변수 파일 생성"
	@echo ""
	@echo "📄 문제지 파싱 (LLM):"
	@echo "  make parse-korean     - 국어 문제지 파싱 (텍스트)"
	@echo "  make parse-math       - 수학 문제지 파싱 (Vision API)"
	@echo "  make parse-english    - 영어 문제지 파싱 (텍스트)"
	@echo "  make parse-all        - 모든 과목 파싱"
	@echo ""
	@echo "🔑 정답표 파싱 (Vision API):"
	@echo "  make answers-korean   - 국어 정답 입력"
	@echo "  make answers-math     - 수학 정답 입력"
	@echo "  make answers-all      - 모든 과목 정답 입력"
	@echo ""
	@echo "🧪 테스트 및 검증:"
	@echo "  make test             - 테스트 실행"
	@echo "  make lint             - 코드 린트"
	@echo "  make validate         - YAML 파일 검증"
	@echo ""
	@echo "🧹 정리:"
	@echo "  make clean            - 임시 파일 삭제"
	@echo "  make clean-results    - 결과 파일 삭제"
	@echo ""
	@echo "📝 커스텀 파싱:"
	@echo "  make parse PDF=<경로>                    - 커스텀 PDF 파싱"
	@echo "  make parse-vision PDF=<경로>             - Vision API로 커스텀 PDF 파싱"
	@echo "  make answer PDF=<정답표> YAML=<시험>     - 커스텀 정답 입력"

# =============================================================================
# 설치 및 환경 설정
# =============================================================================

install:
	@echo "📦 Python 의존성 설치 중..."
	pip install -r requirements.txt
	@echo "✅ 설치 완료!"

env:
	@if [ ! -f .env ]; then \
		echo "📝 .env 파일 생성 중..."; \
		cp .env.example .env; \
		echo "✅ .env 파일이 생성되었습니다. API 키를 입력하세요."; \
		echo "📝 편집: code .env"; \
	else \
		echo "⚠️  .env 파일이 이미 존재합니다."; \
	fi

# =============================================================================
# 문제지 파싱 (PDF → YAML)
# =============================================================================

YEAR := 2025

parse-korean:
	@echo "📚 국어 문제지 파싱 중..."
	python src/parser/parse_exam.py exams/pdf/$(YEAR)/국어영역_문제지_홀수형.pdf
	@echo "✅ 국어 파싱 완료!"

parse-math:
	@echo "🔢 수학 문제지 파싱 중 (Vision API)..."
	python src/parser/parse_exam.py exams/pdf/$(YEAR)/수학영역_문제지_홀수형.pdf --vision
	@echo "✅ 수학 파싱 완료!"

parse-english:
	@echo "🌐 영어 문제지 파싱 중..."
	python src/parser/parse_exam.py exams/pdf/$(YEAR)/영어영역_문제지_홀수형.pdf
	@echo "✅ 영어 파싱 완료!"

parse-all: parse-korean parse-math parse-english
	@echo "🎉 모든 과목 파싱 완료!"

# 커스텀 파싱
parse:
	@if [ -z "$(PDF)" ]; then \
		echo "❌ 오류: PDF 경로를 지정하세요."; \
		echo "   사용법: make parse PDF=exams/pdf/2025/국어영역_문제지_홀수형.pdf"; \
		exit 1; \
	fi
	@echo "📄 파싱 중: $(PDF)"
	python src/parser/parse_exam.py $(PDF)

parse-vision:
	@if [ -z "$(PDF)" ]; then \
		echo "❌ 오류: PDF 경로를 지정하세요."; \
		echo "   사용법: make parse-vision PDF=exams/pdf/2025/수학영역_문제지_홀수형.pdf"; \
		exit 1; \
	fi
	@echo "📄 파싱 중 (Vision API): $(PDF)"
	python src/parser/parse_exam.py $(PDF) --vision

# =============================================================================
# 정답표 파싱 및 입력
# =============================================================================

answers-korean:
	@echo "🔑 국어 정답 입력 중..."
	python src/parser/parse_answer_key.py \
		exams/pdf/$(YEAR)/국어영역_정답표.pdf \
		exams/parsed/$(YEAR)-korean-sat.yaml
	@echo "✅ 국어 정답 입력 완료!"

answers-math:
	@echo "🔑 수학 정답 입력 중..."
	python src/parser/parse_answer_key.py \
		exams/pdf/$(YEAR)/수학영역_정답표.pdf \
		exams/parsed/$(YEAR)-math-sat.yaml
	@echo "✅ 수학 정답 입력 완료!"

answers-english:
	@echo "🔑 영어 정답 입력 중..."
	python src/parser/parse_answer_key.py \
		exams/pdf/$(YEAR)/영어영역_정답표.pdf \
		exams/parsed/$(YEAR)-english-sat.yaml
	@echo "✅ 영어 정답 입력 완료!"

answers-all: answers-korean answers-math answers-english
	@echo "🎉 모든 과목 정답 입력 완료!"

# 커스텀 정답 입력
answer:
	@if [ -z "$(PDF)" ] || [ -z "$(YAML)" ]; then \
		echo "❌ 오류: PDF와 YAML 경로를 지정하세요."; \
		echo "   사용법: make answer PDF=exams/pdf/2025/수학영역_정답표.pdf YAML=exams/parsed/2025-math-sat.yaml"; \
		exit 1; \
	fi
	@echo "🔑 정답 입력 중..."
	python src/parser/parse_answer_key.py $(PDF) $(YAML)

# =============================================================================
# 전체 파이프라인
# =============================================================================

# 전체 파이프라인 (파싱 + 정답)
all: parse-all answers-all
	@echo "🎊 전체 파이프라인 완료!"
	@echo "📝 다음 단계: git add, commit, push"

# 국어만
korean: parse-korean answers-korean
	@echo "✅ 국어 처리 완료!"

# 수학만
math: parse-math answers-math
	@echo "✅ 수학 처리 완료!"

# 영어만
english: parse-english answers-english
	@echo "✅ 영어 처리 완료!"

# =============================================================================
# 테스트 및 검증
# =============================================================================

test:
	@echo "🧪 테스트 실행 중..."
	pytest tests/ -v

lint:
	@echo "🔍 코드 린트 중..."
	@if command -v ruff >/dev/null 2>&1; then \
		ruff check src/; \
	elif command -v flake8 >/dev/null 2>&1; then \
		flake8 src/; \
	else \
		echo "⚠️  ruff나 flake8이 설치되지 않았습니다."; \
	fi

validate:
	@echo "✅ YAML 파일 검증 중..."
	@for file in exams/parsed/*.yaml; do \
		echo "  검증 중: $$file"; \
		python -c "import yaml; yaml.safe_load(open('$$file'))" || exit 1; \
	done
	@echo "✅ 모든 YAML 파일이 유효합니다!"

# =============================================================================
# Git 작업
# =============================================================================

commit:
	@if [ -z "$(MSG)" ]; then \
		echo "❌ 오류: 커밋 메시지를 지정하세요."; \
		echo "   사용법: make commit MSG='feat: 2025 수학 시험 추가'"; \
		exit 1; \
	fi
	git add -A
	git status
	@echo ""
	@echo "커밋하시겠습니까? (Ctrl+C to cancel)"
	@read -p "Enter to continue: " confirm
	git commit -m "$(MSG)"
	@echo "✅ 커밋 완료!"

push:
	@echo "📤 GitHub에 푸시 중..."
	git push origin main
	@echo "✅ 푸시 완료!"

# =============================================================================
# 정리
# =============================================================================

clean:
	@echo "🧹 임시 파일 삭제 중..."
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name ".pytest_cache" -delete
	find . -type f -name ".DS_Store" -delete
	@echo "✅ 정리 완료!"

clean-results:
	@echo "🧹 결과 파일 삭제 중..."
	rm -rf results/*
	rm -rf logs/*
	@echo "✅ 결과 파일 삭제 완료!"

# =============================================================================
# 샘플 및 테스트 파싱 (일부 페이지만)
# =============================================================================

sample-korean:
	@echo "📄 국어 샘플 파싱 (첫 3페이지)..."
	python src/parser/parse_exam.py exams/pdf/$(YEAR)/국어영역_문제지_홀수형.pdf --pages 1-3 --keep-json

sample-math:
	@echo "📄 수학 샘플 파싱 (첫 2페이지, Vision API)..."
	python src/parser/parse_exam.py exams/pdf/$(YEAR)/수학영역_문제지_홀수형.pdf --pages 1-2 --vision --keep-json

# =============================================================================
# 정보 출력
# =============================================================================

info:
	@echo "📊 프로젝트 정보"
	@echo "===================="
	@echo "Python: $$(python --version)"
	@echo "PDF 파일:"
	@ls -lh exams/pdf/$(YEAR)/ 2>/dev/null || echo "  (없음)"
	@echo ""
	@echo "YAML 파일:"
	@ls -lh exams/parsed/*.yaml 2>/dev/null || echo "  (없음)"
	@echo ""
	@echo "환경변수:"
	@if [ -f .env ]; then \
		echo "  ✅ .env 파일 존재"; \
	else \
		echo "  ❌ .env 파일 없음 (make env 실행)"; \
	fi

# =============================================================================
# 개발 도구
# =============================================================================

dev-install:
	@echo "🛠️  개발 도구 설치 중..."
	pip install -r requirements.txt
	pip install pytest ruff black isort
	@echo "✅ 개발 도구 설치 완료!"

format:
	@echo "✨ 코드 포맷팅 중..."
	@if command -v black >/dev/null 2>&1; then \
		black src/; \
	fi
	@if command -v isort >/dev/null 2>&1; then \
		isort src/; \
	fi
	@echo "✅ 포맷팅 완료!"

# =============================================================================
# 도움말 별칭
# =============================================================================

h: help
list: help

