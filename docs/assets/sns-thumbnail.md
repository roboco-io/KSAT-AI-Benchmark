# SNS 썸네일

Codex 내장 이미지 생성 도구로 생성했다. 최종 파일은 `web/public/images/ksat-ai-benchmark-social.png`이며, 1672 × 941 픽셀 PNG다. Open Graph와 Twitter 공유 카드가 이 파일을 참조한다.

## 최종 생성 프롬프트

Use case: ads-marketing. Create one polished landscape 16:9 Korean SNS thumbnail for the open-source project KSAT AI Benchmark. Strong editorial technology visual: deep navy background, warm ivory typography, restrained electric cyan accents. Large impeccably legible Korean headline, exact text: "AI가 수능을 풀면?". Smaller exact subtitle: "2026학년도 · 국어 / 수학 / 영어". Small exact badge: "11개 모델 비교". Footer exact brand: "KSAT AI Benchmark" and "roboco.io/KSAT-AI-Benchmark". Main visual on the right: a beautifully rendered exam answer sheet with neat circular answer bubbles and a translucent luminous computational chip or abstract AI circuit hovering above it, subtle paper texture and dimensional light. Typography dominates left side; ample breathing room, clear hierarchy, safe margins, legible at small thumbnail size. Sophisticated research publication cover, not a busy dashboard screenshot. All text must match exactly and have correct Korean spelling. Do not show fabricated model scores, model logos, claims of all 11 completed, or extraneous tiny text. Opaque background.


## 로보코 로고 추가 (2026-10-16)

공식 로고는 로보코 사이트 저장소의 `static/images/roboco-logo.svg`를 그대로 복사한 `web/public/images/roboco-logo.svg`다. 헤더는 이 벡터를 사용하며 어두운 테마에서는 흰색으로 표시한다.

내장 이미지 편집 도구에 기존 썸네일과 공식 SVG를 흰 배경에 렌더링한 참조 이미지를 제공했다. 제목과 AI 칩 사이의 빈 공간에 동일한 로고를 흰색으로 넣고 기존 문구와 구성을 보존하도록 지시했다. 최종 편집본은 `web/public/images/ksat-ai-benchmark-social-roboco.png` (1672 × 941)다. 기존 생성본은 보존하며 Open Graph·Twitter 이미지는 새 파일을 참조한다.
