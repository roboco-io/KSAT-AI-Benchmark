export type Usage = { input_tokens: number; cached_input_tokens: number; output_tokens: number };
export type Summary = {
  score: number; max_score: number;
  total_questions: number; correct: number; incorrect: number; abstained: number;
  errors: number; pending: number; accuracy: number; abstention_rate: number;
  attempt_accuracy: number | null; wall_time_seconds: number; solver_time_seconds: number; solve_time_seconds?: number; solve_time_basis?: 'model_stream' | 'attempt' | 'mixed' | null; cost_basis?: 'provider_usage_metrics'; response_estimated_cost_usd?: number; provider_usage?: { source: string; input_tokens: number; output_tokens_including_thinking: number; window: { start: string; end: string }; queried_at: string };
  usage: Usage; estimated_cost_usd: number;
  adjusted_correct?: number;
};
export type QuestionStatus = 'correct' | 'incorrect' | 'abstained' | 'error' | 'pending';
export type Question = {
  id: string; number: number; subject: string; section: string;
  kind: 'multiple_choice' | 'short_answer'; points: number; status: QuestionStatus;
  answer: number | null; correct_answer: number; explanation: string;
  abstain_reason: string | null; time_seconds: number; solve_time_seconds?: number; usage: Usage;
  estimated_cost_usd: number; source_page: number;
  official_status?: QuestionStatus; accepted_answers?: number[]; benchmark_adjusted?: boolean;
};
export type BenchmarkData = {
  schema_version: 2; generated_at: string; run_id: string; model: string; engine: string;
  academic_year: number; phase: string; completed?: boolean; usage_complete?: boolean;
  pricing: { input_per_million: number; cached_input_per_million: number; output_per_million: number; currency: string; as_of: string; basis: string };
  summary: Summary;
  official_summary?: Summary;
  grading_policy?: { id: string; effective_date: string; question_id: string; official_answer: number; accepted_answers: number[]; annotation: string; rationale: string };
  execution_stats?: { refusal_count: number; timeout_count: number; retry_count: number };
  protocol?: { effort?: string; effort_semantics?: string; agent?: string; sdk_version?: string; tools?: string; input?: string; english_listening?: string };
  execution_notes?: string[];
  input_mode?: 'text_transcript';
  figure_dependent?: { excluded_question_ids: string[]; total_questions: number; correct: number; accuracy: number; score: number; max_score: number; exams: { id: string; excluded: number; score: number; max_score: number; correct: number; total_questions: number }[] };
  exams: { id: string; title: string; subject: 'korean' | 'math' | 'english' | 'korean_history' | 'social' | 'science'; track: string; question_ids: string[]; max_score: number; summary: Summary & {score: number}; official_summary?: Summary }[];
  questions: Question[]; sources: { subject: string; url: string }[]; limitations: string[];
};

export type RequestedModel = {
  id: string; label: string; provider: string;
  state: 'complete' | 'partial' | 'pending' | 'blocked'; reason?: string | null;
  input_mode?: 'text_transcript';
};
export type BenchmarkComparison = {
  schema_version: 3; generated_at: string; academic_year: number; repository_url: string;
  session?: 'period4'; knowledge_policy?: 'closed_book';
  models: BenchmarkData[]; requested_models: RequestedModel[];
  billing_policy: { subscription_only: boolean; api_key_fallback: boolean; pi_api_models?: string[] };
};
