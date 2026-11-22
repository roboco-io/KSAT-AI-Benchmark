import Link from 'next/link';
import styles from './MethodNotes.module.css';

import type { MethodFacts } from '@/lib/site-data';

// Sentences are carried over word for word from the previous dashboard.
function executionPolicy({ piApiModels, subscriptionOnly }: MethodFacts): string {
  if (piApiModels > 0) return `OpenAI·Anthropic 모델은 Codex·Claude 구독 인증으로 실행합니다. 추가 지정한 ${piApiModels}개 모델은 Pi API로 실행합니다. 구독 실행을 API 키로 대체하지 않습니다.`;
  return subscriptionOnly
    ? '구독 인증으로 실행합니다. API 키로 전환하지 않습니다.'
    : '모델별 실행 방식은 모델 프로필 페이지의 문항별 기록에서 확인할 수 있습니다.';
}

export function MethodNotes({ year, facts }: { year: number; facts: MethodFacts }) {
  return (
    <section aria-label="평가 방법">
      <details className={styles.details}>
        <summary className={styles.summary}>
          평가 방법과 주의 사항 <small>정답률·원점수 차이, 입력 조건, 실행 경로 제약, 채점 기준</small>
        </summary>
        <div className={styles.body}>
          <p className={styles.note}><strong>정답률과 원점수의 차이:</strong> 전체 정답률은 공통 문항을 한 번만 세어 계산합니다. 선택과목별 원점수는 공통 문항과 해당 선택과목 문항의 배점을 합산합니다. 따라서 공통 문항의 오답은 같은 영역의 모든 선택과목 점수에, 선택과목 문항의 오답은 해당 선택과목 점수에만 반영됩니다. 오답 위치와 배점에 따라 정답률이 같아도 원점수는 다를 수 있습니다.</p>
          {year === 2025 && <p className={styles.note}>예: Gemini 4 Argon과 GPT-6 Astra는 모두 147문항 중 146문항을 맞혀 정답률이 99.3%입니다. Argon은 국어 공통 7번(2점)을 틀려 화작·언매가 각각 98점이고, Astra는 화작 41번(2점)을 틀려 화작 98점·언매 100점입니다.</p>}
          {facts.textTranscript && <p className={styles.note}><strong>입력 조건의 차이:</strong> 모델 요약과 프로필의 입력 방식에 ‘텍스트 전사본 입력’으로 표시한 모델은 이미지 입력을 받지 않아, 문제지 이미지 대신 원본을 쪽 단위로 옮겨 적은 고정 텍스트로 평가했습니다. 다른 모델은 문제지 이미지를 직접 판독하므로 두 결과는 같은 입력 조건의 비교가 아닙니다. 그림·그래프·도표는 글로 기술해 전달했습니다.</p>}
          {facts.antigravity && <p className={styles.note}><strong>agy(Antigravity CLI) 경로의 제약:</strong> Google AI Ultra 구독으로 실행하는 Gemini 모델은 agy의 ACP 모드로 문제지 이미지를 받습니다. agy는 웹 검색·URL 읽기·브라우저 같은 내장 도구를 끌 수 있는 설정이 없어, 도구가 켜진 채 실행됩니다. 모델이 도구를 한 번이라도 호출하면 그 요청을 즉시 취소하고 답을 버린 뒤 다시 시도하므로, 공개한 답은 모두 도구 없이 낸 답입니다. 다만 도구를 쓸 수 있는 상태에서 풀었다는 점과, agy가 이미지를 한 변 최대 2,000px(원본 2,339×3,309px의 약 60%)로 줄여 보낸다는 점이 다른 모델과 다릅니다.</p>}
          {facts.gradingPolicy && <p className={styles.note}><strong>채점 기준:</strong> 영어 37번 ④·⑤ 인정 · 보정 점수 * 표시 · 공식 점수 병기. <Link href="/debates/english-q37#grading-policy">보정 근거·정책 보기 →</Link></p>}
          {facts.closedBook && <p className={styles.note}><strong>외부 정보 없는 지식 시험:</strong> 4교시는 모델이 학습으로 이미 가진 지식만으로 풀도록 설계했습니다. 웹 검색·외부 문서·도구를 제공하지 않고(Codex는 네트워크·웹 검색 비활성, Claude는 도구 0개, Pi는 오프라인·도구 비활성), 모델이 도구를 호출하면 그 요청을 프로토콜 위반으로 중단합니다. 풀이 지시문에도 외부 조회를 하지 말라고 명시했습니다.</p>}
          {facts.closedBook && <p className={styles.note}><strong>과목 구성:</strong> 수험생은 탐구를 최대 2과목만 고르지만, 모델은 사회탐구 9과목과 과학탐구 8과목을 모두 풀었습니다. 모델 순위 표의 탐구 점수는 과목별 원점수(50점 만점)의 평균이며, 과목별 점수는 모델 순위 표의 과목 강약 열과 모델 프로필 페이지의 문항별 기록에서 볼 수 있습니다. 직업탐구와 5교시(제2외국어·한문)는 평가하지 않았습니다.</p>}
        </div>
      </details>
      <p className={styles.note}><strong>API 환산 비용:</strong> 모든 모델의 비용은 추론(thinking) 토큰을 출력 토큰에 포함해 계산한 참고 추정이며 청구서 금액이 아닙니다. Gemini는 호환 API가 추론 토큰을 응답 사용량에서 빼고 보고해, Google Cloud 사용량 지표의 실제 토큰 수로 다시 계산했습니다(2026-11-21 보정). 다른 Pi 모델은 응답 사용량에 추론 토큰이 포함됨을 확인했고, Codex·Claude는 SDK가 보고한 출력 토큰(추론 포함)을 사용합니다.</p>
      <p className={styles.note}>기권 횟수는 기권을 확정한 문항 수입니다. 재시도·거부·타임아웃과 사용량은 모델 프로필 페이지에서 확인할 수 있습니다.</p>
      <details className={styles.details}>
        <summary className={styles.summary}>실행·비용 산정 기준</summary>
        <div className={styles.body}>
          <p className={styles.note}>{executionPolicy(facts)} 비용은 토큰 사용량을 API 단가로 환산한 추정값이며 실제 청구액이 아닙니다. 캐시 토큰은 입력에 포함됩니다. 화작·언매는 국어, 확통·미적·기하는 수학 선택과목입니다.</p>
        </div>
      </details>
    </section>
  );
}
