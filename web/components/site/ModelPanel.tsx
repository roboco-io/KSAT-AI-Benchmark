import Link from 'next/link';
import type { SubjectKey } from '@/lib/site-types.mjs';
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
                  <span className={styles.muted}>{SUBJECT_LABEL[t.subject]}</span> {t.title}
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
        <h4 className={styles.h}>채점 결과</h4>
        <OutcomeBar correct={row.correct} incorrect={row.incorrect} abstained={row.abstained} errors={row.errors} />
        <dl className={styles.dl}>
          <dt>엔진</dt>
          <dd>{row.engine}</dd>
          <dt>effort</dt>
          <dd>{row.effort ?? '–'}</dd>
          <dt>입력 방식</dt>
          <dd>{row.inputMode ?? '–'}</dd>
          {row.period4 && (
            <>
              <dt>4교시 점수</dt>
              <dd className={styles.num}>
                {row.period4.score} / {row.period4.max}
              </dd>
            </>
          )}
        </dl>
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
