import type { Metric, MetricKey, ModelSummary, Rescore, SubjectKey } from './site-types.mjs';
export declare function metricsFor(subjects: SubjectKey[], filtered: boolean): Metric[];
export declare function metricValue(m: ModelSummary, key: MetricKey, rescored: Rescore | null): number | null;
export declare function formatMetric(key: MetricKey, value: number | null): string;
