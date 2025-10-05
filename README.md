# 🎓 KSAT AI Benchmark

> 대한민국 수학능력시험(KSAT)으로 AI 모델의 실력을 측정합니다

[![License: CC BY-NC 4.0](https://img.shields.io/badge/License-CC%20BY--NC%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-nc/4.0/)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![GitHub Pages](https://img.shields.io/badge/GitHub-Pages-brightgreen)](https://pages.github.com/)

## 📖 소개

KSAT AI Benchmark는 대한민국 수학능력시험 문제를 활용하여 다양한 AI 모델의 문제 해결 능력을 평가하고, 그 결과를 공개적으로 공유하는 오픈소스 프로젝트입니다.

### 주요 특징

- 🤖 **다양한 AI 모델 지원**: GPT-4, Claude, Gemini 등 주요 AI 모델 평가
- 📊 **상세한 결과 분석**: 정답률뿐만 아니라 답변 이유와 소요 시간까지 기록
- ⚡ **자동화된 평가**: GitHub Actions를 통한 완전 자동화된 평가 시스템
- 🌐 **실시간 리더보드**: GitHub Pages를 통한 평가 결과 실시간 공개
- 🔄 **지속적인 업데이트**: 새로운 시험이나 모델이 추가되면 자동으로 평가

## 🎯 평가 지표

각 AI 모델은 다음 기준으로 평가됩니다:

1. **정답률**: 정답을 맞힌 문제의 비율
2. **답변 근거**: 해당 답을 선택한 이유와 논리
3. **풀이 시간**: 각 문제를 푸는데 소요된 시간
4. **과목별 성적**: 국어, 수학, 영어, 탐구 영역별 점수

## 🚀 빠른 시작

### 필요 조건

- Python 3.10 이상
- Node.js 18 이상 (웹 인터페이스 개발 시)
- AI 모델 API 키 (OpenAI, Anthropic, Google 등)

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

`exams/` 폴더에 JSON 형식의 시험 파일을 추가합니다:

```json
{
  "exam_id": "2024-ksat-math",
  "title": "2024학년도 수학능력시험 - 수학",
  "subject": "math",
  "year": 2024,
  "questions": [
    {
      "question_id": "q1",
      "question_text": "다음 중 옳은 것은?",
      "choices": ["1", "2", "3", "4", "5"],
      "correct_answer": "3",
      "difficulty": "medium"
    }
  ]
}
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
# 모든 모델로 모든 시험 평가
python -m src.evaluator.main

# 특정 모델로 특정 시험 평가
python -m src.evaluator.main --model gpt-4-turbo --exam 2024-ksat-math
```

## 📁 프로젝트 구조

```
KSAT-AI-Benchmark/
├── .github/
│   └── workflows/          # GitHub Actions 워크플로우
├── exams/                  # 시험 문제 데이터
├── models/                 # AI 모델 설정
├── src/
│   ├── evaluator/         # 평가 시스템 코어
│   └── models/            # 모델 인터페이스
├── results/               # 평가 결과 (자동 생성)
├── web/                   # 웹 프론트엔드
├── docs/                  # 프로젝트 문서
└── tests/                 # 테스트 코드
```

## 🔄 자동화 워크플로우

이 프로젝트는 GitHub Actions를 통해 완전히 자동화되어 있습니다:

1. **새로운 시험 추가 감지**: `exams/` 폴더에 새 파일이 추가되면
2. **새로운 모델 추가 감지**: `models/models.json`이 수정되면
3. **자동 평가 실행**: 등록된 모든 모델로 자동으로 문제 풀이
4. **결과 저장**: 평가 결과를 `results/` 폴더에 저장
5. **웹사이트 업데이트**: GitHub Pages에 최신 결과 반영

## 🌐 결과 확인

평가 결과는 [GitHub Pages](https://roboco-io.github.io/KSAT-AI-Benchmark)에서 확인할 수 있습니다.

### 리더보드

- 전체 모델 순위
- 과목별 점수 비교
- 평균 풀이 시간

### 상세 결과

- 모델별 문제 풀이 과정
- 각 문제에 대한 답변 이유
- 시험별 정답률 분석

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

- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku
- **Google**: Gemini Pro, Gemini Ultra
- **Meta**: Llama 2, Llama 3
- 기타 OpenAI API 호환 모델

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
# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Anthropic
ANTHROPIC_API_KEY=your_anthropic_api_key

# Google
GOOGLE_API_KEY=your_google_api_key

# 기타 설정
MAX_RETRIES=3
TIMEOUT=60
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
- [ ] 기본 평가 시스템 구현
- [ ] GitHub Actions 자동화
- [ ] 웹 인터페이스 v1.0

### 2026 Q1
- [ ] 과거 수능 문제 데이터베이스 확장
- [ ] 더 많은 AI 모델 지원
- [ ] 상세 분석 리포트 기능

### 2026 Q2
- [ ] 다국어 시험 지원 (SAT 등)
- [ ] API 서비스 제공
- [ ] 커뮤니티 기여 시스템

## ⭐ Star History

이 프로젝트가 유용하다면 ⭐️를 눌러주세요!

---

**Made with ❤️ by the KSAT AI Benchmark Team**

