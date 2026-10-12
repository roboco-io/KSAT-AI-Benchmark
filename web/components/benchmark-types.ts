export type Usage = { input_tokens: number; cached_input_tokens: number; output_tokens: number };
export type Summary = {
  total_questions: number; correct: number; incorrect: number; abstained: number;
  errors: number; pending: number; accuracy: number; abstention_rate: number;
  attempt_accuracy: number | null; wall_time_seconds: number; solver_time_seconds: number;
  usage: Usage; estimated_cost_usd: number;
};
export type QuestionStatus = 'correct' | 'incorrect' | 'abstained' | 'error' | 'pending';
export type Question = {
  id: string; number: number; subject: string; section: string;
  kind: 'multiple_choice' | 'short_answer'; points: number; status: QuestionStatus;
  answer: number | null; correct_answer: number; explanation: string;
  abstain_reason: string | null; time_seconds: number; usage: Usage;
  estimated_cost_usd: number; source_page: number;
};
export type BenchmarkData = {
  schema_version: 2; generated_at: string; run_id: string; model: string; engine: string;
  academic_year: number; phase: string; completed?: boolean;
  pricing: { input_per_million: number; cached_input_per_million: number; output_per_million: number; currency: string; as_of: string; basis: string };
  summary: Summary;
  exams: { id: string; title: string; subject: 'korean' | 'math' | 'english'; track: string; question_ids: string[]; max_score: number; summary: Summary & {score: number} }[];
  questions: Question[]; sources: { subject: string; url: string }[]; limitations: string[];
};

export type RequestedModel = {
  id: string; label: string; provider: 'openai' | 'anthropic' | 'deepseek' | 'zai' | 'qwen' | 'moonshot';
  state: 'complete' | 'partial' | 'pending' | 'blocked'; reason?: string | null;
};
export type BenchmarkComparison = {
  schema_version: 3; generated_at: string; academic_year: number; repository_url: string;
  models: BenchmarkData[]; requested_models: RequestedModel[];
  billing_policy: { subscription_only: boolean; api_key_fallback: boolean; pi_api_models?: string[] };
};
