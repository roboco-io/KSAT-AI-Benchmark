import Link from 'next/link';
import { OutcomeBar, SubjectBars, SUBJECT_LABEL } from './primitives';
import { RecordList, type RecordItem } from './RecordList';
import { comparePath, yearPath } from '@/lib/site-routes.mjs';
import { formatMetric, metricValue } from '@/lib/metrics.mjs';
import { sectionTag, trackName } from '@/lib/section-labels.mjs';
import type { MetricKey, ModelSummary, SubjectKey, Trait } from '@/lib/site-types.mjs';
import styles from './ModelProfile.module.css';

interface Props {
  year: number;
  model: ModelSummary;
  traits: Trait[];
  subjects: SubjectKey[];
  limitations: string[];
  records: RecordItem[];
}

const KIND_LABEL: Record<string, string> = { multiple_choice: '객관식', short_answer: '단답형' };

function pct(c: number, t: number) {
  return t === 0 ? '–' : `${Math.round((c / t) * 1000) / 10}%`;
}

function tally(records: RecordItem[], keyOf: (r: RecordItem) => string) {
  const map = new Map<string, { correct: number; total: number }>();
  for (const r of records) {
    const k = keyOf(r);
    const e = map.get(k) ?? { correct: 0, total: 0 };
    e.total += 1;
    if (r.status === 'correct') e.correct += 1;
    map.set(k, e);
  }
  return [...map.entries()];
}

export function ModelProfile({ year, model, traits, subjects, limitations, records }: Props) {
  const figure = (key: MetricKey) => formatMetric(key, metricValue(model, key, null));
  const tracks = subjects.flatMap((s) => (model.subjects[s]?.tracks ?? []).map((t) => ({ ...t, subject: s })));
  const bySection = tally(records, (r) => [SUBJECT_LABEL[r.subject as SubjectKey] ?? r.subject, sectionTag(r.section)].filter(Boolean).join(' · '));
  const byKind = tally(records, (r) => KIND_LABEL[r.kind] ?? r.kind);

  return (
    <article className={styles.root}>
      <nav><Link className={styles.back} href={yearPath(year)}>← {year}학년도</Link></nav>
      <header>
        <h1 className={styles.title}>{model.id}</h1>
        <p className={styles.sub}>{model.provider} · {model.engine}</p>
      </header>

      {model.period4 && <h2>1-3교시 (국어·수학·영어)</h2>}
      {model.score === null && model.period4 && <p>1-3교시 결과가 없다.</p>}
      <dl className={styles.figures}>
        <div><dt>총점</dt><dd>{model.score ?? '–'} / {model.maxScore ?? '–'}</dd></div>
        <div><dt>정답률</dt><dd>{figure('accuracy')}</dd></div>
        <div><dt>추정 비용</dt><dd>{figure('cost')}</dd></div>
        <div><dt>소요 시간</dt><dd>{figure('wall')}</dd></div>
        <div>
          <dt>토큰 사용량</dt><dd>{figure('tokens')}</dd>
          <dd className={styles.note}>제공사에 따라 추론 토큰이 출력에 포함되지 않았을 수 있다.</dd>
        </div>
      </dl>
      {model.period4 && (
        <>
          <h2>4교시 (한국사·탐구)</h2>
          <dl className={styles.figures}>
            <div><dt>점수</dt><dd>{model.period4.score} / {model.period4.max}</dd></div>
            <div><dt>정답</dt><dd>{model.period4.correct} / {model.period4.total}</dd></div>
            <div><dt>추정 비용</dt><dd>{formatMetric('cost', model.period4.costUsd)}</dd></div>
            <div><dt>소요 시간</dt><dd>{formatMetric('wall', model.period4.wallSeconds)}</dd></div>
          </dl>
        </>
      )}

      <section className={styles.section}>
        <h2>특징</h2>
        {traits.length === 0 ? <p>두드러진 특징이 없다.</p> : (
          <ul className={styles.traits}>
            {traits.map((t) => <li key={t.key}><strong>{t.label}</strong> {t.sentence}</li>)}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2>과목별 점수</h2>
        <SubjectBars subjects={model.subjects} order={subjects} />
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead><tr><th>트랙</th><th>점수</th></tr></thead>
            <tbody>
              {tracks.map((t) => <tr key={`${t.subject}-${t.id}`}><td>{trackName(t.title, SUBJECT_LABEL[t.subject as SubjectKey] ?? t.subject)}</td><td>{t.score} / {t.max}</td></tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2>문항 유형별 정답률</h2>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead><tr><th>구분</th><th>정답 / 전체</th><th>정답률</th></tr></thead>
            <tbody>
              {[...bySection, ...byKind].map(([k, v]) => (
                <tr key={k}><td>{k}</td><td>{v.correct} / {v.total}</td><td>{pct(v.correct, v.total)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section}>
        <h2>결과 구성{model.period4 ? ' · 1-3교시 (국어·수학·영어)' : ''}</h2>
        <OutcomeBar correct={model.correct} incorrect={model.incorrect} abstained={model.abstained} errors={model.errors} />
      </section>

      <section className={styles.section}>
        <h2>실행 조건</h2>
        <ul className={styles.plain}>
          <li>엔진: {model.engine}</li>
          <li>effort: {model.effort ?? '–'}</li>
          <li>입력 방식: {model.inputMode === 'text_transcript' ? '텍스트 전사본 입력' : model.inputMode ?? '문제지 이미지 입력'}</li>
        </ul>
        {limitations.length > 0 && (
          <>
            <h3>한계</h3>
            <ul className={styles.plain}>{limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
          </>
        )}
      </section>

      <p><Link className={styles.cta} href={comparePath(year, [model.id])}>다른 모델과 비교</Link></p>

      <section className={styles.section}>
        <h2>문항별 기록</h2>
        <RecordList year={year} records={records} />
      </section>
    </article>
  );
}
