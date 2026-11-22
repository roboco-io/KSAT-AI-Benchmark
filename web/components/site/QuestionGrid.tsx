'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import type { Matrix, SubjectKey } from '@/lib/site-types.mjs';
import { modelPath, questionPath } from '@/lib/site-routes.mjs';
import { sectionTag } from '@/lib/section-labels.mjs';
import { StatusMark, SUBJECT_LABEL } from './primitives';
import styles from './QuestionGrid.module.css';

interface Props { year: number; subjects: SubjectKey[]; matrices: Record<SubjectKey, Matrix> }

export function QuestionGrid({ year, subjects, matrices }: Props) {
  const params = useSearchParams();
  const fromUrl = params.get('subject');
  const initial = (subjects as string[]).includes(fromUrl ?? '') ? (fromUrl as SubjectKey) : subjects[0];
  const [subject, setSubject] = useState<SubjectKey>(initial);
  const [onlyMissed, setOnlyMissed] = useState(false);
  const [sort, setSort] = useState<'default' | 'correct'>('default');

  const pick = useCallback((s: SubjectKey) => {
    setSubject(s);
    const url = new URL(window.location.href);
    url.searchParams.set('subject', s);
    window.history.replaceState(null, '', url);
  }, []);

  const matrix = matrices[subject];
  const total = matrix.columns.length;
  const allCorrect = matrix.columns.filter((c) => c.missCount === 0).length;
  const nModels = matrix.rows.length;
  const half = matrix.columns.filter((c) => nModels > 0 && c.missCount * 2 >= nModels).length;
  const maxMiss = Math.max(1, ...matrix.columns.map((c) => c.missCount));

  const view = useMemo(() => {
    const idx = matrix.columns.map((_, i) => i).filter((i) => !onlyMissed || matrix.columns[i].missCount > 0);
    const rows = matrix.rows.map((r) => ({ modelId: r.modelId, cells: idx.map((i) => r.cells[i]), n: r.cells.filter((c) => c === 'correct').length }));
    if (sort === 'correct') rows.sort((a, b) => b.n - a.n);
    return { columns: idx.map((i) => matrix.columns[i]), rows };
  }, [matrix, onlyMissed, sort]);

  return (
    <div className={styles.wrap}>
      <div className={styles.tabs} role="group" aria-label="과목">
        {subjects.map((s) => (
          <button key={s} type="button" className={styles.tab} aria-pressed={s === subject} onClick={() => pick(s)}>
            {SUBJECT_LABEL[s]}
          </button>
        ))}
      </div>
      <p className={styles.summary}>
        {total}문항 중 모든 모델이 맞힌 문항은 {allCorrect}개, 절반 이상이 틀린 문항은 {half}개다.
      </p>
      <div className={styles.controls}>
        <label>
          <input type="checkbox" checked={onlyMissed} onChange={(e) => setOnlyMissed(e.target.checked)} />
          틀린 모델이 있는 문항만
        </label>
        <label>
          정렬
          <select className={styles.sel} value={sort} onChange={(e) => setSort(e.target.value as 'default' | 'correct')}>
            <option value="default">기본 순서</option>
            <option value="correct">정답 수</option>
          </select>
        </label>
      </div>
      <div className={styles.box}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.corner} scope="col">모델</th>
              {view.columns.map((c) => (
                <th
                  key={c.id}
                  scope="col"
                  className={styles.th}
                  style={c.missCount > 0 ? { background: `color-mix(in srgb, var(--bad-soft) ${Math.round((c.missCount / maxMiss) * 100)}%, var(--surface))` } : undefined}
                >
                  <span className={styles.thInner}>
                    <span className={styles.num}>{c.number}</span>
                    {sectionTag(c.section) && <span className={styles.sub}>{sectionTag(c.section)}</span>}
                    <span className={styles.sub}>{c.points}점</span>
                    <span className={styles.miss}>{c.missCount > 0 ? `×${c.missCount}` : ''}</span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r) => (
              <tr key={r.modelId}>
                <th scope="row" className={styles.rowHead} title={r.modelId}>
                  <Link className={styles.modelLink} href={modelPath(year, r.modelId)}>{r.modelId}</Link>
                </th>
                {r.cells.map((st, i) => {
                  const col = view.columns[i];
                  return (
                    <td key={col.id} className={styles.td}>
                      {st === null ? (
                        <span className={styles.empty} />
                      ) : (
                        <Link className={`${styles.cell} ${styles[`st${st}`]}`} href={questionPath(year, col.id)}>
                          <StatusMark status={st} />
                        </Link>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={styles.legend}>○ 정답 · × 오답 · – 기권 또는 풀이 실패 · ! 실행 오류. 빈 칸은 해당 모델이 이 문항을 평가하지 않았다는 뜻이다. 머리글의 ×n은 틀리거나 풀지 못한 모델 수다.</p>
    </div>
  );
}
