import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {MODELS} from './models.mjs';
import {buildReport} from './report.mjs';
const root=resolve(import.meta.dirname,'..');
const dataset=JSON.parse(readFileSync(join(root,'exams/datasets/2026-ksat.json'),'utf8'));
const sources=JSON.parse(readFileSync(join(root,'exams/pdf/2026/sources.json'),'utf8')).files.filter(f=>f.kind==='exam').map(f=>({subject:f.subject,url:f.source_page}));
const reports=[];const requested=[];
for(const model of MODELS) {
 const path=join(root,model.directory,'run.json');
 if(!existsSync(path)){requested.push({id:model.id,label:model.label,provider:model.provider,state:'pending',reason:model.provider==='anthropic'?'Astra·Luna 완료 후, Claude 구독의 추가 유료 사용 OFF 확인을 거쳐 실행':'구독 포함 사용량으로 실행 예정'});continue;}
 const run=JSON.parse(readFileSync(path,'utf8'));
 const report=buildReport(dataset,run,sources,model.pricing,model.provider==='openai'?'Codex SDK / Ralph loop':'Claude Agent SDK / Ralph loop');
 reports.push(report);requested.push({id:model.id,label:model.label,provider:model.provider,state:run.completed?'complete':run.blocked_reason?'blocked':'partial',reason:run.blocked_reason||(!run.completed?'아직 모든 문항이 제출되지 않았습니다.':null)});
}
const comparison={schema_version:3,generated_at:new Date().toISOString(),academic_year:2026,repository_url:'https://github.com/roboco-io/KSAT-AI-Benchmark',models:reports,requested_models:requested,billing_policy:{subscription_only:true,api_key_fallback:false}};
const dir=join(root,'web/public/data');mkdirSync(dir,{recursive:true});
writeFileSync(join(dir,'benchmark-comparison.json'),JSON.stringify(comparison,null,2)+'\n');
const sol=reports.find(r=>r.model==='gpt-6.1-sol');if(sol)writeFileSync(join(dir,'benchmark-v2.json'),JSON.stringify(sol,null,2)+'\n');
console.log(JSON.stringify(reports.map(r=>({model:r.model,completed:r.completed,correct:r.summary.correct,total:r.summary.total_questions,abstained:r.summary.abstained,errors:r.summary.errors,cost:r.summary.estimated_cost_usd}))));
