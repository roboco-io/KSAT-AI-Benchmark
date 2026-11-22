'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { disagreements } from '@/lib/question-matrix.mjs';
import { modelPath, parseCompare, questionPath, yearPath } from '@/lib/site-routes.mjs';
import { formatMetric, metricValue } from '@/lib/metrics.mjs';
import { sectionTag } from '@/lib/section-labels.mjs';
import type { CompareData, MetricKey, SubjectKey, Trait } from '@/lib/site-types.mjs';
import { StatusMark, SUBJECT_LABEL, TraitTags } from './primitives';
import styles from './CompareView.module.css';


const MAX = 4;
const BETTER: Partial<Record<string, 'high' | 'low'>> = {
  score: 'high', period4: 'high', accuracy: 'high', cost: 'low', wall: 'low', costPerPoint: 'low', abstention: 'low', errors: 'low', tokens: 'low',
};
const LABEL: Record<string, string> = {
  score: '총점', accuracy: '정답률', cost: '추정 비용', wall: '소요 시간', costPerPoint: '1점당 비용',
  abstention: '기권율', errors: '실행 오류', tokens: '토큰 사용량', period4: '4교시 득점률',
};

interface Props { year: number; subjects: SubjectKey[]; data: CompareData; traits: Record<string, Trait[]> }

export function CompareView({ year, subjects, data, traits }: Props) {
  const [picked, setPicked] = useState<string[]>([]);
  const [subject, setSubject] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const known = useMemo(() => new Set(data.models.map((m) => m.id)), [data.models]);

  useEffect(() => {
    const read = () => setPicked(parseCompare(window.location.search).filter((id) => known.has(id)).slice(0, MAX));
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, [known]);

  const update = useCallback((next: string[]) => {
    setPicked(next);
    const params = new URLSearchParams(window.location.search);
    if (next.length > 0) params.set('models', next.join(','));
    else params.delete('models');
    const qs = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }, []);

  const toggle = (id: string) => update(picked.includes(id) ? picked.filter((p) => p !== id) : picked.length < MAX ? [...picked, id] : picked);

  const copy = () => {
    navigator.clipboard.writeText(window.location.href).then(
      () => setCopied('링크를 복사했다.'),
      () => setCopied('복사하지 못했다. 주소창의 주소를 직접 복사하세요.'),
    );
  };

  const selected = data.models.filter((m) => picked.includes(m.id));
  const ready = selected.length >= 2;

  const rows: MetricKey[] = ['score', 'accuracy', ...subjects.map((s) => `subj:${s}` as MetricKey), 'cost', 'wall', 'costPerPoint', 'abstention', 'errors', 'tokens', ...(selected.some((m) => m.period4) ? (['period4'] as MetricKey[]) : [])];
  const rowLabel = (k: MetricKey) => (k.startsWith('subj:') ? `${SUBJECT_LABEL[k.slice(5) as SubjectKey] ?? k.slice(5)} 점수` : LABEL[k]);
  const rowBetter = (k: MetricKey) => (k.startsWith('subj:') ? 'high' : BETTER[k] ?? 'high');

  const diffIds = useMemo(() => (ready ? disagreements(data, selected.map((m) => m.id)) : []), [data, selected, ready]);
  const diffQs = data.questions.filter((q) => diffIds.includes(q.id));
  const diffSubjects = subjects.filter((s) => diffQs.some((q) => q.subject === s));
  const shown = diffQs.filter((q) => subject === null || q.subject === subject);

  return (
    <div className={styles.root}>
      <h1 className={styles.h1}>모델 비교 · {year}학년도</h1>
      <p><Link href={yearPath(year)}>{year}학년도 개요</Link></p>

      <section aria-label="모델 선택">
        <div className={styles.picker}>
          {data.models.map((m) => {
            const on = picked.includes(m.id);
            return (
              <button key={m.id} type="button" className={styles.pick} aria-pressed={on}
                disabled={!on && picked.length >= MAX} onClick={() => toggle(m.id)}>
                {m.id}
              </button>
            );
          })}
        </div>
        <div className={styles.bar}>
          {!ready && <p className={styles.hint}>모델을 2-4개 고르세요.</p>}
          <button type="button" className={styles.copy} onClick={copy}>링크 복사</button>
          {copied && <span role="status" className={styles.hint}>{copied}</span>}
        </div>
      </section>

      {ready && (
        <>
          <section aria-label="지표 비교">
            <h2 className={styles.h2}>지표 비교</h2>
            <div className={styles.scroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col" className={styles.stick}>지표</th>
                    {selected.map((m) => <th key={m.id} scope="col">{m.id}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((k) => {
                    const vals = selected.map((m) => metricValue(m, k, null));
                    const nums = vals.filter((v): v is number => v !== null);
                    const best = nums.length > 0 ? (rowBetter(k) === 'high' ? Math.max(...nums) : Math.min(...nums)) : null;
                    return (
                      <tr key={k}>
                        <th scope="row" className={styles.stick}>{rowLabel(k)}</th>
                        {selected.map((m, i) => {
                          const v = vals[i];
                          // 토큰 수는 제공사마다 집계 방식이 달라 우열을 표시하지 않는다.
                          const isBest = k !== 'tokens' && v !== null && v === best && nums.length > 1;
                          return (
                            <td key={m.id} className={styles.num}>
                              {formatMetric(k, v)}
                              {isBest && <span className={styles.best}>최고</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {selected.some((m) => m.period4) && <p className={styles.hint}>총점·정답률·추정 비용·소요 시간·1점당 비용·기권율·실행 오류·토큰 사용량은 1-3교시(국어·수학·영어) 기준이다. 4교시(한국사·탐구)는 과목 점수와 4교시 득점률로 비교한다.</p>}
            <p className={styles.hint}>토큰 사용량은 입력과 출력(추론 포함)의 합이다. Gemini는 Google Cloud 사용량 지표의 값을 쓰고, 다른 모델은 응답에 보고된 사용량을 쓴다. 집계 방식이 달라 우열은 표시하지 않는다.</p>
            <ul className={styles.traits}>
              {selected.map((m) => (
                <li key={m.id}>
                  <Link href={modelPath(year, m.id)}>{m.id}</Link>
                  <TraitTags traits={traits[m.id] ?? []} />
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="답이 갈린 문항">
            <h2 className={styles.h2}>답이 갈린 문항</h2>
            <p>{diffIds.length > 0 ? `선택한 모델의 답이 갈린 문항은 ${diffIds.length}개다.` : '선택한 모델은 모든 문항에서 같은 답을 냈다.'}</p>
            {diffIds.length > 0 && (
              <>
                <div className={styles.filters}>
                  <button type="button" className={styles.pick} aria-pressed={subject === null} onClick={() => setSubject(null)}>전체</button>
                  {diffSubjects.map((s) => (
                    <button key={s} type="button" className={styles.pick} aria-pressed={subject === s} onClick={() => setSubject(s)}>
                      {SUBJECT_LABEL[s]}
                    </button>
                  ))}
                </div>
                <div className={styles.scroll}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th scope="col" className={styles.stick}>문항</th>
                        {selected.map((m) => <th key={m.id} scope="col">{m.id}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {shown.map((q) => (
                        <tr key={q.id}>
                          <th scope="row" className={styles.stick}>
                            <Link href={questionPath(year, q.id)}>
                              {SUBJECT_LABEL[q.subject as SubjectKey] ?? q.subject}
                              {sectionTag(q.section) ? ` · ${sectionTag(q.section)}` : ''} · {q.number}번 · {q.points}점
                            </Link>
                          </th>
                          {selected.map((m) => {
                            const a = q.answers[m.id];
                            return (
                              <td key={m.id}>
                                {a ? (
                                  <span className={styles.cell}>
                                    <StatusMark status={a[0]} />
                                    <span>{a[1] === null ? '–' : String(a[1])}</span>
                                  </span>
                                ) : '–'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
