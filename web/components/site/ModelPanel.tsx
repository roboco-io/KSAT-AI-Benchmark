import Link from 'next/link';
import type { SubjectKey } from '@/lib/site-types.mjs';
import { formatMetric } from '@/lib/metrics.mjs';
import { trackName } from '@/lib/section-labels.mjs';
import { comparePath, modelPath } from '@/lib/site-routes.mjs';
import { OutcomeBar, SUBJECT_LABEL } from './primitives';
import type { RankRow } from './RankTable';
import styles from './ModelPanel.module.css';

export function ModelPanel({ year, row, subjects }: { year: number; row: RankRow; subjects: SubjectKey[] }) {
  const tracks = subjects.flatMap((k) => (row.subjects[k]?.tracks ?? []).map((t) => ({ ...t, subject: k })));
  return (
    <div className={styles.panel}>
      <section className={styles.block}>
        <h4 className={styles.h}>특징</h4>
        {row.traits.length === 0 ? (
          <p className={styles.none}>두드러진 특징이 없다.</p>
        ) : (
          <ul className={styles.traits}>
            {row.traits.map((t) => (
              <li key={t.key}>
                <strong>{t.label}</strong> {t.sentence}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.block}>
        <h4 className={styles.h}>트랙별 점수</h4>
        {tracks.length === 0 ? (
          <p className={styles.none}>트랙 점수가 없다.</p>
        ) : (
          <ul className={styles.tracks}>
            {tracks.map((t) => (
              <li key={`${t.subject}:${t.id}`}>
                <span className={styles.trackName}>
                  <span className={styles.muted}>{SUBJECT_LABEL[t.subject]}</span> {trackName(t.title, '')}
                </span>
                <span className={styles.num}>
                  {t.score} / {t.max}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.block}>
        <h4 className={styles.h}>채점 결과{row.period4 ? ' · 1-3교시 (국어·수학·영어)' : ''}</h4>
        {row.score === null && row.period4 ? (
          <p className={styles.none}>1-3교시 결과가 없다.</p>
        ) : (
          <OutcomeBar correct={row.correct} incorrect={row.incorrect} abstained={row.abstained} errors={row.errors} />
        )}
        <dl className={styles.dl}>
          <dt>엔진</dt>
          <dd>{row.engine}</dd>
          <dt>effort</dt>
          <dd>{row.effort ?? '–'}</dd>
          <dt>입력 방식</dt>
          <dd>{row.inputMode === 'text_transcript' ? '텍스트 전사본 입력' : row.inputMode ?? '문제지 이미지 입력'}</dd>
        </dl>
        {row.period4 && (
          <>
            <h4 className={styles.h}>4교시 (한국사·탐구)</h4>
            <dl className={styles.dl}>
              <dt>점수</dt>
              <dd className={styles.num}>{row.period4.score} / {row.period4.max}</dd>
              <dt>정답</dt>
              <dd className={styles.num}>{row.period4.correct} / {row.period4.total}</dd>
              <dt>추정 비용</dt>
              <dd className={styles.num}>{formatMetric('cost', row.period4.costUsd)}</dd>
              <dt>소요 시간</dt>
              <dd className={styles.num}>{formatMetric('wall', row.period4.wallSeconds)}</dd>
            </dl>
          </>
        )}
      </section>
      <div className={styles.links}>
        <Link className={styles.link} href={modelPath(year, row.id)}>
          프로필 전체 보기
        </Link>
        <Link className={styles.link} href={comparePath(year, [row.id])}>
          다른 모델과 비교
        </Link>
      </div>
    </div>
  );
}
