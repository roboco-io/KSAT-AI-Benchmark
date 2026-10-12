import {isDeepStrictEqual} from 'node:util';

const POLICY='one_split_recovery_pass';
const CAUSE='output_limit_or_timeout_split_recovery';
const blocked=message=>new Error(`RECOVERY_BLOCKED: ${message}`);
const validSize=size=>Number.isSafeInteger(size)&&size>=1&&size<=6;

export function splitSolverGroups(groups,size) {
 if (!Array.isArray(groups)||!validSize(size)) throw blocked('batch size must be an integer from one to six');
 const ids=new Set();const questions=new Set();const splits=[];
 for (const group of groups) {
  if (!group || typeof group.id!=='string' || !group.id || ids.has(group.id) || !Array.isArray(group.question_ids) || !Array.isArray(group.pages)) throw blocked('invalid or duplicate original solver group');
  ids.add(group.id);
  for (const id of group.question_ids) {
   if (typeof id!=='string' || !id || questions.has(id)) throw blocked('question IDs must be unique across original groups');
   questions.add(id);
  }
  // Split full original IDs before filtering submitted answers, so resume never
  // shifts a chunk's identity or resets its attempt count.
  for (let offset=0;offset<group.question_ids.length;offset+=size) {
   const split=structuredClone(group);
   split.id=`${group.id}--split-${offset/size+1}`;
   split.original_id=group.id;
   split.question_ids=group.question_ids.slice(offset,offset+size);
   splits.push(split);
  }
 }
 return splits;
}

function withoutRecovery(protocol) {
 const {batch_max_questions,recovery_policy,...base}=protocol;
 return base;
}

function freezeDeep(value) {
 if (value && typeof value==='object') {
  for (const child of Object.values(value)) freezeDeep(child);
  Object.freeze(value);
 }
 return value;
}

export function applySplitRecovery(state,nextProtocol,changedAt=new Date().toISOString()) {
 const current=state?.protocol;
 if (!current || !nextProtocol || typeof nextProtocol!=='object' || Array.isArray(nextProtocol) || current.agent!=='Pi' || current.subscription_only!==false) throw blocked('split recovery applies only to authorized Pi API runs');
 if (!validSize(nextProtocol.batch_max_questions) || nextProtocol.recovery_policy!==POLICY) throw blocked('one controlled split recovery policy is required');
 if (!isDeepStrictEqual(withoutRecovery(current),withoutRecovery(nextProtocol))) throw blocked('only batch size and recovery policy may change');
 if (!Number.isSafeInteger(nextProtocol.max_iterations) || nextProtocol.max_iterations<1 || nextProtocol.max_iterations>3 || !Number.isFinite(nextProtocol.cost_limit_usd) || nextProtocol.cost_limit_usd<=0 || nextProtocol.cost_limit_usd>25) throw blocked('recovery must retain at most three attempts and the global reference cost cap');
 const history=state.protocol_history??[];
 if (!Array.isArray(history)) throw blocked('invalid protocol history');
 const records=history.filter(record=>record?.cause===CAUSE);
 const alreadySplit=Object.hasOwn(current,'batch_max_questions')||Object.hasOwn(current,'recovery_policy');
 if (alreadySplit) {
  if (records.length!==1 || !isDeepStrictEqual(current,nextProtocol) || !isDeepStrictEqual(withoutRecovery(records[0].protocol),withoutRecovery(current))) throw blocked('a second or differently sized recovery phase is forbidden');
  for (const record of records) freezeDeep(record);
  return state;
 }
 if (records.length) throw blocked('split recovery was already used');
 const time=new Date(changedAt);
 if (!Number.isFinite(time.getTime())) throw blocked('invalid recovery timestamp');
 const archived=freezeDeep({protocol:structuredClone(current),changed_at:time.toISOString(),answer_count:Object.keys(state.answers??{}).length,cause:CAUSE});
 const next=structuredClone(nextProtocol);
 state.protocol_history=[...history,archived];
 state.protocol=next;
 return state;
}

// Call only after the parent has terminated the corresponding process group.
// Missing final usage is explicitly unknown; no token count is fabricated.
export function markInterruptedAttempts(state,stoppedAt) {
 const stop=new Date(stoppedAt).getTime();
 if (!Number.isFinite(stop)) throw blocked('invalid interruption timestamp');
 const running=Object.values(state.groups??{}).flatMap(group=>group.attempts??[]).filter(attempt=>attempt.status==='running');
 const prepared=running.map(attempt=>{
  const start=new Date(attempt.started_at??attempt.startedAt).getTime();
  if (!Number.isFinite(start)) throw blocked('running attempt has invalid start timestamp');
  const usage=attempt.usage;
  const known=usage && [usage.input_tokens,usage.output_tokens].every(n=>Number.isFinite(n)&&n>=0);
  return {attempt,time_seconds:Math.max(0,stop-start)/1000,known:Boolean(known)};
 });
 for (const {attempt,time_seconds,known} of prepared) {
  attempt.status='interrupted';
  attempt.time_seconds=time_seconds;
  attempt.finished_at=new Date(stop).toISOString();
  attempt.api_usage_unknown=!known;
  attempt.error=known?'Interrupted after process termination':'Interrupted after process termination; API usage unknown (no final usage received)';
 }
 return prepared.length;
}
