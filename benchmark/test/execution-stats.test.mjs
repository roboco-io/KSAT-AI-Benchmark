import test from 'node:test';
import assert from 'node:assert/strict';
import {executionStats} from '../execution-stats.mjs';

test('counts recorded refusal and timeout attempts including retries, not affected questions or abstentions',()=>{
 const run={protocol:{group_timeout_seconds:900},answers:{q:{decision:'abstained',abstain_reason:'uncertain'}},groups:{a:{attempts:[
  {status:'error',error:'PI_TURN_FAILED: code=DataInspectionFailed',question_ids:['a','b']},
  {status:'error',error:'PI_CONTENT_BLOCKED: scope=output'},
  {status:'error',error:'PI_ABORTED: request cancelled or timed out',time_seconds:899.994},
  {status:'error',error:'PI_ABORTED: request cancelled or timed out',time_seconds:12},
  {status:'error',error:'PI_ABORTED: request cancelled or timed out'},
  {status:'error',error:'RequestTimeout'},
  {status:'error',error:'PI_TURN_FAILED: response reached output token limit'},
  {status:'error',error:'PI_TURN_FAILED: provider did not finish a complete answer'},
  {status:'completed'},
 ]},split:{attempts:[{status:'error',error:'MODEL_REFUSAL'},{status:'running',error:'RequestTimeout'}]}}};
 assert.deepEqual(executionStats(run),{refusal_count:3,timeout_count:2,retry_count:9});
 assert.deepEqual(executionStats({groups:{},protocol:{}}),{refusal_count:0,timeout_count:0,retry_count:0});
});

test('preserved Argon diagnostic corrects only its exact historical failed request',()=>{
 const run={run_id:'2026-pre-exam-pi-gemini-4-argon',protocol:{model:'gemini-4-argon',group_timeout_seconds:900},groups:{'2026-korean-language_media':{attempts:[{iteration:1,status:'error',error:'PI_TURN_FAILED: provider did not finish a complete answer',started_at:'2026-10-16T04:06:11.585Z',time_seconds:303.333}]}}};
 assert.deepEqual(executionStats(run),{refusal_count:0,timeout_count:1,retry_count:0});
 const changed=structuredClone(run);changed.groups['2026-korean-language_media'].attempts[0].started_at='different';
 assert.deepEqual(executionStats(changed),{refusal_count:0,timeout_count:0,retry_count:0});
});

test('split recovery attempts count as retries of their original group',()=>{
 const run={groups:{original:{attempts:[{status:'error'},{status:'error'}]},'original--split-1':{original_group_id:'original',attempts:[{status:'completed'}]},'original--split-2':{original_group_id:'original',attempts:[{status:'error'},{status:'completed'}]},other:{attempts:[{status:'completed'}]}}};
 assert.equal(executionStats(run).retry_count,4);
});
