# KSAT AI Benchmark

대한민국 수능 문제를 최신 AI 모델로 풀고, 답안과 채점 결과를 연도별로 공개합니다.

**대시보드:** https://roboco.io/KSAT-AI-Benchmark/

## 현재 평가 방식

2026학년도 수능 홀수형 원본을 Codex·Claude SDK 및 Pi CLI로 평가합니다. GPT-6.1 Sol 기존 결과와 GPT-6 Astra·Luna, Claude Sonnet 5.5·Opus 5.5·Haiku 5.5·Fable 5.1과 Pi의 DeepSeek V4.1 Flash·GLM 5.3 Flash·Qwen3.8-27B·Kimi K3를 모델별로 비교합니다. 원본 PDF를 200 DPI 이미지로 렌더링하고, 전송량을 줄이기 위해 동일한 픽셀의 무손실 WebP로 인코딩합니다. 문제 본문을 텍스트로 전사하지 않습니다.

- 국어: 공통, 화법과 작문, 언어와 매체. 선택과목별 45문항·100점.
- 수학: 공통, 확률과 통계, 미적분, 기하. 선택과목별 30문항·100점.
- 영어: 45문항·100점. 듣기 1~17번은 공식 대본 이미지로 평가하며 음성 청취 평가와 구분합니다.
- 전체 지표는 공통 문항을 한 번만 센 147개 고유 문항 기준입니다.
- 모델은 확신하지 못한 문항에서 기권할 수 있습니다. 기권은 `answer: null`로 저장하며 실행 오류와 구분합니다.
- 도구·검색·MCP·플러그인을 비활성화합니다. 정답은 모델 요청에 넣지 않습니다.

## 연례 운영

수능 전에 전년도 문제를 최신 모델로 한 번 평가하고, 수능 직후 새 문제를 같은 모델·프로토콜로 평가합니다. 최초 공개 정답으로 잠정 결과를 만들고, 최종 정답 확정 후 저장한 답안을 재채점합니다. 모델을 다시 호출하지 않습니다.

학년도와 실제 시행 연도는 구분합니다. 2026년 사전 평가는 2026학년도 시험이며, 2026년 11월 19일 직후 평가는 2027학년도 시험입니다.

## 실행 환경

- Node.js 24 이상, npm
- Codex CLI 0.162.1 및 해당 GPT 모델의 ChatGPT 구독 접근 권한
- Claude Code 2.1.296 및 Claude 구독. API 키 인증·유료 공급자·추가 사용 크레딧을 사용하지 않습니다.
- Poppler (`pdfinfo`, `pdftoppm`), libwebp (`cwebp`)
- Codex 로그인: `codex login`

macOS 도구 설치:

```bash
brew install poppler webp
npm ci --prefix benchmark
npm ci --prefix web
```

## 풀이와 채점

저장소 루트에서 실행합니다.

```bash
npm test --prefix benchmark
node benchmark/run.mjs --model gpt-6-astra
node benchmark/run.mjs --model gpt-6-luna
# Astra·Luna 완료 후 Claude 구독의 Usage credits OFF를 직접 확인
node benchmark/run.mjs --model claude-sonnet-5-5
# 토큰과 실제 잔여 용량을 확인한 뒤 다른 Claude 모델을 진행
node benchmark/export.mjs
npm run build --prefix web
```

Ralph 반복은 SDK에서 동일한 기본 지시와 저장된 진행 기록을 사용합니다. Claude 종료 훅을 사용하지 않습니다. 제출한 답과 기권은 고정하고 미제출·실행 오류만 재개합니다. 기본 상한은 묶음당 총 3회, Codex 900초·Claude 600초, 동시 요청 2개, API 환산 예상 비용 25 USD입니다. 입력·프롬프트·프로토콜이 바뀌면 같은 실행에 이어 붙일 수 없습니다.

현재 실행기는 2026학년도 자료를 사용하며 모델별 결과 경로는 `benchmark/models.mjs`에 지정합니다. 다음 학년도에는 데이터·실행 경로를 분리한 설정 확장이 필요합니다. 이전 실행을 새 학년도 결과로 덮어쓰지 마세요.

## Pi API 실행 조건

사용자가 API 사용을 승인한 네 모델만 Pi CLI 0.87.1로 호출합니다. 필요한 키를 `~/.zsh_secrets`에서 읽고, 해당 키 하나만 격리된 Pi 프로세스에 전달합니다. 파일을 셸로 실행하거나 키를 명령 인수·로그·결과에 남기지 않습니다. 재실행 시 `.runtime/pi-api-authorization.json`의 명시적인 모델 승인 목록을 확인합니다.

```bash
node benchmark/run.mjs --model deepseek-v4.1-flash
node benchmark/run.mjs --model glm-5.3-flash
node benchmark/run.mjs --model qwen3.8-27b
node benchmark/run.mjs --model kimi-k3
```

Pi는 도구·확장·자동 재시도·문맥 압축·이미지 자동 축소를 끕니다. 모델별 경로·요율·출력 상한을 실행 기록에 보존합니다. Qwen의 thinking 활성화와 다른 모델의 high 설정은 같은 계산량으로 해석하지 않습니다. [Pi 실행 계획](docs/superpowers/plans/2026-10-12-pi-models.md)을 참조하세요.

## Codex·Claude 구독 전용 실행 조건

Codex·Claude SDK 자식 프로세스에는 API 키와 유료 클라우드 공급자 환경 변수를 전달하지 않습니다. Codex 요청 전 ChatGPT 로그인·포함 사용량·유료 크레딧 없음 상태를 확인합니다. Claude는 OAuth 구독 인증과 Usage credits OFF를 확인합니다. 인증 불명·한도 초과·유료 전환·모델 대체가 감지되면 다음 요청을 멈추고 활성 요청도 취소합니다.

Claude의 과금 차단 확인은 계정 지문에 묶인 30분 유효의 로컬 기록 `.runtime/claude-subscription-only.json`을 사용합니다. Settings → Usage 또는 CLI의 `/usage`에서 Usage credits OFF를 직접 확인한 경우에만 확인 기록을 갱신합니다. 만료되면 모델을 호출하지 않습니다. API 키나 비용 상한 설정만으로 추가 과금 차단을 보장하지 않습니다. 확인 파일과 계정별 잔여 용량은 git·웹에 공개하지 않습니다.

첫 Claude 모델을 작은 묶음으로 확인할 때는 `--group 2026-korean-hwajak --once`를 사용합니다. 부분 실행은 완료 모델 순위에 넣지 않습니다. 제출된 답은 전체 평가를 이어갈 때도 그대로 유지합니다.

## 지표 해석

- 정답률: 정답 문항 / 전체 평가 문항. 기권·실패도 분모에 포함합니다.
- 기권률: 모델이 자발적으로 기권한 문항 / 전체 평가 문항.
- 응답 문항 정답률: 정답 문항 / 유효 답 제출 문항. 시도가 없으면 표시하지 않습니다.
- 총 실행 시간: 실제 경과 시간. 병렬 묶음 요청 시간 합계와 구분합니다.
- 토큰 비용: SDK의 USD 예상치 또는 입력·캐시·출력 토큰에 공개 API 요율을 적용한 참고값. 구독의 실제 청구액이 아닙니다. Claude는 SDK 예상치를 우선 사용해 캐시 보관 시간과 토큰 구간별 요율을 반영합니다.

문항별 시간·토큰·시험별 비용은 묶음 요청 값을 균등 배분한 추정치입니다. 사용량을 반환하지 않은 실패 요청은 비용 추정에서 제외될 수 있습니다. 공개된 전년도 문제가 학습 데이터에 포함되었을 가능성이 있으며, 원점수를 학생의 표준점수·백분위·등급으로 환산하지 않습니다.

## 정적 사이트 배포

Next.js는 결과 JSON을 빌드 시 읽고 `web/out/`에 정적 HTML을 생성합니다. 서버 API·데이터베이스·실시간 연결은 없습니다.

`main`에 결과·웹·평가기 변경을 push하면 GitHub Actions가 오프라인 테스트, 데이터 내보내기, 정적 빌드와 GitHub Pages 배포를 수행합니다. 배포 경로는 `/KSAT-AI-Benchmark`이며 조직 도메인 `roboco.io`를 유지합니다.

## 자료와 구현 문서

- 공식 원본·해시: `exams/pdf/2026/sources.json`
- 검수한 문항·정답: `exams/datasets/2026-ksat.json`
- 실제 답안·사용량·프로토콜: `results/codex-2026/run.json`
- 모델 비교 공개 데이터: `web/public/data/benchmark-comparison.json`
- 기존 Sol 공개 데이터 호환: `web/public/data/benchmark-v2.json`
- 구현 계획: [구독 전용 다중 모델 비교](docs/superpowers/plans/2026-10-12-multi-model-subscription.md)
- 최초 구현: [Codex SDK 연례 평가 계획](docs/superpowers/plans/2026-10-12-codex-sdk-annual-benchmark.md)
- 이전 방식의 문서: [이전 README](docs/LEGACY_README.md)

원본 이벤트와 렌더 이미지는 `.runtime/`에 두며 git·웹에 공개하지 않습니다. 과거 방식의 결과는 대시보드의 기존 평가 기록에서 별도로 볼 수 있습니다.
