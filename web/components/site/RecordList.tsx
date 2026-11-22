'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MathContent } from '@/components/MathContent';
import { StatusMark, SUBJECT_LABEL } from './primitives';
import { questionPath } from '@/lib/site-routes.mjs';
import { sectionTag } from '@/lib/section-labels.mjs';
import type { QuestionStatus, SubjectKey } from '@/lib/site-types.mjs';
import styles from './RecordList.module.css';

export interface RecordItem {
  id: string; number: number; subject: string; section: string; kind: string; points: number;
  correct_answer: number | string | null; status: QuestionStatus; answer: number | string | null;
  explanation: string; time_seconds: number;
}

export function RecordList({ year, records }: { year: number; records: RecordItem[] }) {
  const [onlyMiss, setOnlyMiss] = useState(true);
  const [subject, setSubject] = useState<string | null>(null);

  const subjects = Array.from(new Set(records.map((r) => r.subject)));
  const shown = records.filter((r) => (!onlyMiss || r.status !== 'correct') && (!subject || r.subject === subject));

  const groups: { subject: string; sections: { section: string; items: RecordItem[] }[] }[] = [];
  for (const r of shown) {
    let g = groups.find((x) => x.subject === r.subject);
    if (!g) { g = { subject: r.subject, sections: [] }; groups.push(g); }
    let s = g.sections.find((x) => x.section === r.section);
    if (!s) { s = { section: r.section, items: [] }; g.sections.push(s); }
    s.items.push(r);
  }
  const label = (k: string) => SUBJECT_LABEL[k as SubjectKey] ?? k;

  return (
    <div className={styles.root}>
      <div className={styles.controls}>
        <label className={styles.check}>
          <input type="checkbox" checked={onlyMiss} onChange={(e) => setOnlyMiss(e.target.checked)} />
          오답·기권·오류만 보기
        </label>
        <div className={styles.filters} role="group" aria-label="과목 필터">
          <button type="button" className={`${styles.btn} ${subject === null ? styles.on : ''}`} aria-pressed={subject === null} onClick={() => setSubject(null)}>전체</button>
          {subjects.map((s) => (
            <button key={s} type="button" className={`${styles.btn} ${subject === s ? styles.on : ''}`} aria-pressed={subject === s} onClick={() => setSubject(s)}>{label(s)}</button>
          ))}
        </div>
      </div>
      {groups.length === 0 && <p className={styles.empty}>틀리거나 기권한 문항이 없다.</p>}
      {groups.map((g) => (
        <section key={g.subject} className={styles.group}>
          <h3 className={styles.subjectHead}>{label(g.subject)}</h3>
          {g.sections.map((s) => (
            <div key={s.section}>
              {sectionTag(s.section) && <h4 className={styles.sectionHead}>{sectionTag(s.section)}</h4>}
              {s.items.map((r) => (
                <details key={r.id} className={styles.rec}>
                  <summary className={styles.summary}>
                    <StatusMark status={r.status} />
                    <span className={styles.num}>{r.number}번</span>
                    <span className={styles.meta}>{r.points}점</span>
                    <span className={styles.meta}>답 {r.answer ?? '–'} / 정답 {r.correct_answer ?? '–'}</span>
                    <span className={styles.meta}>{Math.round(r.time_seconds)}초</span>
                  </summary>
                  <div className={styles.body}>
                    {r.explanation ? <MathContent text={r.explanation} /> : <p className={styles.empty}>기록된 풀이가 없다.</p>}
                    <Link className={styles.link} href={questionPath(year, r.id)}>이 문항을 다른 모델과 비교</Link>
                  </div>
                </details>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
