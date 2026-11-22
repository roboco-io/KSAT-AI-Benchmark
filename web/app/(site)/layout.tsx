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
      </footer>
    </div>
  );
}
