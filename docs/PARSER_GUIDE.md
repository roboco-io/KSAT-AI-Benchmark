# LLM 기반 PDF 파싱 가이드

## 개요

KSAT AI Benchmark 프로젝트는 **OpenAI GPT-5 (현재 GPT-4o)** 의 Vision API를 활용하여 수능 문제지 PDF를 자동으로 파싱합니다.

### 왜 LLM 파싱인가?

수능 문제지는 다음과 같은 복잡한 특징이 있습니다:

1. **2단 레이아웃**: 좌우 2단 구성으로 텍스트 순서가 뒤섞임
2. **복잡한 수식**: LaTeX로 표현 가능한 수학 공식
3. **그래프와 도형**: 이미지로만 표현 가능한 시각 자료
4. **지문-문제 연결**: [N~M] 범위로 지문과 문제 연결
5. **다양한 기호**: ①②③④⑤, ㉠㉡㉢, 등의 특수 기호

전통적인 PDF 파싱 도구(PyPDF2, pdfplumber)는 이러한 복잡성을 처리하기 어렵지만, **LLM은 맥락을 이해하고 구조화**할 수 있습니다.

## 파싱 전략

### Option 1: 텍스트 기반 파싱 (저비용)

- **적합한 경우**: 국어, 사회, 과학 등 텍스트 중심 과목
- **장점**: 비용 저렴, 빠른 처리
- **단점**: 수식, 그래프 처리 제한적

```bash
python src/parser/parse_exam.py exams/pdf/2025/국어영역_문제지_홀수형.pdf
```

### Option 2: Vision API 파싱 (고품질) ⭐️ **추천**

- **적합한 경우**: 수학, 과학 등 수식/그래프 포함 과목
- **장점**: 수식 LaTeX 변환, 그래프 인식, 높은 정확도
- **단점**: 비용 발생 (페이지당 약 $0.01~0.05)

```bash
python src/parser/parse_exam.py exams/pdf/2025/수학영역_문제지_홀수형.pdf --vision
```

## 사용 방법

### 1. 기본 사용법

```bash
# 전체 파싱 (텍스트)
python src/parser/parse_exam.py <pdf_path>

# Vision API 사용
python src/parser/parse_exam.py <pdf_path> --vision

# 특정 페이지만
python src/parser/parse_exam.py <pdf_path> --pages 1-5
```

### 2. 상세 옵션

```bash
python src/parser/parse_exam.py <pdf_path> \
  --vision \                    # Vision API 사용
  --pages 1-10 \                # 페이지 범위
  --model gpt-4o \              # 모델 선택 (향후 gpt-5)
  --subject math \              # 과목 지정
  --year 2025 \                 # 연도 지정
  --output custom.yaml \        # 출력 경로 지정
  --keep-json                   # 중간 JSON 파일 유지
```

### 3. 실전 예시

#### 국어 영역 전체 파싱 (텍스트 기반)
```bash
python src/parser/parse_exam.py \
  exams/pdf/2025/국어영역_문제지_홀수형.pdf
```

#### 수학 영역 파싱 (Vision API)
```bash
python src/parser/parse_exam.py \
  exams/pdf/2025/수학영역_문제지_홀수형.pdf \
  --vision
```

#### 영어 영역 일부만 테스트
```bash
python src/parser/parse_exam.py \
  exams/pdf/2025/영어영역_문제지.pdf \
  --pages 1-3 \
  --keep-json
```

## 출력 형식

### YAML 구조

```yaml
exam_id: 2025-math-sat
title: 2025학년도 수능 수학영역
subject: math
year: 2025
parsing_info:
  method: vision
  model: gpt-4o
  parsed_at: '2025-10-05T15:46:00.593023'

questions:
- question_id: q1
  question_number: 1
  question_text: 함수 f(x) = x² - 8x + 7에 대하여 lim (h→0) (f(2+h) - f(2))/h 의 값은? [2점]
  passage: null
  choices:
  - '1'
  - '2'
  - '3'
  - '4'
  - '5'
  correct_answer: null  # 수동으로 입력 필요
  points: 2
  explanation: null
```

## 파싱 후 작업

### 1. 정답 입력

생성된 YAML 파일을 열고 `correct_answer` 필드에 정답을 입력합니다:

```yaml
questions:
- question_id: q1
  question_number: 1
  question_text: ...
  choices:
  - '1'
  - '2'
  - '3'
  - '4'
  - '5'
  correct_answer: 4  # ← 정답 입력
```

### 2. Git 커밋 및 푸시

```bash
git add exams/parsed/2025-math-sat.yaml
git commit -m "Add 2025 Math SAT exam"
git push
```

### 3. 자동 평가

GitHub Actions가 자동으로:
1. 새 YAML 파일 감지
2. 모든 AI 모델로 문제 풀이
3. 결과 저장 및 GitHub Pages 배포

## 파싱 품질 검증

### 체크리스트

파싱 결과를 검토할 때 다음 항목을 확인하세요:

- [ ] **문제 번호**: 순차적으로 정렬되었는가?
- [ ] **문제 텍스트**: 완전하고 정확한가?
- [ ] **선택지**: 5개 모두 추출되었는가?
- [ ] **배점**: [N점] 형식에서 정확히 추출되었는가?
- [ ] **지문**: 지문이 있는 문제는 passage 필드에 포함되었는가?
- [ ] **수식**: LaTeX 형식으로 정확히 변환되었는가? (수학)
- [ ] **특수 기호**: ㉠㉡㉢, ⓐⓑⓒ 등이 유지되었는가?

### 수동 보정

필요시 YAML 파일을 직접 수정할 수 있습니다:

```bash
# YAML 파일 편집
vim exams/parsed/2025-math-sat.yaml

# 또는 VS Code
code exams/parsed/2025-math-sat.yaml
```

## 비용 추정

### Vision API 비용

- **GPT-4o Vision**: 약 $0.01~0.05 per page (고해상도)
- **예시**: 20페이지 수학 문제지 = 약 $0.20~1.00

### 텍스트 API 비용

- **GPT-4o Text**: 약 $0.005~0.01 per page
- **예시**: 20페이지 국어 문제지 = 약 $0.10~0.20

### 비용 절감 팁

1. **테스트는 일부 페이지만**: `--pages 1-3`으로 품질 확인 후 전체 파싱
2. **텍스트 우선**: 수식이 없으면 텍스트 기반 파싱 사용
3. **배치 처리**: 여러 과목을 한 번에 파싱

## 고급 기능

### 프로그래밍 API

Python 코드에서 직접 사용:

```python
from src.parser.llm_parser import LLMParser
from src.parser.json_to_yaml import convert_json_to_yaml

# 파서 초기화
parser = LLMParser(model="gpt-4o")

# PDF 파싱
result = parser.parse_pdf(
    pdf_path="exams/pdf/2025/수학영역_문제지_홀수형.pdf",
    use_vision=True,
    page_range=(1, 20),
    output_path="temp.json"
)

# YAML 변환
convert_json_to_yaml(
    json_path="temp.json",
    output_path="exams/parsed/2025-math-sat.yaml",
    exam_id="2025-math-sat",
    subject="math",
    year=2025
)
```

### 커스텀 프롬프트

LLM 파서의 프롬프트를 수정하여 특정 과목에 최적화:

```python
# src/parser/llm_parser.py 수정
system_prompt = """당신은 수학 전문가입니다.
수식을 LaTeX로 변환할 때 다음 규칙을 따르세요:
- 분수: \\frac{a}{b}
- 극한: \\lim_{x \\to a}
- 적분: \\int_{a}^{b}
..."""
```

## 문제 해결

### Q1: 수식이 깨져서 나옵니다

**A**: Vision API를 사용하세요. 텍스트 기반 파싱은 수식을 처리하지 못합니다.

```bash
python src/parser/parse_exam.py <pdf> --vision
```

### Q2: 지문과 문제가 제대로 연결되지 않습니다

**A**: LLM에게 더 명확한 컨텍스트를 제공하도록 프롬프트를 수정하거나, 파싱 후 수동으로 YAML을 편집하세요.

### Q3: 비용이 너무 많이 나옵니다

**A**: 
1. 먼저 텍스트 기반으로 시도
2. 실패하면 Vision API를 일부 페이지만 테스트
3. 품질 확인 후 전체 파싱

### Q4: OpenAI API 키가 없습니다

**A**: `.env` 파일에 API 키를 설정하세요:

```bash
echo "OPENAI_API_KEY=sk-..." >> .env
```

## 모범 사례

### 1. 단계적 파싱

```bash
# Step 1: 첫 페이지만 테스트
python src/parser/parse_exam.py exam.pdf --pages 1-1 --vision --keep-json

# Step 2: 품질 확인 후 전체 파싱
python src/parser/parse_exam.py exam.pdf --vision
```

### 2. 과목별 전략

| 과목 | 파싱 방법 | 이유 |
|------|-----------|------|
| 국어 | 텍스트 | 긴 지문, 텍스트 중심 |
| 수학 | Vision ⭐️ | 복잡한 수식, 그래프 |
| 영어 | 텍스트 | 긴 지문, 텍스트 중심 |
| 사회 | 텍스트 | 표와 텍스트 |
| 과학 | Vision | 그래프, 도표, 화학식 |
| 한국사 | 텍스트 | 텍스트 중심 |

### 3. 파싱 후 워크플로우

```bash
# 1. 파싱
python src/parser/parse_exam.py exam.pdf --vision

# 2. 정답 입력 (에디터에서)
code exams/parsed/2025-math-sat.yaml

# 3. 검증
python -c "import yaml; print(yaml.safe_load(open('exams/parsed/2025-math-sat.yaml')))"

# 4. 커밋
git add exams/parsed/2025-math-sat.yaml
git commit -m "Add 2025 Math SAT"
git push
```

## 향후 개선 계획

- [ ] **GPT-5 지원**: 출시 시 자동 업그레이드
- [ ] **OCR 보정**: Tesseract + LLM 하이브리드
- [ ] **자동 정답 추출**: 별도 정답지 PDF 파싱
- [ ] **멀티모달 강화**: 그래프 설명 자동 생성
- [ ] **배치 처리**: 여러 PDF 동시 파싱

## 참고 자료

- [OpenAI Vision API 문서](https://platform.openai.com/docs/guides/vision)
- [수능 출제 기관](https://www.suneung.re.kr/)
- [LaTeX 수식 가이드](https://en.wikibooks.org/wiki/LaTeX/Mathematics)

