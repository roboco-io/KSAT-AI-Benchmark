import type { BenchmarkComparison, Question, QuestionStatus } from '../components/benchmark-types';
export type SubjectKey = 'korean' | 'math' | 'english' | 'korean_history' | 'social' | 'science';
export interface SubjectScore { pct: number; tracks: { id: string; title: string; score: number; max: number }[] }
export interface ModelSummary {
  id: string; engine: string; effort: string | null; inputMode: string | null;
  score: number | null; maxScore: number | null; period4: { score: number; max: number; correct: number; incorrect: number; abstained: number; errors: number; total: number; costUsd: number | null; wallSeconds: number | null } | null;
  correct: number; incorrect: number; abstained: number; errors: number; total: number;
  costUsd: number | null; wallSeconds: number | null;
  subjects: Partial<Record<SubjectKey, SubjectScore>>;
  provider: string; inputTokens: number | null; outputTokens: number | null;
}
export interface ModelView extends ModelSummary { questions: Question[]; limitations: string[] }
export interface YearView { year: number; models: ModelView[]; pending: { model: string; state: string }[]; subjects: SubjectKey[] }
export interface Trait { key: string; tone: 'good' | 'bad' | 'neutral'; label: string; sentence: string }
export interface MatrixColumn { id: string; number: number; section: string; points: number; missCount: number }
export interface Matrix { columns: MatrixColumn[]; rows: { modelId: string; cells: (QuestionStatus | null)[] }[] }
export interface QuestionDetail { id: string; number: number; subject: string; section: string; points: number; correctAnswer: number | string | null; sourcePage: number | null;
  answers: { modelId: string; status: QuestionStatus; answer: number | string | null; explanation: string | null; timeSeconds: number | null }[] }
export interface CompareData { models: ModelSummary[]; questions: { id: string; subject: string; section: string; number: number; points: number; kind: string; answers: Record<string, [QuestionStatus, number | string | null]> }[] }
export interface PlacedPoint { id: string; x: number; y: number; labelX: number; labelY: number; anchor: 'start' | 'end' | 'middle' }
export type { BenchmarkComparison, Question, QuestionStatus };
export type MetricKey = 'score' | 'accuracy' | 'cost' | 'wall' | 'costPerPoint' | 'secPerQuestion' | 'abstention' | 'errors' | 'tokens' | 'period4'
  | 'fAccuracy' | 'fPoints' | `subj:${SubjectKey}`;
export interface Metric { key: MetricKey; label: string; unit: string; scale: 'linear' | 'log'; better: 'high' | 'low' }
export interface QuestionFilter { subjects: SubjectKey[]; minPoints: number | null; kind: 'multiple_choice' | 'short_answer' | null; minMissShare: number | null }
export interface ExploreState { x: MetricKey; y: MetricKey; sort: MetricKey; asc: boolean; cols: MetricKey[];
  providers: string[]; engines: string[]; maxCost: number | null; picked: string[]; open: string | null; q: QuestionFilter }
export interface Rescore { correct: number; total: number; points: number; maxPoints: number }
