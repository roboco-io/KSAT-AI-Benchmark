'use client';
import { useState } from 'react';
import type { BenchmarkComparison, RequestedModel } from './benchmark-types';

// Period 4 per-subject raw scores (50 points each) for every model: Korean history, 9 social and 8 science subjects.
const groups: { label: string; subjects: [string, string, string][] }[] = [
  { label: '한국사', subjects: [['korean_history', '한국사', '한국사']] },
  { label: '사회탐구', subjects: [['ethics_life', '생윤', '생활과 윤리'], ['ethics_thought', '윤사', '윤리와 사상'], ['korean_geography', '한지', '한국지리'], ['world_geography', '세지', '세계지리'], ['east_asian_history', '동사', '동아시아사'], ['world_history', '세계사', '세계사'], ['economics', '경제', '경제'], ['politics_law', '정법', '정치와 법'], ['society_culture', '사문', '사회·문화']] },
  { label: '과학탐구', subjects: [['physics1', '물Ⅰ', '물리학Ⅰ'], ['chemistry1', '화Ⅰ', '화학Ⅰ'], ['life_science1', '생Ⅰ', '생명과학Ⅰ'], ['earth_science1', '지Ⅰ', '지구과학Ⅰ'], ['physics2', '물Ⅱ', '물리학Ⅱ'], ['chemistry2', '화Ⅱ', '화학Ⅱ'], ['life_science2', '생Ⅱ', '생명과학Ⅱ'], ['earth_science2', '지Ⅱ', '지구과학Ⅱ']] },
];
const allSubjects = groups.flatMap(group => group.subjects);

// Score bands for the cell shade; the number itself is always shown, so color is only a reading aid.
function band(score: number) {
  return score >= 47 ? 'b5' : score >= 42 ? 'b4' : score >= 35 ? 'b3' : score >= 25 ? 'b2' : 'b1';
}

export function Period4SubjectMatrix({ data, order }: { data: BenchmarkComparison; order: RequestedModel[] }) {
  const [sortTrack, setSortTrack] = useState<string | null>(null);
  const cell = (modelId: string, track: string) => {
    const exam = data.models.find(item => item.model === modelId)?.exams.find(item => item.track === track);
    // A subject with no submitted answer yet (all pending or execution errors) is shown as not graded, not as 0.
    const s = exam?.summary;
    return s && s.total_questions - s.pending - s.errors > 0 ? s : null;
  };
  const rows = order.filter(model => data.models.some(item => item.model === model.id && item.questions.some(q => q.status !== 'pending')));
  const sorted = sortTrack ? [...rows].sort((a, b) => (cell(b.id, sortTrack)?.score ?? -1) - (cell(a.id, sortTrack)?.score ?? -1)) : rows;
  const done = (model: RequestedModel) => model.state === 'complete' && data.models.find(item => item.model === model.id)?.completed !== false;
  // Averages use finished runs only, so interim scores of running models do not pull them down.
  const average = (track: string) => {
    const scores = rows.filter(done).map(model => cell(model.id, track)?.score).filter((score): score is number => score != null);
    return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
  };
  return <section className="subject-matrix-section" aria-labelledby="subject-matrix-title">
    <div className="section-title"><h2 id="subject-matrix-title">과목별 원점수</h2><span>{sortTrack ? `${allSubjects.find(item => item[0] === sortTrack)?.[2]} 원점수 내림차순` : '위 표와 같은 순서'} · 과목 이름을 누르면 그 과목 점수로 정렬</span></div>
    <p className="comparison-note">각 칸은 과목별 원점수(50점 만점)이고, 아래 작은 숫자는 맞힌 문항 수(20문항 중)입니다. 색이 진할수록 점수가 높습니다(47점 이상, 42-46점, 35-41점, 25-34점, 25점 미만). 진행 중인 모델은 이름 옆에 ‘중간’으로 표시하며, 제출한 답까지만 채점한 중간 점수입니다(‘미제출’은 아직 답이 없는 문항 수, ‘—’는 답이 하나도 없는 과목). 맨 아래 모델 평균은 평가를 마친 모델만으로 계산합니다.</p>
    <div className="subject-matrix-wrap"><table className="subject-matrix"><caption className="sr-only">모델별 4교시 과목 원점수</caption>
      <thead><tr><th scope="col" rowSpan={2} className="matrix-model">모델</th>{groups.map(group => <th scope="colgroup" colSpan={group.subjects.length} key={group.label} className="matrix-group">{group.label}</th>)}</tr>
        <tr>{allSubjects.map(([track, short, full]) => <th scope="col" key={track} aria-sort={sortTrack === track ? 'descending' : 'none'}><button type="button" title={`${full} 원점수로 정렬`} onClick={() => setSortTrack(sortTrack === track ? null : track)} className={sortTrack === track ? 'active' : ''}>{short}</button></th>)}</tr></thead>
      <tbody>{sorted.map(model => {
        const partial = !done(model);
        return <tr key={model.id}><th scope="row" className="matrix-model">{model.label}{partial && <small>중간</small>}</th>{allSubjects.map(([track, , full]) => {
          const summary = cell(model.id, track);
          return <td key={track} className={summary ? band(summary.score) : 'empty'} title={summary ? `${model.label} · ${full}: ${summary.score}점, ${summary.correct}/${summary.total_questions}문항${summary.abstained ? `, 기권 ${summary.abstained}` : ''}${summary.errors ? `, 미제출 ${summary.errors}` : ''}` : `${full}: 아직 제출한 답 없음`}>{summary ? <><b>{summary.score}</b><small>{summary.correct}/{summary.total_questions}</small>{!!summary.errors && <small className="missing">미제출 {summary.errors}</small>}</> : '—'}</td>;
        })}</tr>;
      })}</tbody>
      <tfoot><tr><th scope="row" className="matrix-model">모델 평균<small>완료 모델</small></th>{allSubjects.map(([track]) => { const value = average(track); return <td key={track}>{value == null ? '—' : value.toFixed(1)}</td>; })}</tr></tfoot>
    </table></div>
  </section>;
}
