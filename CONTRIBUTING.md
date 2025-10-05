# 기여 가이드

KSAT AI Benchmark 프로젝트에 기여해 주셔서 감사합니다! 🎉

## 기여 방법

### 1. 새로운 시험 추가

새로운 수능 시험 문제를 추가하려면:

1. `exams/` 폴더의 [README.md](exams/README.md)를 참고하여 JSON 파일 작성
2. `exams/example-exam.json`을 템플릿으로 활용
3. 파일명은 `{year}-ksat-{subject}.json` 형식 준수
4. Pull Request 생성

**주의사항:**
- 저작권 문제가 없는 문제만 업로드
- 공개 가능한 문제인지 확인 필수
- 모든 필수 필드 포함 확인

### 2. 새로운 AI 모델 추가

새로운 AI 모델을 벤치마크에 추가하려면:

1. `models/models.json`에 모델 정보 추가
2. 필요시 `src/models/` 폴더에 새로운 모델 인터페이스 구현
3. API 키 환경 변수 설정 문서화
4. Pull Request 생성

### 3. 코드 기여

#### 개발 환경 설정

```bash
# 저장소 포크 및 클론
git clone https://github.com/YOUR_USERNAME/KSAT-AI-Benchmark.git
cd KSAT-AI-Benchmark

# 가상 환경 생성 및 활성화
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 개발용 추가 도구 설치
pip install black flake8 mypy pytest pytest-cov
```

#### 브랜치 생성

```bash
git checkout -b feature/your-feature-name
```

#### 코드 스타일

- **Python**: PEP 8 스타일 가이드 준수
- **포매팅**: Black 사용
- **린팅**: Flake8 사용
- **타입 힌트**: MyPy 사용 권장

```bash
# 코드 포매팅
black src/ tests/

# 린팅
flake8 src/ tests/

# 타입 체크
mypy src/
```

#### 테스트 작성

새로운 기능을 추가할 때는 반드시 테스트를 함께 작성합니다:

```bash
# 테스트 실행
pytest

# 커버리지 확인
pytest --cov=src tests/
```

#### 커밋 메시지

커밋 메시지는 다음 형식을 따릅니다:

```
<타입>: <제목>

<본문 (선택)>

<푸터 (선택)>
```

**타입:**
- `feat`: 새로운 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포매팅
- `refactor`: 코드 리팩토링
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 파일 변경

**예시:**
```
feat: OpenAI GPT-4o 모델 지원 추가

- models.json에 gpt-4o 설정 추가
- OpenAI 클라이언트 업데이트
- 관련 테스트 작성

Closes #123
```

### 4. Pull Request 제출

1. 변경사항을 커밋하고 푸시
   ```bash
   git add .
   git commit -m "feat: 새로운 기능 추가"
   git push origin feature/your-feature-name
   ```

2. GitHub에서 Pull Request 생성

3. PR 템플릿에 따라 내용 작성:
   - 변경 사항 설명
   - 관련 이슈 번호
   - 테스트 결과
   - 스크린샷 (UI 변경 시)

4. 리뷰 대기 및 피드백 반영

## 이슈 보고

버그를 발견하거나 새로운 기능을 제안하려면 [이슈](https://github.com/roboco-io/KSAT-AI-Benchmark/issues)를 생성해주세요.

### 버그 리포트

다음 정보를 포함해주세요:
- 버그 설명
- 재현 방법
- 예상 동작
- 실제 동작
- 환경 정보 (OS, Python 버전 등)
- 에러 로그

### 기능 제안

다음 정보를 포함해주세요:
- 기능 설명
- 사용 사례
- 예상되는 이점
- 구현 아이디어 (선택)

## 행동 강령

### 우리의 약속

모든 기여자와 유지관리자는 다음을 약속합니다:
- 나이, 신체 크기, 장애, 민족성, 성 정체성 및 표현, 경험 수준, 국적, 외모, 인종, 종교 또는 성적 정체성 및 지향과 관계없이 모든 사람에게 열린 환경을 만듭니다
- 서로 존중하고 배려합니다
- 건설적인 비판을 받아들입니다

### 금지 행동

다음 행동은 허용되지 않습니다:
- 성적인 언어나 이미지 사용
- 트롤링, 모욕적/경멸적 댓글, 개인적 또는 정치적 공격
- 공개적 또는 개인적 괴롭힘
- 명시적 허가 없이 개인 정보 공개
- 전문적 환경에서 부적절하다고 간주될 수 있는 기타 행위

## 질문이 있으신가요?

프로젝트에 대해 궁금한 점이 있으시면:
- [이슈](https://github.com/roboco-io/KSAT-AI-Benchmark/issues)에 질문을 올려주세요
- [Discussions](https://github.com/roboco-io/KSAT-AI-Benchmark/discussions)를 활용해주세요

## 라이선스

기여하신 내용은 프로젝트의 [CC BY-NC 4.0 라이선스](LICENSE)를 따릅니다.

---

다시 한 번 기여해 주셔서 감사합니다! 🙏


