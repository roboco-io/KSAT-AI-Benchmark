# 🎓 KSAT AI Benchmark

> 대한민국 수학능력시험(KSAT)으로 AI 모델의 실력을 측정합니다

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-brightgreen)](https://roboco.io/KSAT-AI-Benchmark/)

**🌐 리더보드 바로가기:** [https://roboco.io/KSAT-AI-Benchmark/](https://roboco.io/KSAT-AI-Benchmark/)

## 📖 소개

KSAT AI Benchmark는 대한민국 수학능력시험 문제를 활용하여 다양한 AI 모델의 문제 해결 능력을 평가하고, 그 결과를 공개적으로 공유하는 오픈소스 프로젝트입니다.

### 🎯 프로젝트 철학

**인간 중심의 AI 평가 (Human-Centered AI Evaluation)**

기존의 AI 벤치마크들은 대부분 AI를 위해 설계된 합성 데이터셋이나 특정 태스크에 최적화된 문제들을 사용합니다. 하지만 우리는 다른 접근을 택했습니다:

- **진짜 인간이 보는 시험으로 평가**: 대한민국 고등학생들이 실제로 치르는 수능 문제로 AI를 평가합니다
- **표준화된 측정**: 매년 동일한 난이도와 형식으로 출제되는 수능은 AI 능력의 일관된 비교 기준을 제공합니다
- **종합적 사고력 요구**: 단순 암기가 아닌 독해력, 추론력, 문제해결력을 종합적으로 평가합니다
- **투명한 벤치마킹**: 모든 문제, 답변, 채점 과정이 공개되어 누구나 검증 가능합니다

**Vibe Coding: 자연스러운 개발 경험**

이 프로젝트는 "Vibe Coding" 철학으로 구축되었습니다:

- **자연스러운 워크플로우**: `make korean`, `make gpt-5 2025 korean` 같은 직관적인 명령어
- **지능형 자동화**: Vision API로 PDF를 파싱하고, GitHub Actions로 평가를 자동화
- **즉각적인 피드백**: 평가 후 바로 리더보드와 상세 분석 결과 제공
- **확장 가능한 설계**: 새 모델, 새 시험을 쉽게 추가할 수 있는 구조

**지속적인 AI 발전 추적**

- 엄선된 최신 모델 6종으로 집중 벤치마킹
  - **OpenAI**: GPT-5, GPT-4o
  - **Anthropic**: Claude Opus 4.1, Claude Sonnet 4.5 (via Perplexity)
  - **Upstage**: Solar Pro (한국어 특화)
  - **Perplexity**: Sonar Pro
- 동일한 시험으로 시간에 따른 AI 발전을 객관적으로 비교
- 과목별(국어, 수학, 영어), 영역별(언어이해, 수리추론, 문제해결) 강점과 약점 파악

> **⚠️ Google Gemini 2.5 Pro 제외 사유**
> Google의 안전 필터가 한국어 수능 문제 콘텐츠를 유해 콘텐츠로 오인하여 대부분의 문제에서 SAFETY 응답(finish_reason=2)을 반환합니다. BLOCK_NONE 설정에도 불구하고 정상적인 평가가 불가능하여 벤치마크에서 제외하였습니다.

### 주요 특징

- 🤖 **Vision API 기반 지능형 파싱**: GPT-4o Vision으로 복잡한 수식, 그래프, 2단 레이아웃 완벽 처리
- 🎯 **엄선된 최신 AI 모델**: GPT-5, GPT-4o, Claude Opus 4.1, Claude Sonnet 4.5, Solar Pro, Sonar Pro
- 📊 **상세한 결과 분석**: 정답률, 답변 선택 이유, 풀이 시간, 과목별 등수까지 모두 기록
- ⚡ **완전 자동화 파이프라인**: PDF → Vision 파싱 → 평가 → 웹 배포까지 GitHub Actions로 자동화
- 🌐 **현대적인 웹 UI**: Next.js + Mantine UI로 구현된 인터랙티브 리더보드
- 🔄 **지속적인 업데이트**: 새로운 시험이나 모델이 추가되면 자동으로 평가하고 배포

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

**완전 자동화 파이프라인:**

```
평가 실행 → results/ 저장 → Git Push → GitHub Actions → 자동 배포
   (1)          (2)            (3)       (4)               (5)
   ✅           ✅             ✅        ✅                ✅
```

**자동화 단계:**

1. **로컬 평가**: `make gpt-5 2025 korean` 실행 → `results/` 디렉토리에 YAML 저장
2. **Git 커밋/푸시**: `results/` 변경사항을 main 브랜치에 푸시
3. **GitHub Actions 자동 실행** (`.github/workflows/deploy-pages.yml`):
   - Python으로 YAML → JSON 변환 (`scripts/export_data.py`)
   - Next.js 웹사이트 빌드
   - GitHub Pages 자동 배포
4. **웹사이트 자동 업데이트**: https://roboco.io/KSAT-AI-Benchmark/

### 🚀 GitHub Pages 활성화 방법

GitHub Actions 워크플로우가 작동하려면 GitHub Pages 설정이 필요합니다:

1. **GitHub 저장소 → Settings → Pages**
2. **Source**: "GitHub Actions" 선택
3. 저장 후 자동으로 워크플로우 실행

**수동 트리거 방법:**
- GitHub 저장소 → Actions 탭 → "Deploy to GitHub Pages" → "Run workflow"

**배포 상태 확인:**
- Actions 탭에서 워크플로우 실행 상태 확인
- 배포 완료 후 https://roboco.io/KSAT-AI-Benchmark/ 접속

### Vibe Coding in Action

**1. PDF 업로드**: `exams/pdf/`에 시험지 PDF 추가
- 수능 문제지를 그대로 업로드 (OCR 불필요)

**2. Vision API 파싱**: GPT-4o Vision으로 지능형 추출
- 복잡한 수학 수식 → LaTeX로 정확하게 변환
- 그래프, 도표 → 시각적 요소 인식 및 설명
- 2단 레이아웃 → 구조 파악 및 논리적 순서로 재배열
- 한 번의 명령: `make korean` 또는 `make math --vision`

**3. YAML 생성**: `exams/parsed/`에 구조화된 데이터 저장
- 사람이 읽기 쉬운 포맷
- 버전 관리 가능
- 재사용 및 검증 용이

**4. 모델 평가**: 각 AI 모델이 실제 시험 응시
- 문제 읽기 → 사고 → 답변 선택 → 이유 설명
- 실시간 소요 시간 측정
- 유연한 평가: `make gpt-5 2025 korean,math`

**5. 결과 저장**: `results/`에 YAML 형식으로 저장
- 모델별, 시험별 결과 분리
- 답변 이유와 시간 모두 기록
- 언제든 재분석 가능

**6. 웹 배포**: GitHub Actions로 자동 배포
- 결과 커밋 → 자동 빌드 → GitHub Pages 배포
- 실시간 리더보드 업데이트
- 과목별 등수, 상세 통계 자동 생성

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

평가 결과는 다음 링크에서 확인할 수 있습니다:

**👉 [https://roboco.io/KSAT-AI-Benchmark/](https://roboco.io/KSAT-AI-Benchmark/)**

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

> 🌟 **이 프로젝트는 개발 초기 단계입니다!**
>
> 여러분의 기여를 환영합니다. 함께 AI 벤치마킹의 새로운 표준을 만들어가요!

### 🚀 기여 프로세스

**1. 이슈 확인 또는 생성**
   - [이슈 트래커](https://github.com/roboco-io/KSAT-AI-Benchmark/issues)에서 기존 이슈 확인
   - 새로운 아이디어가 있다면 이슈 생성 후 토론
   - `good first issue` 라벨로 초보자 친화적인 태스크 찾기

**2. Fork & Clone**
   ```bash
   # Repository fork 후
   git clone https://github.com/YOUR_USERNAME/KSAT-AI-Benchmark.git
   cd KSAT-AI-Benchmark
   ```

**3. 개발 환경 설정**
   ```bash
   # Python 의존성 설치
   make install

   # .env 파일 생성 및 API 키 설정
   make env
   code .env  # API 키 입력

   # 개발 도구 설치
   make dev-install
   ```

**4. Feature Branch 생성**
   ```bash
   git checkout -b feature/amazing-feature
   # 또는
   git checkout -b fix/bug-description
   ```

**5. 개발 및 테스트**
   ```bash
   # 코드 작성

   # 테스트 실행
   make test

   # 코드 포맷팅
   make format

   # Linting
   make lint
   ```

**6. 커밋 & 푸시**
   ```bash
   git add .
   git commit -m "feat: 멋진 기능 추가"
   git push origin feature/amazing-feature
   ```

**7. Pull Request 생성**
   - GitHub에서 PR 생성
   - 제목: 명확하고 간결하게 (예: `feat: 과목별 리더보드 탭 추가`)
   - 설명: 변경 사항, 테스트 방법, 스크린샷(UI 변경 시) 포함

---

### 📋 기여 가이드라인

#### 🆕 새로운 시험 추가
- ✅ 공개 가능한 시험 문제만 추가 (저작권 확인 필수)
- ✅ Vision API 파싱 후 반드시 수동 검증
- ✅ 정답표 파싱 후 샘플 평가로 검증
- 📁 위치: `exams/pdf/YYYY/과목영역_문제지_홀수형.pdf`

#### 🤖 새로운 모델 추가
- ✅ `models/models.json`에 설정 추가
- ✅ `src/evaluator/models/`에 provider 구현 (새 provider인 경우)
- ✅ 최소 1개 시험으로 테스트 후 PR
- 📝 README.md의 모델 목록 업데이트

#### 💻 코드 기여
- ✅ **PEP 8** 스타일 가이드 준수
- ✅ 새 기능은 **테스트 코드** 함께 작성
- ✅ `CLAUDE.md` 업데이트 (중요한 변경사항의 경우)
- ✅ **Vibe Coding** 철학 유지:
  - 직관적인 명령어와 API
  - 지능형 자동화
  - 투명한 프로세스

#### 📚 문서화
- 📖 **README.md**: 사용자 관점의 가이드
- 🔧 **CLAUDE.md**: 개발자 관점의 가이드
- 💬 **코드 주석**: 복잡한 로직은 설명 추가
- 🌐 **한국어 우선**: 문서는 한국어로 작성

#### 🎨 프론트엔드 기여
- ✅ Next.js 15 + App Router 사용
- ✅ Mantine UI v7 컴포넌트 활용
- ✅ 반응형 디자인 (모바일 지원)
- ✅ 접근성(a11y) 고려

---

### 🏗️ 주요 기여 영역

#### 🔥 긴급 (High Priority)
- [ ] **GitHub Actions 워크플로우 구현** - 자동 배포 파이프라인
- [ ] **웹사이트 UI/UX 개선** - 과목별 탭, 차트, 필터
- [ ] **모델 추가** - 최신 AI 모델 벤치마킹

#### ⚡ 중요 (Medium Priority)
- [ ] **PDF 파싱 개선** - 정확도 향상, 오류 처리
- [ ] **테스트 커버리지** - 단위 테스트, 통합 테스트 추가
- [ ] **성능 최적화** - 평가 속도, 웹 로딩 시간

#### 💡 개선 (Nice to Have)
- [ ] **다국어 시험 지원** - SAT, 가오카오 등
- [ ] **API 서비스** - 평가 결과 조회 API
- [ ] **차트 & 시각화** - 성능 추이, 비교 그래프

---

### 🐛 버그 리포트

버그를 발견하셨나요? [이슈를 생성](https://github.com/roboco-io/KSAT-AI-Benchmark/issues/new)해주세요!

**포함할 내용:**
- 🔍 **재현 방법**: 단계별 설명
- 🎯 **예상 동작**: 어떻게 작동해야 하는지
- 💥 **실제 동작**: 실제로 어떻게 작동하는지
- 🖼️ **스크린샷**: 가능하면 첨부
- 🔧 **환경**: OS, Python 버전, Node.js 버전

---

### 💬 질문 & 토론

- 💡 아이디어 제안: [Discussions](https://github.com/roboco-io/KSAT-AI-Benchmark/discussions)
- 🐛 버그 리포트: [Issues](https://github.com/roboco-io/KSAT-AI-Benchmark/issues)
- 📧 직접 연락: [이메일](mailto:contact@roboco.io)

---

### 🙌 기여자 행동 강령

- 🤝 **존중**: 모든 기여자를 존중합니다
- 🌈 **포용**: 다양한 배경과 관점을 환영합니다
- 🎯 **건설적**: 피드백은 건설적이고 구체적으로
- 🚀 **협력**: 함께 성장하는 커뮤니티

**함께 만들어가요!** 작은 기여도 큰 영향을 만듭니다. 💪

## 📊 벤치마크 대상 모델

**현재 활성화된 모델 (7종)**:

| 제공사 | 모델 | 버전 | 특징 |
|--------|------|------|------|
| **OpenAI** | GPT-5 | 2025 | 수학/과학 능력 대폭 향상 |
| **OpenAI** | GPT-4o | 2024-08 | 최신 멀티모달 모델 |
| **Anthropic** | Claude Opus 4.1 | 2025-08 | 에이전트, 코딩, 추론 강화 |
| **Anthropic** | Claude Sonnet 4.5 | 2025 | Perplexity API로 제공 |
| **Google** | Gemini 2.5 Pro | 2025-01 | 가장 강력한 Gemini 모델 |
| **Upstage** | Solar Pro | 2024 | 한국어 특화 모델 |
| **Perplexity** | Sonar Pro | 2024-11 | 최신 추론 모델 |

**비활성화된 모델**: GPT-4 Turbo, GPT-4, GPT-3.5-turbo, Claude 3.5 Sonnet, Claude 3 시리즈, Gemini 2.0/1.5 시리즈, Solar Mini, Sonar 온라인 시리즈

> 💡 **모델 선정 기준**: 각 제공사의 최신/최강 모델 중심으로 엄선하여 벤치마크 효율성 극대화

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

- 📦 프로젝트 저장소: [https://github.com/roboco-io/KSAT-AI-Benchmark](https://github.com/roboco-io/KSAT-AI-Benchmark)
- 💬 이슈 트래커: [https://github.com/roboco-io/KSAT-AI-Benchmark/issues](https://github.com/roboco-io/KSAT-AI-Benchmark/issues)
- 🌐 리더보드 웹사이트: [https://roboco.io/KSAT-AI-Benchmark/](https://roboco.io/KSAT-AI-Benchmark/)

## 🙏 감사의 말

- **한국교육과정평가원** - 표준화된 고품질 평가 도구(수능) 제공
- **OpenAI, Anthropic, Google, Upstage, Perplexity** - 강력한 AI 모델과 API 제공
- **오픈소스 커뮤니티** - 이 프로젝트의 기반이 되는 수많은 도구와 라이브러리
- **모든 기여자들** - 코드, 문서, 피드백으로 프로젝트를 발전시켜주신 분들

## 💡 영감과 동기

이 프로젝트는 다음과 같은 질문에서 시작되었습니다:

> "AI가 얼마나 똑똑한지 어떻게 측정할까?"

합성 벤치마크는 AI를 위해 만들어진 것이고, 인간이 실제로 얼마나 어려운지 체감하기 어렵습니다. 그래서 우리는 **인간이 실제로 보는 시험**을 선택했습니다.

수능은 대한민국에서 가장 표준화되고, 공정하며, 종합적인 사고력을 평가하는 시험입니다. 매년 50만 명의 학생이 동일한 조건에서 응시하고, 문제의 질과 난이도가 철저히 검증됩니다.

**Vibe Coding**으로 이 벤치마크를 구축하면서, 단순히 점수를 매기는 것을 넘어 **AI가 어떻게 생각하는지**를 들여다볼 수 있게 되었습니다. 각 문제마다 AI의 답변 이유를 보면서, 인간과 AI의 사고 방식 차이를 발견하고, 앞으로 AI가 어떻게 발전해야 할지 힌트를 얻을 수 있습니다.

이 프로젝트가 AI 발전을 추적하고, AI 능력을 이해하며, 더 나은 AI를 만드는 데 작은 기여가 되길 바랍니다.

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

