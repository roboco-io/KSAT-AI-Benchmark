# 아키텍처 문서

KSAT AI Benchmark의 시스템 아키텍처를 설명합니다.

## 전체 구조

```mermaid
flowchart TD
    subgraph repo["GitHub Repository"]
        pdf["exams/pdf/<br/>(PDF 시험지)"]
        models["models/<br/>(모델 설정)"]
        workflows[".github/workflows/"]
    end
    
    pdf -->|"PDF 업로드"| actions["GitHub Actions<br/>(Trigger)"]
    
    subgraph parser["PDF Parser"]
        extract["텍스트 추출"]
        recognize["문제 인식"]
        convert["YAML 변환"]
        
        extract --> recognize
        recognize --> convert
    end
    
    actions --> parser
    parser --> parsed["exams/parsed/<br/>(YAML)"]
    
    subgraph eval["Evaluation System"]
        loader["YAML Loader"]
        runner["Model Runner"]
        subgraph apis["AI Models"]
            openai["OpenAI GPT"]
            anthropic["Claude"]
            google["Gemini"]
            upstage["Solar"]
            perplexity["Sonar"]
        end
        collector["Result Collector"]
        
        loader --> runner
        runner --> apis
        apis --> collector
    end
    
    parsed --> eval
    eval --> results["results/<br/>(YAML)"]
    results --> deploy["GitHub Pages<br/>Deploy"]
    
    subgraph web["Next.js + Mantine"]
        leaderboard["리더보드"]
        questions["문제 목록<br/>(답안 그리드)"]
        modal["답안 상세<br/>(모달)"]
        charts["차트/통계"]
    end
    
    deploy --> web
    
    style repo fill:#e1f5ff
    style parser fill:#ffe1f5
    style eval fill:#fff4e1
    style web fill:#f0ffe1
```

## 주요 컴포넌트

### 1. 데이터 레이어

#### 원본 시험 데이터 (PDF)
- **위치**: `exams/pdf/`
- **형식**: PDF
- **역할**: 원본 수능 시험지
- **트리거**: 새 파일 업로드 시 GitHub Actions 자동 실행

#### 파싱된 시험 데이터 (YAML)
- **위치**: `exams/parsed/`
- **형식**: YAML
- **역할**: 구조화된 문제 데이터
- **스키마**:
```yaml
exam_id: 2024-ksat-math
title: 2024학년도 수학능력시험 - 수학
subject: math
year: 2024
questions:
  - question_id: q1
    question_number: 1
    question_text: "문제 내용..."
    choices: ["1", "2", "3", "4", "5"]
    correct_answer: "3"
    points: 2
```

#### Model Configuration (모델 설정)
- **위치**: `models/models.json`
- **형식**: JSON
- **역할**: 평가할 AI 모델 정의
- **내용**: 모델명, API 엔드포인트, 설정값 등

#### 평가 결과 데이터 (YAML)
- **위치**: `results/`
- **형식**: YAML
- **역할**: 모델별 평가 결과 저장
- **내용**: 답안, 정답 여부, 이유, 시간, 점수

### 2. PDF 파싱 시스템

#### PDF Parser
```python
class PDFParser:
    """PDF 시험지를 파싱하여 YAML로 변환"""
    
    def extract_text(self, pdf_path: str) -> str
    def recognize_questions(self, text: str) -> List[Question]
    def extract_images(self, pdf_path: str) -> List[Image]
    def to_yaml(self, questions: List[Question]) -> str
```

**책임:**
- PDF 텍스트 추출
- 문제 번호 인식
- 선택지 파싱
- 이미지 추출 및 저장
- YAML 형식 변환

**라이브러리:**
- `pdfplumber` - PDF 텍스트/테이블 추출
- `pdf2image` + `pytesseract` - OCR
- `Pillow` - 이미지 처리
- `ruamel.yaml` - YAML 생성

### 3. 평가 시스템 (Evaluation System)

#### YAML Loader
```python
class YAMLLoader:
    """YAML 시험 파일을 로드하고 검증"""
    
    def load_exam(self, yaml_path: str) -> Exam
    def validate_exam(self, exam: Exam) -> bool
    def parse_questions(self, exam: Exam) -> List[Question]
```

**책임:**
- YAML 파일 읽기
- 스키마 검증
- 문제 데이터 구조화

#### Model Runner
```python
class ModelRunner:
    """AI 모델로 문제 풀이 실행"""
    
    def run_question(self, model: Model, question: Question) -> Answer
    def measure_time(self, func) -> Tuple[Result, float]
```

**책임:**
- 모델 API 호출
- 프롬프트 생성
- 응답 파싱
- 실행 시간 측정
- 에러 처리 및 재시도

#### Model Interfaces
```python
class BaseModel(ABC):
    """모든 모델의 기본 인터페이스"""
    
    @abstractmethod
    def generate(self, prompt: str) -> str
    
class OpenAIModel(BaseModel):
    """OpenAI API 구현"""
    
class AnthropicModel(BaseModel):
    """Anthropic API 구현"""
```

**책임:**
- API 클라이언트 초기화
- 프로바이더별 API 호출
- 응답 포맷 통일

#### Result Collector
```python
class ResultCollector:
    """평가 결과 수집 및 YAML 저장"""
    
    def collect_result(self, question: Question, answer: Answer) -> Result
    def save_results_yaml(self, results: List[Result], path: str)
    def calculate_score(self, results: List[Result]) -> Score
    def extract_reasoning(self, response: str) -> str
```

**책임:**
- 정답 비교 및 자동 채점
- 점수 계산 (배점 × 정답 여부)
- 답변 이유 추출
- 풀이 시간 측정
- 결과 YAML 생성 및 저장

### 4. 자동화 레이어 (GitHub Actions)

#### Workflow: parse-and-evaluate.yml
```yaml
name: Parse PDF and Evaluate Models

on:
  push:
    paths:
      - 'exams/pdf/**'
      - 'models/models.json'
  workflow_dispatch:

jobs:
  parse-pdf:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Setup Python
      - Install Dependencies (pdfplumber, pytesseract)
      - Run PDF Parser
      - Save Parsed YAML
      - Commit Parsed Files
  
  evaluate:
    needs: parse-pdf
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Setup Python
      - Install Dependencies
      - Load YAML Exams
      - Run Model Evaluation
      - Save Results YAML
      - Commit Results
```

**책임:**
- PDF 업로드 감지
- PDF 파싱 실행
- 평가 실행 환경 구성
- 모델별 순차 평가
- 결과 커밋

#### Workflow: deploy-pages.yml
```yaml
name: Deploy Next.js to GitHub Pages

on:
  push:
    paths:
      - 'results/**'
      - 'exams/parsed/**'
      - 'web/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Setup Node.js 18+
      - Install Dependencies (npm install)
      - Copy YAML Data to public/data
      - Build Next.js (npm run build)
      - Export Static Site
      - Deploy to GitHub Pages
```

**책임:**
- YAML 데이터 복사
- Next.js 정적 빌드
- GitHub Pages 배포

### 5. 프레젠테이션 레이어 (Next.js + Mantine UI)

#### 기술 스택
- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript 5.0+
- **UI 라이브러리**: Mantine UI 7.0+
- **차트**: Recharts
- **데이터**: YAML 파일 (정적 빌드 시 번들링)

#### 컴포넌트 구조

```mermaid
graph TD
    subgraph web["web/"]
        subgraph app["app/ (App Router)"]
            layout["layout.tsx<br/>(루트 레이아웃)"]
            home["page.tsx<br/>(리더보드)"]
            exams["exams/[id]/page.tsx<br/>(문제 목록)"]
            models["models/[name]/page.tsx<br/>(모델 상세)"]
            compare["compare/page.tsx<br/>(비교)"]
        end
        
        subgraph components["components/"]
            leaderboard["Leaderboard.tsx<br/>(Mantine Table)"]
            questionlist["QuestionList.tsx<br/>(Grid + Cards)"]
            answermodal["AnswerModal.tsx<br/>(Mantine Modal)"]
            modelchart["ModelChart.tsx<br/>(Recharts)"]
        end
        
        subgraph lib["lib/"]
            yamlloader["yamlLoader.ts<br/>(YAML 파싱)"]
            processor["dataProcessor.ts<br/>(데이터 처리)"]
            types["types.ts<br/>(TypeScript 타입)"]
        end
    end
    
    style app fill:#e3f2fd
    style components fill:#f3e5f5
    style lib fill:#fff3e0
```

#### 주요 페이지

**1. 리더보드 (`app/page.tsx`)**
- Mantine Table로 모델 순위 표시
- Badge로 순위 표시
- Select로 과목별 필터링
- RingProgress로 정답률 시각화

**2. 문제 목록 (`app/exams/[id]/page.tsx`)**
- Grid로 모델별 답안 배치
- Card로 각 문제 표시
- Badge로 정답(초록)/오답(빨강) 구분
- ActionIcon 클릭 시 모달 팝업

**3. 답안 상세 모달 (`components/AnswerModal.tsx`)**
- Modal 컴포넌트 사용
- Text로 선택 이유 표시 (줄바꿈 보존)
- Stack으로 정보 수직 배치
- Divider로 섹션 구분

**4. 모델 상세 (`app/models/[name]/page.tsx`)**
- Tabs로 과목별 구분
- Progress로 정답률 표시
- BarChart로 점수 분포
- Timeline으로 평가 히스토리

#### 데이터 플로우

```mermaid
flowchart LR
    yaml["YAML 파일<br/>(results/)"] --> copy["빌드 시<br/>public/data/ 복사"]
    copy --> loader["yamlLoader.ts<br/>(파싱)"]
    loader --> processor["dataProcessor.ts<br/>(처리)"]
    processor --> components["React 컴포넌트<br/>(Mantine UI)"]
    components --> static["정적 HTML<br/>(GitHub Pages)"]
    
    style yaml fill:#fff9c4
    style components fill:#c8e6c9
    style static fill:#bbdefb
```

**책임:**
- YAML 데이터 로드 및 파싱
- 결과 데이터 시각화
- 인터랙티브 UI 제공 (모달, 필터링)
- 반응형 레이아웃
- 다크/라이트 모드 지원

## 데이터 플로우

### 평가 프로세스

```mermaid
flowchart TD
    start["PDF 업로드"] --> trigger["GitHub Actions<br/>트리거"]
    
    subgraph parse["PDF 파싱 Job"]
        extract["PDF 텍스트 추출<br/>(pdfplumber)"]
        recognize["문제 인식<br/>(정규식/패턴)"]
        images["이미지 추출<br/>(pdf2image)"]
        yaml_gen["YAML 생성<br/>(ruamel.yaml)"]
        
        extract --> recognize
        extract --> images
        recognize --> yaml_gen
        images --> yaml_gen
    end
    
    trigger --> parse
    yaml_gen --> parsed["exams/parsed/<br/>YAML 저장"]
    parsed --> commit1["Git 커밋"]
    
    commit1 --> eval_start["평가 Job 시작"]
    
    subgraph evaluate["평가 Job"]
        load["YAML 로드"] --> validate["스키마 검증"]
        validate --> create["Question 객체 생성"]
        
        create --> model_loop{"각 모델마다"}
        model_loop --> init["모델 초기화"]
        
        init --> question_loop{"각 문제마다"}
        question_loop --> prompt["프롬프트 생성"]
        prompt --> timer_start["타이머 시작"]
        timer_start --> api["API 호출"]
        api --> timer_end["타이머 종료"]
        timer_end --> extract_ans["답안 추출"]
        extract_ans --> extract_reason["이유 추출"]
        extract_reason --> check["정답 비교"]
        check --> score["점수 계산"]
        score --> question_loop
        
        question_loop -->|"완료"| aggregate["결과 집계"]
        aggregate --> model_loop
        
        model_loop -->|"완료"| save["결과 저장"]
    end
    
    eval_start --> evaluate
    save --> yaml_save["YAML 파일 생성<br/>(results/)"]
    yaml_save --> commit2["Git 커밋 & 푸시"]
    
    commit2 --> deploy_trigger["배포 트리거"]
    
    subgraph deploy["배포 Job"]
        copy["YAML → public/data/"]
        build["Next.js 빌드"]
        export["정적 HTML 생성"]
        
        copy --> build
        build --> export
    end
    
    deploy_trigger --> deploy
    export --> pages["GitHub Pages<br/>배포"]
    pages --> done["완료"]
    
    style start fill:#90EE90
    style done fill:#FFB6C1
    style parse fill:#ffe1f5
    style evaluate fill:#fff4e1
    style deploy fill:#E0BBE4
    style api fill:#FFE4B5
```

## 에러 처리

### 재시도 로직

```mermaid
flowchart TD
    start["API 호출 시작"] --> call["API 요청"]
    call --> check{"성공?"}
    check -->|Yes| success["결과 반환"]
    check -->|No| error{"에러 타입"}
    
    error -->|"APIError<br/>TimeoutError"| retry{"재시도 횟수<br/>< 3?"}
    error -->|"기타 에러"| log_error["에러 로그 기록"]
    
    retry -->|Yes| wait["지수 백오프<br/>(5초 × 2^n)"]
    wait --> call
    retry -->|No| log_fail["재시도 실패<br/>로그 기록"]
    
    log_fail --> fail["실패 반환"]
    log_error --> fail
    
    style success fill:#90EE90
    style fail fill:#FFB6C1
    style wait fill:#FFE4B5
```

### 재시도 코드 예시
```python
@retry(
    max_attempts=3,
    delay=5,
    backoff=2,
    exceptions=(APIError, TimeoutError)
)
def call_api(model, prompt):
    # API 호출
    pass
```

### 에러 타입

```mermaid
graph TD
    errors["에러 타입"] --> api["API 에러<br/>(재시도 후 기록)"]
    errors --> timeout["타임아웃<br/>(제한 시간 초과 기록)"]
    errors --> parse["파싱 에러<br/>(응답 형식 불일치 기록)"]
    errors --> validation["검증 에러<br/>(데이터 무결성 문제)"]
    
    style api fill:#ffcdd2
    style timeout fill:#fff9c4
    style parse fill:#f8bbd0
    style validation fill:#e1bee7
```

## 확장성

### 새로운 모델 추가

```mermaid
flowchart LR
    A["models.json에<br/>설정 추가"] --> B{"커스텀 API?"}
    B -->|Yes| C["src/models/에<br/>인터페이스 구현"]
    B -->|No| D["자동으로<br/>평가에 포함"]
    C --> D
    
    style A fill:#bbdefb
    style D fill:#c8e6c9
```

### 새로운 시험 추가

```mermaid
flowchart LR
    A["exams/에<br/>JSON 파일 추가"] --> B["Git Push"]
    B --> C["GitHub Actions<br/>자동 실행"]
    C --> D["모든 모델로<br/>자동 평가"]
    
    style A fill:#bbdefb
    style D fill:#c8e6c9
```

### 새로운 평가 지표 추가

```mermaid
flowchart LR
    A["ResultCollector에<br/>계산 로직 추가"] --> B["결과 스키마<br/>업데이트"]
    B --> C["웹 인터페이스에<br/>표시 로직 추가"]
    
    style A fill:#bbdefb
    style B fill:#fff9c4
    style C fill:#c8e6c9
```

## 보안

### API 키 관리

```mermaid
flowchart LR
    dev["개발자"] -->|"설정"| secrets["GitHub Secrets"]
    secrets -->|"주입"| env["환경 변수"]
    env -->|"읽기"| code["평가 코드"]
    
    code -.->|"절대 하지 않음"| hardcode["❌ 하드코딩"]
    
    style secrets fill:#c8e6c9
    style env fill:#fff9c4
    style code fill:#bbdefb
    style hardcode fill:#ffcdd2
```

### Rate Limiting

```mermaid
sequenceDiagram
    participant Code as 코드
    participant Limiter as Rate Limiter
    participant API as AI API
    
    Code->>Limiter: API 호출 요청
    Limiter->>Limiter: 호출 횟수 체크
    
    alt 제한 이내
        Limiter->>API: API 호출
        API-->>Limiter: 응답
        Limiter-->>Code: 결과 반환
    else 제한 초과
        Limiter->>Limiter: 대기 (60초)
        Limiter->>API: API 호출
        API-->>Limiter: 응답
        Limiter-->>Code: 결과 반환
    end
```

### Rate Limiting 코드 예시
```python
@rate_limit(max_calls=60, period=60)
def call_api():
    pass
```

## 성능 최적화

### 캐싱 전략

```mermaid
flowchart TD
    request["평가 요청"] --> cache_check{"캐시<br/>존재?"}
    
    cache_check -->|Yes| valid{"유효<br/>기간?"}
    cache_check -->|No| evaluate["모델 평가 실행"]
    
    valid -->|"유효"| return_cache["캐시된 결과 반환"]
    valid -->|"만료"| evaluate
    
    evaluate --> store["결과 저장"]
    store --> set_ttl["TTL 30일 설정"]
    set_ttl --> return_new["새 결과 반환"]
    
    style cache_check fill:#fff9c4
    style return_cache fill:#c8e6c9
    style evaluate fill:#bbdefb
```

### 병렬 처리 아키텍처

```mermaid
flowchart LR
    subgraph sequential["순차 처리 (기본)"]
        q1["문제 1"] --> q2["문제 2"]
        q2 --> q3["문제 3"]
        q3 --> q4["문제 4"]
    end
    
    subgraph parallel["병렬 처리 (선택)"]
        direction TB
        pool["Worker Pool"]
        pool --> w1["Worker 1<br/>(문제 1)"]
        pool --> w2["Worker 2<br/>(문제 2)"]
        pool --> w3["Worker 3<br/>(문제 3)"]
        pool --> w4["Worker 4<br/>(문제 4)"]
    end
    
    style sequential fill:#ffecb3
    style parallel fill:#c8e6c9
```

### 비용 최적화

```mermaid
flowchart TD
    start["평가 시작"] --> priority["모델 우선순위 정렬"]
    priority --> small["작은 모델<br/>(GPT-3.5, Haiku)"]
    small --> cache_check{"캐시 확인"}
    
    cache_check -->|"캐시 있음"| skip["호출 스킵"]
    cache_check -->|"캐시 없음"| call["API 호출"]
    
    call --> rate["Rate Limit 체크"]
    rate --> save["결과 캐시 저장"]
    
    skip --> medium["중간 모델<br/>(Sonnet)"]
    save --> medium
    
    medium --> large["큰 모델<br/>(GPT-4, Opus)"]
    
    style small fill:#c8e6c9
    style medium fill:#fff9c4
    style large fill:#ffcdd2
    style skip fill:#90EE90
```

## 모니터링

### 로깅 시스템

```mermaid
flowchart LR
    subgraph sources["로그 소스"]
        api["API 호출"]
        error["에러"]
        time["실행 시간"]
    end
    
    sources --> logger["Logger"]
    
    logger --> console["콘솔 출력"]
    logger --> file["로그 파일<br/>(logs/)"]
    
    file --> analysis["로그 분석"]
    
    style logger fill:#bbdefb
    style file fill:#fff9c4
    style analysis fill:#c8e6c9
```

### 주요 메트릭

```mermaid
graph TD
    metrics["메트릭"] --> success["평가 성공률<br/>(완료/전체)"]
    metrics --> time["평균 실행 시간<br/>(모델별/문제별)"]
    metrics --> cost["API 비용 추정<br/>(토큰 사용량)"]
    metrics --> error_rate["에러 발생률<br/>(에러/전체 호출)"]
    
    success --> dashboard["대시보드"]
    time --> dashboard
    cost --> dashboard
    error_rate --> dashboard
    
    style metrics fill:#e1f5ff
    style dashboard fill:#c8e6c9
```

## 추후 개선 사항

1. **실시간 평가**: Webhook을 통한 즉시 평가
2. **병렬 처리**: 여러 모델 동시 실행
3. **분산 처리**: 대규모 평가를 위한 분산 시스템
4. **A/B 테스트**: 프롬프트 최적화
5. **머신러닝**: 난이도 자동 분류


