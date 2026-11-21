import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {modelsForYear,yearPaths} from './academic-years.mjs';
import {buildReport,applyProviderUsage} from './report.mjs';
import {transcriptManifestPath,loadTranscriptManifest} from './transcript.mjs';
const root=resolve(import.meta.dirname,'..');
const dir=join(root,'web/public/data');mkdirSync(dir,{recursive:true});
for(const [year,session] of [[2027,'period4'],[2027,'main'],[2026,'main'],[2025,'main']]) {
 const paths=yearPaths(year,session),models=modelsForYear(year,session).filter(model=>model.publish!==false); // publish:false keeps an unfinished run out of public data
 const datasetPath=join(root,paths.dataset);
 const dataset=existsSync(datasetPath)?JSON.parse(readFileSync(datasetPath,'utf8')):null;
 const manifestPath=join(root,paths.manifest);
 const sources=existsSync(manifestPath)?JSON.parse(readFileSync(manifestPath,'utf8')).files.filter(f=>f.kind==='exam').map(f=>({subject:f.subject,url:f.source_page})):[];
 const transcriptPath=join(root,transcriptManifestPath(year,session));
 const transcript=existsSync(transcriptPath)?loadTranscriptManifest(root,year,session):null;
 const figureDependent=transcript?.manifest.figure_dependent??[];
 const inputMode=model=>({...(model.input==='text'?{input_mode:'text_transcript'}:{}),...(model.agent==='antigravity'?{agent:'antigravity'}:{})});
 const reports=[],requested=[];
 for(const model of models) {
  const path=join(root,model.directory,'run.json'),statusPath=join(root,model.directory,'status.json');
  if(!existsSync(path)) {
   const status=existsSync(statusPath)?JSON.parse(readFileSync(statusPath,'utf8')):null;
   requested.push({id:model.id,label:model.label,provider:model.provider,...inputMode(model),state:status?.state||'pending',reason:status?.reason||(!dataset?'공식 데이터셋 검증 준비 중':model.agent==='antigravity'?'Google AI Ultra 구독(agy) 실행 준비 중':model.pi?'Pi API 인증·실행 준비 중':model.provider==='anthropic'?'Claude 구독의 추가 유료 사용 OFF 확인 후 실행':'구독 포함 사용량으로 실행 예정')});continue;
  }
  if(!dataset)throw new Error(`Verified dataset is missing for ${year}`);
  const run=JSON.parse(readFileSync(path,'utf8'));
  if(run.academic_year!==year||(run.session??'main')!==session)throw new Error('Result academic year or session mismatch');
  if(run.protocol?.transcript_manifest_hash&&run.protocol.transcript_manifest_hash!==transcript?.hash)throw new Error(`Transcript manifest changed after the run: ${model.id}`);
  const report=buildReport(dataset,run,sources,model.pricing,model.pi?'Pi CLI 0.87.1 / Ralph loop':model.agent==='antigravity'?'Antigravity CLI (agy ACP) / Ralph loop':model.provider==='openai'?'Codex SDK / Ralph loop':'Claude Agent SDK / Ralph loop',figureDependent);
  const auditPath=join(root,model.directory,'provider-usage.json'); // provider-side usage audit (benchmark/audit-google-usage.mjs)
  applyProviderUsage(report,existsSync(auditPath)?JSON.parse(readFileSync(auditPath,'utf8')):null,model.pricing);
  reports.push(report);requested.push({id:model.id,label:model.label,provider:model.provider,...inputMode(model),state:run.completed?'complete':run.blocked_reason?'blocked':'partial',reason:run.blocked_reason||run.finalization?.reason||(!run.completed?'아직 모든 문항이 제출되지 않았습니다.':null)});
 }
 const comparison={schema_version:3,generated_at:new Date().toISOString(),academic_year:year,...(session==='main'?{}:{session,knowledge_policy:'closed_book'}),repository_url:'https://github.com/roboco-io/KSAT-AI-Benchmark',models:reports,requested_models:requested,billing_policy:{subscription_only:!models.some(m=>m.pi),api_key_fallback:false,pi_api_models:models.filter(m=>m.pi).map(m=>m.id)}};
 writeFileSync(join(dir,paths.comparison),JSON.stringify(comparison,null,2)+'\n');
 if(year===2026&&session==='main'){const sol=reports.find(r=>r.model==='gpt-6.1-sol');if(sol)writeFileSync(join(dir,'benchmark-v2.json'),JSON.stringify(sol,null,2)+'\n');}
 console.log(JSON.stringify({academic_year:year,session,models:reports.map(r=>({model:r.model,completed:r.completed,correct:r.summary.correct,total:r.summary.total_questions,abstained:r.summary.abstained,errors:r.summary.errors,cost:r.summary.estimated_cost_usd}))}));
}
