import {Codex} from '@openai/codex-sdk';
import {buildSolverPrompt} from './solver-prompt.mjs';
import {readFileSync,writeFileSync,mkdirSync,existsSync,mkdtempSync,appendFileSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateAnswers,mergeSubmitted,addUsage,estimateCost,fatalStreamError,attemptsRemaining,elapsedWall,verifyResume,runBatches} from './core.mjs';
import {modelById} from './models.mjs';
import {modelForYear,yearPaths} from './academic-years.mjs';
import {codexSubscriptionStatus,subscriptionEnvironment,claudeAccountFingerprint,assertFreshClaudeProof} from './subscription.mjs';
import {claudeEvents} from './claude-adapter.mjs';
import {piEvents} from './pi-adapter.mjs';
import {readPiSecret} from './pi-env.mjs';
import {splitSolverGroups,applySplitRecovery} from './recovery.mjs';
import {sourcePath} from './source-path.mjs';
import {renderPages} from './render.mjs';
import {acquireRunLock} from './run-lock.mjs';
import {repeatedInspectionBlock,inspectionScope} from './moderation.mjs';

const root=resolve(import.meta.dirname,'..');
const yearIndex=process.argv.indexOf('--year');
const year=yearIndex>=0?Number(process.argv[yearIndex+1]):2026;
const paths=yearPaths(year);
const dataset=JSON.parse(readFileSync(join(root,paths.dataset),'utf8'));
if(dataset.academic_year!==year)throw new Error('Dataset academic year mismatch');
const hash=s=>createHash('sha256').update(s).digest('hex');
const modelArg=process.argv.indexOf('--model');const selected=modelForYear(modelById(modelArg>=0?process.argv[modelArg+1]:'gpt-6.1-sol'),year);
const groupArg=process.argv.indexOf('--group');const requestedGroup=groupArg>=0?process.argv[groupArg+1]:null;
let allowedGroups=requestedGroup?dataset.solver_groups.filter(g=>g.id===requestedGroup):dataset.solver_groups;
if(!allowedGroups.length)throw new Error('Unknown solver group');
const once=process.argv.includes('--once');
const recoveryIndex=process.argv.indexOf('--recover-with-batches');
const requestedBatchSize=recoveryIndex>=0?Number(process.argv[recoveryIndex+1]):null;
if((selected.provider==='google'&&!selected.pi)||selected.agent==='antigravity')throw new Error('ANTIGRAVITY_BLOCKED: agy 1.3.2 headless native image input is unsupported; no substitute agent');
if(!['openai','anthropic'].includes(selected.provider)&&!selected.pi)throw new Error('RUNTIME_BLOCKED: this provider requires a verified Pi profile');
const runDir=join(root,selected.directory);mkdirSync(runDir,{recursive:true});
const statePath=join(runDir,'run.json');
if(existsSync(statePath)&&JSON.parse(readFileSync(statePath,'utf8')).completed){console.log(`ALREADY COMPLETE: ${selected.id}; preserving locked answers`);process.exit(0);}
const releaseLock=acquireRunLock(join(root,'.runtime/locks',(year===2026?selected.id:`${year}-${selected.id}`)+'.json'),existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{});
process.once('exit',releaseLock);
const protocol={model:selected.id,provider:selected.provider,effort:'high',sdk_version:selected.pi?'Pi CLI 0.87.1':selected.provider==='openai'?'0.162.1':'0.3.296',tools:'disabled',input:'original PDF rendered at 200 DPI',english_listening:'official transcript rendered as images',max_iterations:3,group_timeout_seconds:selected.pi||selected.provider==='openai'?900:600,concurrency:2,cost_limit_usd:25,subscription_only:!selected.pi,api_key_fallback:false};
if(selected.pi) {
 const authorization=join(root,'.runtime/pi-api-authorization.json');
 if(!existsSync(authorization)||!JSON.parse(readFileSync(authorization,'utf8')).allowed_models?.includes(selected.id))throw new Error('PI_BLOCKED: this model has not been authorized for API billing');
 protocol.agent='Pi';protocol.api_model=selected.pi.model_id;protocol.api_base_url=selected.pi.base_url;protocol.max_output_tokens=selected.pi.max_tokens;protocol.effort_semantics=selected.pi.effort_semantics||'high';protocol.output_format='prompted JSON; no tools';protocol.image_resize=false;protocol.route_hash=hash(JSON.stringify({route:selected.pi,pricing:selected.pricing}));
 readPiSecret(selected.pi.secret_name);
}
if(selected.provider==='anthropic') {
 const guard=join(root,'.runtime/claude-subscription-only.json');
 if(!existsSync(guard))throw new Error('SUBSCRIPTION_BLOCKED: Claude extra paid usage OFF has not been confirmed');
 assertFreshClaudeProof(JSON.parse(readFileSync(guard,'utf8')),claudeAccountFingerprint());
}
const datasetHash=hash(readFileSync(join(root,paths.dataset)));
const sourcePaths=[...new Set(dataset.solver_groups.flatMap(g=>[g.pdf_path,g.transcript_path].filter(Boolean)))].sort();
const sourceHashes=Object.fromEntries(sourcePaths.map(p=>[p,hash(readFileSync(sourcePath(root,p)))]));
const sourceManifest=JSON.parse(readFileSync(join(root,paths.manifest),'utf8'));
for(const p of sourcePaths)if(sourceManifest.files.find(f=>f.path===p)?.sha256!==sourceHashes[p])throw new Error(`Source integrity check failed: ${p}`);
let state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{schema_version:2,prompt_version:2,run_id:`${year}-pre-exam-${selected.pi?'pi':selected.provider==='openai'?'codex':'claude'}-${selected.id}`,academic_year:year,phase:'pre_exam',started_at:new Date().toISOString(),protocol,dataset_hash:datasetHash,answers:{},errors:{},groups:{},iterations:[],usage:{},wall_time_seconds:0};
if(state.dataset_hash!==datasetHash)throw new Error('Resume refused: input changed. Preserve existing run and start a new run directory.');
const batchSize=requestedBatchSize??state.protocol.batch_max_questions;
if(batchSize!==undefined&&batchSize!==null) {
 if(!selected.pi)throw new Error('RECOVERY_BLOCKED: split recovery requires an authorized Pi API run');
 if(!state.protocol.batch_max_questions) {
  const attempts=Object.values(state.groups).flatMap(g=>g.attempts);
  if(state.blocked_reason||!state.finished_at||attempts.some(a=>a.status==='running')||!attempts.some(a=>/PI_TURN_FAILED|PI_ABORTED/.test(a.error||'')))throw new Error('RECOVERY_BLOCKED: finish the original run before one controlled execution-error recovery');
 }
 protocol.batch_max_questions=batchSize;protocol.recovery_policy='one_split_recovery_pass';
 applySplitRecovery(state,protocol);
 allowedGroups=splitSolverGroups(allowedGroups,batchSize);
}else if(JSON.stringify(state.protocol)!==JSON.stringify(protocol))throw new Error('Resume refused: protocol changed. Preserve existing run and start a new run directory.');
const save=()=>{state.updated_at=new Date().toISOString();writeFileSync(statePath+'.tmp',JSON.stringify(state,null,2)+'\n');execFileSync('mv',[statePath+'.tmp',statePath]);};
const renderDir=join(root,`.runtime/${year}-pages`);mkdirSync(renderDir,{recursive:true});
const eventsDir=join(root,'.runtime/events');mkdirSync(eventsDir,{recursive:true});
function render(pdf,pages) {
 return renderPages({root,renderDir,pdf,pages,sourceHashes});
}

const prompt=buildSolverPrompt(year,state.prompt_version??1);
const schema={type:'object',properties:{answers:{type:'array',items:{type:'object',properties:{question_id:{type:'string'},decision:{type:'string',enum:['answered','abstained']},answer:{type:['integer','null']},explanation:{type:'string'},abstain_reason:{type:['string','null'],enum:[null,'uncertain','unreadable','budget_exhausted','unsupported_input']}},required:['question_id','decision','answer','explanation','abstain_reason'],additionalProperties:false}}},required:['answers'],additionalProperties:false};
verifyResume(state,protocol,datasetHash,hash(prompt),sourceHashes);
state.prompt_hash=hash(prompt);state.source_hashes=sourceHashes;save();
if(state.blocked_reason){delete state.blocked_reason;save();} // Each resumed request re-verifies authentication/quota before input.
const sdk=selected.provider==='openai'?new Codex({env:subscriptionEnvironment(),codexPathOverride:join(root,'benchmark/codex-isolated.sh'),config:{features:{shell_tool:false,unified_exec:false,apps:false,plugins:false,multi_agent:false,browser_use:false,computer_use:false,code_mode:false},web_search:'disabled'}}):null;
const invocationController=new AbortController();
const stopInvocation=()=>{state.blocked_reason='RUN_INTERRUPTED: interrupted by process signal; resume explicitly';invocationController.abort(new Error(state.blocked_reason));};
process.once('SIGINT',stopInvocation);process.once('SIGTERM',stopInvocation);
async function solveGroup(group,iteration) {
 if(state.blocked_reason||invocationController.signal.aborted)return;
 const questions=dataset.questions.filter(q=>group.question_ids.includes(q.id)&&!state.answers[q.id]);
 if(!questions.length)return;
 if(estimateCost(state.usage,selected.pricing)>=protocol.cost_limit_usd)throw new Error('Estimated cost limit reached');
 if(selected.provider==='openai') {
  try{const proof=await codexSubscriptionStatus();state.billing={method:proof.method,api_key_used:false,purchased_credits_available:false,included_usage_verified:true,verified_at:proof.verified_at};save();}
  catch(error){state.blocked_reason=error.message;save();invocationController.abort(error);throw error;}
 }else if(selected.pi) {
  state.billing={method:'pi_api',api_key_used:true,subscription_only:false,user_authorized:true,api_model:selected.pi.model_id,api_endpoint:selected.pi.base_url,reference_cost_is_invoice:false};
  readPiSecret(selected.pi.secret_name);save();
 }else {
  try{assertFreshClaudeProof(JSON.parse(readFileSync(join(root,'.runtime/claude-subscription-only.json'),'utf8')),claudeAccountFingerprint());}
  catch(error){state.blocked_reason=error.message;save();invocationController.abort(error);throw error;}
  state.billing={method:'claude_subscription',api_key_used:false,extra_usage_disabled:true,verification:'live_UI_disabled_extra_usage_and_SDK_accountInfo'};
 }
 const images=render(group.pdf_path,group.pages);
 if(group.transcript_path){const info=execFileSync('pdfinfo',[sourcePath(root,group.transcript_path)],{encoding:'utf8'});const n=Number(info.match(/^Pages:\s+(\d+)/m)[1]);images.push(...render(group.transcript_path,Array.from({length:n},(_,i)=>i+1)));}
 const allowed=questions.map(({id,number,section,kind})=>({question_id:id,number,section,kind}));
 const input=[{type:'text',text:prompt+'\n요청 문항:\n'+JSON.stringify(allowed)},...images.map(path=>({type:'local_image',path}))];
 const thread=sdk?.startThread({model:protocol.model,modelReasoningEffort:protocol.effort,workingDirectory:mkdtempSync(join(tmpdir(),'ksat-solver-')),skipGitRepoCheck:true,sandboxMode:'read-only',approvalPolicy:'never',networkAccessEnabled:false,webSearchMode:'disabled'});
 const started=Date.now();const attempt={iteration,started_at:new Date().toISOString(),question_ids:questions.map(q=>q.id),image_encoding:'lossless WebP, original 200 DPI pixels',image_hashes:images.map(p=>hash(readFileSync(p))),usage:{},time_seconds:0,thread_id:null,status:'running'};
 const logPath=join(eventsDir,`${selected.id}-${group.id}-${iteration}-${Date.now()}.jsonl`);
 state.groups[group.id]??={attempts:[]};
 if(group.original_id)state.groups[group.id].original_group_id=group.original_id;state.groups[group.id].attempts.push(attempt);save();
 console.log(`[iteration ${iteration}] ${group.id}: ${questions.length} questions, ${images.length} images`);
 let final='';
 try {
  const signal=AbortSignal.any([AbortSignal.timeout(protocol.group_timeout_seconds*1000),invocationController.signal]);
  const events=thread?(await thread.runStreamed(input,{outputSchema:schema,signal})).events:selected.pi?piEvents({model:selected,prompt:input[0].text,images,schema,signal,apiKey:readPiSecret(selected.pi.secret_name)}):claudeEvents({model:selected.id,prompt:input[0].text,images,schema,signal});
  for await(const event of events) {
   appendFileSync(logPath,JSON.stringify(event)+'\n');
   if(event.type==='thread.started'){attempt.thread_id=event.thread_id;save();}
   if(event.type==='turn.completed'){attempt.usage=addUsage(attempt.usage,event.usage);state.usage=addUsage(state.usage,event.usage);if(Number.isFinite(event.estimated_cost_usd))attempt.estimated_cost_usd=event.estimated_cost_usd;save();}
   if(event.type==='item.completed'&&event.item.type==='agent_message')final=event.item.text;
   if(event.type==='item.started'&&['command_execution','mcp_tool_call','web_search','file_change'].includes(event.item.type))throw new Error('Tool execution violates locked protocol');
   const fatal=fatalStreamError(event);if(fatal)throw new Error(fatal);
  }
  const answers=validateAnswers(JSON.parse(final).answers,questions);
  state.answers=mergeSubmitted(state.answers,answers);
  for(const id of Object.keys(answers))delete state.errors[id];
  attempt.response=final;attempt.status='completed';
  for(const q of questions)if(!answers[q.id])state.errors[q.id]={status:'error',message:'Missing answer in structured response'};
  console.log(`${group.id}: submitted ${Object.keys(answers).length}, abstained ${Object.values(answers).filter(a=>a.decision==='abstained').length}`);
 } catch(error) {
  attempt.status='error';attempt.error=String(error.message);
  for(const q of questions)state.errors[q.id]={status:'error',message:attempt.error};
  if(repeatedInspectionBlock(state.groups[group.id].attempts)) {
   const scope=inspectionScope(attempt.error)||'unspecified';
   state.groups[group.id].retry_stopped={reason:'provider_content_inspection',scope,recorded_at:new Date().toISOString()};
   for(const q of questions)state.errors[q.id].detail=`제공자 ${scope==='output'?'출력':scope==='input'?'입력':'콘텐츠'} 검사 차단 반복으로 재시도 종료. 모델 기권과 구분한 실행 오류입니다.`;
  }
  console.log(`${group.id}: execution error: ${attempt.error.slice(0,200)}`);
  if(/^(SUBSCRIPTION_BLOCKED|PI_BLOCKED|MODEL_MISMATCH|TOOL_BLOCKED)/.test(attempt.error)){state.blocked_reason=attempt.error;invocationController.abort(error);}
 } finally {attempt.time_seconds=(Date.now()-started)/1000;attempt.finished_at=new Date().toISOString();save();}
}
const invocationStart=Date.now(),baseWall=state.wall_time_seconds;
const heartbeat=setInterval(()=>{state.wall_time_seconds=elapsedWall(baseWall,invocationStart,Date.now());save();},10000);
try {
 for(let i=1;i<=(once?1:protocol.max_iterations);i++) {
  if(state.blocked_reason)break;
  const pending=allowedGroups.filter(g=>g.question_ids.some(id=>!state.answers[id])&&attemptsRemaining(state.groups[g.id]?.attempts,protocol.max_iterations)>0&&!repeatedInspectionBlock(state.groups[g.id]?.attempts)&&(!g.original_id||!repeatedInspectionBlock(state.groups[g.original_id]?.attempts)));
  if(!pending.length)break;
  state.iterations.push({iteration:i,started_at:new Date().toISOString(),pending_groups:pending.map(g=>g.id)});save();
  await runBatches(pending,protocol.concurrency,invocationController,()=>Boolean(state.blocked_reason),g=>solveGroup(g,i));
 }
} finally {
 process.removeListener('SIGINT',stopInvocation);process.removeListener('SIGTERM',stopInvocation);
 clearInterval(heartbeat);state.wall_time_seconds=elapsedWall(baseWall,invocationStart,Date.now());
 state.completed=dataset.questions.every(q=>state.answers[q.id]);state.finished_at=new Date().toISOString();save();
 console.log(`RALPH ${state.completed?'COMPLETE':'INCOMPLETE'} ${selected.id}: ${Object.keys(state.answers).length}/${dataset.questions.length}, API-equivalent $${estimateCost(state.usage,selected.pricing).toFixed(4)}`);
}
if(!state.completed&&!allowedGroups.every(g=>g.question_ids.every(id=>state.answers[id])))process.exitCode=1;
