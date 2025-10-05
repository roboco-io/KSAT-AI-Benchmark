# KSAT AI Benchmark - Product Requirements Document (PRD)

## 1. 개요

### 1.1 프로젝트 목적
대한민국 수학능력시험(KSAT) 문제를 활용하여 다양한 AI 모델의 성능을 평가하고, 그 결과를 투명하게 공개하여 AI 모델의 실질적인 문제 해결 능력을 측정한다.

### 1.2 프로젝트 범위
- 수능 문제 데이터베이스 관리
- 여러 AI 모델을 통한 자동 문제 풀이
- 평가 결과의 자동 수집 및 분석
- GitHub Pages를 통한 리더보드 및 상세 결과 공개

### 1.3 주요 이해관계자
- **일반 사용자**: AI 모델 성능에 관심있는 연구자, 개발자, 학생
- **모델 제공자**: AI 모델의 성능을 공개적으로 검증하고자 하는 기업 및 연구기관
- **프로젝트 관리자**: 벤치마크 시스템을 유지보수하는 개발팀

## 2. 기능 요구사항

### 2.1 시험지 관리
#### 2.1.1 시험지 등록
- **요구사항**: PDF 형식의 수능 시험지를 `exams/pdf/` 폴더에 업로드
- **트리거**: PDF 파일 업로드 시 GitHub Actions 자동 실행
- **파일 형식**: 
  - **입력**: PDF (원본 시험지)
  - **출력**: YAML (파싱된 구조화 데이터)
- **필수 정보**:
  - 문제 ID
  - 문제 텍스트
  - 선택지 (객관식의 경우)
  - 정답
  - 문제 유형 (국어, 수학, 영어, 탐구 등)
  - 배점
  - 이미지/도표 (선택)

#### 2.1.2 PDF 파싱
- **파서**: Python 기반 PDF 파싱 엔진
- **라이브러리**: PyPDF2, pdfplumber, 또는 OCR (Tesseract)
- **기능**:
  - 문제 번호 자동 추출
  - 선택지 식별
  - 이미지 영역 감지 및 추출
  - YAML 형식으로 변환
- **검증**:
  - 파싱 정확도 확인
  - 필수 필드 존재 여부 검증
  - 정답 형식 검증

### 2.2 AI 모델 관리
#### 2.2.1 모델 등록
- **요구사항**: 새로운 AI 모델을 설정 파일에 추가하면 자동으로 벤치마크에 포함
- **설정 정보**:
  - 모델 이름
  - 모델 버전
  - API 엔드포인트 또는 로컬 실행 정보
  - 인증 정보 (환경 변수로 관리)
  - 타임아웃 설정
  - 최대 토큰 수

#### 2.2.2 지원 모델
- OpenAI GPT 시리즈
- Anthropic Claude 시리즈
- Google Gemini 시리즈
- Meta Llama 시리즈
- 기타 API 호환 모델

### 2.3 자동 평가 시스템
#### 2.3.1 문제 풀이 실행
- GitHub Actions를 통한 자동 실행
- 트리거 조건:
  - 새로운 시험지가 `exams/` 폴더에 추가될 때
  - 새로운 모델이 `models.json`에 추가될 때
  - 수동 트리거 (workflow_dispatch)
  - 스케줄 실행 (선택)

#### 2.3.2 평가 프로세스
1. 파싱된 YAML 파일을 읽어서 문제 로드
2. 각 모델에 대해 모든 문제를 순차적으로 실행
3. 각 문제마다 다음 정보를 수집:
   - 모델의 선택 답안
   - 정답 여부 (자동 채점)
   - 답변 선택 이유 (모델의 상세 설명)
   - 풀이 시간 (초 단위, 밀리초 정밀도)
   - 획득 점수 (배점 × 정답 여부)
   - API 응답 메타데이터
4. 결과를 YAML 형식으로 저장

#### 2.3.3 타임아웃 및 에러 처리
- 문제당 최대 실행 시간 설정
- API 에러 발생 시 재시도 로직
- 에러 로그 기록

### 2.4 결과 저장 및 관리
#### 2.4.1 결과 데이터 구조 (YAML)
```yaml
model_name: gpt-4
model_version: 2024-01
exam_id: 2024-ksat-math
timestamp: 2024-11-15T10:30:00Z
total_score: 85
max_score: 100
accuracy: 85.0
average_time: 3.2
results:
  - question_id: q1
    question_number: 1
    is_correct: true
    student_answer: "2"
    correct_answer: "2"
    reasoning: |
      이 문제는 미적분의 극한 개념을 다루고 있습니다.
      주어진 함수에서 x가 0으로 접근할 때...
    time_taken: 3.5
    points_earned: 2
    points_possible: 2
```

#### 2.4.2 결과 파일 관리
- `results/` 폴더에 모델별, 시험별로 저장
- 파일명 규칙: `{model_name}_{exam_id}_{timestamp}.yaml`
- Git에 커밋하여 버전 관리
- 자동 백업 및 히스토리 추적

### 2.5 GitHub Pages 공개 (Next.js + TypeScript)

#### 2.5.1 기술 스택
- **프레임워크**: Next.js 14+ (App Router)
- **언어**: TypeScript
- **UI 컴포넌트**: Mantine UI
- **스타일링**: Mantine 내장 스타일 시스템
- **배포**: GitHub Pages (Static Export)

#### 2.5.2 메인 페이지 (리더보드)
**기능:**
- 모델별 전체 점수 순위 테이블
- 과목별 점수 비교
- 평균 풀이 시간
- 최종 업데이트 시간
- 실시간 필터링 및 정렬

**Mantine 컴포넌트:**
- `Table` - 리더보드 표시
- `Badge` - 순위 뱃지
- `Group`, `Stack` - 레이아웃
- `Text`, `Title` - 텍스트 요소

#### 2.5.3 문제 목록 페이지
**기능:**
- 시험 문제 전체 목록 표시
- 각 문제별로 모든 모델의 답안 비교
- 정답 여부를 색상으로 표시
  - 정답: 초록색
  - 오답: 빨간색
- 각 모델의 점수 합계

**Mantine 컴포넌트:**
- `Card` - 문제 카드
- `Grid` - 모델별 답안 그리드
- `Badge` - 정답/오답 표시
- `ActionIcon` - 상세 보기 버튼

#### 2.5.4 답안 상세 모달
**기능:**
- 답안 클릭 시 모달 팝업
- 선택한 답안
- 정답 여부
- 답안 선택 이유 (전체 텍스트)
- 풀이 소요 시간
- 획득 점수

**Mantine 컴포넌트:**
- `Modal` - 상세 정보 모달
- `Text` - 이유 텍스트 (줄바꿈 보존)
- `Divider` - 섹션 구분
- `Timeline` - 풀이 과정 시각화 (선택)

#### 2.5.5 모델별 상세 페이지
**기능:**
- 특정 모델의 전체 성적
- 문제별 정답/오답 상세 내역
- 과목별 점수 차트
- 평균 응답 시간

**Mantine 컴포넌트:**
- `Tabs` - 과목별 탭
- `Progress` - 정답률 진행바
- `RingProgress` - 원형 점수 표시
- `BarChart` - 점수 분포 (Recharts 연동)

#### 2.5.6 시험별 비교 페이지
**기능:**
- 한 시험에 대한 모든 모델 성적 비교
- 문제별 정답률 통계
- 가장 많이 틀린 문제 하이라이트
- 평균 풀이 시간 비교

**Mantine 컴포넌트:**
- `SegmentedControl` - 시험 선택
- `Paper` - 컨텐츠 컨테이너
- `LineChart` - 문제별 정답률 추이

#### 2.5.7 UI/UX 요구사항
- ✅ 반응형 디자인 (Mantine의 Grid 시스템 활용)
- ✅ 다크/라이트 모드 전환 (Mantine ColorScheme)
- ✅ 직관적인 네비게이션 (AppShell, Navbar)
- ✅ 로딩 상태 표시 (Loader, Skeleton)
- ✅ 빠른 필터링 및 검색 (Select, TextInput)
- ✅ 접근성 준수 (Mantine 기본 지원)
- ✅ 애니메이션 및 트랜지션 (Mantine Transition)

## 3. 비기능 요구사항

### 3.1 성능
- 각 문제당 평가 시간: 최대 60초
- 전체 시험 평가 시간: 시험당 최대 2시간
- GitHub Pages 로딩 시간: 초기 로드 3초 이내

### 3.2 확장성
- 새로운 모델 추가 용이성
- 다양한 시험 형식 지원 가능
- API 변경 시 최소한의 코드 수정

### 3.3 보안
- API 키는 GitHub Secrets로 관리
- 민감한 정보는 공개 결과에서 제외
- Rate limiting 고려

### 3.4 신뢰성
- API 호출 실패 시 자동 재시도 (최대 3회)
- 부분 실패 시에도 완료된 결과는 저장
- 에러 로그 자동 기록

### 3.5 유지보수성
- 명확한 코드 구조 및 문서화
- 설정 파일을 통한 쉬운 설정 변경
- 단위 테스트 및 통합 테스트

## 4. 기술 스택

### 4.1 백엔드 (평가 시스템)
- **언어**: Python 3.10+
- **주요 라이브러리**:
  - **AI 모델 API**: `openai`, `anthropic`, `google-generativeai`
  - **PDF 파싱**: `pdfplumber`, `PyPDF2`, `pytesseract` (OCR)
  - **YAML 처리**: `PyYAML`, `ruamel.yaml`
  - **HTTP 요청**: `requests`, `httpx`
  - **데이터 검증**: `pydantic`
  - **이미지 처리**: `Pillow`, `pdf2image`
  - **테스팅**: `pytest`

### 4.2 프론트엔드 (GitHub Pages)
- **프레임워크**: Next.js 14+ (App Router, Static Export)
- **언어**: TypeScript 5.0+
- **UI 컴포넌트**: Mantine UI 7.0+
  - `@mantine/core` - 핵심 컴포넌트
  - `@mantine/hooks` - 커스텀 훅
  - `@mantine/notifications` - 알림
  - `@mantine/modals` - 모달 관리
- **차트**: Recharts (Mantine 통합)
- **스타일링**: Mantine 내장 스타일 시스템
- **아이콘**: `@tabler/icons-react`
- **YAML 파싱**: `js-yaml`
- **빌드**: Next.js Static HTML Export

### 4.3 인프라
- **CI/CD**: GitHub Actions
- **호스팅**: GitHub Pages
- **버전 관리**: Git/GitHub

### 4.4 데이터 형식
- **원본 시험**: PDF
- **파싱된 시험 데이터**: YAML
- **모델 설정 파일**: JSON
- **평가 결과 데이터**: YAML
- **GitHub Actions 설정**: YAML

## 5. 프로젝트 구조

```
KSAT-AI-Benchmark/
├── .github/
│   └── workflows/
│       ├── parse-and-evaluate.yml    # PDF 파싱 및 평가
│       └── deploy-pages.yml          # GitHub Pages 배포
├── exams/
│   ├── pdf/                          # 원본 PDF 시험지
│   │   ├── 2024-ksat-korean.pdf
│   │   ├── 2024-ksat-math.pdf
│   │   └── ...
│   └── parsed/                       # 파싱된 YAML 파일
│       ├── 2024-ksat-korean.yaml
│       ├── 2024-ksat-math.yaml
│       └── ...
├── models/
│   └── models.json                   # 모델 설정
├── src/
│   ├── parser/                       # PDF 파서
│   │   ├── __init__.py
│   │   ├── pdf_parser.py
│   │   ├── image_extractor.py
│   │   └── yaml_converter.py
│   ├── evaluator/                    # 평가 시스템
│   │   ├── __init__.py
│   │   ├── yaml_loader.py
│   │   ├── model_runner.py
│   │   ├── result_collector.py
│   │   └── utils.py
│   └── models/                       # 모델 인터페이스
│       ├── __init__.py
│       ├── base.py
│       ├── openai_model.py
│       ├── anthropic_model.py
│       ├── upstage_model.py
│       ├── perplexity_model.py
│       └── ...
├── results/                          # 평가 결과 (YAML)
│   ├── gpt-4_2024-ksat-math.yaml
│   └── ...
├── web/                              # Next.js 프론트엔드
│   ├── app/                          # App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # 메인 (리더보드)
│   │   ├── exams/
│   │   │   └── [id]/page.tsx        # 문제 목록
│   │   ├── models/
│   │   │   └── [name]/page.tsx      # 모델 상세
│   │   └── compare/page.tsx         # 비교 페이지
│   ├── components/
│   │   ├── Leaderboard.tsx
│   │   ├── QuestionList.tsx
│   │   ├── AnswerModal.tsx
│   │   ├── ModelChart.tsx
│   │   └── ...
│   ├── lib/
│   │   ├── yamlLoader.ts
│   │   ├── dataProcessor.ts
│   │   └── types.ts
│   ├── public/
│   │   └── data/                     # 결과 YAML 파일 복사본
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   └── ...
├── docs/                             # 문서
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── API.md
├── tests/                            # 테스트
│   ├── test_parser.py
│   ├── test_evaluator.py
│   └── ...
├── requirements.txt                  # Python 의존성
├── .gitignore
├── README.md
└── LICENSE
```

## 6. 구현 단계

### Phase 1: PDF 파싱 시스템 (2주)
- [x] 프로젝트 구조 설정
- [ ] PDF 파서 구현
  - [ ] 텍스트 추출
  - [ ] 문제 번호 인식
  - [ ] 선택지 파싱
  - [ ] 이미지 추출
- [ ] YAML 스키마 정의
- [ ] YAML 변환기 구현
- [ ] 파싱 검증 로직

### Phase 2: 평가 시스템 구현 (3주)
- [ ] YAML 로더 구현
- [ ] 모델 인터페이스 구현
- [ ] 각 AI 모델 API 연동
  - [ ] OpenAI
  - [ ] Anthropic
  - [ ] Google Gemini
  - [ ] Upstage Solar
  - [ ] Perplexity Sonar
- [ ] 결과 수집 및 YAML 저장 로직
- [ ] 에러 처리 및 재시도 로직
- [ ] 시간 측정 및 채점 로직
- [ ] GitHub Actions 워크플로우 구성

### Phase 3: Next.js 웹 인터페이스 (3주)
- [ ] Next.js 프로젝트 설정 (TypeScript, Mantine)
- [ ] YAML 데이터 로더
- [ ] 리더보드 페이지
- [ ] 문제 목록 페이지
  - [ ] 모델별 답안 그리드
  - [ ] 정답/오답 색상 표시
- [ ] 답안 상세 모달
  - [ ] 선택 이유 표시
  - [ ] 풀이 시간 표시
- [ ] 모델별 상세 페이지
- [ ] 시험별 비교 페이지
- [ ] 차트 및 시각화
- [ ] 다크 모드 구현

### Phase 4: 테스트 및 최적화 (2주)
- [ ] 단위 테스트 작성
- [ ] 통합 테스트
- [ ] 성능 최적화
- [ ] 문서화 완성

### Phase 5: 런칭 및 모니터링 (1주)
- [ ] 베타 테스트
- [ ] 버그 수정
- [ ] 공식 런칭
- [ ] 모니터링 및 피드백 수집

## 7. 성공 지표

### 7.1 기술적 지표
- 시험 평가 성공률: 95% 이상
- API 응답 시간: 평균 5초 이내
- 웹사이트 가동 시간: 99% 이상

### 7.2 사용자 지표
- 월간 방문자 수
- 평균 체류 시간
- GitHub 스타 수

### 7.3 콘텐츠 지표
- 등록된 시험지 수
- 평가 완료된 모델 수
- 커뮤니티 기여 (PR, 이슈)

## 8. 위험 요소 및 대응

### 8.1 API 비용
- **위험**: AI 모델 API 사용 비용 증가
- **대응**: 
  - 호출 횟수 제한
  - 캐싱 메커니즘
  - 스폰서십 확보

### 8.2 API 변경
- **위험**: 모델 API 인터페이스 변경
- **대응**: 
  - 추상화 레이어 구현
  - 버전 관리
  - 정기적인 호환성 체크

### 8.3 저작권 문제
- **위험**: 수능 문제 저작권 이슈
- **대응**: 
  - 공개 가능한 문제만 사용
  - 법률 자문
  - 샘플 문제 자체 제작

### 8.4 결과 신뢰성
- **위험**: 평가 결과의 정확성 의심
- **대응**: 
  - 평가 프로세스 투명하게 공개
  - 재현 가능한 결과
  - 커뮤니티 검증

## 9. 향후 확장 계획

### 9.1 단기 (3-6개월)
- 더 많은 AI 모델 지원
- 과거 수능 문제 데이터베이스 확장
- 커뮤니티 기여 가이드 작성

### 9.2 중기 (6-12개월)
- 다국어 시험 지원 (SAT, 가오카오 등)
- 모델 비교 분석 리포트 자동 생성
- API 제공 (외부에서 결과 조회)

### 9.3 장기 (12개월+)
- 실시간 평가 시스템
- 커스텀 테스트 생성 기능
- 모델 파인튜닝 가이드

## 10. 참고 자료

- [수능 출제 기관](https://www.suneung.re.kr/)
- [OpenAI API 문서](https://platform.openai.com/docs)
- [Anthropic API 문서](https://docs.anthropic.com/)
- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [GitHub Pages 문서](https://docs.github.com/en/pages)

---

**문서 버전**: 1.0  
**최종 수정일**: 2025-10-05  
**작성자**: KSAT AI Benchmark Team


