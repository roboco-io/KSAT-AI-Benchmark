import type { Metadata } from 'next';
import report from '@/public/research/contamination/report.json';
import summary from '@/public/research/contamination/summary.json';
import { RobocoBrand } from '@/components/RobocoBrand';
import { ThemeControl } from '@/components/ThemeControl';
import { ResearchContent } from '@/components/ResearchContent';
import styles from '../common-errors/report.module.css';

const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
const assets = `${basePath}/research/contamination`;
const url = 'https://roboco.io/KSAT-AI-Benchmark/research/contamination.html';
const description = '같은 AI 모델이 이미 공개된 2025·2026학년도 수능과 시험 당일에 푼 2027학년도 수능에서 받은 점수를 비교해, 학습 데이터 오염이 점수를 올렸는지 분석했습니다. 난이도 보정 결과와 한계, 재현 자료를 공개합니다.';

export const metadata: Metadata = {
  title: `${summary.title} | KSAT AI Benchmark 연구`, description,
  alternates: { canonical: url },
  openGraph: { type: 'article', title: summary.title, description, url, publishedTime: '2026-11-22T00:00:00+09:00' },
  twitter: { card: 'summary', title: summary.title, description },
};

const contents = ['결과', '난이도 보정', '해석과 한계', '수집하지 못한 자료']
  .map(heading => report.sections.find(section => section.heading === heading)!).map(section => [section.id, section.heading])
  .concat([['research-downloads', '자료와 재현 코드']]);

export default function ContaminationPage() {
  return <div className={`benchmark-shell ${styles.shell}`}>
    <a className="skip-link" href="#research-article">연구 본문으로 이동</a>
    <header className="site-header"><RobocoBrand /><nav aria-label="주요 메뉴"><a href={`${basePath}/`}>모델 성적표</a><a href={`${basePath}/#research`}>연구</a><a href="#research-downloads">자료 다운로드</a><ThemeControl /></nav></header>
    <main>
      <header className={styles.hero}><p className={styles.meta}>수능 AI Benchmark 연구 · <time dateTime="2026-11-22">2026년 11월 22일</time></p>
        <h1>{summary.title}</h1><p className={styles.lead}>같은 모델 {summary.panelModels}개에서는 그런 증거가 나오지 않았습니다. 다만 약 3-4%p보다 작은 효과는 이 자료로 검출할 수 없습니다.</p>
        <p className={styles.scope}>2025·2026·2027학년도 · 학년도별 147개 고유 문항 · 저장 답안에 대한 탐색 연구 · 모델을 새로 호출하지 않음</p>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar}><nav aria-label="연구 목차"><strong>이 보고서에서</strong>{contents.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav><a href={`${assets}/README.md`} download>보고서 Markdown 다운로드</a></aside>
        <article id="research-article" className={styles.prose}>
          <section><ResearchContent text={report.intro} assetRoot={assets} sectionId="summary" /></section>
          {report.sections.map(section => <section key={section.id}><ResearchContent text={section.text} assetRoot={assets} sectionId={section.id} /></section>)}
          <section id="research-downloads"><h2>자료와 재현 코드</h2><p>분석에 쓴 채점 결과와 수험생 지표를 고정해 공개합니다. 대시보드에 모델 결과가 추가되어도 이 연구의 입력은 바뀌지 않습니다. 수험생 지표는 2026-11-22에 웹에서 수집한 민간 가채점 값이며, 출처 URL이 각 행에 있습니다.</p>
            <ul className={styles.downloads}>
              <li><a href={`${assets}/outputs/summary.json`} download>전체 추정치 JSON</a><span>평균 차이 · 난이도 보정 회귀 · 배점 구간 · 보조 분석과 신뢰구간</span></li>
              <li><a href={`${assets}/outputs/contrasts.csv`} download>모델별 비교 CSV</a><span><a href={`${assets}/outputs/panel.csv`} download>모델·학년도별 정답률 CSV</a></span></li>
              {[2025, 2026, 2027].map(year => <li key={year}><a href={`${assets}/inputs/${year}-answers.json`} download>{year}학년도 채점 결과 스냅숏</a><span><a href={`${assets}/inputs/human/${year}-item-rates.csv`} download>문항별 수험생 정답률(가채점, 일부 문항)</a></span></li>)}
              <li><a href={`${assets}/inputs/human/exam-level.csv`} download>시험 단위 난이도 지표 CSV</a><span>선택과목별 원점수 1등급컷 · 영어 1등급 비율 · 출처</span></li>
              <li><a href={`${assets}/analyze.py`} download>분석 코드</a><span><a href={`${assets}/logit.py`} download>로지스틱 회귀</a> · <a href={`${assets}/snapshot.mjs`} download>채점 스냅숏 생성</a></span></li>
              <li><a href={`${assets}/inputs/manifest.json`} download>풀이 기록 입력 해시</a><span><a href={`${assets}/files.json`} download>공개 파일 목록·해시</a></span></li>
            </ul>
            <p>분석 코드는 Python 3와 numpy로 실행하며 약 1분이 걸립니다. 내려받은 파일을 같은 폴더 구조로 두고 실행하면 <code>outputs/</code>가 다시 만들어집니다. <code>snapshot.mjs</code>는 저장소의 풀이 기록에서 입력 스냅숏을 다시 만들 때만 필요합니다.</p>
            <pre><code>python3 analyze.py</code></pre>
          </section>
        </article>
      </div>
    </main><footer><span>roboco · KSAT AI Benchmark 연구</span><a href={`${basePath}/#research`}>대시보드 연구 섹션</a></footer>
  </div>;
}
