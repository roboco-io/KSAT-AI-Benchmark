/**
 * 시험 문제 정보
 */
export interface Question {
  question_id: string;
  question_number: number;
  question_text: string;
  choices: string[];
  correct_answer: number;
  points: number;
}

/**
 * 파싱된 시험 데이터
 */
export interface ExamData {
  exam_id: string;
  title: string;
  subject: 'korean' | 'math' | 'english';
  year: number;
  questions: Question[];
  parsing_info?: {
    method: string;
    timestamp: string;
  };
}

/**
 * 문제별 평가 결과
 */
export interface QuestionResult {
  question_id: string;
  question_number: number;
  answer: number;
  correct_answer: number;
  is_correct: boolean;
  reasoning: string;
  time_taken: number;
  points: number;
  earned_points: number;
  success: boolean;
  error: string | null;
}

/**
 * 평가 결과 요약
 */
export interface ResultSummary {
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  total_score: number;
  max_score: number;
  score_rate: number;
}

/**
 * 모델 평가 결과
 */
export interface EvaluationResult {
  exam_id: string;
  exam_title: string;
  subject: string;
  model_name: string;
  evaluated_at: string;
  summary: ResultSummary;
  results: QuestionResult[];
}

/**
 * 리더보드 항목
 */
export interface LeaderboardEntry {
  model_name: string;
  accuracy: number;
  score_rate: number;
  total_score: number;
  max_score: number;
  total_questions: number;
  correct_answers: number;
  avg_time: number;
  exams_count: number;
}

/**
 * 과목별 통계
 */
export interface SubjectStats {
  subject: string;
  accuracy: number;
  score_rate: number;
  total_score: number;
  max_score: number;
  questions_count: number;
  correct_count: number;
}

