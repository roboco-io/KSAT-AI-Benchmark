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
 assert.deepEqual(executionStats(run),{refusal_count:3,timeout_count:2});
 assert.deepEqual(executionStats({groups:{},protocol:{}}),{refusal_count:0,timeout_count:0});
});
