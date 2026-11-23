import type { QuestionStatus, SubjectKey, SubjectScore, Trait } from '@/lib/site-types.mjs';
import { scoreBand } from '@/lib/metrics.mjs';
import styles from './primitives.module.css';

export const SUBJECT_LABEL: Record<SubjectKey, string> = {
  korean: '국어',
  math: '수학',
  english: '영어',
  korean_history: '한국사',
  social: '사회탐구',
  science: '과학탐구',
};

const SUBJECT_SHORT: Record<SubjectKey, string> = {
  korean: '국어',
  math: '수학',
  english: '영어',
  korean_history: '한국사',
  social: '사탐',
  science: '과탐',
};

const TONE_CLASS = { good: styles.toneGood, bad: styles.toneBad, neutral: styles.toneNeutral } as const;

export function TraitTags({ traits }: { traits: Trait[] }) {
  if (traits.length === 0) return null;
  return (
    <ul className={styles.tags}>
      {traits.map((t) => (
        <li key={t.key} className={`${styles.tag} ${TONE_CLASS[t.tone]}`} title={t.sentence}>
          {t.label}
        </li>
      ))}
    </ul>
  );
}

export function SubjectBars({
  subjects,
  order,
  compact = false,
}: {
  subjects: Partial<Record<SubjectKey, SubjectScore>>;
  order: SubjectKey[];
  compact?: boolean;
}) {
  return (
    <div className={`${styles.subjects} ${compact ? styles.subjectsCompact : ''}`}>
      {order.map((key) => {
        const s = subjects[key];
        const pct = s ? Math.max(0, Math.min(100, s.pct)) : null;
        return (
          <div key={key} className={styles.subjectRow}>
            <span className={styles.subjectLabel} title={SUBJECT_LABEL[key]}>{SUBJECT_SHORT[key]}</span>
            <span className={styles.track} aria-hidden="true">
              {pct !== null && (
                <span className={styles.fill} style={{ width: `${pct}%`, background: `var(--band-${scoreBand(pct)})` }} />
              )}
            </span>
            <span className={styles.subjectNum}>{pct === null ? '–' : pct.toFixed(1)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function OutcomeBar({
  correct,
  incorrect,
  abstained,
  errors,
}: {
  correct: number;
  incorrect: number;
  abstained: number;
  errors: number;
}) {
  const segs = [
    { n: correct, cls: styles.segCorrect },
    { n: incorrect, cls: styles.segIncorrect },
    { n: abstained, cls: styles.segAbstained },
    { n: errors, cls: styles.segError },
  ].filter((s) => s.n > 0);
  return (
    <div className={styles.outcome}>
      <div className={styles.outcomeBar} aria-hidden="true">
        {segs.map((s, i) => (
          <span key={i} className={`${styles.seg} ${s.cls}`} style={{ flexGrow: s.n }} />
        ))}
      </div>
      <p className={styles.legend}>
        정답 {correct} · 오답 {incorrect} · 기권 {abstained} · 오류 {errors}
      </p>
    </div>
  );
}

const STATUS: Record<QuestionStatus, { mark: string; label: string; cls: string }> = {
  correct: { mark: '○', label: '정답', cls: styles.stCorrect },
  incorrect: { mark: '×', label: '오답', cls: styles.stIncorrect },
  abstained: { mark: '–', label: '기권', cls: styles.stAbstained },
  unsolved: { mark: '·', label: '풀이 실패', cls: styles.stAbstained },
  error: { mark: '!', label: '실행 오류', cls: styles.stError },
  pending: { mark: '·', label: '평가 대기', cls: styles.stAbstained },
};

export function StatusMark({ status }: { status: QuestionStatus }) {
  const s = STATUS[status];
  return (
    <span className={`${styles.statusMark} ${s.cls}`} role="img" aria-label={s.label}>
      {s.mark}
    </span>
  );
}
