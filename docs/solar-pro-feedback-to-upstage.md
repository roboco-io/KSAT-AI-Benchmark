# Solar-Pro 벤치마크 성능 개선 요청

## 📋 요약

KSAT AI Benchmark(한국 수능 기반 AI 평가)에서 Solar-Pro 모델의 성능을 테스트한 결과, **JSON 응답 형식 미준수로 인한 기술적 문제**로 실제 추론 능력 대비 낮은 점수를 기록했습니다. 개선을 요청드립니다.

---

## 📊 현황

### 테스트 환경
- **벤치마크**: KSAT AI Benchmark (2025학년도 수능 국어영역)
- **시험**: 45문제, 객관식 5지선다
- **평가 방식**: JSON 형식 응답 요구 (`{"answer": 1-5, "reasoning": "..."}`)
- **API**: Upstage Solar API (OpenAI 호환)
- **GitHub**: https://github.com/roboco-io/KSAT-AI-Benchmark

### 성적 비교

| 모델 | 정답률 | JSON 파싱 오류율 |
|------|--------|------------------|
| GPT-5 | 35.6% | 4.4% |
| Claude Opus 4.1 | 31.1% | 6.7% |
| GPT-4o | 24.4% | 0.0% |
| **Solar-Pro** | **11.1%** | **46.7%** ⬅️ |
| Solar-Mini | 20.0% | - |

**Solar-Mini가 Solar-Pro보다 높은 성적**을 기록했습니다.

---

## 🔍 핵심 문제: JSON 형식 미준수

### 문제점
Solar-Pro가 **시스템 프롬프트의 JSON 형식 지시를 무시**하고, 추가 텍스트를 포함하여 응답합니다.

### 통계
- **총 45문제 중 21문제(46.7%)에서 JSON 파싱 실패**
- 파싱 실패 시 자동으로 오답 처리됨
- 실제 추론 능력 기준 정답률: 20.8% (파싱 성공 24문제 중 5문제 정답)

---

## 📝 구체적 실패 사례

### 사례 1: JSON 앞에 한국어 설명 추가 (가장 빈번)

**기대 응답:**
```json
{
  "answer": 4,
  "reasoning": "지문에는 '신뢰도'라는 단어가 등장하지 않으며..."
}
```

**실제 응답:**
```
주어진 지문과 문제를 분석한 결과, 적절하지 않은 평가는 다음과 같습니다.

{
  "answer": 4,
  "reasoning": "지문에는 '신뢰도'라는 단어가 등장하지 않으며..."
}
```

**결과:** `json.loads()` 파싱 실패 → 오답 처리

---

### 사례 2: JSON 뒤에 추가 해설

**실제 응답:**
```
{
  "answer": 2,
  "reasoning": "지문 (가)와 (나)를 종합할 때..."
}

해설:
- (가)의 핵심: **주체적 개화**와 **과학적·철학적 주체성** 강조
- (나)의 핵심: **과학적 방법론의 한계**...
```

**결과:** `json.loads()` 파싱 실패 → 오답 처리

---

### 사례 3: 마크다운 코드 블록 사용

**실제 응답:**
````
### **답변 형식**
```json
{
  "answer": 5,
  "reasoning": "5번은 (나)의 내용과 <보기>의 상황을 잘못 해석..."
}
```

### **상세 분석**
1. **(나)의 핵심 논지**:
   - 과학적 방법이 인문학적 문제 해결에 한계가 있음...
````

**결과:** `json.loads()` 파싱 실패 → 오답 처리

---

## 🛠️ 현재 사용 중인 시스템 프롬프트

```python
system_prompt = """당신은 대한민국 수능 문제를 푸는 AI입니다.

문제를 신중하게 분석하고 다음 형식으로 답변하세요:

{
  "answer": 3,
  "reasoning": "답을 선택한 상세한 이유를 설명합니다..."
}

중요 지침:
1. **지문에 명시된 내용에만 근거**하여 답변하세요
   - 지문의 내용을 우선하세요
   - 외부 지식을 과도하게 의존하지 마세요

2. **핵심 논지와 전체 맥락을 파악**하세요
   - "~라고 오해되어 온 경향", "~라고 보았다" 같은 한정어를 주의하세요
   - 부분적 표현보다 전체 문맥을 우선하세요

3. **형식 준수**
   - answer는 1~5 사이의 숫자여야 합니다
   - reasoning은 구체적이고 논리적이어야 합니다"""
```

**문제점:** "다음 형식으로 답변하세요"라는 지시만으로는 불충분

---

## 💡 개선 요청 사항

### 1. Instruction-Following 능력 개선 (최우선)

**요청:**
- JSON 형식 지시를 엄격히 준수하도록 모델 fine-tuning
- "JSON만 출력", "추가 텍스트 금지" 같은 명시적 지시 준수

**비교:**
- GPT-4o: JSON 파싱 오류 0%
- Claude Opus 4.1: JSON 파싱 오류 6.7%
- **Solar-Pro: JSON 파싱 오류 46.7%** ⬅️ 개선 필요

### 2. 구조화된 출력(Structured Output) 지원

**제안:**
- OpenAI의 `response_format={"type": "json_object"}` 파라미터 지원
- JSON Schema 기반 응답 강제
- 또는 Function Calling 방식 지원

**예시:**
```python
response = client.chat.completions.create(
    model="solar-pro",
    messages=[...],
    response_format={"type": "json_object"}  # ⬅️ 이런 기능 지원 요청
)
```

### 3. 시스템 프롬프트 모범 사례 제공

**요청:**
- Solar-Pro에 최적화된 JSON 응답 프롬프트 예시 제공
- 공식 문서에 "JSON-only response" 가이드 추가
- Temperature, Top-P 등 파라미터 권장값 제공

### 4. 한국어 특화 성능 검증

**관찰 사항:**
- Solar-Mini(20.0%)가 Solar-Pro(11.1%)보다 높은 정답률
- 한국어 특화 모델임에도 범용 모델(GPT-4o 24.4%)보다 낮은 성적
- 지문 이해 오류 사례 발견 (다른 지문과 혼동)

**요청:**
- 긴 한국어 지문 처리 능력 개선
- Context window 관리 최적화
- 한국어 수능 유형 데이터로 추가 학습 고려

---

## 📎 재현 방법

### 1. 벤치마크 실행
```bash
git clone https://github.com/roboco-io/KSAT-AI-Benchmark
cd KSAT-AI-Benchmark
pip install -r requirements.txt

# .env 파일에 UPSTAGE_API_KEY 설정
echo "UPSTAGE_API_KEY=your_key_here" > .env

# 평가 실행
make solar-pro 2025 korean

# 결과 확인
python src/evaluator/summary.py --model solar-pro --subject korean
```

### 2. 결과 파일 위치
- 평가 결과: `results/2025-korean-sat/solar-pro.yaml`
- 상세 로그: `logs/2025-korean-sat_solar-pro_*.log`

### 3. 직접 테스트
Solar-Pro에게 다음 프롬프트로 테스트해보세요:

**프롬프트:**
```
다음 형식으로만 답변하세요. JSON 앞뒤에 다른 텍스트를 추가하지 마세요.

{
  "answer": 3,
  "reasoning": "이유"
}

문제: 다음 중 틀린 것은?
1. 사과는 과일이다
2. 바나나는 채소이다
3. 포도는 과일이다
```

**확인 사항:** JSON만 출력하는지, 아니면 추가 설명이 포함되는지

---

## 🤝 협력 제안

### 단기 (1-2주)
- JSON 응답 형식 개선 패치 제공
- 또는 구조화된 출력 파라미터 지원

### 중기 (1-2개월)
- 한국어 수능 벤치마크 데이터셋 공유 및 협력
- Solar-Pro의 한국어 추론 능력 개선

### 장기
- KSAT AI Benchmark를 공식 평가 도구로 채택
- 정기적인 성능 비교 및 개선

---

## 📧 연락처

- **프로젝트**: KSAT AI Benchmark
- **GitHub**: https://github.com/roboco-io/KSAT-AI-Benchmark
- **이슈 트래킹**: GitHub Issues에서 논의 가능

---

## 🙏 마무리

Solar-Pro는 한국어 특화 모델로서 큰 잠재력을 가지고 있습니다. **Instruction-following 능력만 개선되면** 실제 추론 능력(20.8%)을 온전히 발휘하여 다른 모델과 경쟁할 수 있을 것으로 기대합니다.

**핵심 요청: JSON 형식 엄격 준수 또는 구조화된 출력 파라미터 지원**

감사합니다.

