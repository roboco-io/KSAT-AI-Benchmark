import type { Metadata } from 'next';
import report from '@/public/research/penalty-abstention/report.json';
import summary from '@/public/research/penalty-abstention/summary.json';
import { RobocoBrand } from '@/components/RobocoBrand';
import { ThemeControl } from '@/components/ThemeControl';
import { ResearchContent } from '@/components/ResearchContent';
import styles from '../common-errors/report.module.css';

const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
const assets = `${basePath}/research/penalty-abstention`;
const url = 'https://roboco.io/KSAT-AI-Benchmark/research/penalty-abstention.html';
const description = '기권 0점 · 오답 -1점 / -3점 감점제를 2027학년도 수능 4교시 80문항에 적용한 통제 인과 실험. 무기권 모델 DeepSeek V4.1 Flash의 기권 각성(0→42건), 선택성 vs 과잉 기권, 비도표 사탐 사각지대의 분해 결과를 공개합니다.';

export const metadata: Metadata = {
  title: `${summary.title} | KSAT AI Benchmark 연구`,
  description,
  alternates: { canonical: url },
  openGraph: {
    type: 'article',
    title: summary.title,
    description,
    url,
    publishedTime: '2026-11-25T00:00:00+09:00',
    images: [{
      url: 'https://roboco.io/KSAT-AI-Benchmark/images/research-penalty-abstention-social.png',
      width: 1376,
      height: 768,
      alt: '오답에 감점을 주면 AI는 기권할까? — 기권 0점 · 오답 -1점/-3점 통제 인과 실험 결과',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: summary.title,
    description,
    images: ['https://roboco.io/KSAT-AI-Benchmark/images/research-penalty-abstention-social.png'],
  },
};

const contents = [
  ...report.sections.map(section => [section.id, section.toc] as const),
  ['research-downloads', '자료와 재현 코드'] as const,
];

export default function PenaltyAbstentionPage() {
  return <div className={`benchmark-shell ${styles.shell}`}>
    <a className="skip-link" href="#research-article">연구 본문으로 이동</a>
    <header className="site-header">
      <RobocoBrand />
      <nav aria-label="주요 메뉴">
        <a href={`${basePath}/`}>모델 성적표</a>
        <a href={`${basePath}/#research`}>연구</a>
        <a href="#research-downloads">자료 다운로드</a>
        <ThemeControl />
      </nav>
    </header>
    <main>
      <header className={styles.hero}>
        <p className={styles.meta}>
          수능 AI Benchmark 후속 인과 실험 · <time dateTime={summary.publishedAt}>2026년 11월 25일</time> ·{' '}
          <a href={`${basePath}/research/metacognitive-abstention.html`}>선행 연구: LLM은 &ldquo;자신이 모르는 것&rdquo;을 아는가? ↗</a>
        </p>
        <h1>{summary.title}</h1>
        <p className={styles.lead}>선행 관찰 연구(「고난도 다학제 시험에서 LLM은 &ldquo;자신이 모르는 것&rdquo;을 아는가?」)의 후속 인과 실험입니다. 기권 0점 · 오답 −3점 감점을 명시하자, 기본 시험에서 기권 0건이던 DeepSeek V4.1 Flash가 42문항(52.5%)을 기권하며 기존 오답의 63.6%를 골라 피했습니다.</p>
        <p className={styles.scope}>2027학년도 4교시 4과목({summary.nQuestions}문항, Closed-Book) · {summary.nModels}개 대표 모델 × 3개 채점 조건(C0 기본 · C1 −1점 · C2 −3점) · 격리 통제 실험</p>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav aria-label="연구 목차">
            <strong>이 보고서에서</strong>
            {contents.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
          <p><a href={`${basePath}/research/metacognitive-abstention.html`}>← 선행 관찰 연구 보기</a></p>
          <a href={`${assets}/REPORT.md`} download>보고서 Markdown 다운로드</a>
        </aside>
        <article id="research-article" className={styles.prose}>
          {report.sections.map(section => (
            <section key={section.id}>
              <ResearchContent text={section.text} assetRoot={assets} sectionId={section.id} />
              <p className={styles.references}>
                근거 자료:{' '}
                {section.sources.map((id, index) => (
                  <span key={id}>
                    {index > 0 && ' · '}
                    <a href={`#source-${id}`}>{report.sources.find(source => source.id === id)?.kind || id}</a>
                  </span>
                ))}
              </p>
            </section>
          ))}
          <section id="research-downloads">
            <h2>자료와 재현 코드</h2>
            <p>본 실험의 6개 신규 통제 실행 원문(80문항 × 6실행 = 480건), 사전 등록 계획서, 전체 통계 분석 JSON 및 CSV를 그대로 공개합니다. 기존 공식 리더보드 결과와 완전히 격리되어 있습니다.</p>
            <ul className={styles.downloads}>
              <li>
                <a href={`${assets}/outputs/ablation_analysis.json`} download>전체 인과 분석 JSON</a>
                <span>3×3 전이 행렬·선택성 Fisher 검정·McNemar 검정·영역별 탄력성·실현 효용</span>
              </li>
              <li>
                <a href={`${assets}/outputs/condition_summary.csv`} download>조건별 요약 CSV</a>
                <span>
                  <a href={`${assets}/outputs/subject_elasticity.csv`} download>과목별 탄력성 CSV</a> ·{' '}
                  <a href={`${assets}/outputs/new_abstentions.csv`} download>신규 유도 기권 136건 해설 CSV</a>
                </span>
              </li>
              <li>
                <a href={`${assets}/analyze_ablation.py`} download>분석 코드 (analyze_ablation.py)</a>
                <span>
                  <a href={`${assets}/run_ablation.mjs`} download>격리 실행기</a> ·{' '}
                  <a href={`${assets}/plot_ablation.py`} download>그림 생성 코드</a> ·{' '}
                  <a href={`${assets}/test_ablation.py`} download>단위 테스트</a> ·{' '}
                  <a href={`${assets}/verify_ablation.py`} download>독립 검증 코드</a>
                </span>
              </li>
              <li>
                <a href={`${assets}/PLAN.md`} download>실험 계획서 (PLAN.md)</a>
                <span>
                  <a href={`${assets}/outputs/verification.json`} download>검증 결과 JSON</a> ·{' '}
                  <a href={`${assets}/files.json`} download>공개 파일 목록·SHA-256</a> ·{' '}
                  <a href={`${basePath}/research/metacognitive-abstention.html`}>선행 관찰 연구 보고서</a>
                </span>
              </li>
            </ul>
            <p>분석·단위 테스트·독립 검증은 Python 3 표준 라이브러리만으로 재현할 수 있으며, 그림 생성에는 matplotlib과 numpy가 필요합니다.</p>
            <pre><code>python3 analyze_ablation.py{'\n'}python3 plot_ablation.py{'\n'}python3 -m unittest discover -p &apos;test_*.py&apos; -v{'\n'}python3 verify_ablation.py</code></pre>
          </section>
          <section aria-labelledby="research-sources">
            <h2 id="research-sources">근거 자료</h2>
            <p>A는 사전 등록 실험 계획 및 격리 통제 실행 원문, B는 재현 계산 및 독립 검증 결과입니다.</p>
            <ol className={styles.sources}>
              {report.sources.map(source => (
                <li id={`source-${source.id}`} key={source.id}>
                  <a href={source.url.startsWith('https://') ? source.url : `${assets}/${source.url}`}>{source.kind}</a>
                  <small>{source.grade} · {source.date}</small>
                </li>
              ))}
            </ol>
          </section>
        </article>
      </div>
    </main>
    <footer>
      <span>roboco · KSAT AI Benchmark 연구</span>
      <a href={`${basePath}/#research`}>대시보드 연구 섹션</a>
    </footer>
  </div>;
}
