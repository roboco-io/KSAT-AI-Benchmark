import {addUsage,summarize,outcome,estimateCost} from './core.mjs';
export function buildReport(dataset,run,sources,pricing,engine) {
 const stats={};
 for(const g of dataset.solver_groups) {
  const attempts=run.groups[g.id]?.attempts||[];
  stats[g.id]={usage:attempts.reduce((a,b)=>addUsage(a,b.usage),{}),seconds:attempts.reduce((a,b)=>a+b.time_seconds,0),cost:attempts.reduce((a,b)=>a+(Number.isFinite(b.estimated_cost_usd)&&b.estimated_cost_usd>0?b.estimated_cost_usd:estimateCost(b.usage,pricing)),0)};
 }
 const totalSeconds=Object.values(stats).reduce((a,b)=>a+b.seconds,0);
 const questions=dataset.questions.map(q=>{
  const answer=run.answers[q.id],group=dataset.solver_groups.find(g=>g.question_ids.includes(q.id)),stat=stats[group.id],n=group.question_ids.length;
  const usage=Object.fromEntries(Object.entries(addUsage({},stat.usage)).map(([k,v])=>[k,v/n]));
  return {...q,status:outcome(q,run.answers,run.errors),answer:answer?.answer??null,explanation:answer?.explanation||run.errors[q.id]?.message||'',abstain_reason:answer?.abstain_reason??null,time_seconds:stat.seconds/n,usage,estimated_cost_usd:stat.cost/n,measurement_basis:'Group request duration and usage divided equally; not individual measurement'};
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
 return {schema_version:2,generated_at:new Date().toISOString(),run_id:run.run_id,model:run.protocol.model,engine,academic_year:dataset.academic_year||2026,phase:run.phase,pricing,summary,exams,questions,sources,completed:run.completed===true,protocol:run.protocol,billing:run.billing||{method:'previous_record'},usage_complete:Object.values(run.groups).every(g=>g.attempts.every(a=>Number.isFinite(a.usage?.input_tokens))),limitations:[
  '영어 듣기 1~17번은 공식 대본 이미지로 평가합니다. 실제 음성 청취 성능이 아닙니다.',
  '전체 지표는 공통 문항을 한 번만 센 147개 고유 문항 기준입니다.',
  '전체 풀이 시간은 실제 경과 시간이며 병렬 묶음 시간 합계와 다릅니다.',
  '문항별 시간·사용량·시험별 비용은 묶음 값을 균등 배분한 추정치입니다.',
  'USD 비용은 API 요율 환산 참고값으로 실제 구독 청구액이나 API 결제액이 아닙니다.',
  '사용량 없는 실패 요청은 비용에서 제외될 수 있어 확인 가능한 사용량의 하한 추정입니다.',
  '원본 200 DPI 이미지, high 추론, 외부 도구·검색 비활성 조건입니다. Claude의 StructuredOutput은 외부 IO가 없는 SDK 출력 형식 캐리어만 허용합니다.',
  '공개된 전년도 시험의 학습 데이터 포함 가능성과 모델별 토크나이저·SDK·추론 차이를 배제하지 않습니다.',
  'Claude의 사고 토큰은 별도 보고되지 않습니다. 내부 정규화의 0은 사고 토큰이 없다는 뜻이 아니며 총 출력 토큰에 포함됩니다.',
 ]};
}
