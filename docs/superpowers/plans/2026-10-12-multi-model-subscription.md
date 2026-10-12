# 구독 전용 다중 모델 수능 비교 실행 계획

## 목표와 순서

기존 Sol 결과를 보존하고 GPT-6 Astra·GPT-6 Luna를 같은 147문항으로 평가한다. 두 모델이 완료된 뒤 Claude Agent SDK로 Sonnet 5.5, Opus 5.5, Haiku 5.5, Fable 5.1을 순서대로 평가한다. 모델별 정답률·기권률·선택과목 점수·실제 경과 시간·토큰·API 환산 참고 비용을 정적 첫 화면에서 비교하고 GitHub 저장소 링크를 제공한다.

## 과금 방지 조건

- API 키·API 토큰·유료 클라우드 공급자 환경 변수를 자식 프로세스에서 제거한다. API 인증으로 자동 대체하지 않는다.
- Codex는 모델 요청 전 로컬 app-server의 account/read와 account/rateLimits/read로 ChatGPT 인증, 포함 사용량 허용, 유료 크레딧 잔액 0을 확인한다. 크레딧 과금 가능 상태·인증 불명·한도 초과에서는 모델을 호출하지 않는다.
- Claude는 기존 개인 구독 OAuth 로그인과 firstParty·Max/Pro·API key source none을 SDK accountInfo로 확인한 뒤 입력을 전달한다. API 키와 apiKeyHelper·외부 공급자는 허용하지 않는다.
- Claude 추가 유료 사용은 사용자 계정의 Settings → Usage에서 OFF임을 먼저 확인한다. SDK의 maxBudgetUsd나 UI 명령 숨김은 과금 차단으로 취급하지 않는다.
- SDK의 overageEnabled, overageInUse, isUsingOverage 및 quota rejection을 감지하면 즉시 멈춘다. 한도 초과 시 유료 크레딧·자동 충전·API로 넘어가지 않는다.
- API 환산 참고 비용을 실제 청구액 또는 API 사용 결제액으로 표시하지 않는다. 가격과 SDK 추정 필드의 근거를 함께 기록한다.

## 작업과 완료 기준

- [x] 최신 모델 ID·개인 SDK 구독 사용 지원을 공식 문서로 확인한다.
- [x] 모델별 결과 경로·요율·SDK 어댑터와 인증 보호를 구현한다.
- [x] 답안·기권 잠금, 모델별 요율, 캐시 토큰 정규화, 유료 인증·overage·모델 대체 차단을 오프라인 테스트한다.
- [x] 정적 첫 화면의 7모델 비교표·상태·상세 선택·GitHub 링크를 구현한다. 완료되지 않은 모델의 점수를 만들어 넣거나 순위에 포함하지 않는다.
- [x] Astra·Luna의 147문항을 각각 완료하고 오류·기권·사용량을 검증한다.
- [x] Claude 추가 유료 사용 OFF 확인 후 지정한 4모델을 각각 완료한다.
- [x] 전체 결과를 독립 채점해 schema_version=3 비교 JSON을 생성한다.
- [x] 테스트·정적 빌드·모바일/데스크톱·콘솔·공개 JSON 검증을 통과한 뒤 기존 GitHub Pages 주소로 배포한다.

실행 명령:

```bash
npm ci --prefix benchmark
npm test --prefix benchmark
node benchmark/run.mjs --model gpt-6-astra
node benchmark/run.mjs --model gpt-6-luna
node benchmark/run.mjs --model claude-sonnet-5-5
node benchmark/run.mjs --model claude-opus-5-5
node benchmark/run.mjs --model claude-haiku-5-5
node benchmark/run.mjs --model claude-fable-5-1
node benchmark/export.mjs
npm run build --prefix web
```

실행 순서를 지키며 Claude 시작 조건을 확인하지 못하면 해당 단계에서 멈춘다.

## 비교 조건과 기록

원본 200 DPI 무손실 이미지와 같은 문항 ID·채점 키·지시·기권 정책을 사용한다. 공유 지문과 선택과목의 8개 묶음으로 처리하며 외부 도구·검색은 비활성화한다. Claude의 StructuredOutput은 외부 IO가 없는 출력 형식 캐리어만 허용한다. 모델별 토크나이저·SDK·추론 예산은 동일한 것으로 취급하지 않고 공개한다.

각 모델의 결과는 `benchmark/models.mjs`에 지정한 별도 경로에 보존한다. 이미 제출한 답과 기권은 변경하지 않는다. 반복은 미제출·실행 오류만 처리하며 묶음당 누적 최대 3회다. 모델·문항·지문·프롬프트 해시를 보존한다. 인증 증명에는 계정 이메일·조직 ID·토큰·개인 결제 정보를 포함하지 않는다.

## 근거

- [Codex 구독과 크레딧](https://learn.chatgpt.com/docs/pricing).
- [Claude SDK의 개인 구독 사용](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan).
- [Claude 추가 사용 크레딧과 자동 유료 전환](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans).
- 최신 모델 명세: [Astra](https://developers.openai.com/api/docs/models/gpt-6-astra), [Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [Claude](https://platform.claude.com/docs/en/models/overview).

## 실행 결과와 배포 검증

2026-10-12 실행을 완료했다. 각 모델은 고유 문항 147개를 제출했고 실행 오류·미제출은 0개다. 기권은 정답률 분모에 포함한다.

| 모델 | 정답 | 기권 | 실제 경과 시간 | API 환산 참고 USD |
| --- | ---: | ---: | ---: | ---: |
| GPT-6.1 Sol | 142 | 0 | 1,045.3초 | 0.9136 |
| GPT-6 Astra | 147 | 0 | 480.3초 | 3.9673 |
| GPT-6 Luna | 112 | 2 | 453.0초 | 0.0642 |
| Claude Sonnet 5.5 | 141 | 0 | 407.9초 | 2.0340 |
| Claude Opus 5.5 | 146 | 0 | 323.2초 | 3.0655 |
| Claude Haiku 5.5 | 129 | 10 | 720.9초 | 0.1830 |
| Claude Fable 5.1 | 146 | 0 | 492.1초 | 8.4610 |

Sonnet의 첫 11문항 시험 실행 후 실제 잔여량을 확인하고 전체 평가를 이어갔다. 각 후속 모델 전에 구독 한도와 Usage credits OFF를 확인했다. 계정별 잔여량은 비공개 로컬 기록으로만 보존한다. 표의 비용은 청구액이 아니다.

오프라인 테스트 24개와 로컬·CI 정적 빌드가 통과했다. [배포 실행](https://github.com/roboco-io/KSAT-AI-Benchmark/actions/runs/38243439170)이 성공했다. [공개 대시보드](https://roboco.io/KSAT-AI-Benchmark/) HTTP 200, 7모델 요약·1,029개 문항 기록 일치, 데스크톱·모바일 표시와 Fable·Haiku 상세 선택, GitHub 링크를 확인했다. 브라우저 콘솔 오류와 가로 넘침은 없었다.
