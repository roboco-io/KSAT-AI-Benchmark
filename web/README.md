# KSAT AI Benchmark 웹사이트

Next.js 15(App Router) 정적 사이트다. `https://roboco.io/KSAT-AI-Benchmark/`로 GitHub Pages에 배포한다.

## 실행

```bash
npm install
npm run dev      # 개발 서버
npm run build    # out/ 생성 (prebuild: 연구 보고서 게시, postbuild: X.html을 X/index.html로도 복사)
```

데이터는 `public/data/benchmark-comparison*.json`이다. 저장소 루트의 `benchmark/export.mjs`가 만들며, 빌드 시점에 import한다.

## 구조

- `app/(site)/`: 새 사이트. `/`(최신 학년도 개요), `/{year}`, `/{year}/models/{id}`, `/{year}/questions`, `/{year}/questions/{id}`, `/{year}/compare`. 디자인 토큰은 `tokens.css`에 있다.
- `app/(legacy)/`: 기존 경로 `/archive`, `/debates/english-q37`, `/research/*`. `app/globals.css`는 이 그룹의 레이아웃만 불러온다.
- `components/site/`: 새 사이트 컴포넌트. 스타일은 CSS Modules를 쓴다.
- `components/`(최상위): 레거시 경로가 쓰는 컴포넌트(`MathContent`, `QuestionNote`, `LeaderboardContent` 등).
- `lib/*.mjs`: 순수 함수(순위, 문항 행렬, 산점도 배치, 탐색 상태, 경로). 타입 선언은 `.d.mts`. 테스트는 저장소 루트 `benchmark/test/`에 있다.
- `scripts/postbuild-index.mjs`: 정적 호스팅이 `/2026` 요청을 폴더로 보내 404를 내지 않게 `out/2026/index.html`을 만든다.

## 검증

```bash
npx tsc --noEmit
npm test --prefix ../benchmark          # lib 순수 함수 테스트
node --test test/site-output.test.mjs   # build 이후 out/ 검사 (out/ 이 없으면 건너뜀)
```
