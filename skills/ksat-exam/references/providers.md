# 공급자 경로와 등록 프로필

현재 프로젝트의 `benchmark/models.mjs`, `run.mjs`, 어댑터, `core.mjs`가 실행과 채점의 계약이다. 모델을 새로 등록할 때 가격·모델 ID·입력 지원을 현재 공식 문서로 재확인한다. 기존 실행의 가격을 소급해 변경하지 않는다.

## OpenAI / Codex SDK

`provider: openai`, `agent: codex`로 등록한다. Codex CLI와 `@openai/codex-sdk` 버전은 프로토콜에 기록한다. `codexSubscriptionStatus()`가 ChatGPT 인증·포함 사용량·유료 크레딧 없음 상태를 확인한다. 에이전트가 API 키를 상속하지 않는다. 이미지 SDK 입력과 출력 스키마를 사용하고 CLI 사용자 설정을 격리한다.

공식 모델 근거: https://developers.openai.com/api/docs/models

## Anthropic / Claude Code SDK

`provider: anthropic`, `agent: claude`로 등록한다. Python Anthropic API 경로를 사용하지 않는다. `claude-adapter.mjs`의 계정 확인 후 입력 전달, StructuredOutput 캐리어만 허용, 모델 일치 검사를 유지한다. `.runtime/claude-subscription-only.json`은 계정 지문과 Usage credits OFF의 직접 확인 시각을 갖고 30분간 유효하다. 비공개 증명이 없거나 만료되면 갱신 확인 전 호출하지 않는다.

공식 SDK 개인 구독 지원: https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan

## Google / Antigravity CLI

`provider: google`, `agent: antigravity`로 분류한다. 공식 명령은 `agy`다. 현재 버전 1.3.2가 설치돼 있다.

공식 headless 문서의 stream-json 입력은 `event: user`, `message.content`의 텍스트만 지원한다. 이미지 블록은 오류로 세션을 종료한다. 네이티브 이미지가 필요한 현재 시험은 이 경로에서 실행할 수 없다. 호출 전에 설치 버전과 아래 공식 문서를 다시 확인하고, 지원이 확인될 때만 실제 어댑터를 추가한다. 현재 상태에서 모델 API를 시험 호출해 입력 형식을 추측하지 않는다.

- Headless: https://antigravity.google/docs/cli/headless/
- 이미지 입력/TUI: https://antigravity.google/docs/cli/prompting/
- 인증: https://antigravity.google/docs/cli/install/
- 추가 크레딧 차단 `useG1Credits:false`: https://antigravity.google/docs/cli/credits/
- 도구 없는 사용자 에이전트 설정: https://antigravity.google/docs/subagents/

Google 계정 구독 경로를 사용할 때 Gemini API 키·API 공급자 설정·추가 크레딧 경로를 차단해야 한다. 전역 설정을 임의로 덮어쓰지 않는다. 지원이 없으면 실행 차단 사유를 보여주고 결과를 만들지 않는다.

## 다른 공급자 / Pi

`agent: pi`와 공급자명을 등록한다. Pi CLI 0.87.1, 사용자 승인 API 경로를 사용한다. `pi` 프로필에는 `provider: ksat-pi`, 실제 `model_id`, 공식 `base_url`, `secret_name`, `context_window`, `max_tokens`, 검증된 `compat`를 넣는다. 키 값은 넣지 않는다. `secret_name`은 `~/.zsh_secrets`의 변수명이다.

비캐시 입력 + cacheRead + cacheWrite가 전체 입력이다. `reasoning`은 `output`의 부분집합이다. Pi의 기본 카탈로그 요율이나 자동 이미지 축소를 그대로 신뢰하지 않는다. DeepSeek 피크/비피크, Qwen 리전, Kimi 캐시 쓰기 등 실제 경로 조건을 확인한다.

## 프로필 형식

새 프로필은 `scripts/run_exam.py --register <json>`으로 `benchmark/profiles/<id>.json`에 저장한다. 형식 예:

```json
{
  "id": "exact-model-id",
  "label": "Readable model name",
  "provider": "openai",
  "agent": "codex",
  "directory": "results/codex-2026-exact-model-id",
  "pricing": {
    "input_per_million": 2,
    "cached_input_per_million": 0.1,
    "cache_write_per_million": 2.5,
    "output_per_million": 10,
    "currency": "USD",
    "as_of": "YYYY-MM-DD",
    "basis": "API reference estimate; not an invoice",
    "source": "https://official-provider/model-page"
  }
}
```

예시 가격·ID는 실모델 등록값이 아니다. 공급자에 맞는 에이전트와 공식 현재 값으로 바꾼다. 기존 모델 ID·기존 답안 경로를 덮어쓰지 않는다. 현재 실행기는 2026학년도 자료를 사용한다. 다른 학년도의 경우 데이터셋·PDF·실행 경로 설정을 먼저 확장하고 기존 결과를 보존한다.
