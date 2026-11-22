import type { BenchmarkComparison, ModelSummary, ModelView, YearView } from './site-types.mjs';
export declare function buildYearView(main: BenchmarkComparison, period4: BenchmarkComparison | null): YearView;
export declare function slimModel(m: ModelView): ModelSummary;
export declare function latestYearWithResults(views: YearView[]): number;
