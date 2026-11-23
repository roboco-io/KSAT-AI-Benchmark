import { compareData } from '@/lib/question-matrix.mjs';
import { modelTraits } from '@/lib/model-traits.mjs';
import { slimModel } from '@/lib/year-view.mjs';
import type { YearView } from '@/lib/site-types.mjs';
import { siteData } from '@/lib/site-data';
import { Explorer } from './Explorer';
import { MethodNotes } from './MethodNotes';
import { ResearchLinks } from './ResearchLinks';
import { SUBJECT_LABEL } from './primitives';
import styles from './YearOverview.module.css';

// 공식 문제지와 정답이 공개된 페이지로 연결한다. 주소가 과목마다 다르면 과목별 링크로 나눈다.
function OfficialLinks({ year }: { year: number }) {
  const sources = siteData.getOfficialSources(year);
  if (sources.length === 0) return null;
  const name = (subjects: string[]) => subjects.map((s) => SUBJECT_LABEL[s as keyof typeof SUBJECT_LABEL] ?? s).join('·');
  return (
    <p className={styles.official}>
      공식 시험 공개 페이지(문제지·정답):{' '}
      {sources.length === 1 ? (
        <a href={sources[0].url} target="_blank" rel="noreferrer">한국교육과정평가원 {year}학년도 수능 ↗</a>
      ) : (
        sources.map((s, i) => (
          <span key={s.url}>
            {i > 0 && ' · '}
            <a href={s.url} target="_blank" rel="noreferrer">{name(s.subjects)} ↗</a>
          </span>
        ))
      )}
    </p>
  );
}

const usd = (v: number) => `$${v.toFixed(2)}`;

function headline(view: YearView): { main: string; sub: string | null } {
  const { year, models } = view;
  if (models.length === 0) return { main: `${year}학년도 결과는 아직 없다`, sub: null };
  const scored = models.filter((m) => m.score !== null);
  const combined = models.some((m) => m.main);
  // 4교시까지 합산하는 학년도에서는 1-3교시만 집계된 모델을 만점 모델로 세지 않는다.
  const perfect = models.filter((m) => m.score !== null && m.maxScore !== null && m.score === m.maxScore && (!combined || m.main));
  if (perfect.length > 0) {
    const costs = perfect.map((m) => m.costUsd).filter((c): c is number => c !== null);
    return {
      main: `${scored.length}개 모델 중 ${perfect.length}개가 ${year}학년도 수능 ${perfect.some((m) => m.main) ? '전 과목' : '국어·수학·영어'}에서 만점을 받았다`,
      sub: costs.length >= 2 ? `만점 모델의 추정 비용은 ${usd(Math.min(...costs))}부터 ${usd(Math.max(...costs))}까지다.` : null,
    };
  }
  if (scored.length === 0) return { main: `${models.length}개 모델의 ${year}학년도 점수는 아직 집계되지 않았다`, sub: null };
  const ranked = combined ? scored.filter((m) => m.main) : scored;
  const best = ranked.reduce((a, b) => (b.score! > a.score! ? b : a));
  return { main: `${scored.length}개 모델 중 최고점은 ${best.id}의 ${best.score}점(만점 ${best.maxScore}점)이다`, sub: null };
}

export function YearOverview({ view, home = false }: { view: YearView; home?: boolean }) {
  const { year, models, pending } = view;
  const h = headline(view);
  const p4Only = models.filter((m) => m.score === null && m.period4).length;
  const mainOnly = models.some((m) => m.main) ? models.filter((m) => m.score !== null && !m.main) : [];
  const rows = models.map((m) => ({ ...slimModel(m), traits: modelTraits(m, models) }));
  const pendingId = `pending-${home ? 'home' : year}`;
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1>{h.main}</h1>
        {h.sub && <p className={styles.sub}>{h.sub}</p>}
        {p4Only > 0 && <p className={styles.sub}>4교시만 응시한 모델 {p4Only}개는 순위표 아래쪽에 따로 둔다.</p>}
        {models.some((m) => m.main) && <p className={styles.sub}>총점은 1-3교시(국어·수학·영어)와 4교시(한국사·탐구)를 합한 값이다.{mainOnly.length > 0 ? ` 4교시가 끝나지 않은 ${mainOnly.map((m) => m.id).join(', ')}의 총점은 1-3교시만 집계한 값이어서 순위표 아래쪽에 둔다.` : ''}</p>}
        <p className={styles.lede}>{year}학년도 대학수학능력시험 문항을 AI 모델에게 그대로 풀게 한 결과다.</p>
        <OfficialLinks year={year} />
      </header>
      {models.length > 0 && (
        <section id="comparison" className={styles.section} aria-label="모델 비교">
          <Explorer year={year} rows={rows} subjects={view.subjects} compare={compareData(view)} />
        </section>
      )}
      {pending.length > 0 && (
        <section className={styles.section} aria-labelledby={pendingId}>
          <h2 id={pendingId}>평가 대기 중인 모델</h2>
          <ul className={styles.pending}>
            {pending.map((p) => (
              <li key={p.model}><span>{p.model}</span><span>{p.state}</span></li>
            ))}
          </ul>
        </section>
      )}
      <MethodNotes year={year} facts={siteData.getMethodFacts(year)} />
      <section id="research" className={styles.section}>
        <ResearchLinks />
      </section>
    </div>
  );
}
