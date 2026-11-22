import { compareData } from '@/lib/question-matrix.mjs';
import { modelTraits } from '@/lib/model-traits.mjs';
import { slimModel } from '@/lib/year-view.mjs';
import type { YearView } from '@/lib/site-types.mjs';
import { Explorer } from './Explorer';
import { MethodNotes } from './MethodNotes';
import { ResearchLinks } from './ResearchLinks';
import styles from './YearOverview.module.css';

const usd = (v: number) => `$${v.toFixed(2)}`;

function headline(view: YearView): { main: string; sub: string | null } {
  const { year, models } = view;
  if (models.length === 0) return { main: `${year}학년도 결과는 아직 없다`, sub: null };
  const perfect = models.filter((m) => m.score !== null && m.maxScore !== null && m.score === m.maxScore);
  if (perfect.length > 0) {
    const costs = perfect.map((m) => m.costUsd).filter((c): c is number => c !== null);
    return {
      main: `${models.length}개 모델 중 ${perfect.length}개가 ${year}학년도 수능 국어·수학·영어에서 만점을 받았다`,
      sub: costs.length >= 2 ? `만점 모델의 추정 비용은 ${usd(Math.min(...costs))}부터 ${usd(Math.max(...costs))}까지다.` : null,
    };
  }
  const scored = models.filter((m) => m.score !== null);
  if (scored.length === 0) return { main: `${models.length}개 모델의 ${year}학년도 점수는 아직 집계되지 않았다`, sub: null };
  const best = scored.reduce((a, b) => (b.score! > a.score! ? b : a));
  return { main: `${models.length}개 모델 중 최고점은 ${best.id}의 ${best.score}점(만점 ${best.maxScore}점)이다`, sub: null };
}

export function YearOverview({ view, home = false }: { view: YearView; home?: boolean }) {
  const { year, models, pending } = view;
  const h = headline(view);
  const rows = models.map((m) => ({ ...slimModel(m), traits: modelTraits(m, models) }));
  const flags = {
    textTranscript: models.some((m) => m.inputMode === 'text_transcript'),
    antigravity: models.some((m) => /antigravity|agy/i.test(m.engine)),
    period4: models.some((m) => m.period4 !== null),
    gradingPolicy: year === 2026,
    piApiModels: models.filter((m) => /^pi\b/i.test(m.engine)).length,
  };
  const pendingId = `pending-${home ? 'home' : year}`;
  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <h1>{h.main}</h1>
        {h.sub && <p className={styles.sub}>{h.sub}</p>}
        <p className={styles.lede}>{year}학년도 대학수학능력시험 문항을 AI 모델에게 그대로 풀게 한 결과다.</p>
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
      <MethodNotes year={year} flags={flags} />
      <section id="research" className={styles.section}>
        <ResearchLinks />
      </section>
    </div>
  );
}
