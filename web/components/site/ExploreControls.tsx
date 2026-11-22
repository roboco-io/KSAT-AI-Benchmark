'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ExploreState, Metric, MetricKey, SubjectKey } from '@/lib/site-types.mjs';
import { DEFAULT_EXPLORE, PRESETS, serializeExplore } from '@/lib/explore-state.mjs';
import { SUBJECT_LABEL } from './primitives';
import styles from './ExploreControls.module.css';

export interface ExploreControlsProps {
  state: ExploreState;
  metrics: Metric[];
  subjects: SubjectKey[];
  providers: string[];
  engines: string[];
  models: string[];
  totalModels: number;
  shownModels: number;
  matchCount: number | null;
  onChange: (next: ExploreState) => void;
}

type GroupId = 'axes' | 'models' | 'cols' | 'q';
const GROUPS: { id: GroupId; name: string }[] = [
  { id: 'axes', name: '축' },
  { id: 'models', name: '모델' },
  { id: 'cols', name: '열' },
  { id: 'q', name: '문항 조건' },
];
const MAX_COLS = 8;
const NARROW_QUERY = '(max-width: 639.98px)';

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((v) => v !== item) : [...list, item];
}

function presetPressed(state: ExploreState, patch: Partial<ExploreState>): boolean {
  return (Object.keys(patch) as (keyof ExploreState)[]).every(
    (k) => JSON.stringify(state[k]) === JSON.stringify(patch[k]),
  );
}

export function ExploreControls(props: ExploreControlsProps) {
  const { state, metrics, subjects, providers, engines, models, totalModels, shownModels, matchCount, onChange } = props;
  const [narrow, setNarrow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openGroup, setOpenGroup] = useState<GroupId | null>(null);
  const [sheet, setSheet] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia(NARROW_QUERY);
    const sync = () => { setNarrow(mq.matches); setMounted(true); };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!narrow) setSheet(false);
    else setOpenGroup(null);
  }, [narrow]);

  const closeSheet = useCallback(() => {
    setSheet(false);
    triggerRef.current?.focus();
  }, []);

  // Escape and outside click.
  useEffect(() => {
    if (!openGroup && !sheet) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (sheet) closeSheet();
      else setOpenGroup(null);
    };
    const onDown = (e: MouseEvent) => {
      if (openGroup && toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) setOpenGroup(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [openGroup, sheet, closeSheet]);

  // Body scroll lock and initial focus for the sheet.
  useEffect(() => {
    if (!sheet) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [sheet]);

  const set = (patch: Partial<ExploreState>) => onChange({ ...state, ...patch });
  const setQ = (patch: Partial<ExploreState['q']>) => onChange({ ...state, q: { ...state.q, ...patch } });
  const reset = () => onChange({ ...DEFAULT_EXPLORE });
  const dirty = serializeExplore(state) !== '';

  const label = (key: MetricKey) => metrics.find((m) => m.key === key)?.label ?? key;

  const activeCount = (() => {
    let n = 0;
    if (state.x !== DEFAULT_EXPLORE.x || state.y !== DEFAULT_EXPLORE.y) n++;
    if (state.providers.length || state.engines.length || state.maxCost !== null || state.picked.length) n++;
    if (JSON.stringify(state.cols) !== JSON.stringify(DEFAULT_EXPLORE.cols)) n++;
    if (JSON.stringify(state.q) !== JSON.stringify(DEFAULT_EXPLORE.q)) n++;
    return n;
  })();

  const hint = (id: GroupId): string => {
    switch (id) {
      case 'axes': return `${label(state.x)} × ${label(state.y)}`;
      case 'models': return `${totalModels}개 중 ${shownModels}개`;
      case 'cols': return `${state.cols.length}개`;
      case 'q': {
        const n = state.q.subjects.length + (state.q.minPoints !== null ? 1 : 0) + (state.q.kind ? 1 : 0) + (state.q.minMissShare !== null ? 1 : 0);
        return n ? `${n}개 적용` : '전체';
      }
    }
  };

  const toggleCol = (key: MetricKey) => {
    const has = state.cols.includes(key);
    if (has && state.cols.length <= 1) return;
    if (!has && state.cols.length >= MAX_COLS) return;
    const next = metrics.map((m) => m.key).filter((k) => (k === key ? !has : state.cols.includes(k)));
    set({ cols: next });
  };

  const renderGroup = (id: GroupId, p: string): ReactNode => {
    switch (id) {
      case 'axes':
        return (
          <div className={styles.fields}>
            {(['x', 'y'] as const).map((axis) => (
              <div key={axis} className={styles.field}>
                <label htmlFor={`${p}-axis-${axis}`}>{axis === 'x' ? '가로축 (x)' : '세로축 (y)'}</label>
                <select id={`${p}-axis-${axis}`} className={styles.control} value={state[axis]}
                  onChange={(e) => set({ [axis]: e.target.value as MetricKey })}>
                  {metrics.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
                </select>
              </div>
            ))}
          </div>
        );
      case 'models':
        return (
          <div className={styles.fields}>
            <fieldset className={styles.fieldset}>
              <legend>제공사</legend>
              {providers.map((v, i) => (
                <label key={v} htmlFor={`${p}-prov-${i}`} className={styles.check}>
                  <input id={`${p}-prov-${i}`} type="checkbox" checked={state.providers.includes(v)}
                    onChange={() => set({ providers: toggle(state.providers, v) })} />
                  <span>{v}</span>
                </label>
              ))}
            </fieldset>
            <fieldset className={styles.fieldset}>
              <legend>실행 엔진</legend>
              {engines.map((v, i) => (
                <label key={v} htmlFor={`${p}-eng-${i}`} className={styles.check}>
                  <input id={`${p}-eng-${i}`} type="checkbox" checked={state.engines.includes(v)}
                    onChange={() => set({ engines: toggle(state.engines, v) })} />
                  <span>{v}</span>
                </label>
              ))}
            </fieldset>
            <div className={styles.field}>
              <label htmlFor={`${p}-maxcost`}>비용 상한 (USD)</label>
              <input id={`${p}-maxcost`} className={styles.control} type="number" min={0} step="any" inputMode="decimal"
                value={state.maxCost ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  const n = Number(v);
                  set({ maxCost: v === '' || !Number.isFinite(n) ? null : n });
                }} />
            </div>
            <fieldset className={styles.fieldset}>
              <legend>강조할 모델</legend>
              <div className={styles.scrollList}>
                {models.map((v, i) => (
                  <label key={v} htmlFor={`${p}-pick-${i}`} className={styles.check}>
                    <input id={`${p}-pick-${i}`} type="checkbox" checked={state.picked.includes(v)}
                      onChange={() => set({ picked: toggle(state.picked, v) })} />
                    <span>{v}</span>
                  </label>
                ))}
              </div>
              <button type="button" id={`${p}-pick-clear`} className={styles.textBtn}
                disabled={state.picked.length === 0} onClick={() => set({ picked: [] })}>모두 해제</button>
            </fieldset>
          </div>
        );
      case 'cols':
        return (
          <fieldset className={styles.fieldset}>
            <legend>표에 보일 열 (1-{MAX_COLS}개)</legend>
            {metrics.map((m, i) => {
              const on = state.cols.includes(m.key);
              const disabled = (on && state.cols.length <= 1) || (!on && state.cols.length >= MAX_COLS);
              return (
                <label key={m.key} htmlFor={`${p}-col-${i}`} className={styles.check}>
                  <input id={`${p}-col-${i}`} type="checkbox" checked={on} disabled={disabled} onChange={() => toggleCol(m.key)} />
                  <span>{m.label}</span>
                </label>
              );
            })}
          </fieldset>
        );
      case 'q':
        return (
          <div className={styles.fields}>
            <fieldset className={styles.fieldset}>
              <legend>과목</legend>
              {subjects.map((s) => (
                <label key={s} htmlFor={`${p}-qs-${s}`} className={styles.check}>
                  <input id={`${p}-qs-${s}`} type="checkbox" checked={state.q.subjects.includes(s)}
                    onChange={() => setQ({ subjects: toggle(state.q.subjects, s) })} />
                  <span>{SUBJECT_LABEL[s]}</span>
                </label>
              ))}
            </fieldset>
            <div className={styles.field}>
              <label htmlFor={`${p}-qpoints`}>최소 배점</label>
              <select id={`${p}-qpoints`} className={styles.control} value={state.q.minPoints ?? ''}
                onChange={(e) => setQ({ minPoints: e.target.value === '' ? null : Number(e.target.value) })}>
                <option value="">전체</option>
                <option value="3">3점 이상</option>
                <option value="4">4점 이상</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor={`${p}-qkind`}>유형</label>
              <select id={`${p}-qkind`} className={styles.control} value={state.q.kind ?? ''}
                onChange={(e) => setQ({ kind: e.target.value === '' ? null : (e.target.value as 'multiple_choice' | 'short_answer') })}>
                <option value="">전체</option>
                <option value="multiple_choice">객관식</option>
                <option value="short_answer">단답형</option>
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor={`${p}-qmiss`}>틀린 모델 비율</label>
              <select id={`${p}-qmiss`} className={styles.control} value={state.q.minMissShare ?? ''}
                onChange={(e) => setQ({ minMissShare: e.target.value === '' ? null : Number(e.target.value) })}>
                <option value="">전체</option>
                <option value="0.1">10% 이상</option>
                <option value="0.3">30% 이상</option>
                <option value="0.5">50% 이상</option>
              </select>
            </div>
          </div>
        );
    }
  };

  return (
    <section className={styles.root} aria-label="탐색 설정">
      <div className={styles.presets} role="group" aria-label="질문으로 시작하기">
        {PRESETS.map((pr) => (
          <button key={pr.id} type="button" id={`explore-preset-${pr.id}`} className={styles.preset}
            aria-pressed={presetPressed(state, pr.patch)}
            onClick={() => onChange({ ...DEFAULT_EXPLORE, ...pr.patch })}>
            {pr.label}
          </button>
        ))}
      </div>

      {!narrow && (
        <div className={styles.toolbar} ref={toolbarRef}>
          {GROUPS.map((g) => (
            <details key={g.id} className={styles.popover} open={openGroup === g.id}>
              <summary id={`explore-sum-${g.id}`} className={styles.summary}
                onClick={(e) => { e.preventDefault(); setOpenGroup(openGroup === g.id ? null : g.id); }}>
                <span className={styles.sumName}>{g.name}</span>
                <span className={styles.sumHint}>{hint(g.id)}</span>
              </summary>
              <div className={styles.panel}>{renderGroup(g.id, `explore-w-${g.id}`)}</div>
            </details>
          ))}
        </div>
      )}

      <button ref={triggerRef} type="button" id="explore-sheet-trigger"
        className={styles.trigger} hidden={mounted && !narrow}
        aria-haspopup="dialog" aria-expanded={sheet} onClick={() => setSheet(true)}>
        설정{activeCount > 0 ? ` (${activeCount})` : ''}
      </button>

      {narrow && sheet && (
        <div className={styles.backdrop} onClick={closeSheet}>
          <div ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="explore-sheet-title"
            tabIndex={-1} onClick={(e) => e.stopPropagation()}>
            <h2 id="explore-sheet-title" className={styles.sheetTitle}>탐색 설정</h2>
            <div className={styles.sheetBody}>
              {GROUPS.map((g) => (
                <div key={g.id} className={styles.sheetGroup}>
                  <h3 className={styles.sheetGroupName}>{g.name}</h3>
                  {renderGroup(g.id, `explore-s-${g.id}`)}
                </div>
              ))}
            </div>
            <div className={styles.sheetFooter}>
              <button type="button" id="explore-sheet-reset" className={styles.footBtn} onClick={reset}>초기화</button>
              <button type="button" id="explore-sheet-close" className={`${styles.footBtn} ${styles.footPrimary}`} onClick={closeSheet}>닫기</button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.status} role="status">
        <span>모델 {totalModels}개 중 {shownModels}개 표시</span>
        {matchCount !== null && (
          <span>
            조건에 맞는 {matchCount}문항 기준 <span className={styles.muted}>(비용과 시간은 전체 문항 기준)</span>
          </span>
        )}
        {dirty && <button type="button" id="explore-reset" className={styles.textBtn} onClick={reset}>초기화</button>}
      </div>
    </section>
  );
}
