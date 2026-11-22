'use client';
import { useState } from 'react';
import type { BenchmarkComparison, BenchmarkData, RequestedModel } from './benchmark-types';

// Per-subject raw score matrix under the comparison table.
// Periods 1-3: raw score per elective track (100 points) plus partial scores for the common part, each elective part,
// and English listening/reading. Period 4: raw score per subject (50 points).
type Cell = { score: number; max: number; correct: number; total: number; abstained: number; errors: number };
type Column = { key: string; short: string; full: string; get: (result: BenchmarkData) => Cell | null };
type Group = { label: string; columns: Column[] };

function fromExam(track: string, short: string, full: string): Column {
  return { key: `exam-${track}`, short, full, get: result => {
    const exam = result.exams.find(item => item.track === track);
    if (!exam) return null;
    const s = exam.summary;
    return { score: s.score, max: exam.max_score, correct: s.correct, total: s.total_questions, abstained: s.abstained, errors: s.errors + s.pending };
  } };
}
function fromQuestions(key: string, short: string, full: string, pick: (q: BenchmarkData['questions'][number]) => boolean): Column {
  return { key, short, full, get: result => {
    const qs = result.questions.filter(pick);
    if (!qs.length) return null;
    return {
      score: qs.reduce((sum, q) => sum + (q.status === 'correct' ? Number(q.points) : 0), 0),
      max: qs.reduce((sum, q) => sum + Number(q.points), 0),
      correct: qs.filter(q => q.status === 'correct').length,
      total: qs.length,
      abstained: qs.filter(q => q.status === 'abstained').length,
      errors: qs.filter(q => q.status === 'error' || q.status === 'pending').length,
    };
  } };
}
const part = (subject: string, section: string, short: string, full: string) => fromQuestions(`${subject}-${section}`, short, full, q => q.subject === subject && q.section === section);
const englishPart = (key: string, short: string, full: string, listening: boolean) => fromQuestions(key, short, full, q => q.subject === 'english' && (Number(q.number) <= 17) === listening);

const mainGroups: Group[] = [
  { label: '국어 원점수', columns: [fromExam('hwajak', '화작', '국어 화법과 작문 원점수'), fromExam('language_media', '언매', '국어 언어와 매체 원점수')] },
  { label: '국어 부분 점수', columns: [part('korean', 'common', '공통', '국어 공통 문항'), part('korean', 'hwajak', '화작', '국어 화법과 작문 선택 문항'), part('korean', 'language_media', '언매', '국어 언어와 매체 선택 문항')] },
  { label: '수학 원점수', columns: [fromExam('probability', '확통', '수학 확률과 통계 원점수'), fromExam('calculus', '미적', '수학 미적분 원점수'), fromExam('geometry', '기하', '수학 기하 원점수')] },
  { label: '수학 부분 점수', columns: [part('math', 'common', '공통', '수학 공통 문항'), part('math', 'probability', '확통', '수학 확률과 통계 선택 문항'), part('math', 'calculus', '미적', '수학 미적분 선택 문항'), part('math', 'geometry', '기하', '수학 기하 선택 문항')] },
  { label: '영어', columns: [fromExam('english', '원점수', '영어 원점수'), englishPart('english-listening', '듣기', '영어 듣기(1-17번)', true), englishPart('english-reading', '독해', '영어 독해(18-45번)', false)] },
];
const period4Groups: Group[] = [
  { label: '한국사', columns: [fromExam('korean_history', '한국사', '한국사')] },
  { label: '사회탐구', columns: [['ethics_life', '생윤', '생활과 윤리'], ['ethics_thought', '윤사', '윤리와 사상'], ['korean_geography', '한지', '한국지리'], ['world_geography', '세지', '세계지리'], ['east_asian_history', '동사', '동아시아사'], ['world_history', '세계사', '세계사'], ['economics', '경제', '경제'], ['politics_law', '정법', '정치와 법'], ['society_culture', '사문', '사회·문화']].map(([t, s, f]) => fromExam(t, s, f)) },
  { label: '과학탐구', columns: [['physics1', '물Ⅰ', '물리학Ⅰ'], ['chemistry1', '화Ⅰ', '화학Ⅰ'], ['life_science1', '생Ⅰ', '생명과학Ⅰ'], ['earth_science1', '지Ⅰ', '지구과학Ⅰ'], ['physics2', '물Ⅱ', '물리학Ⅱ'], ['chemistry2', '화Ⅱ', '화학Ⅱ'], ['life_science2', '생Ⅱ', '생명과학Ⅱ'], ['earth_science2', '지Ⅱ', '지구과학Ⅱ']].map(([t, s, f]) => fromExam(t, s, f)) },
];

// Score bands by share of the maximum; the number itself is always shown, so color is only a reading aid.
function band(cell: Cell) {
  const r = cell.score / cell.max;
  return r >= 0.94 ? 'b5' : r >= 0.84 ? 'b4' : r >= 0.7 ? 'b3' : r >= 0.5 ? 'b2' : 'b1';
}

export function SubjectScoreMatrix({ data, order, session }: { data: BenchmarkComparison; order: RequestedModel[]; session: 'main' | 'period4' }) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const groups = session === 'period4' ? period4Groups : mainGroups;
  const columns = groups.flatMap(group => group.columns);
  const resultOf = (model: RequestedModel) => data.models.find(item => item.model === model.id);
  const cell = (model: RequestedModel, column: Column) => {
    const result = resultOf(model), value = result && column.get(result);
    // A part with no submitted answer yet (all pending or execution errors) is shown as not graded, not as 0.
    return value && value.total - value.errors > 0 ? value : null;
  };
  const rows = order.filter(model => resultOf(model)?.questions.some(q => q.status !== 'pending'));
  const sortColumn = columns.find(column => column.key === sortKey);
  const sorted = sortColumn ? [...rows].sort((a, b) => (cell(b, sortColumn)?.score ?? -1) - (cell(a, sortColumn)?.score ?? -1)) : rows;
  const done = (model: RequestedModel) => model.state === 'complete' && resultOf(model)?.completed !== false;
  // Averages use finished runs only, so interim scores of running models do not pull them down.
  const average = (column: Column) => {
    const scores = rows.filter(done).map(model => cell(model, column)?.score).filter((score): score is number => score != null);
    return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
  };
  const maxOf = (column: Column) => rows.map(model => cell(model, column)?.max).find(max => max != null);
  const note = session === 'period4'
    ? '각 칸은 과목별 원점수(50점 만점)이고, 아래 작은 숫자는 맞힌 문항 수(20문항 중)입니다.'
    : '원점수는 선택과목별 100점 만점 점수이고, 부분 점수는 공통 문항, 선택과목 문항, 영어 듣기(1-17번)와 독해(18-45번)의 배점 합계입니다. 머리글 괄호 안은 만점입니다. 아래 작은 숫자는 맞힌 문항 수입니다.';
  return <section className="subject-matrix-section" aria-labelledby="subject-matrix-title">
    <div className="section-title"><h2 id="subject-matrix-title">과목별 원점수</h2><span>{sortColumn ? `${sortColumn.full} 내림차순` : '위 표와 같은 순서'} · 과목 이름을 누르면 그 점수로 정렬</span></div>
    <p className="comparison-note">{note} 색이 진할수록 만점 대비 점수가 높습니다(94% 이상, 84-93%, 70-83%, 50-69%, 50% 미만). 진행 중인 모델은 이름 옆에 ‘중간’으로 표시하며, 제출한 답까지만 채점한 중간 점수입니다(‘미제출’은 아직 답이 없는 문항 수, ‘—’는 답이 하나도 없는 과목). 맨 아래 모델 평균은 평가를 마친 모델만으로 계산합니다.</p>
    <div className="subject-matrix-wrap"><table className="subject-matrix"><caption className="sr-only">모델별 과목 원점수</caption>
      <thead><tr><th scope="col" rowSpan={2} className="matrix-model">모델</th>{groups.map(group => <th scope="colgroup" colSpan={group.columns.length} key={group.label} className="matrix-group">{group.label}</th>)}</tr>
        <tr>{columns.map(column => { const max = maxOf(column); return <th scope="col" key={column.key} aria-sort={sortKey === column.key ? 'descending' : 'none'}><button type="button" title={`${column.full}로 정렬`} onClick={() => setSortKey(sortKey === column.key ? null : column.key)} className={sortKey === column.key ? 'active' : ''}>{column.short}{session === 'main' && max != null && <small className="matrix-max">({max})</small>}</button></th>; })}</tr></thead>
      <tbody>{sorted.map(model => <tr key={model.id}><th scope="row" className="matrix-model">{model.label}{!done(model) && <small>중간</small>}</th>{columns.map(column => {
        const value = cell(model, column);
        return <td key={column.key} className={value ? band(value) : 'empty'} title={value ? `${model.label} · ${column.full}: ${value.score}/${value.max}점, ${value.correct}/${value.total}문항${value.abstained ? `, 기권 ${value.abstained}` : ''}${value.errors ? `, 미제출 ${value.errors}` : ''}` : `${column.full}: 아직 제출한 답 없음`}>{value ? <><b>{value.score}</b><small>{value.correct}/{value.total}</small>{!!value.errors && <small className="missing">미제출 {value.errors}</small>}</> : '—'}</td>;
      })}</tr>)}</tbody>
      <tfoot><tr><th scope="row" className="matrix-model">모델 평균<small>완료 모델</small></th>{columns.map(column => { const value = average(column); return <td key={column.key}>{value == null ? '—' : value.toFixed(1)}</td>; })}</tr></tfoot>
    </table></div>
  </section>;
}
