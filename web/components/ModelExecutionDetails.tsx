import type {BenchmarkData} from './benchmark-types';

function analysis(data:BenchmarkData) {
  const summary=data.summary;
  const finished=data.completed&&summary.pending===0&&summary.errors===0;
  const paragraphs=[finished?`이번 시험에서 ${summary.total_questions}문항 중 ${summary.correct}문항을 맞혔고, 기권은 ${summary.abstained}회입니다.`:`미제출·실행 오류가 ${summary.pending+summary.errors}문항 남은 불완전 실행입니다. 현재 성적만으로 모델의 전체 성능을 판단하기 어렵습니다.`];
  const subjects=[['korean','국어'],['math','수학'],['english','영어']].map(([id,label])=>({label,scores:data.exams.filter(exam=>exam.subject===id).map(exam=>exam.summary.score/exam.max_score*100)})).filter(subject=>subject.scores.length);
  if(finished&&subjects.length) {
    const minimum=Math.min(...subjects.flatMap(subject=>subject.scores));
    const maximum=Math.max(...subjects.flatMap(subject=>subject.scores));
    if(minimum===100)paragraphs.push('국어·수학의 모든 선택과목과 영어에서 만점을 기록했습니다.');
    else if(minimum<maximum)paragraphs.push(`이번 평가에서는 ${subjects.filter(subject=>Math.min(...subject.scores)===minimum).map(subject=>subject.label).join('·')}의 원점수가 상대적으로 낮았습니다. 영역별 점수와 문항별 풀이를 함께 확인할 수 있습니다.`);
  }
  if(data.execution_stats)paragraphs.push(data.execution_stats.retry_count>0?(finished?'재시도가 있었지만 최종적으로 모든 문항에 답 또는 기권을 제출했습니다.':'재시도 후에도 미제출 문항이 남았습니다.'):'기록된 묶음 재시도는 없습니다.');
  if(summary.adjusted_correct&&data.official_summary)paragraphs.push(`영어 37번 ④번을 인정한 보정 점수입니다. 공식 기준 정답률은 ${data.official_summary.accuracy.toFixed(1)}%입니다.`);
  return paragraphs;
}

export function ModelExecutionDetails({data,label,onShowAnswers}:{data:BenchmarkData;label:string;onShowAnswers:()=>void}) {
  return <section className="model-analysis" aria-label={`${label} 실행 분석`}>
    <h3>{label} 총평</h3>
    <div className="model-analysis-summary">{analysis(data).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>
    <dl className="execution-metrics">
      <div><dt>재시도</dt><dd>{data.execution_stats?.retry_count??'—'}회</dd></div>
      <div><dt>답변 거부</dt><dd>{data.execution_stats?.refusal_count??'—'}회</dd></div>
      <div><dt>타임아웃</dt><dd>{data.execution_stats?.timeout_count??'—'}회</dd></div>
      <div><dt>사용 에이전트</dt><dd>{data.engine}</dd></div>
      <div><dt>토큰 사용량</dt><dd>입력 {data.summary.usage.input_tokens.toLocaleString('ko-KR')}<br/>출력 {data.summary.usage.output_tokens.toLocaleString('ko-KR')}<br/>캐시 {data.summary.usage.cached_input_tokens.toLocaleString('ko-KR')}</dd></div>
    </dl>
    <p className="execution-definition">재시도는 원래 묶음의 첫 실행 이후 추가 시도 횟수이며 분할 복구를 포함합니다. 답변 거부는 명시적 거부·콘텐츠 검사 차단 요청 횟수로, 확정된 기권 문항 수와 구분합니다.</p>
    <details className="execution-method"><summary>시험 조건·측정 한계</summary>{data.execution_notes?.map((note,index)=><p key={index}>{note}</p>)}<p>원본 PDF 200 DPI 이미지 · 영어 듣기는 공식 대본 이미지 · 추론 설정 {data.protocol?.effort??'기록 없음'} · 검색·외부 도구 비활성 조건입니다. 모델별 내부 계산량이 같다는 뜻은 아닙니다.</p><p>{data.usage_complete===false?'일부 실패 요청의 사용량이 보고되지 않았습니다. 비용은 확인 가능한 사용량의 하한 추정입니다.':'비용은 보고된 사용량을 API 요율로 환산한 참고값입니다.'} 실측 청구액이 아닙니다. 이 총평은 이번 시험의 성적과 실행 기록을 요약하며, 모델의 모든 과제 수행 능력을 대표하지 않습니다.</p></details>
    <button type="button" className="show-model-answers" onClick={onShowAnswers}>문항별 답안·풀이 보기 →</button>
  </section>;
}
