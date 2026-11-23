import './tokens.css';

import { SiteHeader } from '@/components/site/SiteHeader';
import { siteData } from '@/lib/site-data';
import { latestYearWithResults } from '@/lib/year-view.mjs';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const views = siteData.yearViews();
  const years = views.map((v) => v.year);
  const latestYear = latestYearWithResults(views);
  return (
    <div className="site">
      <SiteHeader years={years} latestYear={latestYear} />
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <a href="https://github.com/roboco-io/KSAT-AI-Benchmark">GitHub 저장소</a>
          <a href="https://roboco.io">roboco.io</a>
        </div>
        <p className="site-footer-license">
          © ROBOCO. 평가 결과와 글은 <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.ko">CC BY-NC 4.0</a>, 코드는{' '}
          <a href="https://polyformproject.org/licenses/noncommercial/1.0.0">PolyForm Noncommercial 1.0.0</a>으로 제공한다. 이용할 때 출처(KSAT AI Benchmark, ROBOCO)를 표기해야 하고, 상업적 목적의 이용은{' '}
          <a href="https://roboco.io">roboco.io</a>를 통해 사전 허가를 받아야 한다. 수능 문제의 저작권은 한국교육과정평가원에 있다.{' '}
          <a href="https://github.com/roboco-io/KSAT-AI-Benchmark/blob/main/LICENSE">라이선스 전문</a>
        </p>
      </footer>
    </div>
  );
}
