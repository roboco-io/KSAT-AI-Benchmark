'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_EXPLORE, parseExplore, serializeExplore } from '@/lib/explore-state.mjs';
import { filterQuestions, rescore } from '@/lib/question-matrix.mjs';
import { metricValue, metricsFor } from '@/lib/metrics.mjs';
import type { CompareData, ExploreState, MetricKey, SubjectKey } from '@/lib/site-types.mjs';
import { ExploreControls } from './ExploreControls';
import { MetricScatter } from './MetricScatter';
import { RankTable } from './RankTable';
import type { RankRow } from './RankTable';
import styles from './Explorer.module.css';

interface Props {
  year: number;
  rows: RankRow[];
  subjects: SubjectKey[];
  compare: CompareData;
}

const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, '_');

export function Explorer({ year, rows, subjects, compare }: Props) {
  const [state, setState] = useState<ExploreState>(DEFAULT_EXPLORE as ExploreState);

  useEffect(() => {
    const sync = () => setState(parseExplore(window.location.search));
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  const update = useCallback((next: ExploreState) => {
    setState(next);
    history.replaceState(null, '', window.location.pathname + serializeExplore(next) + window.location.hash);
  }, []);

  const filtered = JSON.stringify(state.q) !== JSON.stringify(DEFAULT_EXPLORE.q);
  const matchIds = useMemo(() => (filtered ? filterQuestions(compare, state.q) : null), [compare, state.q, filtered]);
  const rescored = useMemo(() => (matchIds ? rescore(compare, matchIds) : null), [compare, matchIds]);
  const metrics = useMemo(() => metricsFor(subjects, filtered), [subjects, filtered]);

  const has = (k: MetricKey) => metrics.some((m) => m.key === k);
  const pick = (k: MetricKey, d: MetricKey) => (has(k) ? k : has(d) ? d : metrics[0]?.key ?? d);
  const xKey = pick(state.x, DEFAULT_EXPLORE.x);
  const yKey = pick(state.y, DEFAULT_EXPLORE.y);
  const sortKey = pick(state.sort, DEFAULT_EXPLORE.sort);
  const cols = useMemo(() => state.cols.filter(has), [state.cols, metrics]); // eslint-disable-line react-hooks/exhaustive-deps
  const metricOf = (k: MetricKey) => metrics.find((m) => m.key === k)!;

  const providers = useMemo(() => [...new Set(rows.map((r) => r.provider))].sort(), [rows]);
  const engines = useMemo(() => [...new Set(rows.map((r) => r.engine).filter(Boolean))].sort(), [rows]);
  const modelIds = useMemo(() => rows.map((r) => r.id), [rows]);

  const visible = useMemo(() => {
    const keep = rows.filter((r) => {
      if (state.providers.length && !state.providers.includes(r.provider)) return false;
      if (state.engines.length && !state.engines.includes(r.engine)) return false;
      if (state.maxCost !== null && (r.costUsd === null || r.costUsd > state.maxCost)) return false;
      return true;
    });
    const val = (r: RankRow) => metricValue(r, sortKey, rescored?.[r.id] ?? null);
    return [...keep].sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av === null || bv === null) return av === bv ? 0 : av === null ? 1 : -1;
      return state.asc ? av - bv : bv - av;
    });
  }, [rows, state.providers, state.engines, state.maxCost, state.asc, sortKey, rescored]);

  const points = useMemo(
    () => visible.map((r) => ({
      id: r.id,
      x: metricValue(r, xKey, rescored?.[r.id] ?? null),
      y: metricValue(r, yKey, rescored?.[r.id] ?? null),
    })),
    [visible, xKey, yKey, rescored],
  );

  const onSort = (key: MetricKey) => {
    if (key === sortKey) update({ ...state, sort: key, asc: !state.asc });
    else update({ ...state, sort: key, asc: metricOf(key).better === 'low' });
  };
  const onOpen = (id: string | null) => update({ ...state, open: id });
  const onPick = (id: string) =>
    update({ ...state, picked: state.picked.includes(id) ? state.picked.filter((p) => p !== id) : [...state.picked, id] });
  const onPoint = (id: string) => {
    update({ ...state, open: id });
    window.setTimeout(() => {
      const el = document.getElementById(`rank-panel-t-${safe(id)}`) ?? document.getElementById(`rank-panel-c-${safe(id)}`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 50);
  };

  return (
    <div className={styles.root}>
      <ExploreControls
        state={state}
        metrics={metrics}
        subjects={subjects}
        providers={providers}
        engines={engines}
        models={modelIds}
        totalModels={rows.length}
        shownModels={visible.length}
        matchCount={matchIds ? matchIds.length : null}
        onChange={update}
      />
      <div className={styles.panel}>
        <p className={styles.caption}>{metricOf(yKey).label} 대 {metricOf(xKey).label}</p>
        <MetricScatter points={points} xMetric={metricOf(xKey)} yMetric={metricOf(yKey)} picked={state.picked} onPick={onPoint} />
      </div>
      <div className={styles.panel}>
        <h3 className={styles.tableHead}>모델 순위</h3>
        <RankTable
          year={year}
          rows={visible}
          metrics={metrics}
          cols={cols}
          subjects={subjects}
          sort={sortKey}
          asc={state.asc}
          open={state.open}
          picked={state.picked}
          rescored={rescored}
          onSort={onSort}
          onOpen={onOpen}
          onPick={onPick}
        />
      </div>
    </div>
  );
}
