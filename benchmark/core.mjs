export const PRICING={input_per_million:2,cached_input_per_million:0.1,cache_write_per_million:2.5,output_per_million:10,currency:'USD',as_of:'2026-10-12',basis:'API-equivalent estimate; ChatGPT subscription actual billing differs'};
export function estimateCost(u={},pricing=PRICING) {
 const total=u.input_tokens||0,cached=u.cached_input_tokens||0,written=u.cache_write_input_tokens||0;
 return Number(((Math.max(0,total-cached-written)*pricing.input_per_million+cached*pricing.cached_input_per_million+written*pricing.cache_write_per_million+(u.output_tokens||0)*pricing.output_per_million)/1e6).toFixed(8));
}
export function addUsage(a={},b={}) {
 return Object.fromEntries(['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens','reasoning_output_tokens'].map(k=>[k,(a[k]||0)+(b[k]||0)]));
}
export function validateAnswers(items,questions) {
 if(!Array.isArray(items))throw new Error('answers must be an array');
 const allowed=new Map(questions.map(q=>[q.id,q])); const result={};
 for(const item of items) {
  const q=allowed.get(item.question_id);
  if(!q||result[item.question_id])throw new Error(`Unknown or duplicate question: ${item.question_id}`);
  if(typeof item.explanation!=='string')throw new Error('Explanation must be text');
  if(item.decision==='answered') {
   const limit=q.kind==='multiple_choice'?[1,5]:[0,999];
   if(!Number.isInteger(item.answer)||item.answer<limit[0]||item.answer>limit[1]||item.abstain_reason!==null)throw new Error(`Invalid answer: ${q.id}`);
  } else if(item.decision==='abstained') {
   if(item.answer!==null||!['uncertain','unreadable','budget_exhausted','unsupported_input'].includes(item.abstain_reason))throw new Error(`Invalid abstention: ${q.id}`);
  } else throw new Error(`Invalid decision: ${q.id}`);
  result[q.id]=item;
 }
 return result;
}
export function mergeSubmitted(existing,incoming) {return {...incoming,...existing};}
export function attemptsRemaining(attempts=[],limit=3,userRetry=null) {return Math.max(0,limit-(userRetry===null?attempts:attempts.filter(a=>a.user_retry===userRetry)).length);}
// A user-authorized retry reopens one finished Pi or agy group for up to `limit` new attempts; it is recorded in state.user_retries.
export function openUserRetry(state,group,{note,at=new Date().toISOString(),batchSize}={}) {
 if(!state.finished_at||!state.protocol||!['Pi','Antigravity CLI'].includes(state.protocol.agent))throw new Error('RETRY_BLOCKED: only a finished Pi or agy run can be retried with user authorization');
 if(!group||typeof note!=='string'||!note.trim())throw new Error('RETRY_BLOCKED: a solver group and the user authorization note are required');
 const retries=state.user_retries??[];
 const record={index:retries.length+1,group,authorized_at:at,note,answers_before:Object.keys(state.answers??{}).length,finalization_before:state.finalization??null,...(batchSize?{batch_max_questions:batchSize}:{})};
 state.user_retries=[...retries,record];delete state.finalization;
 return record.index;
}
export async function runBatches(groups,concurrency,controller,shouldStop,solve) {
 for(let offset=0;offset<groups.length;offset+=concurrency) {
  if(controller.signal.aborted||shouldStop())break;
  const settled=await Promise.allSettled(groups.slice(offset,offset+concurrency).map(async group=>{
   if(controller.signal.aborted||shouldStop())return;
   try{await solve(group,controller.signal);}catch(error){controller.abort(error);throw error;}
  }));
  const failure=settled.find(result=>result.status==='rejected');
  if(failure)throw failure.reason;
 }
}
export function elapsedWall(base,started,now) {return base+Math.max(0,now-started)/1000;}
export function verifyResume(state,protocol,datasetHash,promptHash,sourceHashes) {
 if(state.dataset_hash!==datasetHash||JSON.stringify(state.protocol)!==JSON.stringify(protocol))throw new Error('Resume refused: dataset or protocol changed');
 if(state.prompt_hash&&state.prompt_hash!==promptHash)throw new Error('Resume refused: prompt changed');
 if(state.source_hashes&&JSON.stringify(state.source_hashes)!==JSON.stringify(sourceHashes))throw new Error('Resume refused: source files changed');
}
export function fatalStreamError(event) {
 if(event.type==='turn.failed')return event.error?.message||'Codex turn failed';
 if(event.type==='error'&&!/^Reconnecting\.\.\./.test(event.message||''))return event.message||'Codex stream failed';
 return null;
}
export function outcome(q,answers,errors) {
 const a=answers[q.id];
 if(a?.decision==='abstained')return 'abstained';
 if(a?.decision==='answered')return a.answer===q.correct_answer?'correct':'incorrect';
 if(errors[q.id]?.unsolved===true)return 'unsolved';
 return errors[q.id]?'error':'pending';
}
export function summarize(questions,answers,errors,usage,wall,solver,pricing=PRICING) {
 const counts={correct:0,incorrect:0,abstained:0,errors:0,pending:0,unsolved:0};let score=0;
 for(const q of questions){const s=outcome(q,answers,errors);counts[s==='error'?'errors':s]++;if(s==='correct')score+=q.points;}
 const attempts=counts.correct+counts.incorrect+counts.unsolved,total=questions.length;
 return {total_questions:total,...counts,score,max_score:questions.reduce((s,q)=>s+q.points,0),accuracy:total?counts.correct/total*100:0,abstention_rate:total?counts.abstained/total*100:0,attempt_accuracy:attempts?counts.correct/attempts*100:null,wall_time_seconds:wall,solver_time_seconds:solver,usage:addUsage({},usage),estimated_cost_usd:estimateCost(usage,pricing)};
}
// Spaces request starts for providers with a per-second request limit; concurrent callers queue in call order.
export function createPacer(intervalMs,now=Date.now,sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))) {
 let next=0;
 return async()=>{
  if(!intervalMs)return 0;
  const current=now(),at=Math.max(current,next);
  next=at+intervalMs;
  if(at>current)await sleep(at-current);
  return at-current;
 };
}
