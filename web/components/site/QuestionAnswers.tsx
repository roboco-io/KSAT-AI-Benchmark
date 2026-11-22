import Link from 'next/link';
import { MathContent } from '@/components/MathContent';
import type { QuestionDetail, QuestionStatus } from '@/lib/site-types.mjs';
import { modelPath } from '@/lib/site-routes.mjs';
import { StatusMark } from './primitives';
import styles from './QuestionAnswers.module.css';

const ORDER: Record<QuestionStatus, number> = { correct: 0, incorrect: 1, abstained: 2, unsolved: 2, error: 3, pending: 4 };

export function QuestionAnswers({ year, detail }: { year: number; detail: QuestionDetail }) {
  const sorted = [...detail.answers].sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.modelId.localeCompare(b.modelId));
  const groups = new Map<string, string[]>();
  for (const a of detail.answers) {
    if (a.answer === null || a.answer === undefined || a.answer === '') continue;
    const k = String(a.answer);
    groups.set(k, [...(groups.get(k) ?? []), a.modelId]);
  }
  const correctKey = detail.correctAnswer === null ? null : String(detail.correctAnswer);
  const dist = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  const noAnswer = detail.answers.filter((a) => a.answer === null || a.answer === undefined || a.answer === '').map((a) => a.modelId);

  return (
    <section>
      <h2 className={styles.h}>답 분포</h2>
      <ul className={styles.dist}>
        {dist.map(([value, ids]) => (
          <li key={value} className={`${styles.distRow} ${value === correctKey ? styles.distRowRight : ''}`}>
            <span className={styles.val}>{value}</span>
            {value === correctKey && <span className={styles.tag}>정답</span>} · {ids.length}개 모델: {ids.join(', ')}
          </li>
        ))}
        {noAnswer.length > 0 && (
          <li className={styles.distRow}><span className={styles.val}>답 없음</span> · {noAnswer.length}개 모델: {noAnswer.join(', ')}</li>
        )}
      </ul>
      <h2 className={styles.h}>모델별 풀이</h2>
      <div className={styles.list}>
        {sorted.map((a) => (
          <article key={a.modelId} className={styles.block}>
            <div className={styles.head}>
              <StatusMark status={a.status} />
              <Link className={styles.model} href={modelPath(year, a.modelId)}>{a.modelId}</Link>
              <span className={styles.meta}>답 {a.answer ?? '없음'}</span>
              {a.timeSeconds !== null && <span className={styles.meta}>{Math.round(a.timeSeconds)}초</span>}
            </div>
            {a.explanation ? (
              <div className={styles.expl}><MathContent text={a.explanation} /></div>
            ) : (
              <p className={styles.none}>풀이 설명이 없다.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
