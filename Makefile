.PHONY: help install clean test lint model models

# 기본 타겟 설정
.DEFAULT_GOAL := help

# 기본 타겟
help:
	@echo "KSAT AI Benchmark - Makefile Commands"
	@echo ""
	@echo "📦 설치 및 환경 설정:"
	@echo "  make install          - Python 의존성 설치"
	@echo "  make env              - 환경변수 파일 생성"
	@echo "  make model            - 사용 가능한 모델 목록 표시"
	@echo ""
	@echo "🎯 평가 실행:"
	@echo "  make evaluate EXAM=<경로>           - 단일 시험 평가 (GPT-4o)"
	@echo "  make evaluate EXAM=<경로> MODEL=<모델>  - 특정 모델로 평가"
	@echo "  make evaluate-all EXAM=<경로>       - 모든 모델로 평가"
	@echo "  make evaluate-all-exams             - 모든 시험, 모든 모델"
	@echo "  make evaluate-test                  - 빠른 테스트"
	@echo ""
	@echo "📊 결과 분석 및 요약:"
	@echo "  make summary                        - 기본 요약 + 리더보드"
	@echo "  make summary-detailed               - 상세 분석 (과목별, 통계 포함)"
	@echo "  make leaderboard                    - 리더보드만 표시"
	@echo "  make summary-model MODEL=<모델>     - 특정 모델 분석"
	@echo "  make summary-subject SUBJECT=<과목> - 특정 과목 분석"
	@echo "  make summary-year YEAR=<연도>       - 특정 연도 분석"
	@echo ""
	@echo "🚀 유연한 평가 시스템 (NEW!):"
	@echo "  make <모델> <연도> <과목>"
	@echo ""
	@echo "  모델: gpt-5, gpt-4o, claude-opus-4-1, claude-sonnet-4-5,"
	@echo "        gemini-2.5-pro, solar-pro, sonar-pro, all"
	@echo "  연도: 2025, 2024, all"
	@echo "  과목: korean, math, english, korean,math (콤마로 여러개), all"
	@echo ""
	@echo "  예시:"
	@echo "    make gpt-5 2025 korean,math        - GPT-5로 2025 국어+수학"
	@echo "    make claude-opus-4-1 2025 korean   - Claude Opus 4.1로 2025 국어"
	@echo "    make all 2025 all                  - 모든 모델로 2025 모든 과목"
	@echo "    make gpt-4o all korean             - GPT-4o로 모든 연도 국어"
	@echo ""
	@echo "📝 로그 모드:"
	@echo "  기본값: 상세 로그 모드 (문제별 상세 로그 자동 출력)"
	@echo "  SIMPLE=1 make gpt-5 2025 korean      - 간단한 로그만 표시"
	@echo "  SIMPLE=1 make all 2025 all           - 모든 평가에 간단한 로그 적용"
	@echo ""
	@echo "⚡ 병렬 처리 모드 (기본: 활성화):"
	@echo "  기본값: 10개 스레드로 병렬 처리 (속도 3-5배 향상)"
	@echo "  SEQUENTIAL=1 make gpt-5 2025 korean  - 순차 처리 (디버깅용)"
	@echo "  MAX_WORKERS=20 make gpt-5 2025 all   - 최대 스레드 수 조정"
	@echo ""
	@echo "🌐 웹 배포:"
	@echo "  make export-web                     - 평가 결과를 JSON으로 export"
	@echo "  make web-build                      - Next.js 웹사이트 빌드"
	@echo "  make web-dev                        - 개발 서버 실행"
	@echo "  make deploy                         - 평가 결과 업데이트 및 배포"
	@echo ""
	@echo "🧪 테스트 및 검증:"
	@echo "  make test             - 테스트 실행"
	@echo "  make lint             - 코드 린트"
	@echo "  make validate         - YAML 파일 검증"
	@echo ""
	@echo "🧹 정리:"
	@echo "  make clean            - 임시 파일 삭제"
	@echo "  make clean-results    - 결과 파일 삭제"

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

model models:
	@echo "🤖 사용 가능한 모델 목록"
	@echo "========================================"
	@python -c "import json; data = json.load(open('models/models.json')); enabled = [m for m in data['models'] if m.get('enabled', False)]; print('\n'.join(['  - {} ({})'.format(m['name'], m['provider']) for m in enabled]))"
	@echo ""
	@echo "사용법:"
	@echo "  make <모델> <연도> <과목>"
	@echo ""
	@echo "예시:"
	@echo "  make gpt-5 2025 korean"
	@echo "  make claude-opus-4-1 2025 korean,math"
	@echo "  make all 2025 all"

# =============================================================================
# 평가 실행
# =============================================================================

# 단일 모델로 평가
evaluate:
	@if [ -z "$(EXAM)" ]; then \
		echo "❌ 오류: EXAM 경로를 지정하세요."; \
		echo "   사용법: make evaluate EXAM=exams/parsed/2025-korean-sat.yaml"; \
		exit 1; \
	fi
	@if [ -z "$(MODEL)" ]; then \
		echo "📝 기본 모델(gpt-4o)로 평가 중..."; \
		python src/evaluator/evaluate.py $(EXAM); \
	else \
		echo "📝 $(MODEL) 모델로 평가 중..."; \
		python src/evaluator/evaluate.py $(EXAM) --model $(MODEL); \
	fi

# 모든 모델로 평가
evaluate-all:
	@if [ -z "$(EXAM)" ]; then \
		echo "❌ 오류: EXAM 경로를 지정하세요."; \
		echo "   사용법: make evaluate-all EXAM=exams/parsed/2025-korean-sat.yaml"; \
		exit 1; \
	fi
	@echo "🚀 모든 모델로 평가 중..."
	python src/evaluator/evaluate.py $(EXAM) --all-models

# 모든 시험 평가 (모든 모델)
evaluate-all-exams:
	@echo "🚀 모든 시험, 모든 모델로 평가 중..."
	python src/evaluator/evaluate.py --all --all-models

# 빠른 테스트 평가 (GPT-4o만)
evaluate-test:
	@echo "⚡ 빠른 테스트 평가..."
	python src/evaluator/evaluate.py exams/parsed/2025-math-sat-p1-2.yaml --model gpt-4o

# 결과 요약 (기본)
summary:
	@echo "📊 평가 결과 요약..."
	@python src/evaluator/summary.py

# 상세 분석 (과목별, 통계 포함)
summary-detailed:
	@echo "📊 상세 분석 중..."
	@python src/evaluator/summary.py --detailed

# 리더보드만 표시
leaderboard:
	@echo "🏆 리더보드..."
	@python src/evaluator/summary.py --leaderboard

# 특정 모델 분석
summary-model:
	@if [ -z "$(MODEL)" ]; then \
		echo "❌ 오류: MODEL을 지정하세요."; \
		echo "   사용법: make summary-model MODEL=gpt-5"; \
		exit 1; \
	fi
	@echo "📊 $(MODEL) 모델 분석..."
	@python src/evaluator/summary.py --model $(MODEL)

# 특정 과목 분석
summary-subject:
	@if [ -z "$(SUBJECT)" ]; then \
		echo "❌ 오류: SUBJECT를 지정하세요."; \
		echo "   사용법: make summary-subject SUBJECT=korean"; \
		exit 1; \
	fi
	@echo "📊 $(SUBJECT) 과목 분석..."
	@python src/evaluator/summary.py --subject $(SUBJECT)

# 특정 연도 분석
summary-year:
	@if [ -z "$(YEAR)" ]; then \
		echo "❌ 오류: YEAR를 지정하세요."; \
		echo "   사용법: make summary-year YEAR=2025"; \
		exit 1; \
	fi
	@echo "📊 $(YEAR)년 분석..."
	@python src/evaluator/summary.py --year $(YEAR)

# =============================================================================
# 유연한 평가 시스템 (연도별, 과목별, 모델별)
# =============================================================================

# 사용법:
#   make <모델> <연도> <과목>
#   - 모델: gpt-5, gpt-4o, claude-opus-4-1, claude-sonnet-4-5, gemini-2.5-pro, solar-pro, sonar-pro, all
#   - 연도: 2025, 2024, all
#   - 과목: korean, math, english, korean,math, all
#
# 예시:
#   make gpt-5 2025 korean,math
#   make claude-opus-4-1 2025 korean
#   make all 2025 all
#   make gpt-4o all korean

# 기본값 설정
DEFAULT_YEAR := 2025
DEFAULT_SUBJECTS := all
DEFAULT_MODEL := gpt-4o

# 병렬 처리 설정 (기본: 활성화)
PARALLEL ?= 1
MAX_WORKERS ?= 10

# 모델별 타겟 정의
.PHONY: gpt-5 gpt-4o claude-opus-4-1 claude-sonnet-4-5 gemini-2.5-pro solar-pro sonar-pro all-models

# 개별 모델 타겟
gpt-5:
	@$(MAKE) run-evaluation MODEL_NAME=gpt-5 YEAR=$(word 2,$(MAKECMDGOALS)) SUBJECTS=$(word 3,$(MAKECMDGOALS))

gpt-4o:
	@$(MAKE) run-evaluation MODEL_NAME=gpt-4o YEAR=$(word 2,$(MAKECMDGOALS)) SUBJECTS=$(word 3,$(MAKECMDGOALS))

claude-opus-4-1:
	@$(MAKE) run-evaluation MODEL_NAME=claude-opus-4-1 YEAR=$(word 2,$(MAKECMDGOALS)) SUBJECTS=$(word 3,$(MAKECMDGOALS))

claude-sonnet-4-5:
	@$(MAKE) run-evaluation MODEL_NAME=claude-sonnet-4-5 YEAR=$(word 2,$(MAKECMDGOALS)) SUBJECTS=$(word 3,$(MAKECMDGOALS))

gemini-2.5-pro:
	@$(MAKE) run-evaluation MODEL_NAME=gemini-2.5-pro YEAR=$(word 2,$(MAKECMDGOALS)) SUBJECTS=$(word 3,$(MAKECMDGOALS))

solar-pro:
	@$(MAKE) run-evaluation MODEL_NAME=solar-pro YEAR=$(word 2,$(MAKECMDGOALS)) SUBJECTS=$(word 3,$(MAKECMDGOALS))

sonar-pro:
	@$(MAKE) run-evaluation MODEL_NAME=sonar-pro YEAR=$(word 2,$(MAKECMDGOALS)) SUBJECTS=$(word 3,$(MAKECMDGOALS))

# 모든 모델 실행 (첫 번째 인자로 'all' 사용 시)
# 예: make all 2025 korean
all-models:
	@$(MAKE) run-evaluation MODEL_NAME=all YEAR=$(word 2,$(MAKECMDGOALS)) SUBJECTS=$(word 3,$(MAKECMDGOALS))

# 실제 평가 실행 로직
run-evaluation:
	@echo "=========================================="
	@echo "🚀 KSAT AI 평가 시작"
	@echo "=========================================="
	@EVAL_YEAR=$${YEAR:-$(DEFAULT_YEAR)}; \
	EVAL_SUBJECTS=$${SUBJECTS:-$(DEFAULT_SUBJECTS)}; \
	EVAL_MODEL=$${MODEL_NAME:-$(DEFAULT_MODEL)}; \
	VERBOSE_FLAG="--verbose"; \
	LOG_MODE="상세 로그"; \
	PARALLEL_FLAG="--parallel --max-workers $(MAX_WORKERS)"; \
	PARALLEL_MODE="병렬 ($(MAX_WORKERS) 스레드)"; \
	if [ "$$SIMPLE" = "1" ] || [ "$$SIMPLE" = "true" ]; then \
		VERBOSE_FLAG=""; \
		LOG_MODE="간단한 로그"; \
	fi; \
	if [ "$$PARALLEL" = "0" ] || [ "$$SEQUENTIAL" = "1" ]; then \
		PARALLEL_FLAG=""; \
		PARALLEL_MODE="순차 처리"; \
	fi; \
	echo "📋 설정:"; \
	echo "   모델: $$EVAL_MODEL"; \
	echo "   연도: $$EVAL_YEAR"; \
	echo "   과목: $$EVAL_SUBJECTS"; \
	echo "   로그: $$LOG_MODE"; \
	echo "   처리: $$PARALLEL_MODE"; \
	echo ""; \
	TOTAL_EVALS=0; \
	SUCCESS_EVALS=0; \
	FAILED_EVALS=0; \
	START_TIME=$$(date +%s); \
	if [ "$$EVAL_SUBJECTS" = "all" ]; then \
		EVAL_SUBJECTS="korean,math,english"; \
	fi; \
	if [ "$$EVAL_YEAR" = "all" ]; then \
		YEARS="2024 2025"; \
	else \
		YEARS="$$EVAL_YEAR"; \
	fi; \
	if [ "$$EVAL_MODEL" = "all" ]; then \
		MODELS="gpt-5 gpt-4o claude-opus-4-1 claude-sonnet-4-5 gemini-2.5-pro solar-pro sonar-pro"; \
	else \
		MODELS="$$EVAL_MODEL"; \
	fi; \
	for year in $$YEARS; do \
		IFS=',' read -ra SUBJECT_ARRAY <<< "$$EVAL_SUBJECTS"; \
		for subject in "$${SUBJECT_ARRAY[@]}"; do \
			subject=$$(echo $$subject | xargs); \
			EXAM_FILE="exams/parsed/$$year-$$subject-sat.yaml"; \
			if [ ! -f "$$EXAM_FILE" ]; then \
				echo "⚠️  시험 파일 없음: $$EXAM_FILE (건너뜀)"; \
				continue; \
			fi; \
			for model in $$MODELS; do \
				TOTAL_EVALS=$$((TOTAL_EVALS + 1)); \
				echo ""; \
				echo "=========================================="; \
				echo "📝 평가 중: $$model | $$year | $$subject"; \
				echo "=========================================="; \
				if python src/evaluator/evaluate.py "$$EXAM_FILE" --model "$$model" $$VERBOSE_FLAG $$PARALLEL_FLAG; then \
					SUCCESS_EVALS=$$((SUCCESS_EVALS + 1)); \
					echo "✅ 완료: $$model - $$year $$subject"; \
				else \
					FAILED_EVALS=$$((FAILED_EVALS + 1)); \
					echo "❌ 실패: $$model - $$year $$subject"; \
				fi; \
			done; \
		done; \
	done; \
	END_TIME=$$(date +%s); \
	ELAPSED=$$((END_TIME - START_TIME)); \
	echo ""; \
	echo "=========================================="; \
	echo "📊 평가 완료 요약"; \
	echo "=========================================="; \
	echo "총 평가: $$TOTAL_EVALS"; \
	echo "성공: $$SUCCESS_EVALS ✅"; \
	echo "실패: $$FAILED_EVALS ❌"; \
	echo "소요 시간: $$ELAPSED 초"; \
	echo "=========================================="; \
	if [ $$TOTAL_EVALS -gt 0 ]; then \
		echo ""; \
		echo "📈 상세 결과 확인:"; \
		python src/evaluator/summary.py 2>/dev/null || echo "   (summary.py 실행 실패)"; \
	fi

# 유효한 연도 및 과목 인자 (타겟으로 인식되지만 아무것도 하지 않음)
.PHONY: 2025 2024 korean math english all
2025 2024 korean math english:
	@:

# 'all' 타겟: 첫 번째 위치(모델)에서만 실행, 세 번째 위치(과목)에서는 무시
all:
	@if [ "$(word 1,$(MAKECMDGOALS))" = "all" ]; then \
		$(MAKE) run-evaluation MODEL_NAME=all YEAR=$(word 2,$(MAKECMDGOALS)) SUBJECTS=$(word 3,$(MAKECMDGOALS)); \
	fi

# =============================================================================
# 웹 배포
# =============================================================================

# 평가 결과를 웹용 JSON으로 export
export-web:
	@echo "📤 평가 결과를 JSON으로 export 중..."
	python scripts/export_data.py

# Next.js 웹사이트 빌드
web-build:
	@echo "🔨 웹사이트 빌드 중..."
	cd web && npm run build

# 개발 서버 실행
web-dev:
	@echo "🚀 개발 서버 시작..."
	cd web && npm run dev

# 평가 결과 업데이트 및 배포
deploy: export-web
	@echo "🚀 GitHub Pages에 배포 중..."
	@echo "   1. JSON export 완료"
	@echo "   2. Git에 커밋 및 푸시..."
	git add web/public/data/evaluation-data.json
	git commit -m "chore: 평가 결과 업데이트" || echo "변경사항 없음"
	git push origin main
	@echo "   3. GitHub Actions가 자동으로 배포합니다"
	@echo "   ✅ 웹사이트: https://roboco.io/KSAT-AI-Benchmark/"

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

