# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
```bash
# Text-based parsing (Korean, Social Studies, etc.)
python src/parser/parse_exam.py exams/pdf/2025/국어영역_문제지_홀수형.pdf

# Vision API parsing (Math, Science - for equations/graphs)
python src/parser/parse_exam.py exams/pdf/2025/수학영역_문제지_홀수형.pdf --vision

# Parse answer key and inject into exam YAML
python src/parser/parse_answer_key.py \
  exams/pdf/2025/수학영역_정답표.pdf \
  exams/parsed/2025-math-sat.yaml

# Makefile shortcuts
make korean    # Parse + inject answers for Korean
make math      # Parse + inject answers for Math
make all       # Process all subjects
```

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

**Traditional Evaluation Commands**:
```bash
# Evaluate with single model
python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-4o

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

**1. Parser System** (`src/parser/`)
- `parse_exam.py`: Main CLI for PDF parsing
- `llm_parser.py`: LLM-based parsing engine using GPT-4o Vision API
- `json_to_yaml.py`: JSON to YAML converter
- `parse_answer_key.py`: Answer key parser that injects correct_answer into exam YAML

**Parsing Flow**:
```
PDF → LLM Parser (GPT-4o Vision) → JSON → YAML Converter → exams/parsed/*.yaml
```

**2. Evaluator System** (`src/evaluator/`)
- `evaluate.py`: Main CLI for evaluation
- `evaluator.py`: Core evaluation engine that orchestrates the process
- `base_model.py`: Abstract base class defining the model interface
- `models/`: Provider-specific model implementations (OpenAI, Anthropic, Google, Upstage, Perplexity)

**Evaluation Flow**:
```
YAML Exam → Evaluator → Model Instance → solve_question() → ModelResponse → results/*.yaml
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
```yaml
exam_id: 2025-korean-sat
title: 2025학년도 수능 KOREAN
subject: korean
year: 2025
parsing_info:
  method: vision
  model: gpt-4o
  parsed_at: '2025-10-06T00:08:47.744859'
questions:
  - question_id: q1
    question_number: 1
    question_text: "문제 텍스트"
    passage: "지문 (선택적)"
    choices: ["선택지1", "선택지2", ...]
    correct_answer: 3  # 1-5
    points: 2
    explanation: null
```

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

1. Add model configuration to `models/models.json`
2. If a new provider, create `src/evaluator/models/{provider}_model.py` implementing `BaseModel`
3. Register in `src/evaluator/evaluator.py` provider_map
4. Set API key in `.env` file
5. Enable the model by setting `"enabled": true` in models.json
6. Test with `make evaluate EXAM=<path> MODEL=<model_name>`

## Critical Patterns

**Model Interface Contract**:
- All models MUST inherit from `BaseModel`
- MUST implement `solve_question()` returning `ModelResponse`
- Response MUST include: answer (int 1-5), reasoning (str), time_taken (float)
- Handle errors gracefully with `success=False` and error message

**Parsing Strategy**:
- Text-based subjects (Korean, English): Direct text extraction
- Visual subjects (Math, Science): Use `--vision` flag for GPT-4o Vision API
- Complex equations: Parsed as LaTeX in YAML
- Answer injection: Separate workflow using `parse_answer_key.py`

**Evaluation Concurrency**:
- Models evaluate questions sequentially to respect rate limits
- Time tracking starts before API call, ends after response parsing
- Retry logic with exponential backoff (via tenacity package)

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

**Vision API Parsing Failures**:
- Ensure `OPENAI_API_KEY` is set in `.env`
- Check PDF quality - low resolution images may fail
- For complex math equations, use `--vision` flag explicitly
- Verify API rate limits haven't been exceeded

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

**Verbose Evaluation**:
```bash
# Run evaluation with Python verbose mode
python -v src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml --model gpt-4o
```

**Check Parsing Output**:
```bash
# Keep intermediate JSON files for inspection
python src/parser/parse_exam.py <pdf> --keep-json
# JSON saved in same directory as output YAML
```

**Test Single Question**:
```bash
# Create minimal test YAML with 1-2 questions
make evaluate-test
# Uses 2025-math-sat-p1-2.yaml (2 questions only)
```
