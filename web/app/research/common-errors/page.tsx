import type { Metadata } from 'next';
import report from '@/public/research/common-errors/report.json';
import summary from '@/public/research/common-errors/summary.json';
import { RobocoBrand } from '@/components/RobocoBrand';
import { ThemeControl } from '@/components/ThemeControl';
import { ResearchContent } from '@/components/ResearchContent';
import styles from './report.module.css';

const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
const assets = `${basePath}/research/common-errors`;
const url = 'https://roboco.io/KSAT-AI-Benchmark/research/common-errors.html';
const description = '2025·2026학년도 수능 저장 답안으로 공통 오답과 모델 간 상호보완성을 분석했습니다. 최빈값 투표, 공식·보정 채점, 연도 분리 평가와 재현 자료를 공개합니다.';

export const metadata: Metadata = {
  title: `${summary.title} | KSAT AI Benchmark 연구`, description,
  alternates: { canonical: url },
  openGraph: { type: 'article', title: summary.title, description, url,
    publishedTime: '2026-11-22T00:00:00+09:00',
    images: [{ url: 'https://roboco.io/KSAT-AI-Benchmark/research/common-errors/outputs/voting-performance.png', width: 1440, height: 810, alt: '공식 정답 기준 최고 단일 모델과 전체 투표 성능 비교' }] },
  twitter: { card: 'summary_large_image', title: summary.title, description,
    images: ['https://roboco.io/KSAT-AI-Benchmark/research/common-errors/outputs/voting-performance.png'] },
};

const contents = [['c01', '연구 결과'], ['c07', '전체 투표 결과'], ['c09', '공통 오답 사례'], ['c12', '다음 학년도에 적용'], ['c14', '불확실성과 한계'], ['research-downloads', '자료와 재현 코드']];

export default function CommonErrorsPage() {
  return <div className={`benchmark-shell ${styles.shell}`}>
    <a className="skip-link" href="#research-article">연구 본문으로 이동</a>
    <header className="site-header"><RobocoBrand /><nav aria-label="주요 메뉴"><a href={`${basePath}/`}>모델 성적표</a><a href={`${basePath}/#research`}>연구</a><a href="#research-downloads">자료 다운로드</a><ThemeControl /></nav></header>
    <main>
      <header className={styles.hero}><p className={styles.meta}>수능 AI Benchmark 연구 · <time dateTime="2026-11-22">2026년 11월 22일</time></p>
        <h1>{summary.title}</h1><p className={styles.lead}>상호보완적인 정답은 있지만, 단순 투표가 이를 항상 활용하지는 못했습니다.</p>
        <p className={styles.scope}>2025·2026학년도 · 학년도별 147개 고유 문항 · 공식 정답 기준 · 저장 답안에 대한 탐색 연구</p>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}><nav aria-label="연구 목차"><strong>이 보고서에서</strong>{contents.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav><a href={`${assets}/REPORT.md`} download>보고서 Markdown 다운로드</a></aside>
        <article id="research-article" className={styles.prose}>
          {report.claims.map(claim => <section key={claim.id}><ResearchContent text={claim.text} assetRoot={assets} sectionId={claim.id.toLowerCase()} /><p className={styles.references}>근거 자료: {claim.sources.map((id, index) => <span key={id}>{index > 0 && ' · '}<a href={`#source-${id}`}>{report.sources.find(source => source.id === id)?.kind || id}</a></span>)}</p></section>)}
          <section id="research-downloads"><h2>자료와 재현 코드</h2><p>보고서에 사용한 답안과 정답 메타데이터를 고정해 공개합니다. 현재 대시보드의 모델 결과가 추가되어도 이 연구의 입력은 바뀌지 않습니다.</p>
            <ul className={styles.downloads}>
              <li><a href={`${assets}/outputs/analysis.json`} download>전체 분석 JSON</a><span>모델 쌍·문항·모든 3모델 조합·bootstrap</span></li>
              {[2025, 2026].map(year => <li key={year}><a href={`${assets}/outputs/${year}-image_all-pairs.csv`} download>{year}학년도 모델 쌍별 CSV</a><span><a href={`${assets}/outputs/${year}-image_all-items.csv`} download>문항별 CSV</a> · <a href={`${assets}/outputs/${year}-image_all-triples.csv`} download>3모델 조합 CSV</a></span></li>)}
              <li><a href={`${assets}/analyze.py`} download>분석 코드</a><span><a href={`${assets}/test_analyze.py`} download>채점·투표 테스트</a> · <a href={`${assets}/verify.py`} download>독립 검증 코드</a></span></li>
              <li><a href={`${assets}/README.md`} download>재현 방법</a><span><a href={`${assets}/inputs/manifest.json`} download>입력 출처·해시</a> · <a href={`${assets}/files.json`} download>공개 파일 목록·해시</a></span></li>
            </ul>
            <p>분석 코드는 Python 3 표준 라이브러리로 실행합니다. 입력 스냅샷과 원장의 파일 구조는 아래 링크에서 확인할 수 있습니다. 그림 생성에는 matplotlib가 필요합니다.</p>
            <pre><code>python3 analyze.py{'\n'}python3 -m unittest discover -p &apos;test_*.py&apos; -v{'\n'}python3 verify.py</code></pre>
          </section>
          <section aria-labelledby="research-sources"><h2 id="research-sources">근거 자료</h2><p>A는 저장 답안·정답 메타데이터, B는 재현 계산, C는 선행연구입니다. 자료의 역할을 구분하며, 서로 독립적인 증거라는 뜻은 아닙니다.</p><ol className={styles.sources}>{report.sources.map(source => <li id={`source-${source.id}`} key={source.id}><a href={source.url.startsWith('https://') ? source.url : `${assets}/${source.url}`}>{source.kind}</a><small>{source.grade} · {source.date}</small></li>)}</ol></section>
        </article>
      </div>
    </main><footer><span>roboco · KSAT AI Benchmark 연구</span><a href={`${basePath}/#research`}>대시보드 연구 섹션</a></footer>
  </div>;
}
