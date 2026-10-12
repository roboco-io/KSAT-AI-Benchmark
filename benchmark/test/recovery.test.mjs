import test from 'node:test';
import assert from 'node:assert/strict';
import {splitSolverGroups,applySplitRecovery,markInterruptedAttempts} from '../recovery.mjs';

const protocol={model:'deepseek-v4.1-flash',provider:'deepseek',agent:'Pi',sdk_version:'Pi CLI 0.87.1',effort:'high',tools:'disabled',input:'original PDF rendered at 200 DPI',max_iterations:3,group_timeout_seconds:900,cost_limit_usd:25,subscription_only:false,max_output_tokens:65536,route:{model:'native-model'}};
const next={...protocol,batch_max_questions:6,recovery_policy:'one_split_recovery_pass'};
const when='2026-10-12T12:00:00.000Z';
const group={id:'math-common',subject:'math',section:'common',question_ids:Array.from({length:13},(_,i)=>`q${i+1}`),pdf_path:'math.pdf',pages:[1,2,3,4,5,6,7,8]};

function initial() {
 return {protocol:structuredClone(protocol),answers:{q1:{answer:2}},errors:{q2:{message:'output limit'}},usage:{output_tokens:65536},groups:{'math-common':{attempts:[{status:'error',usage:{output_tokens:65536}}]}},iterations:[{iteration:1}]};
}

test('stable six-question splits preserve every original source page and do not mutate groups',()=>{
 const before=structuredClone(group);
 const splits=splitSolverGroups([group],6);
 assert.deepEqual(splits.map(g=>[g.id,g.original_id,g.question_ids.length]),[['math-common--split-1','math-common',6],['math-common--split-2','math-common',6],['math-common--split-3','math-common',1]]);
 assert.deepEqual(splits.flatMap(g=>g.question_ids),group.question_ids);
 for(const split of splits) assert.deepEqual(split.pages,[1,2,3,4,5,6,7,8]);
 splits[0].pages.push(9);
 assert.deepEqual(group,before);
 assert.deepEqual(splitSolverGroups([{...group,question_ids:[]}],6),[]);
});

test('invalid batch sizes and duplicate questions cannot create fresh retry groups',()=>{
 for(const size of [0,7,1.5,NaN]) assert.throws(()=>splitSolverGroups([group],size),/RECOVERY_BLOCKED/);
 assert.throws(()=>splitSolverGroups([{...group,question_ids:['q1','q1']}],6),/RECOVERY_BLOCKED/);
});

test('one recovery archives immutable protocol and preserves locked answers and accounting',()=>{
 const state=initial();
 const prior=structuredClone(state);
 applySplitRecovery(state,next,when);
 assert.deepEqual(state.protocol,next);
 assert.deepEqual(state.protocol_history,[{protocol:prior.protocol,changed_at:when,answer_count:1,cause:'output_limit_or_timeout_split_recovery'}]);
 for(const key of ['answers','errors','usage','groups','iterations']) assert.deepEqual(state[key],prior[key]);
 state.protocol.route.model='changed outside recovery';
 assert.equal(state.protocol_history[0].protocol.route.model,'native-model');
 assert.throws(()=>{state.protocol_history[0].protocol.route.model='tampered';},TypeError);
});

test('same recovery resume is idempotent and a second differently sized phase is forbidden',()=>{
 const state=initial();applySplitRecovery(state,next,when);
 const prior=structuredClone(state);
 applySplitRecovery(state,next,'2026-10-12T13:00:00.000Z');
 assert.deepEqual(state,prior);
 assert.throws(()=>applySplitRecovery(state,{...next,batch_max_questions:3},when),/RECOVERY_BLOCKED/);
 assert.deepEqual(state,prior);
});

test('recovery cannot raise limits, change sources or route, or affect subscription agents',()=>{
 for(const change of [{effort:'max'},{max_output_tokens:131072},{group_timeout_seconds:1800},{cost_limit_usd:30},{max_iterations:4},{tools:'enabled'},{route:{model:'fallback'}}]) {
  const state=initial();const prior=structuredClone(state);
  assert.throws(()=>applySplitRecovery(state,{...next,...change},when),/RECOVERY_BLOCKED/);
  assert.deepEqual(state,prior);
 }
 const state=initial();state.protocol.agent='Codex';state.protocol.subscription_only=true;
 assert.throws(()=>applySplitRecovery(state,{...state.protocol,batch_max_questions:6,recovery_policy:'one_split_recovery_pass'},when),/RECOVERY_BLOCKED/);
});

test('interrupted attempts retain known usage and identify unreported API usage',()=>{
 const state={answers:{q1:{answer:2}},usage:{output_tokens:10},groups:{a:{attempts:[{status:'running',started_at:'2026-10-12T11:59:30.000Z',usage:{}},{status:'running',started_at:'2026-10-12T11:59:40.000Z',usage:{input_tokens:0,output_tokens:10}},{status:'completed',started_at:'bad',time_seconds:4}]}}};
 const completed=structuredClone(state.groups.a.attempts[2]);
 assert.equal(markInterruptedAttempts(state,when),2);
 const [unknown,known]=state.groups.a.attempts;
 assert.equal(unknown.status,'interrupted');assert.equal(unknown.time_seconds,30);assert.equal(unknown.finished_at,when);assert.equal(unknown.api_usage_unknown,true);assert.match(unknown.error,/API usage unknown/);
 assert.equal(known.time_seconds,20);assert.equal(known.api_usage_unknown,false);assert.deepEqual(known.usage,{input_tokens:0,output_tokens:10});
 assert.deepEqual(state.groups.a.attempts[2],completed);
 assert.deepEqual(state.answers,{q1:{answer:2}});assert.deepEqual(state.usage,{output_tokens:10});
 assert.equal(markInterruptedAttempts(state,when),0);
});

test('invalid interruption timestamps leave every attempt unchanged',()=>{
 const state={groups:{a:{attempts:[{status:'running',started_at:'2026-10-12T11:59:30.000Z'},{status:'running',started_at:'invalid'}]}}};
 const prior=structuredClone(state);
 assert.throws(()=>markInterruptedAttempts(state,when),/RECOVERY_BLOCKED/);assert.deepEqual(state,prior);
 assert.throws(()=>markInterruptedAttempts(state,'invalid'),/RECOVERY_BLOCKED/);assert.deepEqual(state,prior);
});
