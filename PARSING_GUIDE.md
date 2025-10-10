# KSAT 시험 파싱 가이드

이 문서는 Claude Code를 사용하여 KSAT 시험 PDF를 YAML 형식으로 수동 파싱하는 방법을 설명합니다.

## 개요

KSAT-AI-Benchmark는 두 가지 YAML 스키마를 지원합니다:
- **Optimized Schema**: 지문을 중앙 관리하여 중복 제거 (권장 - 국어/사회 등)
- **Legacy Schema**: 각 문제에 지문을 직접 포함 (수학/영어 등)

## Optimized Schema (권장)

### 구조

```yaml
exam_id: YYYY-subject-sat         # 예: 2025-korean-sat
title: YYYY학년도 수능 과목영역   # 예: 2025학년도 수능 국어영역
subject: subject                   # korean, math, english
year: YYYY                         # 2025
parsing_info:
  method: manual                   # manual (Claude Code로 파싱)
  model: claude-sonnet-4-5        # 사용한 Claude 모델
  parsed_at: 'YYYY-MM-DDTHH:MM:SS' # ISO 8601 형식

# 지문 중앙 관리 (여러 문제가 공유하는 지문)
passages:
  - passage_id: p1                 # 고유 ID (p1, p2, ...)
    passage_text: |                # 지문 전체 텍스트 (여러 줄 가능)
      지문 내용...
    question_numbers: [1, 2, 3]    # 이 지문을 사용하는 문제 번호들 (참고용)

  - passage_id: p2
    passage_text: |
      다음 지문 내용...
    question_numbers: [4, 5, 6]

# 문제 목록
questions:
  - question_id: q1                # 고유 ID (q1, q2, ...)
    question_number: 1             # 문제 번호 (1부터 시작)
    question_text: |               # 문제 텍스트
      문제 내용...
    passage_id: p1                 # 지문 참조 (passages에서 정의한 ID)
    choices:                       # 선택지 목록 (1-5개)
      - "선택지 1"
      - "선택지 2"
      - "선택지 3"
      - "선택지 4"
      - "선택지 5"
    correct_answer: 3              # 정답 번호 (1-5)
    points: 2                      # 배점
    explanation: null              # 해설 (선택적)

  - question_id: q2
    question_number: 2
    question_text: |
      두 번째 문제...
    passage_id: p1                 # 같은 지문 재사용
    choices: [...]
    correct_answer: 4
    points: 2
    explanation: null
```

### 장점

- **파일 크기 40% 절감**: 지문 중복 제거
- **토큰 사용량 70% 절감**: 평가 시 같은 지문을 반복 전송하지 않음
- **유지보수 용이**: 지문 수정 시 한 곳만 변경
- **명확한 구조**: 같은 지문을 공유하는 문제 그룹 표현

## Legacy Schema

### 구조

```yaml
exam_id: YYYY-subject-sat
title: YYYY학년도 수능 과목영역
subject: subject
year: YYYY
parsing_info:
  method: manual
  model: claude-sonnet-4-5
  parsed_at: 'YYYY-MM-DDTHH:MM:SS'

questions:
  - question_id: q1
    question_number: 1
    question_text: |
      문제 텍스트
    passage: |                     # 지문을 각 문제에 직접 포함
      지문 전체 텍스트...
    choices:
      - "선택지 1"
      - "선택지 2"
      - "선택지 3"
      - "선택지 4"
      - "선택지 5"
    correct_answer: 3
    points: 2
    explanation: null

  - question_id: q2
    question_number: 2
    question_text: |
      문제 텍스트 (지문 없는 문제)
    choices: [...]                 # passage 필드 생략 가능
    correct_answer: 2
    points: 2
    explanation: null
```

### 사용 시기

- **지문 재사용이 적은 과목**: 수학, 영어 등
- **독립적인 문제**: 각 문제가 별도의 짧은 지문을 가진 경우

## 필드 설명

### exam_id
- 형식: `YYYY-subject-sat`
- 예시: `2025-korean-sat`, `2024-math-sat`
- 고유 식별자로 사용됨

### subject
- 허용 값: `korean`, `math`, `english`, `social`, `science`
- 소문자로 작성

### parsing_info
- `method`: 항상 `manual` (Claude Code 사용)
- `model`: 사용한 Claude 모델 이름
- `parsed_at`: 파싱 완료 시각 (ISO 8601 형식)

### passage_id (Optimized Schema)
- 형식: `p1`, `p2`, `p3`, ...
- 지문 고유 식별자
- passages 섹션에서 정의하고 questions에서 참조

### question_id
- 형식: `q1`, `q2`, `q3`, ...
- 문제 고유 식별자

### question_number
- 실제 시험지의 문제 번호
- 1부터 시작하는 정수

### choices
- 배열 형식 (1-5개)
- 각 선택지는 문자열
- 긴 선택지는 여러 줄로 작성 가능

### correct_answer
- **반드시 정수** (1-5)
- 문자열 사용 금지 (예: "3" ❌, 3 ✅)

### points
- 문제 배점
- 일반적으로 2점 또는 3점

### explanation
- 해설 (선택적)
- 없으면 `null` 사용

## Claude Code 파싱 가이드

### 1. 준비 단계

```bash
# 1. PDF 파일을 exams/pdf/YYYY/ 디렉토리에 배치
# 예: exams/pdf/2025/국어영역_문제지_홀수형.pdf

# 2. Claude Code 시작
code .
```

### 2. 파싱 프롬프트 (Optimized Schema)

```
다음 KSAT 시험 PDF를 Optimized Schema YAML로 파싱해주세요:

파일: exams/pdf/2025/국어영역_문제지_홀수형.pdf
출력: exams/parsed/2025-korean-sat.yaml

스키마 요구사항:
1. passages 섹션에 지문을 중앙 관리
2. 같은 지문을 공유하는 문제들은 passage_id로 참조
3. parsing_info.method = "manual"
4. parsing_info.model = "claude-sonnet-4-5" (또는 사용 중인 모델)
5. correct_answer는 정수 (1-5)

참고: PARSING_GUIDE.md의 Optimized Schema 구조를 따라주세요.
```

### 3. 파싱 프롬프트 (Legacy Schema)

```
다음 KSAT 시험 PDF를 Legacy Schema YAML로 파싱해주세요:

파일: exams/pdf/2025/수학영역_문제지_홀수형.pdf
출력: exams/parsed/2025-math-sat.yaml

스키마 요구사항:
1. 각 문제에 passage 필드로 지문 직접 포함
2. 지문 없는 문제는 passage 필드 생략
3. parsing_info.method = "manual"
4. parsing_info.model = "claude-sonnet-4-5"
5. correct_answer는 정수 (1-5)

참고: PARSING_GUIDE.md의 Legacy Schema 구조를 따라주세요.
```

### 4. 정답 입력

정답표를 파싱하여 correct_answer 필드를 채웁니다:

```
정답표 PDF를 읽고 exams/parsed/2025-korean-sat.yaml의
correct_answer 필드를 업데이트해주세요:

정답표: exams/pdf/2025/국어영역_정답표.pdf

각 문제의 correct_answer 필드에 정수 (1-5)로 입력해주세요.
```

### 5. 검증

```bash
# YAML 구문 검증
make validate

# 또는 Python으로 직접 확인
python -c "import yaml; yaml.safe_load(open('exams/parsed/2025-korean-sat.yaml'))"
```

## 파싱 시 주의사항

### 1. 수식 표현

**LaTeX 사용 (권장)**:
```yaml
question_text: |
  함수 $f(x) = x^2 + 2x + 1$의 최솟값을 구하시오.
```

**유니코드 수학 기호 (대안)**:
```yaml
question_text: |
  함수 f(x) = x² + 2x + 1의 최솟값을 구하시오.
```

### 2. 여러 줄 텍스트

**파이프 기호 사용**:
```yaml
question_text: |
  첫 번째 줄
  두 번째 줄
  세 번째 줄
```

### 3. 특수 문자

**인용 부호 처리**:
```yaml
choices:
  - "선택지에 \"인용 부호\" 포함"
  - '선택지에 작은따옴표 포함'
```

### 4. passage_id 참조 (Optimized Schema)

**올바른 참조**:
```yaml
passages:
  - passage_id: p1
    passage_text: "..."
    question_numbers: [1, 2, 3]

questions:
  - question_id: q1
    question_number: 1
    passage_id: p1  # ✅ p1 참조
```

**잘못된 참조**:
```yaml
questions:
  - question_id: q1
    passage_id: p99  # ❌ 정의되지 않은 ID
```

### 5. correct_answer 타입

**올바른 형식**:
```yaml
correct_answer: 3  # ✅ 정수
```

**잘못된 형식**:
```yaml
correct_answer: "3"  # ❌ 문자열
correct_answer: ③   # ❌ 유니코드
```

### 6. 지문 그룹핑 (Optimized Schema)

**같은 지문을 공유하는 문제들은 하나의 passage로**:
```yaml
passages:
  - passage_id: p1
    passage_text: |
      다음 글을 읽고 물음에 답하시오.
      (가) 첫 번째 지문...
      (나) 두 번째 지문...
    question_numbers: [1, 2, 3, 4]  # 1-4번 문제가 이 지문 공유

questions:
  - question_id: q1
    question_number: 1
    passage_id: p1
  - question_id: q2
    question_number: 2
    passage_id: p1
  - question_id: q3
    question_number: 3
    passage_id: p1
  - question_id: q4
    question_number: 4
    passage_id: p1
```

## 스키마 선택 가이드

### Optimized Schema 사용 권장

- 국어: 긴 지문을 여러 문제가 공유
- 사회탐구: 제시문을 여러 문제가 공유
- 과학탐구: 실험 설명을 여러 문제가 공유

### Legacy Schema 사용 권장

- 수학: 대부분 문제가 독립적
- 영어: 짧은 지문 또는 듣기 문제

### 혼용 불가

한 시험 파일 내에서 두 스키마를 혼용할 수 없습니다.
하나의 스키마를 선택하여 일관되게 사용하세요.

## 예시 파일

### Optimized Schema 예시

```yaml
exam_id: 2025-korean-sat
title: 2025학년도 수능 국어영역
subject: korean
year: 2025
parsing_info:
  method: manual
  model: claude-sonnet-4-5
  parsed_at: '2025-10-10T10:00:00'

passages:
  - passage_id: p1
    passage_text: |
      밑줄 긋기는 일상적으로 유용하게 활용할 수 있는 독서 전략이다.
      독서의 목적이나 글의 종류에 관계없이 중요한 내용을 표시해 두면
      나중에 쉽게 확인할 수 있다.
    question_numbers: [1, 2, 3]

questions:
  - question_id: q1
    question_number: 1
    question_text: |
      윗글의 내용과 일치하지 않는 것은?
    passage_id: p1
    choices:
      - "밑줄 긋기는 독서 전략의 하나이다."
      - "독서 목적과 관계없이 활용할 수 있다."
      - "중요한 내용을 나중에 확인할 수 있다."
      - "글의 종류에 따라 활용 여부가 달라진다."
      - "일상적으로 유용한 전략이다."
    correct_answer: 4
    points: 2
    explanation: null

  - question_id: q2
    question_number: 2
    question_text: |
      윗글의 핵심 내용을 한 문장으로 요약하시오.
    passage_id: p1
    choices:
      - "밑줄 긋기의 역사"
      - "밑줄 긋기의 장점"
      - "밑줄 긋기의 방법"
      - "밑줄 긋기의 한계"
      - "밑줄 긋기의 종류"
    correct_answer: 2
    points: 3
    explanation: null
```

### Legacy Schema 예시

```yaml
exam_id: 2025-math-sat
title: 2025학년도 수능 수학영역
subject: math
year: 2025
parsing_info:
  method: manual
  model: claude-sonnet-4-5
  parsed_at: '2025-10-10T10:00:00'

questions:
  - question_id: q1
    question_number: 1
    question_text: |
      $\log_2 8$의 값을 구하시오.
    choices:
      - "1"
      - "2"
      - "3"
      - "4"
      - "5"
    correct_answer: 3
    points: 2
    explanation: null

  - question_id: q2
    question_number: 2
    question_text: |
      함수 $f(x) = 2x + 1$에 대하여 $f(3)$의 값을 구하시오.
    choices:
      - "5"
      - "6"
      - "7"
      - "8"
      - "9"
    correct_answer: 3
    points: 2
    explanation: null
```

## 문제 해결

### Q: YAML 파일이 너무 커요

A: Optimized Schema를 사용하세요. 지문 중복을 제거하면 40% 크기 감소.

### Q: 지문 참조 오류가 발생해요

A: passage_id가 passages 섹션에 정의되어 있는지 확인하세요.

### Q: correct_answer 타입 오류

A: 문자열이 아닌 정수로 입력했는지 확인하세요.
```yaml
correct_answer: 3    # ✅
correct_answer: "3"  # ❌
```

### Q: 여러 줄 텍스트가 한 줄로 합쳐져요

A: 파이프 기호 `|`를 사용하세요:
```yaml
question_text: |
  첫 줄
  둘째 줄
```

### Q: 수식이 제대로 표시되지 않아요

A: LaTeX 형식을 사용하거나 유니코드 수학 기호를 사용하세요.

## 참고 자료

- **YAML 문법**: https://yaml.org/spec/1.2/spec.html
- **LaTeX 수식**: https://katex.org/docs/supported.html
- **ISO 8601 날짜 형식**: https://en.wikipedia.org/wiki/ISO_8601

## 파싱 체크리스트

파싱 완료 후 다음 사항을 확인하세요:

- [ ] exam_id 형식이 올바른가? (`YYYY-subject-sat`)
- [ ] subject가 유효한 값인가? (`korean`, `math`, `english`)
- [ ] parsing_info.method가 `manual`인가?
- [ ] parsing_info.parsed_at이 ISO 8601 형식인가?
- [ ] 모든 correct_answer가 정수인가? (문자열 아님)
- [ ] passage_id 참조가 모두 정의되어 있는가? (Optimized Schema)
- [ ] choices 배열이 비어있지 않은가?
- [ ] YAML 구문 오류가 없는가? (`make validate` 실행)

## 마무리

파싱이 완료되면:

1. **검증**: `make validate`로 YAML 구문 확인
2. **테스트 평가**: 일부 문제만 선택하여 평가 테스트
   ```bash
   python src/evaluator/evaluate.py exams/parsed/2025-korean-sat.yaml \
     --model gpt-4o --questions "1-3"
   ```
3. **전체 평가**: 모든 문제로 평가 실행
   ```bash
   make gpt-5 2025 korean
   ```
4. **커밋**: Git에 추가 및 커밋
   ```bash
   git add exams/parsed/2025-korean-sat.yaml
   git commit -m "feat: 2025 국어 시험 파싱 완료"
   ```

---

**참고**: 이 가이드는 Claude Code를 사용한 수동 파싱을 위한 것입니다.
자동화된 파싱 스크립트는 제거되었으며,
연 1회 작업이므로 Claude Code를 사용한 수동 파싱이 더 효율적입니다.
