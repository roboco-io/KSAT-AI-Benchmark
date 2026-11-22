# KSAT AI Benchmark 웹 UI 재구축 설계

작성일 2026-11-22. 이 문서는 사용자 인터뷰(4라운드)에서 정한 내용과, 그 위에서 AI가 내린 판단을 구분해 적는다. 구현 계획은 `2026-11-22-ui-rebuild.md`에 있다.

## Overview

현재 웹(`web/`)은 한 페이지에 요약 차트, 모델 비교표, 과목별 원점수 표, 연구 목록, 모델별 문항 기록을 세로로 쌓는다. 학년도와 4교시 전환, 모델 선택은 주소의 query string(`?year=`, `?session=period4`, `?model=`)과 화면 상태로만 처리한다. 사용자는 이 구조에서 네 가지를 문제로 꼽았다. 원하는 내용을 찾기 어렵고, 처음 온 사람이 결론을 빨리 파악하지 못하며, 시각 완성도가 낮고, 문항 단위로 모델을 비교하기 어렵다. 여기에 더해 점수만이 아니라 모델마다 어떤 특징이 있는지를 보여 주고 싶다고 했다.

사용자가 정한 내용은 다음과 같다. 주 독자는 AI 실무자와 개발자다. 범위는 전면 재구축이며 Next.js 정적 빌드와 GitHub Pages 배포는 유지한다. 시각 방향은 장식이 적고 밀도 있는 데이터 도구다. 구현은 디자인 토큰(CSS 변수)과 CSS Modules로 한다. 별도 브랜치에서 전체를 완성한 뒤 한 번에 교체하고, push와 배포 전에 사용자 확인을 받는다.

## 1. 화면과 주소

새 화면은 학년도별 주소를 가진다. 주소는 다음 표와 같다. `basePath`는 지금처럼 운영 빌드에서 `/KSAT-AI-Benchmark`다.

| 주소 | 화면 |
|---|---|
| `/` | 결과가 있는 가장 최근 학년도의 개요. 옛 query string 주소로 들어오면 새 주소로 옮긴다 |
| `/{year}` | 학년도 개요: 산점도, 순위표, 평가 방법, 연구 링크 |
| `/{year}/models/{model}` | 모델 프로필 |
| `/{year}/questions` | 문항 × 모델 격자 (`?subject=`로 과목 선택) |
| `/{year}/questions/{questionId}` | 문항 페이지 |
| `/{year}/compare?models=a,b` | 모델 2-4개 비교 |

4교시(한국사·탐구) 결과는 별도 화면을 두지 않고 같은 학년도의 과목 열로 합친다(사용자 결정). 4교시 데이터에만 있는 모델도 같은 표에 나오며, 없는 과목 칸은 비워 둔다.

`/` 는 결과가 있는 모델이 한 개 이상인 가장 최근 학년도를 보여 준다(AI 판단). 2026-11-22 기준 커밋된 2027학년도 데이터에는 완료된 모델이 없으므로 `/` 는 2026학년도를 보여 준다. 결과가 없는 학년도의 개요는 평가 대기 중인 모델 목록만 보여 준다.

옛 주소는 다음처럼 옮긴다. `/?year=Y` 는 `/Y`, `/?year=Y&model=M` 과 `#model-records` 는 `/Y/models/M`, `?session=period4` 는 같은 학년도 개요로 간다. 개요 화면은 `#research` 와 `#comparison` 앵커를 유지한다. 연구 페이지와 외부 링크가 이 앵커를 쓰기 때문이다.

## 2. 학년도 개요

개요는 위에서부터 한 줄 결론, 점수 대 비용 산점도, 순위표, 평가 방법과 주의 사항, 연구 링크 순서다(사용자가 시안을 보고 정한 구성).

산점도는 가로축이 전 과목 1회 풀이의 추정 비용(로그 눈금), 세로축이 국어·수학·영어 총점이다. 점마다 모델 이름을 직접 표기하고, 이름표가 겹치지 않게 자리를 계산한다. 점에 마우스를 올리거나 포커스를 주면 총점, 비용, 시간, 과목 점수를 보여 준다. 점을 누르면 순위표의 그 모델 행을 연다. 비용이 없는 모델은 산점도에서 빼고 그 수를 차트 아래에 적는다.

순위표의 열은 순위, 모델, 총점(막대와 숫자), 과목별 100점 환산 점수의 작은 막대(과목 강약), 추정 비용, 소요 시간, 특징 태그다. 열 제목으로 정렬한다. 행을 누르면 그 아래로 요약 패널이 열린다(아코디언). 요약 패널은 특징 문장, 선택과목별 점수, 정답·오답·기권·실행 오류 문항 수, 실행 조건(엔진, effort, 입력 방식)을 보여 주고, 프로필 페이지와 비교 화면으로 가는 링크를 둔다. 문항별 기록은 요약 패널에 넣지 않는다.

평가 방법 영역은 현재 `ComparisonDashboard.tsx` 에 있는 평가 방법, 실행·비용 산정 기준, 그리고 작업 폴더에 미커밋 상태로 있는 "정답률과 원점수의 차이" 설명 두 문단을 문구 그대로 옮긴다. 이 두 문단은 사용자가 직접 추가한 내용이다.

## 3. 모델 프로필

프로필 페이지는 모델 하나의 전체 기록이다. 특징 문장 전부, 과목과 선택과목별 점수, 문항 유형별(객관식, 단답형, 국어·수학의 공통과 선택) 정답률, 정답·오답·기권·실행 오류 구성, 비용과 시간과 토큰 사용량, 실행 조건과 한계, 그리고 문항별 기록을 보여 준다. 문항별 기록은 과목별로 묶고 "오답·기권·오류만 보기"를 기본으로 켠다. 각 문항은 그 문항 페이지로 연결한다.

## 4. 모델 특징 규칙

특징은 사람이 쓰지 않고 데이터에 규칙을 적용해 만든다(사용자 결정). 규칙과 기준값은 AI가 정했으며 `web/lib/model-traits.mjs` 한 곳에 둔다. 특징은 아래 순서로 판정하고, 해당하는 것을 모두 표시한다. 중앙값은 같은 학년도에서 그 값이 있는 모델들의 중앙값이다.

| key | 조건 | 표시 | 성격 |
|---|---|---|---|
| `perfect` | 총점이 만점 | 만점 | good |
| `value` | 총점이 만점의 90% 이상이고 비용이 중앙값의 절반 이하 | 저비용 고득점 | good |
| `fast` | 소요 시간이 중앙값의 절반 이하 | 빠름 | good |
| `slow` | 소요 시간이 중앙값의 3배 이상 | 느림 | neutral |
| `weak-{subject}` | 그 과목 환산 점수가 60 미만이거나, 그 모델의 최고 과목보다 25점 이상 낮음 | {과목} 약세 | bad |
| `abstains` | 기권 5문항 이상 | 기권 n문항 | neutral |
| `guesses` | 오답 10문항 이상이고 기권이 오답의 10% 이하 | 기권 없이 오답 n문항 | bad |
| `errors` | 실행 오류 1문항 이상 | 실행 오류 n문항 | bad |
| `solo-wrong` | 다른 모델은 모두 맞혔는데 이 모델만 틀린 문항이 3개 이상이고 전체 오답의 절반 이상 | 혼자 틀린 문항 n개 | neutral |

각 특징은 근거 수치를 담은 한 문장을 함께 만든다. 예: `abstains` 는 "10문항에서 답을 내지 않았다. 답한 137문항의 정답률은 94.9%다."

## 5. 문항 탐색

문항 격자는 과목 하나를 골라 문항을 열, 모델을 행으로 놓고 칸마다 정답·오답·기권·실행 오류를 표시한다. 열 머리에는 문항 번호와 틀린 모델 수를 적는다. 상태는 색과 기호를 함께 써서 색만으로 구분하지 않는다. 칸을 누르면 문항 페이지로 간다.

문항 페이지는 문항 번호, 과목, 배점, 정답, 원본 PDF 쪽수를 보여 주고, 모든 모델의 답과 풀이를 나란히 놓는다. 데이터에 문항 본문과 선택지가 없으므로(2026-11-22 확인) 본문은 보여 주지 않고 공식 문제지 출처 링크를 건다. 영어 37번처럼 `question-notes.ts` 에 주석이 있는 문항은 그 주석을 함께 보여 준다.

## 6. 모델 비교

비교 화면은 모델 2-4개를 골라 위쪽에 총점, 과목 점수, 비용, 시간, 기권, 실행 오류를 나란히 놓고, 아래쪽에 선택한 모델들의 답이나 채점 상태가 서로 다른 문항만 모아 보여 준다(사용자 결정). 선택은 주소의 `?models=` 에 담아 링크로 공유할 수 있다. 각 문항은 문항 페이지로 연결한다.

## 7. 기존 콘텐츠와 시각 체계

연구 보고서 3편, 영어 37번 논쟁, 아카이브는 지금 모습과 주소를 유지한다. 인터뷰에서 다시 만들 대상으로 고른 것이 없었기 때문이다(AI 가정, 사용자에게 고지함). 이 페이지들은 route group `(legacy)` 로 옮겨 기존 `globals.css` 와 Mantine을 그대로 쓴다. 주소는 바뀌지 않는다. 2025학년도 결과는 같은 형식의 데이터가 있으므로 새 화면 `/2025` 로 보여 준다.

새 화면은 `web/app/(site)/tokens.css` 의 CSS 변수와 컴포넌트별 CSS Modules만 쓴다. 밝은 테마와 어두운 테마를 모두 지원하고, 폭 400px 화면에서 본문이 가로로 넘치지 않는다. 표와 격자만 자기 영역 안에서 가로로 스크롤한다. 쓰지 않는 Tailwind, recharts, `@mantine/charts` 의존성은 제거한다. Mantine 본체는 아카이브가 쓰므로 남긴다.

## 8. 인터페이스

아래 선언은 `web/lib/site-types.d.mts` 에 그대로 둔다.

```ts
import type { BenchmarkComparison, Question, QuestionStatus } from '../components/benchmark-types';
export type SubjectKey = 'korean' | 'math' | 'english' | 'korean_history' | 'social' | 'science';
export interface SubjectScore { pct: number; tracks: { id: string; title: string; score: number; max: number }[] }
export interface ModelSummary {
  id: string; engine: string; effort: string | null; inputMode: string | null;
  score: number | null; maxScore: number | null; period4: { score: number; max: number } | null;
  correct: number; incorrect: number; abstained: number; errors: number; total: number;
  costUsd: number | null; wallSeconds: number | null;
  subjects: Partial<Record<SubjectKey, SubjectScore>>;
}
export interface ModelView extends ModelSummary { questions: Question[]; limitations: string[] }
export interface YearView { year: number; models: ModelView[]; pending: { model: string; state: string }[]; subjects: SubjectKey[] }
export interface Trait { key: string; tone: 'good' | 'bad' | 'neutral'; label: string; sentence: string }
export interface MatrixColumn { id: string; number: number; section: string; points: number; missCount: number }
export interface Matrix { columns: MatrixColumn[]; rows: { modelId: string; cells: (QuestionStatus | null)[] }[] }
export interface QuestionDetail { id: string; number: number; subject: string; section: string; points: number; correctAnswer: number | string | null; sourcePage: number | null;
  answers: { modelId: string; status: QuestionStatus; answer: number | string | null; explanation: string | null; timeSeconds: number | null }[] }
export interface CompareData { models: ModelSummary[]; questions: { id: string; subject: string; section: string; number: number; points: number; answers: Record<string, [QuestionStatus, number | string | null]> }[] }
export interface PlacedPoint { id: string; x: number; y: number; labelX: number; labelY: number; anchor: 'start' | 'end' | 'middle' }
export type { BenchmarkComparison, Question, QuestionStatus };
```

`ModelView.id` 는 데이터의 `model` 값이다. `score` 와 `maxScore` 는 국어·수학·영어 결과가 없으면 null이다. `SubjectScore.pct` 는 그 과목 시험들(선택과목 포함)의 100점 환산 점수 평균을 반올림한 값이다. 모델 순서는 `score` 내림차순, 같으면 `costUsd` 오름차순, `score` 가 null이면 뒤에 `period4` 득점률 내림차순으로 둔다.

탐색 설정과 지표에 쓰는 선언은 다음과 같다. 이것도 `site-types.d.mts` 에 둔다. `ModelSummary` 에는 `provider: string`, `inputTokens: number | null`, `outputTokens: number | null` 을, `CompareData.questions` 의 각 항목에는 `kind: string` 을 추가한다.

```ts
export type MetricKey = 'score' | 'accuracy' | 'cost' | 'wall' | 'costPerPoint' | 'secPerQuestion' | 'abstention' | 'errors' | 'tokens'
  | 'fAccuracy' | 'fPoints' | `subj:${SubjectKey}`;
export interface Metric { key: MetricKey; label: string; unit: string; scale: 'linear' | 'log'; better: 'high' | 'low' }
export interface QuestionFilter { subjects: SubjectKey[]; minPoints: number | null; kind: 'multiple_choice' | 'short_answer' | null; minMissShare: number | null }
export interface ExploreState { x: MetricKey; y: MetricKey; sort: MetricKey; asc: boolean; cols: MetricKey[];
  providers: string[]; engines: string[]; maxCost: number | null; picked: string[]; open: string | null; q: QuestionFilter }
export interface Rescore { correct: number; total: number; points: number; maxPoints: number }
```

## 9. 탐색 설정

방문자가 데이터에서 직접 답을 찾을 수 있도록, 학년도 개요의 산점도와 순위표는 같은 탐색 설정을 공유한다(사용자 추가 요구, 네 항목 모두 선택). 설정은 주소의 query string에 담기며 기본값과 같은 항목은 주소에서 뺀다. 따라서 설정한 화면을 링크로 공유할 수 있고 뒤로 가기로 되돌릴 수 있다.

방문자가 바꿀 수 있는 것은 네 가지다. 첫째, 산점도의 가로축과 세로축 지표를 고른다. 지표는 총점, 정답률, 추정 비용, 소요 시간, 1점당 비용, 문항당 시간, 기권율, 실행 오류 수, 토큰 사용량, 과목별 환산 점수다. 둘째, 제공사, 실행 엔진, 비용 상한으로 모델을 거르고, 특정 모델을 골라 강조한다. 걸러진 모델은 차트와 표에서 함께 빠지고, 강조하지 않은 모델은 흐리게 그린다. 셋째, 순위표에 보일 지표 열을 고른다. 기본 열은 총점, 과목 강약, 비용, 시간, 특징이다. 넷째, 문항 조건(과목, 최소 배점, 객관식·단답형, 틀린 모델 비율 하한)을 걸어 그 조건에 맞는 문항만으로 모델별 정답률과 득점을 다시 계산한다. 조건이 걸리면 "조건에 맞는 n문항 기준"이라고 표시하고, 조건 정답률(`fAccuracy`)과 조건 득점(`fPoints`) 지표가 축과 열로 추가된다. 비용과 시간은 문항 조건과 무관하게 전체 값을 쓴다.

처음 온 사람이 설정을 직접 만들지 않아도 되도록 질문 형태의 프리셋을 둔다(AI 판단). 프리셋은 탐색 설정 묶음이며 버튼 하나로 적용된다: "가성비가 좋은 모델은?"(비용 대 총점), "빠른 모델은?"(시간 대 총점), "국어에 강한 모델은?"(비용 대 국어), "어려운 문항에서 갈리는 모델은?"(틀린 모델 비율 30% 이상, 비용 대 조건 정답률), "모를 때 어떻게 행동하나?"(기권율 대 정답률).

제공사는 모델 이름의 앞부분으로 정한다: gpt는 OpenAI, claude는 Anthropic, gemini는 Google, deepseek는 DeepSeek, glm은 Zhipu, qwen은 Alibaba, kimi는 Moonshot, solar는 Upstage, exaone은 LG, 그 밖은 "기타". 토큰 사용량은 export 데이터의 `summary.usage` 에 기록된 입력과 출력 토큰의 합이며, 제공사에 따라 추론 토큰이 출력에 포함되지 않았을 수 있다는 주의 문구를 열 설명에 붙인다.

## 10. 모바일

휴대폰(폭 640px 미만)에서도 모든 기능을 쓸 수 있어야 한다(사용자 결정). 순위표는 모델별 카드 목록으로 바뀌고, 카드를 누르면 요약 패널이 열린다. 축, 필터, 열, 문항 조건 설정은 화면 아래에서 올라오는 패널 하나에 모으고, 프리셋 버튼은 가로로 밀어 고른다. 산점도는 화면 폭에 맞춰 다시 배치하고 이름표가 겹치면 강조한 모델과 상위 모델의 이름만 남긴다. 문항 격자와 비교표만 자기 영역 안에서 가로로 민다. 누르는 대상은 최소 44px 높이를 가진다. 마우스 오버로 보여 주는 정보는 누르기로도 볼 수 있어야 한다.

## 11. 검증

순수 로직은 `web/lib/*.mjs` 에 두고 저장소의 기존 방식대로 `benchmark/test/*.test.mjs` 에서 `node --test` 로 검사한다(`npm test --prefix benchmark`). 화면 컴포넌트는 `npx tsc --noEmit -p web` 로 타입을 검사하고, 빌드 결과물 `web/out` 을 읽는 `web/test/site-output.test.mjs` 로 주소별 HTML이 생성됐는지와 핵심 문구가 들어 있는지 검사한다. 이 검사는 배포 워크플로의 빌드 뒤 단계에 추가한다. 풀이 스크립트는 테스트와 GitHub Actions에서 실행하지 않는다.
