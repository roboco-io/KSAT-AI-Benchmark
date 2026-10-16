export const Q37_GRADING_POLICY = Object.freeze({
 id:'2026-english-q37-dual-answer-v1',
 effective_date:'2026-10-17',
 question_id:'2026-english-english-q37',
 official_answer:5,
 accepted_answers:Object.freeze([4,5]),
 annotation:'공식 정답은 ⑤번입니다. 본 벤치마크는 문장 연결의 대안적 해석을 수용해 ④번도 정답으로 인정합니다.',
 rationale:'④(C→A→B)는 (C)의 비경험적 접근을 (A)의 경험적 보완 필요성으로 연결하고, (B)의 신경과학 협력으로 구체화하는 해석입니다. ⑤(C→B→A)는 학제 간 역할과 협력에서 경험적 보완 필요성으로 종합하는 해석입니다. 두 해석을 수용하는 벤치마크 운영 정책이며, 공식 복수정답 인정이나 모델들의 합의에 따른 판정이 아닙니다.',
});

// Post-processing only: solver inputs, locked answers and official answer keys stay intact.
export function applyBenchmarkGrading(report) {
 const policy=Q37_GRADING_POLICY;
 if(report.academic_year!==2026||!report.questions.some(q=>q.id===policy.question_id&&q.correct_answer===policy.official_answer))return report;
 const questions=report.questions.map(q=>{
  if(q.id!==policy.question_id)return q;
  const adjusted=q.status==='incorrect'&&q.answer===4;
  return {...q,official_status:q.status,accepted_answers:[...policy.accepted_answers],benchmark_adjusted:adjusted,status:adjusted?'correct':q.status};
 });
 function adjustedSummary(summary,items) {
  const changed=items.filter(q=>q.benchmark_adjusted);
  const correct=summary.correct+changed.length;
  const incorrect=summary.incorrect-changed.length;
  return {...summary,correct,incorrect,score:summary.score+changed.reduce((sum,q)=>sum+q.points,0),accuracy:summary.total_questions?correct/summary.total_questions*100:0,attempt_accuracy:correct+incorrect?correct/(correct+incorrect)*100:null,adjusted_correct:changed.length};
 }
 return {...report,grading_policy:policy,official_summary:report.summary,summary:adjustedSummary(report.summary,questions),questions,
  exams:report.exams.map(exam=>({...exam,official_summary:exam.summary,summary:adjustedSummary(exam.summary,questions.filter(q=>exam.question_ids.includes(q.id)))})),
  limitations:[policy.annotation,...report.limitations],
 };
}
