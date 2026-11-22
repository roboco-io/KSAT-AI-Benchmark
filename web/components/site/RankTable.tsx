'use client';

import type { Metric, MetricKey, ModelSummary, Rescore, SubjectKey, Trait } from '@/lib/site-types.mjs';
import { formatMetric, metricValue } from '@/lib/metrics.mjs';
import { SubjectBars, TraitTags } from './primitives';
import { ModelPanel } from './ModelPanel';
import styles from './RankTable.module.css';

export type RankRow = ModelSummary & { traits: Trait[] };

interface Props {
  year: number;
  rows: RankRow[];
  metrics: Metric[];
  cols: MetricKey[];
  subjects: SubjectKey[];
  sort: MetricKey;
  asc: boolean;
  open: string | null;
  picked: string[];
  rescored: Record<string, Rescore> | null;
  onSort: (key: MetricKey) => void;
  onOpen: (id: string | null) => void;
  onPick: (id: string) => void;
}

const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '_');

export function RankTable(p: Props) {
  const label = (k: MetricKey) => p.metrics.find((m) => m.key === k)?.label ?? k;
  const val = (r: RankRow, k: MetricKey) => formatMetric(k, metricValue(r, k, p.rescored?.[r.id] ?? null));

  if (p.rows.length === 0) return <p className={styles.empty}>조건에 맞는 모델이 없다. 필터를 줄여 보세요.</p>;

  const toggle = (id: string) => p.onOpen(p.open === id ? null : id);

  return (
    <div>
      <div className={styles.wide}>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col" className={styles.rank}>순위</th>
                <th scope="col" className={styles.left}>모델</th>
                {p.cols.map((k) => (
                  <th
                    key={k}
                    scope="col"
                    className={styles.numTh}
                    aria-sort={p.sort === k ? (p.asc ? 'ascending' : 'descending') : undefined}
                  >
                    <button type="button" className={styles.sortBtn} onClick={() => p.onSort(k)}>
                      {label(k)}
                      <span aria-hidden="true" className={styles.arrow}>{p.sort === k ? (p.asc ? '↑' : '↓') : ''}</span>
                    </button>
                  </th>
                ))}
                <th scope="col" className={styles.left}>과목 강약</th>
                <th scope="col" className={styles.left}>특징</th>
              </tr>
            </thead>
            <tbody>
              {p.rows.map((r, i) => {
                const isOpen = p.open === r.id;
                const picked = p.picked.includes(r.id);
                const pid = `rank-panel-t-${safe(r.id)}`;
                return (
                  <FragmentRows key={r.id}>
                    <tr className={picked ? styles.picked : undefined}>
                      <td className={styles.rank}>{i + 1}</td>
                      <td className={styles.model}>
                        <button
                          type="button"
                          className={styles.modelBtn}
                          aria-expanded={isOpen}
                          aria-controls={pid}
                          onClick={() => toggle(r.id)}
                        >
                          <strong>{r.id}</strong>
                          <span className={styles.sub}>{r.provider} · {r.engine}</span>
                        </button>
                        <button
                          type="button"
                          className={styles.pickBtn}
                          aria-pressed={picked}
                          onClick={() => p.onPick(r.id)}
                        >
                          강조
                        </button>
                      </td>
                      {p.cols.map((k) => (
                        <td key={k} className={styles.num}>
                          {val(r, k)}
                          {k === 'score' && r.score != null && r.maxScore ? (
                            <span className={styles.bar} aria-hidden="true">
                              <span style={{ width: `${Math.max(0, Math.min(100, (r.score / r.maxScore) * 100))}%` }} />
                            </span>
                          ) : null}
                        </td>
                      ))}
                      <td className={styles.subjectsCell}>
                        <SubjectBars subjects={r.subjects} order={p.subjects} compact />
                      </td>
                      <td><TraitTags traits={r.traits} /></td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={p.cols.length + 4} id={pid} className={styles.panelCell}>
                          <ModelPanel year={p.year} row={r} subjects={p.subjects} />
                        </td>
                      </tr>
                    )}
                  </FragmentRows>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.narrow}>
        <div className={styles.sortBar}>
          <select
            className={styles.select}
            aria-label="정렬 기준"
            value={p.sort}
            onChange={(e) => p.onSort(e.target.value as MetricKey)}
          >
            {p.metrics.map((m) => (
              <option key={m.key} value={m.key}>{m.label}</option>
            ))}
          </select>
          <button type="button" className={styles.dirBtn} onClick={() => p.onSort(p.sort)}>
            {p.asc ? '오름차순 ↑' : '내림차순 ↓'}
          </button>
        </div>
        <ul className={styles.cards}>
          {p.rows.map((r, i) => {
            const isOpen = p.open === r.id;
            const picked = p.picked.includes(r.id);
            const pid = `rank-panel-c-${safe(r.id)}`;
            return (
              <li key={r.id} className={`${styles.card} ${picked ? styles.picked : ''}`}>
                <div className={styles.cardHead}>
                  <span className={styles.cardRank}>{i + 1}</span>
                  <div className={styles.cardTitle}>
                    <strong>{r.id}</strong>
                    <span className={styles.sub}>{r.provider} · {r.engine}</span>
                  </div>
                  <button type="button" className={styles.pickBtn} aria-pressed={picked} onClick={() => p.onPick(r.id)}>
                    강조
                  </button>
                </div>
                <dl className={styles.pairs}>
                  {p.cols.slice(0, 3).map((k) => (
                    <div key={k}>
                      <dt>{label(k)}</dt>
                      <dd>{val(r, k)}</dd>
                    </div>
                  ))}
                </dl>
                <SubjectBars subjects={r.subjects} order={p.subjects} compact />
                <TraitTags traits={r.traits} />
                <button
                  type="button"
                  className={styles.toggleBtn}
                  aria-expanded={isOpen}
                  aria-controls={pid}
                  onClick={() => toggle(r.id)}
                >
                  {isOpen ? '요약 닫기' : '요약 보기'}
                </button>
                {isOpen && (
                  <div id={pid}>
                    <ModelPanel year={p.year} row={r} subjects={p.subjects} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function FragmentRows({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
