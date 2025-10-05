# 시험 문제 데이터

이 폴더는 수능 시험 문제를 관리합니다.

## 폴더 구조

```
exams/
├── pdf/            # 원본 PDF 시험지 (업로드)
│   ├── 2024-ksat-korean.pdf
│   ├── 2024-ksat-math.pdf
│   └── ...
└── parsed/         # 파싱된 YAML 파일 (자동 생성)
    ├── 2024-ksat-korean.yaml
    ├── 2024-ksat-math.yaml
    └── ...
```

## 워크플로우

1. **PDF 업로드**: `pdf/` 폴더에 시험지 PDF를 업로드
2. **자동 파싱**: GitHub Actions가 자동으로 PDF를 파싱
3. **YAML 생성**: 파싱 결과가 `parsed/` 폴더에 저장
4. **자동 평가**: 파싱된 YAML을 읽어서 AI 모델 평가 실행

## PDF 파일 형식

- **지원 형식**: PDF
- **권장 사항**:
  - 텍스트 기반 PDF (스캔 이미지보다 OCR 정확도 높음)
  - 명확한 문제 번호 (1, 2, 3... 또는 1., 2., 3....)
  - 선택지 표시 (①②③④⑤ 또는 1)2)3)4)5))
  - 정답은 별도 파일 또는 마지막 페이지에 명시

## YAML 파일 형식

파싱된 YAML 파일은 다음과 같은 구조를 따릅니다:

```yaml
exam_id: 2024-ksat-math
title: 2024학년도 수학능력시험 - 수학
subject: math
year: 2024
date: 2023-11-16
total_points: 100
time_limit_minutes: 100
description: 2024학년도 대학수학능력시험 수학 영역

questions:
  - question_id: q1
    question_number: 1
    question_text: |
      다음 극한값을 구하시오.
      lim (x→0) (sin x) / x
    question_type: multiple_choice
    choices:
      - "0"
      - "1"
      - "2"
      - "∞"
      - "발산"
    correct_answer: "1"
    points: 2
    difficulty: easy
    category: 미적분
    tags:
      - 함수
      - 극한
    has_image: false
    image_path: null
```

## 필드 설명

### 시험 메타데이터
- `exam_id` (필수): 시험의 고유 식별자
- `title` (필수): 시험 제목
- `subject` (필수): 과목 코드
- `year` (필수): 시험 연도
- `date` (선택): 시험 날짜 (YYYY-MM-DD)
- `total_points` (선택): 총점
- `time_limit_minutes` (선택): 제한 시간 (분)
- `description` (선택): 시험 설명

### 문제 필드
- `question_id` (필수): 문제 고유 식별자 (예: q1, q2)
- `question_number` (필수): 문제 번호 (1, 2, 3...)
- `question_text` (필수): 문제 내용 (멀티라인 가능, `|` 사용)
- `question_type` (필수): 문제 유형
  - `multiple_choice`: 객관식 (선택지 있음)
  - `short_answer`: 단답형
  - `essay`: 서술형
- `choices` (객관식 필수): 선택지 배열
- `correct_answer` (필수): 정답
- `points` (필수): 배점
- `difficulty` (선택): 난이도 (easy, medium, hard)
- `category` (선택): 세부 분야 (예: 미적분, 확률과 통계)
- `tags` (선택): 태그 배열 (예: [함수, 극한])
- `has_image` (선택): 이미지 포함 여부
- `image_path` (선택): 이미지 경로 (exams/images/ 기준)

## 과목 코드

- `korean`: 국어
- `math`: 수학
- `english`: 영어
- `history`: 한국사
- `social_studies`: 사회탐구
- `science`: 과학탐구

## 파일명 규칙

### PDF 파일
```
{year}-ksat-{subject}.pdf
```
예시:
- `2024-ksat-math.pdf`
- `2024-ksat-korean.pdf`
- `2023-ksat-english.pdf`

### YAML 파일 (자동 생성)
```
{year}-ksat-{subject}.yaml
```

## 시험 추가 방법

1. **PDF 준비**: 수능 시험지 PDF 파일을 준비
2. **업로드**: `exams/pdf/` 폴더에 PDF 업로드
3. **커밋 & 푸시**:
   ```bash
   git add exams/pdf/2024-ksat-math.pdf
   git commit -m "feat: 2024 수학 시험 추가"
   git push
   ```
4. **자동 처리**: GitHub Actions가 자동으로:
   - PDF를 파싱하여 YAML 생성
   - `exams/parsed/`에 저장
   - 모든 AI 모델로 평가 실행

## 수동 YAML 작성 (선택)

PDF 파싱이 부정확한 경우, `parsed/` 폴더에 YAML을 직접 작성할 수 있습니다.

## 주의사항

### 저작권
- ⚠️ 실제 수능 문제는 한국교육과정평가원의 저작물입니다
- 공개 배포 시 저작권 문제가 없는지 확인 필수
- 교육/연구 목적으로만 사용

### 파일 형식
- PDF는 UTF-8 인코딩 권장
- 이미지 스캔보다 텍스트 기반 PDF 권장 (OCR 정확도)
- YAML 파일은 반드시 UTF-8 인코딩

### 검증
- 파싱 후 YAML 파일을 확인하여 정확성 검증
- 온라인 YAML 검증기 사용: https://www.yamllint.com/


