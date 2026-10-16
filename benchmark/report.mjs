import {executionEvidence} from './execution-evidence.mjs';
import {executionStats} from './execution-stats.mjs';
import {applyBenchmarkGrading} from './grading.mjs';
import {addUsage,summarize,outcome,estimateCost} from './core.mjs';
export function buildReport(dataset,run,sources,pricing,engine) {
 const stats={};
 for(const g of dataset.solver_groups) {
  const attempts=Object.entries(run.groups).filter(([id,group])=>id===g.id||group.original_group_id===g.id).flatMap(([,group])=>group.attempts||[]);
  stats[g.id]={usage:attempts.reduce((a,b)=>addUsage(a,b.usage),{}),seconds:attempts.reduce((a,b)=>a+b.time_seconds,0),cost:attempts.reduce((a,b)=>a+(Number.isFinite(b.estimated_cost_usd)&&b.estimated_cost_usd>0?b.estimated_cost_usd:estimateCost(b.usage,pricing)),0)};
 }
 const totalSeconds=Object.values(stats).reduce((a,b)=>a+b.seconds,0);
 const questions=dataset.questions.map(q=>{
  const answer=run.answers[q.id],group=dataset.solver_groups.find(g=>g.question_ids.includes(q.id)),stat=stats[group.id],n=group.question_ids.length;
  const usage=Object.fromEntries(Object.entries(addUsage({},stat.usage)).map(([k,v])=>[k,v/n]));
  return {...q,status:outcome(q,run.answers,run.errors),answer:answer?.answer??null,explanation:answer?.explanation||run.errors[q.id]?.detail||run.errors[q.id]?.message||'',abstain_reason:answer?.abstain_reason??null,time_seconds:stat.seconds/n,usage,estimated_cost_usd:stat.cost/n,measurement_basis:'Group request duration and usage divided equally; not individual measurement'};
 });
 const exams=dataset.exams.map(exam=>{
  const qs=dataset.questions.filter(q=>exam.question_ids.includes(q.id)),items=questions.filter(q=>exam.question_ids.includes(q.id));
  const usage=items.reduce((u,q)=>addUsage(u,q.usage),{}),seconds=items.reduce((s,q)=>s+q.time_seconds,0);
  const summary=summarize(qs,run.answers,run.errors,usage,seconds,seconds,pricing);
  summary.estimated_cost_usd=items.reduce((s,q)=>s+q.estimated_cost_usd,0);
  return {...exam,summary};
 });
 const summary=summarize(dataset.questions,run.answers,run.errors,run.usage,run.wall_time_seconds,totalSeconds,pricing);
 summary.estimated_cost_usd=Number(Object.values(stats).reduce((s,g)=>s+g.cost,0).toFixed(8));
 return applyBenchmarkGrading({schema_version:2,generated_at:new Date().toISOString(),run_id:run.run_id,model:run.protocol.model,engine,academic_year:dataset.academic_year||2026,execution_stats:executionStats(run),execution_stats_evidence:executionEvidence(run),phase:run.phase,pricing,summary,exams,questions,sources,completed:run.completed===true,protocol:run.protocol,protocol_history:run.protocol_history||[],billing:run.billing||{method:'previous_record'},usage_complete:Object.values(run.groups).every(g=>g.attempts.every(a=>Number.isFinite(a.usage?.input_tokens)&&Number.isFinite(a.usage?.output_tokens)&&!a.api_usage_unknown&&(run.protocol.agent!=='Pi'||a.usage.input_tokens+a.usage.output_tokens>0))),limitations:[...(run.protocol.batch_max_questions?[`기존 묶음 실행 오류 후 미제출 문항을 최대 ${run.protocol.batch_max_questions}문항씩 한 차례 복구했습니다. 이전 실행 조건·실패 사용량·답안은 protocol_history와 원본 실행 기록에 보존합니다.`]:[]),...(run.protocol.agent==='Pi'?[
  'Pi 모델은 사용자 승인 API 인증으로 실행합니다. Codex·Claude 구독 결과와 인증 경로가 다릅니다.',
  `Pi CLI 0.87.1, 도구·확장·자동 재시도·문맥 압축·이미지 자동 축소 비활성, 묶음당 출력 상한 ${(run.protocol.max_output_tokens??65536).toLocaleString('en-US')}토큰입니다.`,
  'Pi의 총 입력은 비캐시 입력·캐시 읽기·캐시 쓰기의 합이며 추론 토큰은 총 출력의 부분집합입니다. 제공자가 별도 추론 값을 주지 않으면 0은 미보고를 뜻할 수 있습니다.',
  run.protocol.effort_semantics==='high'?'Pi high 추론 설정입니다. 모델별 내부 계산량이 동일하다는 뜻은 아닙니다.':'Qwen은 thinking을 활성화했습니다. API가 high 추론 강도 값을 제공하지 않아 다른 모델과 같은 강도로 해석하지 않습니다.',
  ...(run.protocol.model.startsWith('deepseek-')?['DeepSeek 비용은 피크 시간 요율의 참고값입니다. 비피크 요율은 50%이며, API 청구서와 다를 수 있습니다.']:[]),
 ]:[]),
  '영어 듣기 1~17번은 공식 대본 이미지로 평가합니다. 실제 음성 청취 성능이 아닙니다.',
  '전체 지표는 공통 문항을 한 번만 센 147개 고유 문항 기준입니다.',
  '전체 풀이 시간은 실제 경과 시간이며 병렬 묶음 시간 합계와 다릅니다.',
  '문항별 시간·사용량·시험별 비용은 묶음 값을 균등 배분한 추정치입니다.',
  'USD 비용은 API 요율 환산 참고값으로 실제 구독 청구액이나 API 결제액이 아닙니다.',
  '사용량 없는 실패 요청은 비용에서 제외될 수 있어 확인 가능한 사용량의 하한 추정입니다.',
  '원본 200 DPI 이미지, protocol에 기록한 추론 설정, 외부 도구·검색 비활성 조건입니다. Claude의 StructuredOutput은 외부 IO가 없는 SDK 출력 형식 캐리어만 허용합니다.',
  '공개된 전년도 시험의 학습 데이터 포함 가능성과 모델별 토크나이저·SDK·추론 차이를 배제하지 않습니다.',
  'Claude의 사고 토큰은 별도 보고되지 않습니다. 내부 정규화의 0은 사고 토큰이 없다는 뜻이 아니며 총 출력 토큰에 포함됩니다.',
 ]});
}
