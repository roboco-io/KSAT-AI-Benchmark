# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current SDK Benchmark Path

The active 2026 evaluation uses `benchmark/run.mjs`, `models.mjs`, provider SDK adapters and `benchmark/export.mjs`. The legacy Python evaluator below is for archived results. New SDK adapters do not inherit `BaseModel` and must not use `.env` API keys.

- Subscription-only authentication. No API key, paid provider, purchased-credit fallback or automatic billing route.
- Codex: verify ChatGPT included allowance and no purchased credits before each request.
- Claude: require first-party OAuth subscription plus fresh, account-bound confirmation that Settings → Usage credits is OFF. Confirmation is private and expires in30minutes.
- Authenticate before releasing prompts; never pass answer keys or other model answers to a solver.
- Preserve submitted answers and abstentions; grade separately. A billing/quota violation cancels siblings and stops future batches.
- `benchmark/export.mjs` creates version3 comparison data; Next.js imports it at build time for GitHub Pages at `https://roboco.io/KSAT-AI-Benchmark/`.
- Existing user modifications in the 2025 math exam and results must remain untouched.
- Run offline verification with `npm test --prefix benchmark`; never run solver scripts in tests or GitHub Actions.

## Project Overview

KSAT AI Benchmark is an open-source project that evaluates AI models using Korean SAT (KSAT) exam questions. The system automates the full pipeline from PDF parsing to web deployment.

**Project Philosophy - Vibe Coding Approach**:
- **Human-Centered Evaluation**: Measuring AI capabilities through standardized human exams (Korean SAT) rather than synthetic benchmarks
- **Real-World Assessment**: Using actual exam questions that require reasoning, comprehension, and problem-solving abilities
- **Vibe Coding**: Building evaluation infrastructure that feels natural and intuitive, automating the tedious parts while maintaining transparency
- **Continuous Benchmarking**: Tracking how latest AI models perform on the same standardized tests humans take

**Pipeline**: PDF Upload → Vision API Parsing → YAML Generation → Model Evaluation → Results Storage → Web Deployment

**Key Technologies**:
- Python 3.10+ for parsing and evaluation
- GPT-4o Vision API for intelligent PDF parsing (equations, graphs, complex layouts)
- Next.js + Mantine UI for the web leaderboard
- GitHub Actions for automation

## Essential Commands

### Development Setup
```bash
# Install Python dependencies
make install
# or
pip install -r requirements.txt

# Create .env file from template
make env
# Then edit .env with your API keys
```

### PDF Parsing

**⚠️ 중요: 파싱은 연 1회 작업입니다**
- 파싱된 YAML 파일은 모든 모델이 공유합니다
- Claude Code를 사용한 수동 파싱 권장 (자동화 스크립트 제거됨)
- **파싱 가이드**: `PARSING_GUIDE.md` 참조

```bash
# Claude Code로 PDF를 YAML로 변환
# 1. Claude Code 실행
code .

# 2. 프롬프트 예시:
# "다음 KSAT 시험 PDF를 Optimized Schema YAML로 파싱해주세요:
#  파일: exams/pdf/2025/국어영역_문제지_홀수형.pdf
#  출력: exams/parsed/2025-korean-sat.yaml
#  참고: PARSING_GUIDE.md의 Optimized Schema 구조를 따라주세요."

# 3. 검증
make validate
```

**두 가지 스키마 지원**:
- **Optimized Schema**: 지문 중앙 관리 (국어/사회 - 권장, 40% 크기 절감)
- **Legacy Schema**: 각 문제에 지문 포함 (수학/영어)

자세한 파싱 방법은 `PARSING_GUIDE.md`를 참조하세요.

### Evaluation

**Flexible Evaluation System (Recommended)**:
```bash
# Syntax: make <model> <year> <subject>
# - model: gpt-5, gpt-4o, claude-opus-4-1, claude-sonnet-4-5, gemini-2.5-pro, solar-pro, sonar-pro, all
# - year: 2025, 2024, all
# - subject: korean, math, english, korean,math (comma-separated), all

# Examples:
make gpt-5 2025 korean,math           # GPT-5 on 2025 Korean + Math
make claude-opus-4-1 2025 korean      # Claude Opus 4.1 on 2025 Korean
make claude-sonnet-4-5 2025 math      # Claude Sonnet 4.5 on 2025 Math
make gemini-2.5-pro 2025 korean       # Gemini 2.5 Pro on 2025 Korean
make all 2025 all                      # All models on all 2025 subjects
make gpt-4o all korean                 # GPT-4o on all years Korean

# After evaluation, summary is automatically displayed
```

**로그 모드 (기본값: 상세 로그)**:
```bash
# 기본값: 상세 로그 모드 (자동 활성화)
make gpt-5 2025 korean                   # GPT-5로 2025 국어 평가 (상세 로그)
make claude-opus-4-1 2025 all            # Claude Opus 4.1로 모든 과목 (상세 로그)

# 간단한 로그만 표시 (SIMPLE 모드)
SIMPLE=1 make gpt-5 2025 korean          # 간단한 로그만 표시
SIMPLE=1 make all 2025 all               # 모든 평가에 간단한 로그 적용

# 또는 직접 Python 실행
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-4o --verbose
# 단축 옵션: -v
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-4o -v

# 로그 출력:
# - 콘솔: 문제별 요약 로그 (🐛 마크)
# - 파일: logs/{exam_id}_{model_name}_{timestamp}.log (상세 로그)

# 로그 파일 내용:
# - 문제별 상세 정보 (지문, 질문, 선택지)
# - API 요청 내용
# - API 응답 내용 (선택한 답, 정답, 이유)
# - 소요 시간
# - 정답 여부
```

**Traditional Evaluation Commands**:
```bash
# Evaluate with single model
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-4o

# Evaluate specific questions only (useful for testing/debugging, saves API costs)
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-5 --questions "1-5"      # Questions 1-5
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-5 -q "1,3,5"             # Questions 1, 3, 5
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-5 -q "1-3,7,10-12"       # Questions 1-3, 7, 10-12

# Evaluate with verbose mode
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-4o --verbose

# Evaluate with all models
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --all-models

# Evaluate all exams with all models
python src/evaluator/evaluate.py --all --all-models

# Makefile shortcuts
make evaluate EXAM=exams/parsed/2025-korean-sat.yaml MODEL=gpt-4o
make evaluate-all EXAM=exams/parsed/2025-korean-sat.yaml
make evaluate-all-exams
```

### Web Development
```bash
# Start Next.js dev server
cd web && npm run dev
# or
make web-dev

# Build for production
cd web && npm run build
# or
make web-build
```

### Results Analysis & Summary
```bash
# Basic summary with leaderboard
make summary

# Detailed analysis (by subject, with statistics)
make summary-detailed

# Leaderboard only
make leaderboard

# Analyze specific model
make summary-model MODEL=gpt-5

# Analyze specific subject
make summary-subject SUBJECT=korean

# Analyze specific year
make summary-year YEAR=2025

# Python CLI with filters
python src/evaluator/summary.py --detailed
python src/evaluator/summary.py --model gpt-5 --subject korean
python src/evaluator/summary.py --year 2025 --leaderboard
```


### Testing & Validation
```bash
# Run tests
pytest
# or
make test

# Validate YAML files
make validate

# Lint code
make lint
```

## Architecture

### Core Components

**1. YAML Schema** (`exams/parsed/*.yaml`)
- Two schema types: Optimized (passages-based) and Legacy (inline passages)
- Manual parsing using Claude Code (recommended for annual SAT releases)
- See `PARSING_GUIDE.md` for detailed parsing instructions

**Parsing Approach**:
```
PDF → Claude Code Manual Parsing → YAML (Optimized/Legacy Schema) → exams/parsed/*.yaml
```

**2. Evaluator System** (`src/evaluator/`)
- `evaluate.py`: Main CLI for evaluation with parallel processing support
- `evaluator.py`: Core evaluation engine that orchestrates the process
  - **Passages Schema Support**: Automatically handles both legacy (inline passage) and optimized (passage_id reference) schemas
  - `passages_map`: Maps passage_id → passage_text for efficient lookup (built once per exam)
  - `load_exam()`: Builds passage map from passages section if present
  - `_solve_single_question()`: Resolves passage_id references before sending to model
  - **Parallel Processing**: ThreadPoolExecutor for 3-5x speedup (default: 10 workers)
  - **Debug Logging**: Optional detailed logging with `--verbose` flag
- `base_model.py`: Abstract base class defining the model interface
  - `solve_question()`: Required method that all models must implement
  - `_build_prompt()`: Constructs prompts with question type analysis (긍정형/부정형)
  - `_extract_json_from_text()`: Robust JSON extraction with nested brace handling
- `models/`: Provider-specific model implementations (OpenAI, Anthropic, Google, Upstage, Perplexity)
  - Each inherits from BaseModel and implements solve_question()

**Evaluation Flow**:
```
YAML Exam → Evaluator.load_exam() → Build passages_map
          → Evaluator._solve_single_question() → Resolve passage_id
          → Model.solve_question(passage_text) → ModelResponse
          → results/*.yaml
```

**3. Model System**
- All models inherit from `BaseModel` abstract class
- Each model implements `solve_question(question_text, choices, passage) → ModelResponse`
- ModelResponse includes: answer (1-5), reasoning, time_taken, raw_response
- Configuration in `models/models.json` specifies model_id, provider, api_key_env, max_tokens, etc.

**4. Web Interface** (`web/`)
- Next.js 15 with App Router
- Mantine UI v7 for components
- Reads YAML files from `results/` and `exams/parsed/`
- Static site generation for GitHub Pages deployment

### Data Formats

**Exam YAML** (`exams/parsed/*.yaml`):

KSAT 시험 데이터는 두 가지 스키마를 지원합니다:

**1. Optimized Schema (권장 - 국어 시험):**
```yaml
exam_id: 2025-korean-sat
title: 2025학년도 수능 국어영역
subject: korean
year: 2025
parsing_info:
  method: vision
  model: gpt-4o
  parsed_at: '2025-10-07T13:09:10.698243'

# 지문 중앙 관리 (중복 제거)
passages:
  - passage_id: p1
    passage_text: "밑줄 긋기는 일상적으로 유용하게 활용할 수 있는 독서 전략이다..."
    question_numbers: [1, 2, 3]  # 참고용

  - passage_id: p2
    passage_text: "(가) 서양의 과학과 기술, 철학과 수용은..."
    question_numbers: [4, 5, 6, 7, 8, 9]

# 문제들은 passage_id로 지문 참조
questions:
  - question_id: q1
    question_number: 1
    question_text: "윗글의 내용과 일치하지 않는 것은?"
    passage_id: p1  # 지문 참조
    choices: ["선택지1", "선택지2", ...]
    correct_answer: 3  # 1-5
    points: 2
    explanation: null

  - question_id: q2
    question_number: 2
    question_text: "㉠에 해당하는 내용으로 가장 적절한 것은?"
    passage_id: p1  # 같은 지문 재사용
    choices: [...]
    correct_answer: 4
    points: 2
    explanation: null
```

**장점:**
- 지문 중복 제거로 파일 크기 **40% 절감** (국어: 73KB → 43KB)
- 같은 지문을 공유하는 문제 그룹 명확히 표현
- 평가 시 토큰 사용량 약 **70% 절감** 가능
- 지문 수정 시 한 곳만 변경하면 모든 문제에 반영

**2. Legacy Schema (기존 - 수학/영어):**
```yaml
exam_id: 2025-math-sat
title: 2025학년도 수능 수학영역
subject: math
year: 2025
parsing_info:
  method: vision
  model: gpt-4o
  parsed_at: '2025-10-06T00:08:47.744859'

questions:
  - question_id: q1
    question_number: 1
    question_text: "문제 텍스트"
    passage: "지문 전체 텍스트 (선택적)"  # 직접 포함
    choices: ["선택지1", "선택지2", ...]
    correct_answer: 3  # 1-5
    points: 2
    explanation: null
```

**호환성:**
- Evaluator는 두 스키마를 자동으로 감지하고 처리
- `passage` 필드 우선, 없으면 `passage_id`로 조회
- 기존 결과 파일과 100% 호환

**Result YAML** (`results/{exam_id}/{model_name}.yaml`):
```yaml
exam_id: 2025-korean-sat
model_name: gpt-4o
evaluated_at: '2025-10-06T09:33:22.747536'
summary:
  total_questions: 49
  correct_answers: 10
  accuracy: 20.41
  total_score: 24
  max_score: 121
results:
  - question_id: q1
    question_number: 1
    answer: 2  # Model's answer
    correct_answer: 3
    is_correct: false
    reasoning: "모델의 답변 선택 이유"
    time_taken: 4.96
    points: 2
    earned_points: 0
```

**Model Configuration** (`models/models.json`):
```json
{
  "models": [
    {
      "name": "gpt-4o",
      "provider": "openai",
      "model_id": "gpt-4o",
      "api_key_env": "OPENAI_API_KEY",
      "max_tokens": 4096,
      "temperature": 0.3,
      "enabled": true
    }
  ]
}
```

## Supported Models

### Currently Active Models (enabled: true)

**OpenAI**:
- `gpt-5` - GPT-5 (2025) - 수학/과학 능력 대폭 향상
- `gpt-4o` - GPT-4o (2024-08) - 최신 멀티모달 모델

**Anthropic**:
- `claude-opus-4-1` - Claude Opus 4.1 (2025-08) - 에이전트, 코딩, 추론 능력 강화

**Claude via Perplexity API**:
- `claude-sonnet-4-5` - Claude Sonnet 4.5 (2025) - 최신 추론 및 코딩 능력 (Perplexity Pro 필요)

**Google**:
- `gemini-2.5-pro` - Gemini 2.5 Pro (2025-01) - 가장 강력한 Gemini 모델

**Upstage**:
- `solar-pro` - Solar Pro - 한국어 특화 모델

**Perplexity**:
- `sonar-pro` - Sonar Pro (2024-11) - 최신 모델

### Available Models (enabled: false)

**OpenAI**:
- `gpt-4-turbo` - GPT-4 Turbo Preview
- `gpt-4` - GPT-4 기본 모델
- `gpt-3.5-turbo` - GPT-3.5 Turbo

**Anthropic**:
- `claude-3-5-sonnet` - Claude 3.5 Sonnet (2024-10)
- `claude-3-opus` - Claude 3 Opus
- `claude-3-sonnet` - Claude 3 Sonnet
- `claude-3-haiku` - Claude 3 Haiku

**Google**:
- `gemini-2.0-flash-exp` - Gemini 2.0 Flash (Experimental)
- `gemini-1.5-pro` - Gemini 1.5 Pro
- `gemini-pro` - Gemini Pro

**Upstage**:
- `solar-mini` - Solar Mini

**Perplexity**:
- `sonar-large` - Sonar Large (온라인 검색 기능)
- `sonar-medium` - Sonar Medium

## Adding New Models

### Quick Start
1. Add model configuration to `models/models.json`:
   ```json
   {
     "name": "new-model",
     "provider": "existing_provider",
     "model_id": "actual-api-model-id",
     "api_key_env": "PROVIDER_API_KEY",
     "max_tokens": 4096,
     "temperature": 0.3,
     "enabled": true
   }
   ```
2. Set API key in `.env` file
3. Test: `make new-model 2025 korean`

### For New Providers
1. Create `src/evaluator/models/{provider}_model.py`:
   ```python
   from ..base_model import BaseModel, ModelResponse

   class NewProviderModel(BaseModel):
       def solve_question(self, question_text, choices, passage=None, **kwargs):
           # Implement API call logic
           # Return ModelResponse with answer (1-5), reasoning, time_taken
   ```
2. Register in `src/evaluator/evaluator.py` provider_map:
   ```python
   provider_map = {
       'openai': OpenAIModel,
       'new_provider': NewProviderModel,  # Add here
   }
   ```
3. Add to `models/models.json` and test

### Model Interface Requirements
- MUST inherit from `BaseModel`
- MUST implement `solve_question()` returning `ModelResponse`
- Response MUST include: `answer` (int 1-5), `reasoning` (str), `time_taken` (float)
- Handle errors gracefully with `success=False` and error message
- Use `_build_prompt()` helper for consistent prompt formatting
- Use `_extract_json_from_text()` for robust JSON parsing from model responses

## Critical Patterns

**Model Interface Contract**:
- All models MUST inherit from `BaseModel` (src/evaluator/base_model.py:26)
- MUST implement `solve_question()` returning `ModelResponse`
- Response MUST include: answer (int 1-5), reasoning (str), time_taken (float)
- Handle errors gracefully with `success=False` and error message
- **Question Type Detection**: BaseModel automatically detects 긍정형/부정형 questions and includes this in prompts

**Parsing Strategy**:
- Manual parsing using Claude Code (연 1회 작업)
- Optimized Schema for passage-heavy subjects (Korean, Social) - 40% size reduction
- Legacy Schema for independent questions (Math, English)
- See `PARSING_GUIDE.md` for detailed instructions

**Schema Compatibility**:
- Evaluator automatically detects schema type (evaluator.py:96-103)
- `passages_map` built once per exam for efficient passage lookup
- Both `passage` field and `passage_id` reference are supported
- Priority: Direct `passage` field → `passage_id` reference → None

**Evaluation Concurrency**:
- **Parallel Processing** (default): ThreadPoolExecutor with 10 workers for 3-5x speedup
- **Sequential Mode** (optional): Use `SEQUENTIAL=1` for debugging or rate limit issues
- Time tracking: Starts before API call, ends after response parsing
- Retry logic: Exponential backoff via tenacity package (MAX_RETRIES=3)
- Progress tracking: Real-time output of question results as they complete

**Result Storage & Automatic Deployment**:
- Results stored per exam per model: `results/{exam_id}/{model_name}.yaml`
- Enables incremental evaluation and re-evaluation of specific models
- **Frontend is fully automated**: Just push to `results/`, GitHub Actions handles the rest
  - `.github/workflows/deploy-pages.yml` triggers on `results/**` changes
  - Runs `scripts/export_data.py` to convert YAML → JSON
  - Builds Next.js website with updated data
  - Deploys to GitHub Pages automatically
- **Zero frontend maintenance**: Subject tabs, leaderboards, stats auto-update from `results/`
- **Subject-based leaderboards**: Auto-generated for korean, math, english from YAML metadata

## Environment Variables

Required API keys (set in `.env`):
- `OPENAI_API_KEY` - OpenAI models (GPT-4, GPT-3.5)
- `ANTHROPIC_API_KEY` - Anthropic models (Claude)
- `GOOGLE_API_KEY` - Google models (Gemini)
- `UPSTAGE_API_KEY` - Upstage models (Solar)
- `PERPLEXITY_API_KEY` - Perplexity models (Sonar)

Optional settings:
- `MAX_RETRIES=3` - API retry attempts
- `TIMEOUT=60` - API timeout in seconds
- `API_CALL_DELAY=1` - Delay between API calls

## Code Style

- Follow PEP 8 style guide
- Use `black` for formatting: `black src/`
- Use `flake8` for linting: `flake8 src/`
- Type hints recommended with `mypy`
- Commit messages: `<type>: <description>` (feat, fix, docs, style, refactor, test, chore)

## Testing

- Tests in `tests/` directory
- Run with `pytest` or `make test`
- Write tests for new model implementations and parsing logic
- Test coverage with `pytest --cov=src tests/`

## Troubleshooting

### Common Issues

**Model Evaluation Errors**:
- Check API keys for all providers in `.env`
- Verify model is enabled in `models/models.json` (`"enabled": true`)
- Check rate limits - add delays with `API_CALL_DELAY` in `.env`
- Review logs for specific API error messages

**YAML Validation Errors**:
- Run `make validate` to check all YAML files
- Ensure `correct_answer` is integer 1-5, not string
- Verify all required fields exist: question_id, question_text, choices
- Check for proper UTF-8 encoding in Korean text

**Result File Not Found**:
- Ensure evaluation completed successfully (check exit code)
- Verify directory structure: `results/{exam_id}/{model_name}.yaml`
- Run `make summary` to see available results

### Debug Tips

**Verbose Logging**:
```bash
# Enable detailed logging (file + console)
make gpt-5 2025 korean  # Verbose mode is default now
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-4o --verbose

# Log file location: logs/{exam_id}_{model_name}_{timestamp}.log
# Includes: question details, API requests/responses, timing, reasoning
```

**Simple Logging**:
```bash
# Minimal console output only
SIMPLE=1 make gpt-5 2025 korean
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-4o  # No --verbose flag
```

**Test Specific Questions**:
```bash
# Test only questions 1-5 (saves API costs)
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-4o -q "1-5"

# Test specific questions: 1, 3, 5
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-4o -q "1,3,5"

# Test questions 1-3, 7, and 10-12
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-4o -q "1-3,7,10-12"
```

**Sequential Mode (Debugging)**:
```bash
# Disable parallel processing for debugging
SEQUENTIAL=1 make gpt-5 2025 korean

# Adjust max workers
MAX_WORKERS=5 make gpt-5 2025 korean
```

**Test Rapid Evaluation**:
```bash
# Uses pre-configured test file (2 questions only)
make evaluate-test
```
