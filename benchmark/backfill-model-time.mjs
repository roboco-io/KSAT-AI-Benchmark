// Backfill attempt.model_time_seconds for attempts recorded before run.mjs measured it.
// The private event log of an attempt is created by the first model stream event and last written by the final event,
// so its birth-to-last-write span is the model stream time without auth checks, request pacing or process startup.
// Usage: node benchmark/backfill-model-time.mjs [--skip <result-dir-name> ...]
import {existsSync,readdirSync,readFileSync,statSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const root=join(import.meta.dirname,'..'),eventsDir=join(root,'.runtime/events'),resultsDir=join(root,'results');
const skip=new Set(process.argv.flatMap((arg,i,all)=>all[i-1]==='--skip'?[arg]:[]));
const logs=readdirSync(eventsDir).filter(name=>name.endsWith('.jsonl'));
let filled=0,missing=0;
for(const dir of readdirSync(resultsDir).filter(name=>!skip.has(name))) {
 const path=join(resultsDir,dir,'run.json');
 if(!existsSync(path))continue;
 const run=JSON.parse(readFileSync(path,'utf8'));
 if(!run.groups||!run.protocol?.model)continue;
 let changed=false;
 for(const [groupId,group] of Object.entries(run.groups))for(const attempt of group.attempts||[]) {
  if(Number.isFinite(attempt.model_time_seconds)||!attempt.finished_at||!attempt.started_at)continue;
  const prefix=`${run.protocol.model}-${groupId}-${attempt.iteration}-`,started=Date.parse(attempt.started_at);
  const match=logs.filter(name=>name.startsWith(prefix)&&/^\d+\.jsonl$/.test(name.slice(prefix.length)))
   .map(name=>({name,ts:Number(name.slice(prefix.length,-6))})).filter(l=>l.ts>=started-1000&&l.ts<=started+120000)
   .sort((a,b)=>Math.abs(a.ts-started)-Math.abs(b.ts-started))[0];
  if(!match){missing++;continue;}
  const s=statSync(join(eventsDir,match.name));
  const seconds=Math.round(s.mtimeMs-s.birthtimeMs)/1000;
  if(!(seconds>=0&&seconds<=attempt.time_seconds)){missing++;continue;}
  attempt.model_time_seconds=seconds;attempt.model_time_source='event_log_file_times';changed=true;filled++;
 }
 if(changed)writeFileSync(path,JSON.stringify(run,null,2)+'\n');
}
console.log(`model_time_seconds backfilled ${filled}, unmatched ${missing}`);
