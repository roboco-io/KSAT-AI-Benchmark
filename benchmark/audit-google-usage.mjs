// Audits Gemini runs against Google Cloud Monitoring, because the OpenAI-compatible Gemini API leaves thinking tokens
// out of completion_tokens and interrupted requests report no usage, so run.json undercounts billed tokens.
// Writes results/<dir>/provider-usage.json with the provider-side input and output (thinking included) token counts
// in the run's time window. Needs `gcloud auth login`; reads only the selected Gemini key to find its project.
// Usage: node benchmark/audit-google-usage.mjs [result-dir ...]   (default: every results/pi-*gemini* run)
import {readFileSync,writeFileSync,existsSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {readPiSecret} from './pi-env.mjs';
const root=join(import.meta.dirname,'..');
const METRICS={input:'generativelanguage.googleapis.com/quota/generate_content_paid_tier_input_token_count/usage',output:'generativelanguage.googleapis.com/generate_content_usage_output_token_count'};
const HOUR=3600*1000;
const gcloud=args=>execFileSync('gcloud',args,{encoding:'utf8'}).trim();
const token=gcloud(['auth','print-access-token']);
const keyParent=gcloud(['services','api-keys','lookup',readPiSecret('GEMINI_API_KEY'),'--format=value(parent)']);
const projectNumber=keyParent.match(/^projects\/(\d+)\//)[1];
const project=gcloud(['projects','describe',projectNumber,'--format=value(projectId)']);
async function series(metric,model,start,end) {
 const url=new URL(`https://monitoring.googleapis.com/v3/projects/${project}/timeSeries`);
 // The input quota metric reports the same tokens once per quota limit; count only the per-model per-minute limit.
 url.searchParams.set('filter',`metric.type="${metric}" AND metric.labels.model="${model}"`+(metric===METRICS.input?' AND metric.labels.limit_name="GenerateContentPaidTierInputTokensPerModelPerMinute"':''));
 url.searchParams.set('interval.startTime',new Date(start).toISOString());url.searchParams.set('interval.endTime',new Date(end).toISOString());
 url.searchParams.set('aggregation.alignmentPeriod','3600s');url.searchParams.set('aggregation.perSeriesAligner','ALIGN_SUM');
 const response=await fetch(url,{headers:{authorization:`Bearer ${token}`}});const body=await response.json();
 if(!response.ok)throw new Error(`Monitoring query failed: ${body.error?.message}`);
 return (body.timeSeries??[]).flatMap(s=>s.points).reduce((sum,p)=>sum+Number(p.value.int64Value??0),0);
}
const dirs=process.argv.slice(2).length?process.argv.slice(2):readdirSync(join(root,'results')).filter(name=>/^pi-.*gemini/.test(name)).map(name=>`results/${name}`);
for(const dir of dirs) {
 const run=JSON.parse(readFileSync(join(root,dir,'run.json'),'utf8'));
 const attempts=Object.values(run.groups).flatMap(g=>g.attempts||[]);
 const finished=attempts.map(a=>a.finished_at).filter(Boolean).sort().at(-1);
 if(!finished||attempts.some(a=>!a.finished_at)){console.log(`${dir}: skipped (run still in progress)`);continue;}
 // Whole hours around the run; other requests to the same model in that window would be counted too (see note).
 const start=Math.floor(Date.parse(run.started_at)/HOUR)*HOUR,end=Math.ceil(Date.parse(finished)/HOUR)*HOUR;
 const model=run.protocol.api_model;
 const audit={schema_version:1,source:'google_cloud_monitoring',project_number:projectNumber,metrics:METRICS,model,window:{start:new Date(start).toISOString(),end:new Date(end).toISOString()},
  input_tokens:await series(METRICS.input,model,start,end),output_tokens_including_thinking:await series(METRICS.output,model,start,end),
  queried_at:new Date().toISOString(),note:'Provider-side token counts for this model in whole hours around the run; includes interrupted requests and thinking tokens; not an invoice. Requests to the same model outside this benchmark in the window would also be counted.'};
 if(!audit.input_tokens&&!audit.output_tokens_including_thinking){console.log(`${dir}: no metric data (retention or project mismatch); not written`);continue;}
 writeFileSync(join(root,dir,'provider-usage.json'),JSON.stringify(audit,null,2)+'\n');
 console.log(`${dir}: input ${audit.input_tokens}, output ${audit.output_tokens_including_thinking} (recorded ${run.usage.input_tokens}/${run.usage.output_tokens})`);
}
