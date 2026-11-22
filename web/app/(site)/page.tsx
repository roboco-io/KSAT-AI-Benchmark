import { LegacyRedirect } from '@/components/site/LegacyRedirect';
import { YearOverview } from '@/components/site/YearOverview';
import { siteData } from '@/lib/site-data';
import { latestYearWithResults } from '@/lib/year-view.mjs';

export default function HomePage() {
  const views = siteData.yearViews();
  const year = latestYearWithResults(views);
  const view = views.find((v) => v.year === year) ?? views[views.length - 1];
  return (
    <>
      <LegacyRedirect fallbackYear={year} />
      <YearOverview view={view} home />
    </>
  );
}
