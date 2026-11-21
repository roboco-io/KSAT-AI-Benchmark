import {executionEvidence} from './execution-evidence.mjs';
import {executionStats} from './execution-stats.mjs';
import {applyBenchmarkGrading} from './grading.mjs';
import {addUsage,summarize,outcome,estimateCost} from './core.mjs';
// Text-transcript runs: score again without the questions whose figures were described in words.
export function figureFreeSummary(questions,figureDependent) {
 const ids=figureDependent.filter(id=>questions.some(q=>q.id===id));
 const items=questions.filter(q=>!ids.includes(q.id));
 const count=status=>items.filter(q=>q.status===status).length;
 const correct=count('correct'),incorrect=count('incorrect');
 return {excluded_question_ids:ids,total_questions:items.length,correct,incorrect,abstained:count('abstained'),errors:count('error'),pending:count('pending'),score:items.filter(q=>q.status==='correct').reduce((s,q)=>s+q.points,0),max_score:items.reduce((s,q)=>s+q.points,0),accuracy:items.length?correct/items.length*100:0,attempt_accuracy:correct+incorrect?correct/(correct+incorrect)*100:null};
}
// Model time when recorded; older attempts fall back to the whole attempt duration.
export const modelSeconds=attempt=>Number.isFinite(attempt.model_time_seconds)?attempt.model_time_seconds:attempt.time_seconds;
// Replaces the response-based cost with one from provider-side usage metrics (thinking tokens and interrupted requests
// included). Per-question and per-exam costs keep their shares of the run and are scaled to the audited total.
export function applyProviderUsage(report,audit,pricing) {
 if(!audit)return report;
 // The input quota metric can lag or miss samples; never count fewer input tokens than the responses reported.
 const input=Math.max(audit.input_tokens,report.summary.usage?.input_tokens??0);
 const cost=Number(((input*pricing.input_per_million+audit.output_tokens_including_thinking*pricing.output_per_million)/1e6).toFixed(8));
 const recorded=report.summary.estimated_cost_usd,factor=recorded>0?cost/recorded:0;
 for(const q of report.questions)q.estimated_cost_usd*=factor;
 for(const exam of report.exams)exam.summary.estimated_cost_usd*=factor;
 report.summary.response_estimated_cost_usd=recorded;report.summary.estimated_cost_usd=cost;report.summary.cost_basis='provider_usage_metrics';
 report.summary.provider_usage={source:audit.source,input_tokens:input,metric_input_tokens:audit.input_tokens,output_tokens_including_thinking:audit.output_tokens_including_thinking,window:audit.window,queried_at:audit.queried_at};
 const fmt=n=>n.toLocaleString('en-US');
 report.limitations=[...(report.limitations??[]),'비용은 Google Cloud 사용량 지표('+audit.queried_at.slice(0,10)+' 조회)의 입력 '+fmt(input)+'토큰과 추론 포함 출력 '+fmt(audit.output_tokens_including_thinking)+'토큰으로 다시 계산했습니다. Gemini 호환 API는 추론 토큰을 응답 사용량에서 빼고 보고하므로, 응답 기준 추정(US$'+recorded.toFixed(4)+')은 실제보다 작습니다. 청구서 금액은 아닙니다.'];
 return report;
}
export function buildReport(dataset,run,sources,pricing,engine,figureDependent=[]) {
 const textInput=/^frozen text transcription/.test(run.protocol.input||'');
 const stats={};
 for(const g of dataset.solver_groups) {
  const attempts=Object.entries(run.groups).filter(([id,group])=>id===g.id||group.original_group_id===g.id).flatMap(([,group])=>group.attempts||[]);
  stats[g.id]={usage:attempts.reduce((a,b)=>addUsage(a,b.usage),{}),seconds:attempts.reduce((a,b)=>a+b.time_seconds,0),cost:attempts.reduce((a,b)=>a+(Number.isFinite(b.estimated_cost_usd)&&b.estimated_cost_usd>0?b.estimated_cost_usd:estimateCost(b.usage,pricing)),0)};
 }
 const totalSeconds=Object.values(stats).reduce((a,b)=>a+b.seconds,0);
 // Solve time counts only the request that actually submitted each answer; failed attempts and retries are excluded.
 // model_time_seconds runs from the first model stream event to the final answer, excluding auth checks, request pacing and process startup.
 const solveSeconds={};let solveTotal=0;const bases=new Set();
 for(const attempt of Object.values(run.groups).flatMap(group=>group.attempts||[]).filter(a=>a.status==='completed'&&Number.isFinite(a.time_seconds)).sort((a,b)=>String(a.started_at).localeCompare(String(b.started_at)))) {
  const ids=(attempt.question_ids||[]).filter(id=>run.answers[id]&&!(id in solveSeconds));
  if(!ids.length)continue;
  const seconds=modelSeconds(attempt);bases.add(Number.isFinite(attempt.model_time_seconds)?'model_stream':'attempt');
  solveTotal+=seconds;
  for(const id of ids)solveSeconds[id]=seconds/ids.length;
 }
 const questions=dataset.questions.map(q=>{
  const answer=run.answers[q.id],group=dataset.solver_groups.find(g=>g.question_ids.includes(q.id)),stat=stats[group.id],n=group.question_ids.length;
  const usage=Object.fromEntries(Object.entries(addUsage({},stat.usage)).map(([k,v])=>[k,v/n]));
  return {...q,status:outcome(q,run.answers,run.errors),answer:answer?.answer??null,explanation:answer?.explanation||run.errors[q.id]?.detail||run.errors[q.id]?.message||'',abstain_reason:answer?.abstain_reason??null,time_seconds:stat.seconds/n,solve_time_seconds:solveSeconds[q.id]??0,usage,estimated_cost_usd:stat.cost/n,measurement_basis:'Group request duration and usage divided equally; solve_time_seconds counts only the model stream time of the request that submitted the answer; not individual measurement'};
 });
 const exams=dataset.exams.map(exam=>{
  const qs=dataset.questions.filter(q=>exam.question_ids.includes(q.id)),items=questions.filter(q=>exam.question_ids.includes(q.id));
  const usage=items.reduce((u,q)=>addUsage(u,q.usage),{}),seconds=items.reduce((s,q)=>s+q.time_seconds,0);
  const summary=summarize(qs,run.answers,run.errors,usage,seconds,seconds,pricing);
  summary.solve_time_seconds=items.reduce((s,q)=>s+q.solve_time_seconds,0);
  summary.estimated_cost_usd=items.reduce((s,q)=>s+q.estimated_cost_usd,0);
  return {...exam,summary};
 });
 const summary=summarize(dataset.questions,run.answers,run.errors,run.usage,run.wall_time_seconds,totalSeconds,pricing);
 summary.solve_time_seconds=solveTotal;summary.solve_time_basis=bases.size===1?[...bases][0]:bases.size?'mixed':null;
 summary.estimated_cost_usd=Number(Object.values(stats).reduce((s,g)=>s+g.cost,0).toFixed(8));
 const report=applyBenchmarkGrading({schema_version:2,generated_at:new Date().toISOString(),run_id:run.run_id,model:run.protocol.model,engine,academic_year:dataset.academic_year||2026,execution_stats:executionStats(run),execution_notes:run.execution_notes??[],execution_stats_evidence:executionEvidence(run),phase:run.phase,pricing,summary,exams,questions,sources,completed:run.completed===true,protocol:run.protocol,protocol_history:run.protocol_history||[],billing:run.billing||{method:'previous_record'},usage_complete:Object.values(run.groups).every(g=>g.attempts.every(a=>Number.isFinite(a.usage?.input_tokens)&&Number.isFinite(a.usage?.output_tokens)&&!a.api_usage_unknown&&(run.protocol.agent!=='Pi'||a.usage.input_tokens+a.usage.output_tokens>0))),limitations:[...(run.protocol.batch_max_questions?[`기존 묶음 실행 오류 후 미제출 문항을 최대 ${run.protocol.batch_max_questions}문항씩 한 차례 복구했습니다. 이전 실행 조건·실패 사용량·답안은 protocol_history와 원본 실행 기록에 보존합니다.`]:[]),...(run.protocol.agent==='Pi'?[
  'Pi 모델은 사용자 승인 API 인증으로 실행합니다. Codex·Claude 구독 결과와 인증 경로가 다릅니다.',
  `Pi CLI 0.87.1, 도구·확장·자동 재시도·문맥 압축${textInput?'':'·이미지 자동 축소'} 비활성, 묶음당 출력 상한 ${(run.protocol.max_output_tokens??65536).toLocaleString('en-US')}토큰입니다.`,
  'Pi의 총 입력은 비캐시 입력·캐시 읽기·캐시 쓰기의 합이며 추론 토큰은 총 출력의 부분집합입니다. 제공자가 별도 추론 값을 주지 않으면 0은 미보고를 뜻할 수 있습니다.',
  run.protocol.effort_semantics==='high'?'Pi high 추론 설정입니다. 모델별 내부 계산량이 동일하다는 뜻은 아닙니다.':'Qwen은 thinking을 활성화했습니다. API가 high 추론 강도 값을 제공하지 않아 다른 모델과 같은 강도로 해석하지 않습니다.',
  ...(run.protocol.model.startsWith('deepseek-')?['DeepSeek 비용은 피크 시간 요율의 참고값입니다. 비피크 요율은 50%이며, API 청구서와 다를 수 있습니다.']:[]),
 ]:[]),
  ...(textInput?[
   '이 모델은 이미지 입력을 받지 않아, 문제지 이미지 대신 원본을 쪽 단위로 옮겨 적은 고정 텍스트 전사본으로 평가했습니다. 이미지 입력 모델은 문제지를 직접 판독하지만 이 모델은 판독이 끝난 텍스트를 받으므로, 두 결과는 같은 입력 조건의 비교가 아닙니다.',
   '그림·그래프·도표는 그려진 내용을 글로 기술해 전달했습니다. 그림 의존 문항을 제외한 점수를 figure_dependent 항목에 함께 제공합니다. 이 점수는 summary와 같은 채점 기준(벤치마크 채점 정책 적용 후)으로 계산합니다.',
   '영어 듣기 1~17번은 공식 대본 전사본으로 평가합니다. 실제 음성 청취 성능이 아닙니다.',
  ]:['영어 듣기 1~17번은 공식 대본 이미지로 평가합니다. 실제 음성 청취 성능이 아닙니다.']),
  '전체 지표는 공통 문항을 한 번만 센 147개 고유 문항 기준입니다.',
  '전체 풀이 시간은 실제 경과 시간이며 병렬 묶음 시간 합계와 다릅니다.',
  '문항별 시간·사용량·시험별 비용은 묶음 값을 균등 배분한 추정치입니다.',
  'USD 비용은 API 요율 환산 참고값으로 실제 구독 청구액이나 API 결제액이 아닙니다.',
  '사용량 없는 실패 요청은 비용에서 제외될 수 있어 확인 가능한 사용량의 하한 추정입니다.',
  textInput?'고정 텍스트 전사본(exams/transcripts), protocol에 기록한 추론 설정, 외부 도구·검색 비활성 조건입니다.':'원본 200 DPI 이미지, protocol에 기록한 추론 설정, 외부 도구·검색 비활성 조건입니다. Claude의 StructuredOutput은 외부 IO가 없는 SDK 출력 형식 캐리어만 허용합니다.',
  '공개된 전년도 시험의 학습 데이터 포함 가능성과 모델별 토크나이저·SDK·추론 차이를 배제하지 않습니다.',
  'Claude의 사고 토큰은 별도 보고되지 않습니다. 내부 정규화의 0은 사고 토큰이 없다는 뜻이 아니며 총 출력 토큰에 포함됩니다.',
 ]});
 if(!textInput)return report;
 return {...report,input_mode:'text_transcript',figure_dependent:{grading_basis:'same as summary (benchmark grading policy applied)',...figureFreeSummary(report.questions,figureDependent),exams:report.exams.map(exam=>{const {excluded_question_ids,score,max_score,correct,total_questions}=figureFreeSummary(report.questions.filter(q=>exam.question_ids.includes(q.id)),figureDependent);return {id:exam.id,excluded:excluded_question_ids.length,score,max_score,correct,total_questions};})}};
}
