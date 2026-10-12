import {Codex} from '@openai/codex-sdk';
import {readFileSync,writeFileSync,mkdirSync,existsSync,mkdtempSync,appendFileSync} from 'node:fs';
import {resolve,join,basename} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateAnswers,mergeSubmitted,addUsage,estimateCost,fatalStreamError,attemptsRemaining,elapsedWall,verifyResume} from './core.mjs';

const root=resolve(import.meta.dirname,'..');
const dataset=JSON.parse(readFileSync(join(root,'exams/datasets/2026-ksat.json'),'utf8'));
const hash=s=>createHash('sha256').update(s).digest('hex');
const runDir=join(root,'results/codex-2026');mkdirSync(runDir,{recursive:true});
const statePath=join(runDir,'run.json');
const protocol={model:'gpt-6.1-sol',effort:'high',sdk_version:'0.162.1',tools:'disabled',input:'original PDF rendered at 200 DPI',english_listening:'official transcript rendered as images',max_iterations:3,group_timeout_seconds:900,concurrency:2,cost_limit_usd:25};
const datasetHash=hash(readFileSync(join(root,'exams/datasets/2026-ksat.json')));
const sourcePaths=[...new Set(dataset.solver_groups.flatMap(g=>[g.pdf_path,g.transcript_path].filter(Boolean)))].sort();
const sourceHashes=Object.fromEntries(sourcePaths.map(p=>[p,hash(readFileSync(join(root,p)))]));
const sourceManifest=JSON.parse(readFileSync(join(root,'exams/pdf/2026/sources.json'),'utf8'));
for(const p of sourcePaths)if(sourceManifest.files.find(f=>f.path===p)?.sha256!==sourceHashes[p])throw new Error(`Source integrity check failed: ${p}`);
let state=existsSync(statePath)?JSON.parse(readFileSync(statePath,'utf8')):{schema_version:2,run_id:'2026-pre-exam-codex-gpt-6.1-sol',academic_year:2026,phase:'pre_exam',started_at:new Date().toISOString(),protocol,dataset_hash:datasetHash,answers:{},errors:{},groups:{},iterations:[],usage:{},wall_time_seconds:0};
if(state.dataset_hash!==datasetHash||JSON.stringify(state.protocol)!==JSON.stringify(protocol))throw new Error('Resume refused: input or protocol changed. Preserve existing run and start a new run directory.');
const save=()=>{state.updated_at=new Date().toISOString();writeFileSync(statePath+'.tmp',JSON.stringify(state,null,2)+'\n');execFileSync('mv',[statePath+'.tmp',statePath]);};
const renderDir=join(root,'.runtime/2026-pages');mkdirSync(renderDir,{recursive:true});
const eventsDir=join(root,'.runtime/events');mkdirSync(eventsDir,{recursive:true});
function render(pdf,pages) {
 return pages.map(page=>{
  const prefix=join(renderDir,`${sourceHashes[pdf].slice(0,10)}-${page}`);
  if(!existsSync(prefix+'.png'))execFileSync('pdftoppm',['-f',String(page),'-l',String(page),'-r','200','-singlefile','-png',join(root,pdf),prefix],{stdio:'ignore'});
  const webp=prefix+'.webp';
  if(!existsSync(webp))execFileSync('cwebp',['-lossless','-z','6',prefix+'.png','-o',webp],{stdio:'ignore'});
  return webp;
 });
}
const prompt=`당신은 2026학년도 수능 문제를 푸는 AI입니다. 제공한 원본 이미지와 요청한 문항 정보만 사용하세요. 검색, 파일 읽기, 정답표, 다른 모델, 도구는 사용하지 마세요.
문제를 직접 풀고 최종 답과 짧은 한국어 설명을 제출하세요. 잘 모르거나 입력을 읽을 수 없으면 억지로 추측하지 않고 기권할 수 있습니다. 기권은 decision=abstained, answer=null로 제출하세요. 기권 사유는 uncertain, unreadable, budget_exhausted, unsupported_input 중 하나입니다.
객관식은 선택지 번호 1~5, 단답형은 정수 0~999를 answer에 넣으세요. answered이면 abstain_reason=null입니다. 이전에 제출한 답안은 변경하지 않습니다. 요청된 모든 문항에 대해 답 또는 기권을 제출하세요. 주어진 문제지에는 다른 선택과목이 있을 수 있으므로 요청한 section과 번호만 풀이하세요. 영어 듣기는 공식 대본 이미지가 추가로 제공되며 대본으로 풀이합니다.
각 explanation은 핵심 근거를 1~3문장으로 적으세요. 내부 추론을 길게 출력할 필요가 없습니다. 답안 JSON 외의 출력은 하지 마세요.`;
const schema={type:'object',properties:{answers:{type:'array',items:{type:'object',properties:{question_id:{type:'string'},decision:{type:'string',enum:['answered','abstained']},answer:{type:['integer','null']},explanation:{type:'string'},abstain_reason:{type:['string','null'],enum:[null,'uncertain','unreadable','budget_exhausted','unsupported_input']}},required:['question_id','decision','answer','explanation','abstain_reason'],additionalProperties:false}}},required:['answers'],additionalProperties:false};
verifyResume(state,protocol,datasetHash,hash(prompt),sourceHashes);
state.prompt_hash=hash(prompt);state.source_hashes=sourceHashes;save();
const sdk=new Codex({codexPathOverride:join(root,'benchmark/codex-isolated.sh'),config:{features:{shell_tool:false,unified_exec:false,apps:false,plugins:false,multi_agent:false,browser_use:false,computer_use:false,code_mode:false},web_search:'disabled'}});
async function solveGroup(group,iteration) {
 const questions=dataset.questions.filter(q=>group.question_ids.includes(q.id)&&!state.answers[q.id]);
 if(!questions.length)return;
 if(estimateCost(state.usage)>=protocol.cost_limit_usd)throw new Error('Estimated cost limit reached');
 const images=render(group.pdf_path,group.pages);
 if(group.transcript_path){const info=execFileSync('pdfinfo',[join(root,group.transcript_path)],{encoding:'utf8'});const n=Number(info.match(/^Pages:\s+(\d+)/m)[1]);images.push(...render(group.transcript_path,Array.from({length:n},(_,i)=>i+1)));}
 const allowed=questions.map(({id,number,section,kind})=>({question_id:id,number,section,kind}));
 const input=[{type:'text',text:prompt+'\n요청 문항:\n'+JSON.stringify(allowed)},...images.map(path=>({type:'local_image',path}))];
 const thread=sdk.startThread({model:protocol.model,modelReasoningEffort:protocol.effort,workingDirectory:mkdtempSync(join(tmpdir(),'ksat-solver-')),skipGitRepoCheck:true,sandboxMode:'read-only',approvalPolicy:'never',networkAccessEnabled:false,webSearchMode:'disabled'});
 const started=Date.now();const attempt={iteration,started_at:new Date().toISOString(),question_ids:questions.map(q=>q.id),image_encoding:'lossless WebP, original 200 DPI pixels',image_hashes:images.map(p=>hash(readFileSync(p))),usage:{},time_seconds:0,thread_id:null,status:'running'};
 const logPath=join(eventsDir,`${group.id}-${iteration}-${Date.now()}.jsonl`);
 state.groups[group.id]??={attempts:[]};state.groups[group.id].attempts.push(attempt);save();
 console.log(`[iteration ${iteration}] ${group.id}: ${questions.length} questions, ${images.length} images`);
 let final='';
 try {
  const {events}=await thread.runStreamed(input,{outputSchema:schema,signal:AbortSignal.timeout(protocol.group_timeout_seconds*1000)});
  for await(const event of events) {
   appendFileSync(logPath,JSON.stringify(event)+'\n');
   if(event.type==='thread.started'){attempt.thread_id=event.thread_id;save();}
   if(event.type==='turn.completed'){attempt.usage=addUsage(attempt.usage,event.usage);state.usage=addUsage(state.usage,event.usage);save();}
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
  console.log(`${group.id}: execution error: ${attempt.error.slice(0,200)}`);
 } finally {attempt.time_seconds=(Date.now()-started)/1000;attempt.finished_at=new Date().toISOString();save();}
}
const invocationStart=Date.now(),baseWall=state.wall_time_seconds;
const heartbeat=setInterval(()=>{state.wall_time_seconds=elapsedWall(baseWall,invocationStart,Date.now());save();},10000);
try {
 for(let i=1;i<=protocol.max_iterations;i++) {
  const pending=dataset.solver_groups.filter(g=>g.question_ids.some(id=>!state.answers[id])&&attemptsRemaining(state.groups[g.id]?.attempts,protocol.max_iterations)>0);
  if(!pending.length)break;
  state.iterations.push({iteration:i,started_at:new Date().toISOString(),pending_groups:pending.map(g=>g.id)});save();
  for(let j=0;j<pending.length;j+=protocol.concurrency)await Promise.all(pending.slice(j,j+protocol.concurrency).map(g=>solveGroup(g,i)));
 }
} finally {
 clearInterval(heartbeat);state.wall_time_seconds=elapsedWall(baseWall,invocationStart,Date.now());
 state.completed=dataset.questions.every(q=>state.answers[q.id]);state.finished_at=new Date().toISOString();save();
 console.log(`RALPH ${state.completed?'COMPLETE':'INCOMPLETE'}: ${Object.keys(state.answers).length}/${dataset.questions.length}, API-equivalent $${estimateCost(state.usage).toFixed(4)}`);
}
if(!state.completed)process.exitCode=1;
