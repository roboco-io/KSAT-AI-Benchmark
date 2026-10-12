import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {PRICING,addUsage,summarize,outcome,estimateCost} from './core.mjs';
const root=resolve(import.meta.dirname,'..');
const d=JSON.parse(readFileSync(join(root,'exams/datasets/2026-ksat.json'),'utf8'));
const r=JSON.parse(readFileSync(join(root,'results/codex-2026/run.json'),'utf8'));
const groupStats={};
for(const g of d.solver_groups){const attempts=r.groups[g.id]?.attempts||[];groupStats[g.id]={usage:attempts.reduce((a,b)=>addUsage(a,b.usage),{}),seconds:attempts.reduce((a,b)=>a+b.time_seconds,0)};}
const totalSeconds=Object.values(groupStats).reduce((a,b)=>a+b.seconds,0);
const questions=d.questions.map(q=>{
 const a=r.answers[q.id],g=d.solver_groups.find(g=>g.question_ids.includes(q.id)),s=groupStats[g.id],n=g.question_ids.length;
 const usage=Object.fromEntries(Object.entries(addUsage({},s.usage)).map(([k,v])=>[k,v/n]));
 return {...q,status:outcome(q,r.answers,r.errors),answer:a?.answer??null,explanation:a?.explanation||r.errors[q.id]?.message||'',abstain_reason:a?.abstain_reason??null,time_seconds:s.seconds/n,usage,estimated_cost_usd:estimateCost(usage),measurement_basis:'Group request duration and usage divided equally across questions; not individual measurement'};
});
const exams=d.exams.map(e=>{
 const qs=d.questions.filter(q=>e.question_ids.includes(q.id));
 const publicQs=questions.filter(q=>e.question_ids.includes(q.id));
 const usage=publicQs.reduce((u,q)=>addUsage(u,q.usage),{});
 const seconds=publicQs.reduce((s,q)=>s+q.time_seconds,0);
 return {...e,summary:summarize(qs,r.answers,r.errors,usage,seconds,seconds)};
});
const sources=JSON.parse(readFileSync(join(root,'exams/pdf/2026/sources.json'),'utf8')).files.filter(f=>f.kind==='exam').map(f=>({subject:f.subject,url:f.source_page}));
const output={schema_version:2,generated_at:new Date().toISOString(),run_id:r.run_id,model:r.protocol.model,engine:'Codex SDK / Ralph loop',academic_year:2026,phase:'pre_exam',pricing:PRICING,summary:summarize(d.questions,r.answers,r.errors,r.usage,r.wall_time_seconds,totalSeconds),exams,questions,sources,limitations:['영어 듣기 1~17번은 공식 대본 이미지로 평가했습니다. 실제 음성 청취 성능이 아닙니다.','정답률·기권률 전체는 선택과목 공통 문항을 한 번만 센 147개 고유 문항 기준입니다.','전체 풀이 시간은 실제 경과 시간이며 묶음별 시간 합계는 병렬 처리로 더 클 수 있습니다.','문항별 시간·사용량과 시험별 비용은 묶음 요청의 값을 균등 배분한 추정치입니다.','비용은 공개 API 요율의 USD 예상치입니다. ChatGPT 구독 인증의 실제 청구액이 아닙니다.','원본 PDF 이미지 입력, high 추론, 외부 도구·검색 비활성 조건입니다.','공개된 전년도 시험이 학습 데이터에 포함되었을 가능성을 배제하지 않습니다.'],protocol:r.protocol,completed:r.completed};
output.limitations.push('토큰 사용량을 반환하지 않은 연결 실패 시도의 사용량·비용은 포함하지 못했습니다. 비용은 확인 가능한 사용량 기준의 하한 추정치입니다.');
output.usage_complete=Object.values(r.groups).every(g=>g.attempts.every(a=>Number.isFinite(a.usage?.input_tokens)));
const dest=join(root,'web/public/data/benchmark-v2.json');mkdirSync(join(root,'web/public/data'),{recursive:true});writeFileSync(dest,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({file:dest,summary:output.summary}));
