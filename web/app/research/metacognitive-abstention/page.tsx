import type { Metadata } from 'next';
import report from '@/public/research/metacognitive-abstention/report.json';
import summary from '@/public/research/metacognitive-abstention/summary.json';
import { RobocoBrand } from '@/components/RobocoBrand';
import { ThemeControl } from '@/components/ThemeControl';
import { ResearchContent } from '@/components/ResearchContent';
import styles from '../common-errors/report.module.css';

const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
const assets = `${basePath}/research/metacognitive-abstention`;
const url = 'https://roboco.io/KSAT-AI-Benchmark/research/metacognitive-abstention.html';
const description = '2025–2027학년도 수능 1–3교시 및 2027학년도 4교시 18과목 저장 답안으로 LLM의 자발적 기권(메타인지적 보정), 2×2 영역·도표 비대칭성, 난이도 정합성과 재현 자료를 공개합니다.';

export const metadata: Metadata = {
  title: `${summary.title} | KSAT AI Benchmark 연구`,
  description,
  alternates: { canonical: url },
  openGraph: {
    type: 'article',
    title: summary.title,
    description,
    url,
    publishedTime: '2026-11-22T00:00:00+09:00',
    images: [{
      url: 'https://roboco.io/KSAT-AI-Benchmark/research/metacognitive-abstention/outputs/fig2_domain_asymmetry.png',
      width: 2800,
      height: 1200,
      alt: '2027학년도 4교시 도메인×도표 2×2 오답 포착률 분해 및 18과목별 오답 포착률',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: summary.title,
    description,
    images: ['https://roboco.io/KSAT-AI-Benchmark/research/metacognitive-abstention/outputs/fig2_domain_asymmetry.png'],
  },
};

const contents = [
  ...report.sections.map(section => [section.id, section.toc] as const),
  ['research-downloads', '자료와 재현 코드'] as const,
];

export default function MetacognitiveAbstentionPage() {
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
        <p className={styles.meta}>수능 AI Benchmark 연구 · <time dateTime={summary.publishedAt}>2026년 11월 22일</time></p>
        <h1>{summary.title}</h1>
        <p className={styles.lead}>과학탐구에서는 그림이 없어도 오답의 53.7%를 기권으로 걸러냈지만, 비도표 사회탐구에서는 96.1%를 기권 없이 틀렸습니다.</p>
        <p className={styles.scope}>2025–2027학년도 1–3교시(147문항) · 2027학년도 4교시 18과목(360문항, Closed-Book) · 완료 이미지 실행 {summary.primaryImageRuns}건 · 기권 {summary.primaryAbstentions}건 분석</p>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav aria-label="연구 목차">
            <strong>이 보고서에서</strong>
            {contents.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
          </nav>
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
            <p>보고서에 사용한 공식 데이터셋, 도표 의존 문항 목록, 58개 실행 스냅샷을 동결해 공개합니다. 대시보드에 새 모델이 추가되어도 이 연구의 입력은 바뀌지 않습니다.</p>
            <ul className={styles.downloads}>
              <li>
                <a href={`${assets}/outputs/analysis.json`} download>전체 분석 JSON</a>
                <span>패널별 선택적 예측·AUROC·Fisher 정확 검정·효용 곡선·종단 집계</span>
              </li>
              <li>
                <a href={`${assets}/outputs/model_summary.csv`} download>모델별 요약 CSV</a>
                <span>
                  <a href={`${assets}/outputs/domain_asymmetry_p4.csv`} download>4교시 영역별 CSV</a> ·{' '}
                  <a href={`${assets}/outputs/subject_breakdown_p4.csv`} download>4교시 18과목 CSV</a> ·{' '}
                  <a href={`${assets}/outputs/abstention_cases.csv`} download>전체 기권 해설·분류 CSV</a>
                </span>
              </li>
              <li>
                <a href={`${assets}/analyze.py`} download>분석 코드 (analyze.py)</a>
                <span>
                  <a href={`${assets}/test_analyze.py`} download>통계·분류 단위 테스트</a> ·{' '}
                  <a href={`${assets}/verify.py`} download>독립 검증 코드</a> ·{' '}
                  <a href={`${assets}/plot.py`} download>그림 생성 코드</a>
                </span>
              </li>
              <li>
                <a href={`${assets}/README.md`} download>재현 방법 (README.md)</a>
                <span>
                  <a href={`${assets}/inputs/manifest.json`} download>입력 출처·SHA-256</a> ·{' '}
                  <a href={`${assets}/outputs/verification.json`} download>검증 결과 JSON</a> ·{' '}
                  <a href={`${assets}/files.json`} download>공개 파일 목록·해시</a>
                </span>
              </li>
            </ul>
            <p>분석·단위 테스트·독립 검증은 Python 3 표준 라이브러리만으로 실행할 수 있으며, 그림 생성에는 matplotlib과 numpy가 필요합니다.</p>
            <pre><code>python3 analyze.py{'\n'}python3 plot.py{'\n'}python3 -m unittest discover -p &apos;test_*.py&apos; -v{'\n'}python3 verify.py</code></pre>
          </section>
          <section aria-labelledby="research-sources">
            <h2 id="research-sources">근거 자료</h2>
            <p>A는 동결된 공식 정답 메타데이터·저장 답안 스냅샷, B는 스냅샷 해시 기반 재현 계산 및 독립 검증 결과입니다.</p>
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
