# Codex SDK 수능 풀이와 정적 대시보드 구현 계획

> **For agentic workers:** Use `superpowers:executing-plans` or `superpowers:subagent-driven-development` to execute checked tasks. The user has explicitly authorized implementation, solving, grading, commit/push needed for deployment, and GitHub Pages deployment. Steps use checkbox syntax.

**Goal:** Codex SDK의 GPT-6.1-Sol로 2026학년도 국어·영어·수학을 풀고 기권을 허용하며, 채점 결과와 정답률·기권률·전체 시간·토큰 비용 예상치를 `https://roboco.io/KSAT-AI-Benchmark/`에 정적으로 공개한다.

**Architecture:** 원본 PDF → 검수한 문항·정답 데이터 → PDF 페이지 이미지 → 제한된 Ralph 반복 실행 → 답안 고정 → 결정론적 채점·비용 추정 → 공개 결과 JSON → Next.js 정적 HTML → GitHub Pages. 모델 프로세스에는 이미지와 문항 ID·종류만 제공하고 정답을 전달하지 않는다.

**Tech Stack:** Node.js 24, `@openai/codex-sdk@0.162.1`, Codex CLI 0.162.1, Poppler, Python 표준 라이브러리, Next.js 15, React 19, Mantine 7, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-12-codex-ksat-design.md`; 아래 최신 범위가 이전 수학 단독·CLI 중심 제안을 대체한다.

## 확정 범위와 운영 조건

- 국어: 공통 34문항 + 화법과 작문 11문항 + 언어와 매체 11문항. 45문항·100점 시험 두 개로 집계한다.
- 수학: 공통 22문항 + 확률과 통계·미적분·기하 각 8문항. 30문항·100점 시험 세 개로 집계한다.
- 영어: 45문항·100점. 음성 미지원 모델이므로 듣기 1~17번은 공식 대본 이미지로 풀고 입력 조건을 공개한다.
- 합계는 147개 고유 문항이다. 공통 문항을 여러 선택과목 시험에서 합산하더라도 전체 정답률 분모에서 중복 세지 않는다.
- 입력은 홀수형 원본 PDF 200 DPI 이미지다. 이미지의 문제 내용을 전사·변형하지 않는다.
- 모델은 `gpt-6.1-sol`, 추론 수준 `high`로 고정한다. 다른 모델로 자동 대체하지 않는다.
- 첫 실행은 원본 지문 보존을 위해 공통·선택과목별 8개 묶음 요청으로 수행한다. 도구·검색·MCP·플러그인은 비활성화하고 실제 도구 이벤트가 발생하면 해당 시도를 실패 처리한다. 풀이 작업 공간은 저장소 밖 임시 폴더다.
- Ralph는 동일한 기본 지시를 반복하고 파일에 진행을 보존하는 SDK 루프다. Claude Stop 훅을 실행한 것으로 표현하지 않는다. 기본 최대 3회 반복, 동시 요청 2개, 묶음당 900초, API 환산 예상 비용 상한 25 USD다. 완료 답안과 기권은 재풀이하지 않고 미제출·인프라 오류만 재개한다.
- 사용자는 이 계획 작성 이후 구현·실풀이·배포까지 명시적으로 요청했다. 문서 작성 뒤 별도 승인 대기로 작업을 중단하지 않는다.

## 파일 책임과 인터페이스

| 파일 | 책임 |
| --- | --- |
| `exams/pdf/2026/sources.json` | 공식 원본 출처·해시·정답 확정 근거 |
| `exams/datasets/2026-ksat.json` | 문항 ID·유형·배점·정답·실제 PDF 페이지·선택과목 시험 구성 |
| `benchmark/package.json`, `package-lock.json` | 고정 SDK 의존성과 test/solve/export 명령 |
| `benchmark/core.mjs` | 답안 검증, 기권과 오류 구분, 채점, 토큰 비용·집계 |
| `benchmark/codex-isolated.sh` | SDK 실행에 사용자 설정·세션 지속을 상속하지 않도록 CLI 래핑 |
| `benchmark/run.mjs` | 이미지 렌더링, SDK 요청, 잠긴 답안과 진행 기록, 제한된 Ralph 루프 |
| `benchmark/export.mjs` | 채점 후 공개 JSON 생성; 원본 이벤트·인증·내부 경로 제외 |
| `benchmark/test/core.test.mjs` | 검증·채점·비용·기권·재개·연결 오류 회귀 테스트 |
| `results/codex-2026/run.json` | 실제 답안·시도·시간·SDK 사용량·프로토콜 기록 |
| `web/public/data/benchmark-v2.json` | 공개 결과 데이터. 결과 HTML의 유일한 평가 입력 |
| `web/components/BenchmarkDashboard.tsx`, `benchmark-types.ts` | 타입·학년도별 성적표·필터·문항 상세 |
| `web/app/page.tsx`, `layout.tsx`, `globals.css` | 빌드 시 데이터 포함, 정적 레이아웃·글꼴·스타일 |
| `web/app/archive/page.tsx` | 기존 방식의 과거 결과를 별도로 보존 |
| `.github/workflows/deploy-pages.yml` | 정적 빌드·artifact 업로드·Pages 배포 |
| `.runtime/` | 렌더 이미지·원본 이벤트. git에서 제외하고 웹에 공개하지 않음 |

`validateAnswers(items, questions)`는 검증한 ID→답안 매핑을 반환한다. `summarize(questions, answers, errors, usage, wallSeconds, solverSeconds)`는 전체 분모·점수·기권·오류·시간·사용량을 집계한다. `estimateCost(usage)`는 USD 예상치만 반환한다. `mergeSubmitted(existing, incoming)`는 이미 제출된 답과 기권을 보존한다.

공개 데이터 버전은 `schema_version=2`다. 최상위에는 `summary`, `exams`, `questions`, `sources`, `pricing`, `limitations`, `protocol`, `completed`를 둔다. 시험별 summary에는 100점 원점수를 포함한다. 문항별 상태는 `correct`, `incorrect`, `abstained`, `error`, `pending`이다. 모델의 `decision`과 채점 상태를 분리한다.

## Review Focus

1. 같은 번호의 선택과목 문항이 다른 ID이며 공통 문항이 전체 집계에서 중복되지 않는다 — 데이터·채점 테스트.
2. 기권 답 `null`을 숫자 0이나 실행 오류로 바꾸지 않는다 — 답안·집계 테스트.
3. SDK의 일시적인 Reconnecting 안내를 최종 실패로 오인하지 않는다 — 스트림 오류 회귀 테스트.
4. 캐시 입력을 일반 입력과 중복 과금하지 않고 추론 출력 토큰을 총 출력에 다시 더하지 않는다 — 비용 테스트.
5. 정답·기권 완료 결과가 재개에서 수정되지 않고, 일부 결과를 완전한 실행으로 표시하지 않는다 — 재개·완료 검증.

## Task 1 공식 자료 확보와 데이터 검수

- [x] 공식 게시판에서 국어·수학·영어 문제지·정답표와 영어 듣기 대본을 다운로드한다.
- [x] PDF 구조·해시·페이지 수를 확인하고 정답 확정 발표를 시각 검수한다.
- [x] 홀수형 정답표를 시각 판독하고 문항이 있는 실제 페이지를 매핑한다.
- [x] 각 시험의 문항 수와 100점 배점, 147개 고유 ID, 8개 solver group을 검증한다.

검증 명령: `python3` 표준 라이브러리로 JSON을 읽고 각 `question_ids`의 유일성과 점수 합계를 확인한다. 기대값: 국어 시험 2개×45문항, 수학 시험 3개×30문항, 영어 45문항, 모든 시험 100점.

## Task 2 답안·기권·채점·비용 테스트와 구현

- [x] 아래 실패 사례를 먼저 테스트로 작성하고 구현 전 실행 실패를 확인한다.

```javascript
// 4문항: 정답 1, 오답 1, 기권 1, 오류 1이면
assert.equal(summary.accuracy, 25);
assert.equal(summary.abstention_rate, 25);
assert.equal(summary.attempt_accuracy, 50);
// 1M input, 200K cached input, 100K total output
assert.equal(estimateCost(usage), 2.62);
```

- [x] 미등록·중복 ID, 객관식 범위, 정수 단답형, 기권과 비어 있지 않은 답의 충돌을 검증한다.
- [x] 기권·실패는 0점이며 전체 시험 분모를 유지한다. 유효 시도가 없으면 시도 정답률은 `null`이다.
- [x] 이전 제출 답안을 보존하는 재개 정책을 구현한다.
- [x] SDK 연결 재개 안내와 진짜 종료 오류를 분리하고 회귀 테스트를 통과시킨다.

검증: `npm test --prefix benchmark`. 기대값: 모든 테스트 통과, 어떤 테스트도 모델을 호출하지 않음.

## Task 3 SDK 예비 실행과 제한된 Ralph 루프

- [x] `@openai/codex-sdk@0.162.1` 설치 후 실제 타입에서 `local_image`, `runStreamed`, `outputSchema`, 사용량을 확인한다.
- [x] 원본 수학 이미지 한 문항을 예비 호출해 명시한 모델·추론·스키마와 사용량 반환을 확인한다. 예비 결과는 공식 결과로 합산하지 않는다.
- [x] 모델 요청에서 `correct_answer`와 채점 데이터가 제외되는지 확인한다.
- [x] 각 묶음에서 답·기권을 JSON으로 받고 이미지 해시·토큰·실제 요청 시간을 저장한다.
- [x] 8개 묶음의 모든 147개 문항에 답 또는 자발적 기권이 제출될 때까지 실행한다. 연결 오류는 기록을 유지하며 재개한다.
- [x] 출력 스키마·미제출·사용량·완료 상태를 검증한다.

실행: 저장소 루트에서 `node benchmark/run.mjs`. 기대값: `RALPH COMPLETE: 147/147`와 실제 사용량. 종료 코드가 0이어도 답안 수·ID·도구 이벤트를 따로 확인한다.

## Task 4 정적 공개 데이터와 대시보드

- [x] `node benchmark/export.mjs`로 원본 실행 데이터에서 공개 JSON을 생성하는 경로를 구현한다.
- [x] 새 대시보드에 정답률·기권률·원점수·전체 경과 시간·묶음 요청 시간 합계·토큰·USD 예상 비용을 구현한다.
- [x] 문항 필터·짧은 설명·기권 사유·원본 출처·결과 다운로드를 제공한다.
- [x] 결과는 빌드 시 HTML에 포함한다. 서버 API·DB·실시간 갱신 기능을 추가하지 않는다.
- [x] 모바일·데스크톱과 키보드 접근, 0개 시도·미실행 상태를 확인한다.
- [x] 실제 결과로 fixture를 교체하고 다시 빌드한다.

묶음 시간·토큰을 문항별로 균등 배분한 값은 추정이라고 표시한다. 전체 시간은 실제 경과 시간이다. 캐시·출력·추론 토큰 정의는 SDK 필드를 그대로 보존한다. 사용량을 반환하지 않은 실패 시도는 비용 추정에서 제외될 수 있음을 공개한다. 비용은 공개 API 요율에 따른 USD 환산이며 ChatGPT 구독의 실제 청구액이 아니다.

## Task 5 검증과 배포

- [x] 전체 오프라인 테스트, 실제 답안 검증, JSON 집계와 시험별 100점 검증을 실행한다.
- [x] `npm run build --prefix web`로 정적 export를 생성한다.
- [ ] `web/out/`에서 JSON과 HTML의 실제 지표를 확인하고 새 화면을 검수한다.
- [x] `.github/workflows/deploy-pages.yml`이 benchmark 결과 변경을 포함하도록 경로와 내보내기를 갱신한다.
- [ ] 사용자의 기존 미커밋 수학 YAML·결과 6개를 제외하고 새 작업만 논리적 커밋으로 나눈다.
- [ ] 모든 configured remote에 push하고 원격 커밋을 확인한다. 현재 remote는 `origin` 하나다.
- [ ] GitHub Actions 배포 성공과 `https://roboco.io/KSAT-AI-Benchmark/`의 응답·실제 결과 지표를 확인한다.

Pages의 현재 `html_url`은 이미 요청한 주소다. `basePath=/KSAT-AI-Benchmark`를 유지하고 저장소별 도메인을 새로 붙여 경로를 바꾸지 않는다.

## 재현 명령

```bash
npm ci --prefix benchmark
npm test --prefix benchmark
node benchmark/run.mjs
node benchmark/export.mjs
npm ci --prefix web
npm run build --prefix web
```

모델 인증은 사용자의 Codex 로그인으로 처리한다. 사용량 한도·접근 실패는 숨기지 않고 실행 오류로 기록한다. 연례 평가에서는 새 학년도 데이터와 새 run ID를 만들며, 이미 공개한 답안·원본은 덮어쓰지 않는다.

## 실행 검증 기록

- SDK 실행: 고유 147문항 모두 제출, 기권 0, 오류·미제출 0. 도구 실행 이벤트 없음.
- 국어 선택과목별 92점, 수학 선택과목별 100점, 영어 97점. 정답 142/147 = 96.6%.
- 실제 경과 1045.260초, 입력 297936토큰, 출력 31770토큰, API 환산 비용 하한 추정 0.913572 USD.
- 초기 대용량 PNG 연결 실패 후 무손실 WebP로 전송량을 줄였다. 41장 모두 디코딩 RGB 픽셀 동일성을 검증했다. 제출 답안은 유지했다.
- 독립 검토의 4개 중요 발견(재개 횟수·시간 heartbeat·입력 잠금·사용량 없는 실패 비용)을 회귀 테스트 또는 공개 조건으로 수정했다. 테스트 8/8, 정적 빌드 통과.
