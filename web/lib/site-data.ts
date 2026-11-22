import { buildYearView } from './year-view.mjs';
import type { BenchmarkComparison, YearView } from './site-types.mjs';
import type { BenchmarkComparison as RawComparison } from '../components/benchmark-types';
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

// Inputs of the methodology notes, read from the export JSON exactly as the previous dashboard read them.
// For a year with a period-4 file (2027) every flag is the union over both files; piApiModels counts distinct ids across both.
export interface MethodFacts {
  textTranscript: boolean;
  antigravity: boolean;
  gradingPolicy: boolean;
  closedBook: boolean;
  piApiModels: number;
  subscriptionOnly: boolean;
}

const rawByYear: Record<number, RawComparison[]> = {
  2025: [main2025 as unknown as RawComparison],
  2026: [main2026 as unknown as RawComparison],
  2027: [main2027 as unknown as RawComparison, period42027 as unknown as RawComparison],
};

function getMethodFacts(year: number): MethodFacts {
  const files = rawByYear[year] ?? [];
  const piIds = new Set(files.flatMap((d) => d.billing_policy?.pi_api_models ?? []));
  return {
    textTranscript: files.some((d) => d.requested_models.some((m) => m.input_mode === 'text_transcript')),
    antigravity: files.some((d) => d.requested_models.some((m) => m.agent === 'antigravity')),
    gradingPolicy: files.some((d) => d.models.some((m) => m.grading_policy)),
    closedBook: files.some((d) => d.session === 'period4' && d.knowledge_policy === 'closed_book'),
    piApiModels: piIds.size,
    subscriptionOnly: files.length > 0 && files.every((d) => !!d.billing_policy?.subscription_only),
  };
}

export interface OfficialSource { subjects: string[]; url: string }

// 공식 문제지·정답 공개 페이지. export 데이터의 `sources` 에서 읽고, 주소가 같은 과목은 한 항목으로 묶는다.
function getOfficialSources(year: number): OfficialSource[] {
  const byUrl = new Map<string, string[]>();
  for (const file of rawByYear[year] ?? []) {
    for (const model of file.models) {
      for (const source of model.sources ?? []) {
        if (!/^https?:\/\//.test(source.url)) continue;
        const subjects = byUrl.get(source.url) ?? [];
        if (!subjects.includes(source.subject)) subjects.push(source.subject);
        byUrl.set(source.url, subjects);
      }
    }
  }
  return [...byUrl].map(([url, subjects]) => ({ url, subjects }));
}

function getOfficialSourceUrl(year: number, subject: string): string | null {
  return getOfficialSources(year).find((s) => s.subjects.includes(subject))?.url ?? null;
}

export const siteData = { yearViews, getYear, getMethodFacts, getOfficialSources, getOfficialSourceUrl };
