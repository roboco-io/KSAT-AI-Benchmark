// Explicit, subscription-only post-exam discussion. Never invoked by tests or CI.
import {Codex} from '@openai/codex-sdk';
import {readFileSync,writeFileSync,mkdirSync,existsSync,mkdtempSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import {claudeEvents} from './claude-adapter.mjs';
import {codexSubscriptionStatus,subscriptionEnvironment,assertFreshClaudeProof,claudeAccountFingerprint} from './subscription.mjs';
import {modelById} from './models.mjs';
import {estimateCost} from './core.mjs';

const root=resolve(import.meta.dirname,'..');
const path=join(root,'web/public/data/english-q37-debate.json');
const imagePath=join(root,'.runtime/2026-pages/788830081b-7.webp');
const digest=data=>createHash('sha256').update(data).digest('hex');
const models=['claude-fable-5-1','gpt-6-astra'];
const protocol={question_id:'2026-english-english-q37',models,rounds:3,effort:'high',agents:{'claude-fable-5-1':'Claude Agent SDK 0.3.296','gpt-6-astra':'Codex SDK 0.162.1'},input:'Original exam page 7, lossless 200 DPI WebP',image_sha256:digest(readFileSync(imagePath)),tools:'disabled',external_search:false,initial_official_answer_disclosed:false,initial_previous_answers_disclosed:false,context:'Fresh isolated session each turn; prior debate statements supplied verbatim from round 2',timeout_seconds:600,reference_cost_limit_usd_per_model:25,automatic_retries:0};
const instructions='이것은 수능 재시험이나 채점 수정이 아니라, 영어 37번 글 순서 문항의 사후 공개 토론입니다. 원본 이미지에서 37번만 분석하세요. 모든 선택지를 고려하되 특히 ④(C-A-B)와 ⑤(C-B-A)를 비교하세요. 공식 정답, 출제자 의도, 원문 출처, 본인의 과거 답안을 추측해 근거로 삼지 마세요. 검색·파일·도구를 사용하지 마세요. 상대를 설득하기 위해 특정 답을 맡아 옹호하지 말고 증거에 따라 판단을 바꾸세요. 자연스러운 배열과 가장 적절한 배열, 그리고 단일정답을 확정할 충분한 근거가 있는지는 서로 구분하세요. 확신 수치는 검증된 확률이 아닌 자기평가입니다. JSON의 answers 배열에 항목 하나를 제출하세요. statement는 독자가 이해할 수 있는 한국어 공개 논증 800~1200자, evidence는 본문의 짧은 표현과 문장 연결 근거 3~5개, counterargument는 자신의 판단에 대한 가장 강한 반론과 그 답변, change는 이전 단계 대비 판단 변화입니다. 숨은 내부 추론을 출력하지 마세요.';
const schema={type:'object',properties:{answers:{type:'array',items:{type:'object',properties:{preferred_answer:{type:['integer','null'],enum:[4,5,null]},verdict:{type:'string',enum:['single_4','single_5','both_plausible','undetermined']},statement:{type:'string'},evidence:{type:'array',items:{type:'string'}},counterargument:{type:'string'},change:{type:'string'},confidence:{type:'integer',minimum:0,maximum:100}},required:['preferred_answer','verdict','statement','evidence','counterargument','change','confidence'],additionalProperties:false}}},required:['answers'],additionalProperties:false};
const state=existsSync(path)?JSON.parse(readFileSync(path,'utf8')):{schema_version:1,question_id:protocol.question_id,started_at:new Date().toISOString(),protocol,rounds:[],completed:false};
if(JSON.stringify(state.protocol)!==JSON.stringify(protocol))throw new Error('Preserve existing debate: protocol differs');
const save=()=>{mkdirSync(join(root,'web/public/data'),{recursive:true});writeFileSync(path,JSON.stringify(state,null,2)+'\n');};
const sdk=new Codex({env:subscriptionEnvironment(),codexPathOverride:join(root,'benchmark/codex-isolated.sh'),config:{features:{shell_tool:false,unified_exec:false,apps:false,plugins:false,multi_agent:false,browser_use:false,computer_use:false,code_mode:false},web_search:'disabled'}});

async function discuss(modelId,prompt,round) {
 const existing=round.participants.find(p=>p.model===modelId);
 if(existing?.status==='completed')return;
 if(existing)throw new Error('Preserve failed attempt; no automatic retry');
 const model=modelById(modelId);
 const prior=state.rounds.flatMap(r=>r.participants).filter(p=>p.model===modelId);
 if(prior.reduce((s,p)=>s+(p.estimated_cost_usd||0),0)>=25)throw new Error('Reference cost guard reached');
 const entry={model:modelId,agent:protocol.agents[modelId],status:'running',started_at:new Date().toISOString(),prompt_sha256:digest(prompt)};
 round.participants.push(entry);save();console.log(`Round ${round.number}: ${modelId} started`);
 try {
  if(modelId.startsWith('claude-'))assertFreshClaudeProof(JSON.parse(readFileSync(join(root,'.runtime/claude-subscription-only.json'),'utf8')),claudeAccountFingerprint());
  else await codexSubscriptionStatus();
  const signal=AbortSignal.timeout(600000);
  const events=modelId.startsWith('claude-')?claudeEvents({model:modelId,prompt,images:[imagePath],schema,signal}):(await sdk.startThread({model:modelId,modelReasoningEffort:'high',workingDirectory:mkdtempSync(join(tmpdir(),'ksat-debate-')),skipGitRepoCheck:true,sandboxMode:'read-only',approvalPolicy:'never',networkAccessEnabled:false,webSearchMode:'disabled'}).runStreamed([{type:'text',text:prompt},{type:'local_image',path:imagePath}],{outputSchema:schema,signal})).events;
  let output='';
  for await(const event of events) {
   if(event.type==='item.started'&&['command_execution','mcp_tool_call','web_search','file_change'].includes(event.item.type))throw new Error('External tool violates debate protocol');
   if(event.type==='turn.failed'||event.type==='error')throw new Error('Agent turn failed');
   if(event.type==='item.completed'&&event.item.type==='agent_message')output=event.item.text;
   if(event.type==='turn.completed'){entry.usage=event.usage;entry.estimated_cost_usd=event.estimated_cost_usd??estimateCost(event.usage,model.pricing);}
  }
  const parsed=JSON.parse(output);
  if(parsed.answers?.length!==1||!entry.usage||!['single_4','single_5','both_plausible','undetermined'].includes(parsed.answers[0].verdict))throw new Error('Incomplete structured debate response');
  entry.response=parsed.answers[0];entry.response_text=output;entry.status='completed';
  entry.finished_at=new Date().toISOString();entry.elapsed_seconds=(Date.parse(entry.finished_at)-Date.parse(entry.started_at))/1000;
  save();console.log(`Round ${round.number}: ${modelId} completed; ${entry.response.verdict}, preferred ${entry.response.preferred_answer}`);
 } catch(error) {entry.status='error';entry.error=/^(SUBSCRIPTION_BLOCKED|CLAUDE_|MODEL_MISMATCH|TOOL_BLOCKED)/.test(error.message)?error.message:'Debate execution failed; inspect private runtime diagnostics';save();throw error;}
}

for(let number=1;number<=3;number++) {
 const stage=['독립 판단','상호 반박','최종 판단'][number-1];
 let round=state.rounds.find(r=>r.number===number);
 if(!round){
  const previous=state.rounds.map(r=>({round:r.number,participants:r.participants.map(p=>({model:p.model,response:p.response}))}));
  const task=number===1?'상대 답안을 보지 않은 독립 판단을 제출하세요.':number===2?'아래 실제 발언을 읽고 상대의 가장 강한 논거를 정확히 요약한 뒤 반박하거나 수용하세요. 서로 같은 답을 선호하더라도 그 합의의 취약점을 검토하세요.':'아래 독립 판단과 반박을 읽고 최종 판단을 제출하세요. 선호 답 하나와 단일정답 확정 가능성은 별도로 판정하세요. 합의를 강요하지 마세요. 남는 불확실성과 결론을 바꿀 수 있는 증거를 명시하세요.';
  round={number,stage,prompt:instructions+'\n\n'+task+(previous.length?'\n\n이전 단계 발언 원문:\n'+JSON.stringify(previous):''),participants:[]};state.rounds.push(round);save();
 }
 const results=await Promise.allSettled(models.map(model=>discuss(model,round.prompt,round)));
 if(results.some(r=>r.status==='rejected')){console.log('Debate stopped; recorded successful statements preserved');process.exitCode=1;break;}
}
if(state.rounds.length===3&&state.rounds.every(r=>r.participants.length===2&&r.participants.every(p=>p.status==='completed'))){
 state.completed=true;state.finished_at??=new Date().toISOString();
 // Context is added only after the final statements, never to the debate prompts.
 state.context_added_after_debate={official_answer:5,previous_exam_answers:models.map(modelId=>{
  const model=modelById(modelId);const run=JSON.parse(readFileSync(join(root,model.directory,'run.json'),'utf8'));
  return {model:modelId,answer:run.answers[protocol.question_id].answer,explanation:run.answers[protocol.question_id].explanation,source:model.directory+'/run.json'};
 })};
 save();console.log('Debate complete: '+path);
}
