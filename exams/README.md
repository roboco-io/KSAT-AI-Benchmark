# 시험 문제 데이터

이 폴더에는 평가에 사용될 수능 시험 문제 데이터가 JSON 형식으로 저장됩니다.

## 파일 형식

각 시험 파일은 다음과 같은 구조를 따라야 합니다:

```json
{
  "exam_id": "2024-ksat-math",
  "title": "2024학년도 수학능력시험 - 수학",
  "subject": "math",
  "year": 2024,
  "date": "2023-11-16",
  "total_points": 100,
  "time_limit_minutes": 100,
  "description": "2024학년도 대학수학능력시험 수학 영역",
  "questions": [
    {
      "question_id": "q1",
      "question_number": 1,
      "question_text": "문제 내용",
      "question_type": "multiple_choice",
      "choices": ["1", "2", "3", "4", "5"],
      "correct_answer": "3",
      "points": 2,
      "difficulty": "easy",
      "category": "미적분",
      "tags": ["함수", "극한"],
      "has_image": false,
      "image_path": null
    }
  ]
}
```

## 필드 설명

### 시험 메타데이터
- `exam_id` (필수): 시험의 고유 식별자
- `title` (필수): 시험 제목
- `subject` (필수): 과목 (korean, math, english, history, social, science 등)
- `year` (필수): 시험 연도
- `date` (선택): 시험 날짜
- `total_points` (선택): 총점
- `time_limit_minutes` (선택): 제한 시간 (분)
- `description` (선택): 시험 설명

### 문제 필드
- `question_id` (필수): 문제 고유 식별자
- `question_number` (필수): 문제 번호
- `question_text` (필수): 문제 내용
- `question_type` (필수): 문제 유형
  - `multiple_choice`: 객관식 (선택지 있음)
  - `short_answer`: 단답형
  - `essay`: 서술형
- `choices` (객관식 필수): 선택지 배열
- `correct_answer` (필수): 정답
- `points` (선택): 배점
- `difficulty` (선택): 난이도 (easy, medium, hard)
- `category` (선택): 세부 분야
- `tags` (선택): 태그 배열
- `has_image` (선택): 이미지 포함 여부
- `image_path` (선택): 이미지 경로

## 과목 코드

- `korean`: 국어
- `math`: 수학
- `english`: 영어
- `history`: 한국사
- `social_studies`: 사회탐구
- `science`: 과학탐구

## 파일명 규칙

파일명은 다음 형식을 따릅니다:
```
{year}-ksat-{subject}.json
```

예시:
- `2024-ksat-math.json`
- `2024-ksat-korean.json`
- `2023-ksat-english.json`

## 시험 추가 방법

1. 이 폴더에 위 형식을 따르는 JSON 파일을 추가합니다
2. Git에 커밋하고 푸시합니다
3. GitHub Actions가 자동으로 새로운 시험을 감지하고 평가를 실행합니다

## 예시 파일

`example-exam.json` 파일을 참고하여 새로운 시험을 작성할 수 있습니다.

## 주의사항

- 저작권이 있는 실제 수능 문제를 업로드할 때는 법적 문제가 없는지 확인하세요
- 모든 JSON 파일은 UTF-8 인코딩을 사용해야 합니다
- JSON 형식이 유효한지 확인하세요 (https://jsonlint.com/)
- 필수 필드가 모두 포함되어 있는지 확인하세요


