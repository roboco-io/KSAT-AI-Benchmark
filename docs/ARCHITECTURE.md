# 아키텍처 문서

KSAT AI Benchmark의 시스템 아키텍처를 설명합니다.

## 전체 구조

```mermaid
flowchart TD
    subgraph repo["GitHub Repository"]
        exams["exams/<br/>(시험 데이터)"]
        models["models/<br/>(모델 설정)"]
        workflows[".github/workflows/"]
    end
    
    repo --> actions["GitHub Actions<br/>(Trigger Detection)"]
    
    subgraph eval["Evaluation System"]
        loader["Exam Loader"]
        runner["Model Runner"]
        subgraph apis["AI Models"]
            openai["OpenAI"]
            anthropic["Anthropic"]
            google["Google"]
        end
        collector["Result Collector"]
        
        loader --> runner
        runner --> apis
        apis --> collector
    end
    
    actions --> eval
    eval --> results["results/<br/>(JSON)"]
    results --> deploy["GitHub Pages Deploy"]
    
    subgraph web["Web Interface"]
        leaderboard["Leaderboard"]
        details["Detail Pages"]
        charts["Charts"]
    end
    
    deploy --> web
    
    style repo fill:#e1f5ff
    style eval fill:#fff4e1
    style web fill:#f0ffe1
```

## 주요 컴포넌트

### 1. 데이터 레이어

#### Exam Data (시험 데이터)
- **위치**: `exams/`
- **형식**: JSON
- **역할**: 평가에 사용될 문제 저장
- **스키마**: 문제 ID, 텍스트, 선택지, 정답 등

#### Model Configuration (모델 설정)
- **위치**: `models/models.json`
- **형식**: JSON
- **역할**: 평가할 AI 모델 정의
- **내용**: 모델명, API 엔드포인트, 설정값 등

### 2. 평가 시스템 (Evaluation System)

#### Exam Loader
```python
class ExamLoader:
    """시험 파일을 로드하고 검증"""
    
    def load_exam(self, exam_path: str) -> Exam
    def validate_exam(self, exam: Exam) -> bool
```

**책임:**
- JSON 파일 읽기
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
    """평가 결과 수집 및 저장"""
    
    def collect_result(self, question: Question, answer: Answer) -> Result
    def save_results(self, results: List[Result], path: str)
    def calculate_score(self, results: List[Result]) -> Score
```

**책임:**
- 정답 비교
- 점수 계산
- 결과 JSON 생성
- 파일 저장

### 3. 자동화 레이어 (GitHub Actions)

#### Workflow: evaluate.yml
```yaml
name: Evaluate Models

on:
  push:
    paths:
      - 'exams/**'
      - 'models/models.json'
  workflow_dispatch:

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Setup Python
      - Install Dependencies
      - Run Evaluation
      - Save Results
      - Commit Results
```

**책임:**
- 변경 감지
- 평가 실행 환경 구성
- 결과 커밋

#### Workflow: deploy-pages.yml
```yaml
name: Deploy to GitHub Pages

on:
  push:
    paths:
      - 'results/**'

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - Build Web Interface
      - Deploy to GitHub Pages
```

**책임:**
- 웹 인터페이스 빌드
- GitHub Pages 배포

### 4. 프레젠테이션 레이어 (Web Interface)

#### Components

```mermaid
graph TD
    subgraph web["web/"]
        subgraph src["src/"]
            subgraph components["components/"]
                leaderboard["Leaderboard.tsx<br/>(리더보드)"]
                modeldetail["ModelDetail.tsx<br/>(모델 상세)"]
                examdetail["ExamDetail.tsx<br/>(시험 상세)"]
                charts["Charts.tsx<br/>(차트/시각화)"]
            end
            
            subgraph pages["pages/"]
                home["Home.tsx<br/>(메인 페이지)"]
                models["Models.tsx<br/>(모델 목록)"]
                exams["Exams.tsx<br/>(시험 목록)"]
            end
            
            subgraph utils["utils/"]
                dataloader["dataLoader.ts<br/>(데이터 로딩)"]
                calc["calculations.ts<br/>(점수 계산)"]
            end
        end
    end
    
    style components fill:#e3f2fd
    style pages fill:#f3e5f5
    style utils fill:#fff3e0
```

**책임:**
- 결과 데이터 시각화
- 인터랙티브 UI 제공
- 필터링 및 정렬

## 데이터 플로우

### 평가 프로세스

```mermaid
flowchart TD
    start["트리거 감지"] --> detect{"변경 사항"}
    detect -->|"새 시험 추가"| load
    detect -->|"새 모델 추가"| load
    
    load["시험 로드"] --> read["JSON 파일 읽기"]
    read --> validate["스키마 검증"]
    validate --> create["Question 객체 생성"]
    
    create --> model_loop{"각 모델마다"}
    model_loop --> init["모델 초기화"]
    
    init --> question_loop{"각 문제마다"}
    question_loop --> prompt["프롬프트 생성"]
    prompt --> api["API 호출<br/>(시간 측정)"]
    api --> parse["응답 파싱"]
    parse --> compare["정답 비교"]
    compare --> question_loop
    
    question_loop -->|"완료"| aggregate["결과 집계"]
    aggregate --> model_loop
    
    model_loop -->|"완료"| save["결과 저장"]
    save --> json["JSON 파일 생성"]
    json --> store["results/ 폴더에 저장"]
    
    store --> commit["Git 커밋 & 푸시"]
    commit --> deploy["웹 인터페이스 빌드"]
    deploy --> pages["GitHub Pages 배포"]
    
    pages --> done["완료"]
    
    style start fill:#90EE90
    style done fill:#FFB6C1
    style api fill:#FFE4B5
    style deploy fill:#E0BBE4
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


