# 테스트

이 폴더에는 프로젝트의 테스트 코드가 포함됩니다.

## 테스트 실행

```bash
# 모든 테스트 실행
pytest

# 특정 테스트 파일 실행
pytest tests/test_evaluator.py

# 특정 테스트 함수 실행
pytest tests/test_evaluator.py::test_load_exam

# 커버리지와 함께 실행
pytest --cov=src tests/

# HTML 커버리지 리포트 생성
pytest --cov=src --cov-report=html tests/
```

## 테스트 작성 가이드

### 단위 테스트

각 모듈의 개별 함수를 테스트합니다.

```python
import pytest
from src.evaluator.exam_loader import load_exam

def test_load_exam():
    """시험 파일 로드 테스트"""
    exam = load_exam("exams/example-exam.json")
    assert exam["exam_id"] == "example-2024-math"
    assert len(exam["questions"]) > 0
```

### 통합 테스트

여러 모듈이 함께 동작하는 것을 테스트합니다.

```python
@pytest.mark.integration
def test_full_evaluation():
    """전체 평가 프로세스 테스트"""
    # 시험 로드, 모델 실행, 결과 저장까지
    pass
```

### API 테스트

API 키가 필요한 테스트는 마커를 사용합니다.

```python
@pytest.mark.api
def test_openai_api():
    """OpenAI API 호출 테스트"""
    # API 키가 있을 때만 실행됨
    pass
```

## 테스트 구조

```
tests/
├── test_evaluator.py      # 평가 시스템 테스트
├── test_exam_loader.py    # 시험 로더 테스트
├── test_models.py         # 모델 인터페이스 테스트
├── test_result_collector.py  # 결과 수집기 테스트
└── conftest.py           # pytest 설정 및 fixture
```

## Fixture 사용

공통으로 사용되는 테스트 데이터는 fixture로 정의합니다.

```python
@pytest.fixture
def sample_exam():
    """테스트용 샘플 시험"""
    return {
        "exam_id": "test-exam",
        "questions": [...]
    }

def test_something(sample_exam):
    # sample_exam 사용
    pass
```


