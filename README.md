# 🎓 KSAT AI Benchmark

> 대한민국 수학능력시험(KSAT)으로 AI 모델의 실력을 측정합니다

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-brightgreen)](https://pages.github.com/)

## 📖 소개

KSAT AI Benchmark는 대한민국 수학능력시험 문제를 활용하여 다양한 AI 모델의 문제 해결 능력을 평가하고, 그 결과를 공개적으로 공유하는 오픈소스 프로젝트입니다.

### 주요 특징

- 🤖 **LLM 기반 지능형 파싱**: GPT-4o Vision API로 복잡한 수식, 그래프, 2단 레이아웃 완벽 처리
- 🎯 **다양한 AI 모델 지원**: GPT-4, Claude, Gemini, Solar, Sonar 등 주요 AI 모델 평가
- 📊 **상세한 결과 분석**: 정답률, 답변 선택 이유, 풀이 시간까지 모두 기록
- ⚡ **완전 자동화**: PDF 업로드 → LLM 파싱 → 평가 → 웹 배포까지 GitHub Actions로 자동화
- 🌐 **현대적인 웹 UI**: Next.js + Mantine UI로 구현된 아름다운 리더보드
- 🔄 **지속적인 업데이트**: 새로운 시험이나 모델이 추가되면 자동으로 평가

## 🎯 평가 지표

각 AI 모델은 다음 기준으로 평가됩니다:

1. **정답률 & 점수**: 정답을 맞힌 문제의 비율과 획득 점수
2. **답변 선택 이유**: 해당 답을 선택한 상세한 논리와 설명
3. **풀이 시간**: 각 문제를 푸는데 소요된 시간 (초 단위)
4. **과목별 성적**: 국어, 수학, 영어, 탐구 영역별 점수

## ⚡ Makefile 빠른 시작

```bash
# 도움말
make help

# 국어 파싱 + 정답 입력
make korean

# 수학 파싱 + 정답 입력 (Vision API)
make math

# 모든 과목 처리
make all

# 커스텀 PDF 파싱
make parse PDF=exams/pdf/2025/국어영역_문제지_홀수형.pdf
make parse-vision PDF=exams/pdf/2025/수학영역_문제지_홀수형.pdf

# YAML 검증
make validate

# 정리
make clean
```

## 🔄 자동화 워크플로우

```
PDF 업로드 → LLM 파싱 → YAML 생성 → 모델 평가 → 결과 YAML 저장 → 웹 배포
   (1)       (GPT-4o)       (3)        (4)          (5)            (6)
```

1. **PDF 업로드**: `exams/pdf/`에 시험지 PDF 추가
2. **LLM 파싱**: GPT-4o Vision API로 수식, 그래프, 지문 지능형 추출
3. **YAML 생성**: `exams/parsed/`에 구조화된 시험 데이터 저장 (LaTeX 수식 포함)
4. **모델 평가**: 각 AI 모델이 문제를 풀고 이유와 시간 기록
5. **결과 저장**: `results/`에 YAML 형식으로 평가 결과 저장
6. **웹 배포**: Next.js로 빌드하여 GitHub Pages에 자동 배포

## 🚀 빠른 시작

### 필요 조건

- Python 3.10 이상
- Node.js 18 이상
- AI 모델 API 키:
  - OpenAI (GPT-4, GPT-3.5)
  - Anthropic (Claude)
  - Google (Gemini)
  - Upstage (Solar)
  - Perplexity (Sonar)

### 설치

```bash
# 저장소 클론
git clone https://github.com/roboco-io/KSAT-AI-Benchmark.git
cd KSAT-AI-Benchmark

# Python 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일에 API 키 입력
```

### 새로운 시험 추가하기

#### 방법 1: Makefile 사용 ⭐️ **가장 간편!**

```bash
# 국어 파싱 + 정답 입력 (한 번에)
make korean

# 수학 파싱 + 정답 입력 (한 번에)
make math

# 영어 파싱 + 정답 입력 (한 번에)
make english

# 모든 과목 처리
make all

# 도움말 보기
make help
```

#### 방법 2: Python 스크립트 직접 실행

```bash
# 1. PDF 파싱 (로컬에서)
# 텍스트 기반 (국어, 사회 등)
python src/parser/parse_exam.py exams/pdf/2025/국어영역_문제지_홀수형.pdf

# Vision API (수학, 과학 등) - 수식과 그래프 완벽 인식
python src/parser/parse_exam.py exams/pdf/2025/수학영역_문제지_홀수형.pdf --vision

# 2. 정답표 파싱 및 자동 입력
python src/parser/parse_answer_key.py \
  exams/pdf/2025/수학영역_정답표.pdf \
  exams/parsed/2025-math-sat.yaml

# 3. Git에 추가 및 커밋
git add exams/parsed/2025-math-sat.yaml
git commit -m "feat: 2025 수학 시험 추가"
git push

# 4. GitHub Actions가 자동으로:
#    - 모든 AI 모델로 평가 실행
#    - 결과를 results/에 저장
#    - 웹사이트 업데이트
```

**파싱 가이드**: 상세한 파싱 방법은 [`docs/PARSER_GUIDE.md`](docs/PARSER_GUIDE.md)를 참고하세요.

#### 방법 2: 수동 YAML 작성

`exams/parsed/` 폴더에 YAML 파일을 직접 작성할 수도 있습니다:

```yaml
exam_id: 2024-ksat-math
title: 2024학년도 수학능력시험 - 수학
subject: math
year: 2024
questions:
  - question_id: q1
    question_number: 1
    question_text: "다음 중 옳은 것은?"
    choices: ["1", "2", "3", "4", "5"]
    correct_answer: "3"
    points: 2
```

### 새로운 모델 추가하기

`models/models.json` 파일에 모델 정보를 추가합니다:

```json
{
  "models": [
    {
      "name": "gpt-4-turbo",
      "provider": "openai",
      "version": "2024-01",
      "api_key_env": "OPENAI_API_KEY",
      "max_tokens": 2000,
      "timeout": 60
    }
  ]
}
```

### 로컬에서 평가 실행

```bash
# PDF 파싱
python -m src.parser.main --input exams/pdf/2024-ksat-math.pdf

# 모든 모델로 모든 시험 평가
python -m src.evaluator.main

# 특정 모델로 특정 시험 평가
python -m src.evaluator.main --model gpt-4-turbo --exam 2024-ksat-math
```

### 웹 인터페이스 로컬 실행

```bash
cd web
npm install
npm run dev
# http://localhost:3000 접속
```

## 📁 프로젝트 구조

```
KSAT-AI-Benchmark/
├── .github/
│   └── workflows/              # GitHub Actions 워크플로우
│       ├── parse-and-evaluate.yml
│       └── deploy-pages.yml
├── exams/
│   ├── pdf/                    # 원본 PDF 시험지
│   └── parsed/                 # 파싱된 YAML 파일
├── models/                     # AI 모델 설정
├── src/
│   ├── parser/                 # PDF 파싱 시스템
│   ├── evaluator/              # 평가 시스템
│   └── models/                 # 모델 인터페이스
├── results/                    # 평가 결과 YAML
├── web/                        # Next.js 프론트엔드
│   ├── app/                    # App Router 페이지
│   ├── components/             # React 컴포넌트
│   └── lib/                    # YAML 로더 등
├── docs/                       # 프로젝트 문서
└── tests/                      # 테스트 코드
```

## ⚙️ GitHub Actions 워크플로우

### 1. PDF 파싱 및 평가 (`parse-and-evaluate.yml`)

**트리거:**
- `exams/pdf/`에 새 PDF 추가
- `models/models.json` 수정
- 수동 실행

**프로세스:**
```
Job 1: PDF 파싱
  - PDF 텍스트/이미지 추출
  - YAML 생성
  - exams/parsed/에 커밋

Job 2: 모델 평가 (Job 1 완료 후)
  - YAML 로드
  - 각 모델로 문제 풀이
  - 결과 YAML 저장
  - results/에 커밋
```

### 2. 웹사이트 배포 (`deploy-pages.yml`)

**트리거:**
- `results/` 폴더 변경
- `exams/parsed/` 폴더 변경
- `web/` 폴더 변경

**프로세스:**
```
- YAML 데이터를 public/data/로 복사
- Next.js 빌드 (npm run build)
- 정적 HTML 생성
- GitHub Pages에 배포
```

## 🌐 결과 확인

평가 결과는 [GitHub Pages](https://roboco-io.github.io/KSAT-AI-Benchmark)에서 확인할 수 있습니다.

### 주요 페이지

#### 1. 리더보드 (메인)
- 모델별 전체 순위 테이블
- 과목별 점수 필터링
- 정답률과 평균 풀이 시간

#### 2. 문제 목록 페이지
- 시험의 모든 문제 표시
- 각 문제별로 모든 모델의 답안 그리드
- 정답(초록) / 오답(빨강) 색상 구분
- 답안 클릭 → 상세 모달 팝업

#### 3. 답안 상세 모달
- 선택한 답안
- **답변 선택 이유** (전체 설명)
- 풀이 소요 시간
- 획득 점수

#### 4. 모델별 상세 페이지
- 해당 모델의 전체 성적
- 과목별 탭
- 문제별 정답/오답 상세
- 차트 및 통계

## 🤝 기여하기

프로젝트에 기여하는 방법:

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### 기여 가이드라인

- 새로운 시험 문제는 공개 가능한 것만 추가해주세요
- 코드는 PEP 8 스타일 가이드를 따라주세요
- 새로운 기능은 테스트 코드를 함께 작성해주세요
- 문서화를 잊지 마세요

## 📊 지원 모델

현재 지원하는 AI 모델:

| 제공사 | 모델 | 상태 |
|--------|------|------|
| **OpenAI** | GPT-4 Turbo, GPT-4, GPT-3.5 Turbo | ✅ |
| **Anthropic** | Claude 3 Opus, Sonnet, Haiku | ✅ |
| **Google** | Gemini Pro, Gemini 1.5 Pro | ✅ |
| **Upstage** | Solar Pro, Solar Mini | ✅ |
| **Perplexity** | Sonar Large, Sonar Medium | ✅ |

새로운 모델 추가 요청은 [이슈](https://github.com/roboco-io/KSAT-AI-Benchmark/issues)로 남겨주세요.

## 📋 시험 과목

- 국어
- 수학
- 영어
- 한국사
- 사회탐구
- 과학탐구

## ⚙️ 환경 변수

`.env` 파일에 다음 환경 변수를 설정해주세요:

```bash
# AI Model API Keys
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key
UPSTAGE_API_KEY=your_upstage_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key

# Evaluation Settings
MAX_RETRIES=3
TIMEOUT=60
API_CALL_DELAY=1
```

## 🧪 테스트

```bash
# 전체 테스트 실행
pytest

# 특정 테스트 실행
pytest tests/test_evaluator.py

# 커버리지 리포트
pytest --cov=src tests/
```

## 📝 라이선스

이 프로젝트는 **CC BY-NC 4.0 (Creative Commons Attribution-NonCommercial 4.0 International)** 라이선스를 따릅니다.

- ✅ **비상업적 사용**: 교육 및 연구 목적으로 자유롭게 사용 가능
- 📝 **출처 표기 필수**: 사용 시 반드시 원본 출처를 명시해야 합니다
- 🚫 **상업적 사용 금지**: 상업적 목적으로는 사용할 수 없습니다 (별도 문의 필요)

자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

### 출처 표기 예시

```
KSAT AI Benchmark by roboco-io
Licensed under CC BY-NC 4.0
Source: https://github.com/roboco-io/KSAT-AI-Benchmark
```

## 📮 연락처

- 프로젝트 링크: [https://github.com/roboco-io/KSAT-AI-Benchmark](https://github.com/roboco-io/KSAT-AI-Benchmark)
- 이슈 트래커: [https://github.com/roboco-io/KSAT-AI-Benchmark/issues](https://github.com/roboco-io/KSAT-AI-Benchmark/issues)
- 웹사이트: [https://roboco-io.github.io/KSAT-AI-Benchmark](https://roboco-io.github.io/KSAT-AI-Benchmark)

## 🙏 감사의 말

- 한국교육과정평가원 - 수능 문제 출제
- 모든 오픈소스 기여자들
- AI 모델을 제공하는 모든 기업들

## 🗺️ 로드맵

### 2025 Q4
- [x] 프로젝트 초기 설정
- [x] PDF 파싱 시스템 설계
- [x] YAML 데이터 형식 정의
- [ ] PDF 파서 구현
- [ ] 기본 평가 시스템 구현
- [ ] GitHub Actions 자동화

### 2026 Q1
- [ ] Next.js + Mantine UI 웹 인터페이스
- [ ] 문제 목록 및 답안 그리드
- [ ] 답안 상세 모달
- [ ] 과거 수능 문제 데이터베이스 확장
- [ ] 더 많은 AI 모델 지원

### 2026 Q2
- [ ] 상세 분석 리포트 기능
- [ ] 차트 및 시각화 고도화
- [ ] 다국어 시험 지원 (SAT, 가오카오 등)
- [ ] API 서비스 제공

## ⭐ Star History

이 프로젝트가 유용하다면 ⭐️를 눌러주세요!

---

**Made with ❤️ by the KSAT AI Benchmark Team**

