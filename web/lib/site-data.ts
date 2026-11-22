import { buildYearView } from './year-view.mjs';
import type { BenchmarkComparison, YearView } from './site-types.mjs';
import main2026 from '../public/data/benchmark-comparison.json';
import main2025 from '../public/data/benchmark-comparison-2025.json';
import main2027 from '../public/data/benchmark-comparison-2027.json';
import period42027 from '../public/data/benchmark-comparison-2027-period4.json';

let cache: YearView[] | null = null;

function yearViews(): YearView[] {
  if (!cache) {
    cache = [
      buildYearView(main2025 as unknown as BenchmarkComparison, null),
      buildYearView(main2026 as unknown as BenchmarkComparison, null),
      buildYearView(main2027 as unknown as BenchmarkComparison, period42027 as unknown as BenchmarkComparison),
    ].sort((a, b) => a.year - b.year);
  }
  return cache;
}

function getYear(year: number): YearView {
  const view = yearViews().find((v) => v.year === year);
  if (!view) throw new Error(`Unknown year: ${year}`);
  return view;
}

export const siteData = { yearViews, getYear };
