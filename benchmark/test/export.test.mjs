import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildReport} from '../report.mjs';
test('each model is scored independently and shared questions are not double counted',()=>{
 const questions=[{id:'common',kind:'multiple_choice',correct_answer:1,points:2},{id:'option',kind:'short_answer',correct_answer:97,points:4}];
 const dataset={questions,solver_groups:[{id:'group',question_ids:['common','option']}],exams:[{id:'exam',question_ids:['common','option'],max_score:6}]};
 const run={run_id:'actual',academic_year:2026,phase:'pre_exam',protocol:{model:'gpt-6-astra'},completed:true,answers:{common:{decision:'answered',answer:1,explanation:'',abstain_reason:null},option:{decision:'abstained',answer:null,explanation:'uncertain',abstain_reason:'uncertain'}},errors:{},wall_time_seconds:10,usage:{input_tokens:1000000,output_tokens:100000},groups:{group:{attempts:[{usage:{input_tokens:1000000,output_tokens:100000},time_seconds:10}]}}};
 const pricing={input_per_million:10,cached_input_per_million:1,cache_write_per_million:12.5,output_per_million:50};
 const report=buildReport(dataset,run,[],pricing,'Codex SDK / Ralph loop');
 assert.equal(report.summary.total_questions,2);assert.equal(report.summary.accuracy,50);assert.equal(report.summary.abstention_rate,50);assert.equal(report.summary.estimated_cost_usd,15);assert.equal(report.exams[0].summary.score,2);assert.equal(report.exams[0].summary.max_score,6);
 assert.equal(report.questions[0].estimated_cost_usd,7.5);assert.equal(report.questions[0].time_seconds,5);
 const recovered=structuredClone(run);
 recovered.protocol.agent='Pi';
 recovered.groups={group:{attempts:[{status:'error',error:'PI_TURN_FAILED: transport ended',usage:{input_tokens:0,output_tokens:0},time_seconds:3}]},'group--split-1':{original_group_id:'group',attempts:run.groups.group.attempts}};
 const recoveredReport=buildReport(dataset,recovered,[],pricing,'Pi CLI / Ralph loop');
 assert.equal(recoveredReport.summary.estimated_cost_usd,15);
 assert.equal(recoveredReport.usage_complete,false);
});
test('Pi report uses the recorded model output limit and generic API wording',()=>{
 const dataset={questions:[],solver_groups:[],exams:[]};
 const run={protocol:{model:'gemini-4-argon',agent:'Pi',max_output_tokens:32768,effort_semantics:'high'},groups:{},answers:{},errors:{},usage:{},wall_time_seconds:0};
 const report=buildReport(dataset,run,[],{},'Pi CLI');
 assert.ok(report.limitations.some(text=>text.includes('32,768')));
 assert.ok(!report.limitations.some(text=>text.includes('네 모델')||text.includes('65,536')||text.includes('DeepSeek')));
});

test('English 37 accepts 4 and 5 with official grading retained and only 4 marked',()=>{
 const question={id:'2026-english-english-q37',kind:'multiple_choice',correct_answer:5,points:3};
 const dataset={academic_year:2026,questions:[question],solver_groups:[{id:'english',question_ids:[question.id]}],exams:[{id:'english',question_ids:[question.id],max_score:3}]};
 for(const [answer,correct,officialCorrect,adjusted] of [[4,1,0,1],[5,1,1,0],[3,0,0,0],[null,0,0,0]]) {
  const run={protocol:{model:'fixture'},groups:{},answers:{[question.id]:{decision:answer===null?'abstained':'answered',answer,explanation:'original',abstain_reason:answer===null?'uncertain':null}},errors:{},usage:{input_tokens:100,output_tokens:20},wall_time_seconds:7};
  const before=JSON.stringify({dataset,run});
  const report=buildReport(dataset,run,[],{},'fixture');
  assert.equal(report.summary.correct,correct);
  assert.equal(report.summary.adjusted_correct,adjusted);
  assert.equal(report.summary.score,correct*3);
  assert.equal(report.official_summary.correct,officialCorrect);
  assert.equal(report.exams[0].summary.score,correct*3);
  assert.equal(report.exams[0].official_summary.score,officialCorrect*3);
  assert.equal(report.questions[0].benchmark_adjusted,Boolean(adjusted));
  assert.equal(report.questions[0].official_status,answer===null?'abstained':answer===5?'correct':'incorrect');
  assert.equal(report.questions[0].answer,answer);
  assert.equal(report.questions[0].correct_answer,5);
  assert.deepEqual(report.questions[0].accepted_answers,[4,5]);
  assert.equal(JSON.stringify({dataset,run}),before);
 }
 for(const errors of [{},{[question.id]:{message:'failed'}}]) {
  const report=buildReport(dataset,{protocol:{model:'fixture'},groups:{},answers:{},errors,usage:{},wall_time_seconds:0},[],{},'fixture');
  assert.equal(report.summary.correct,0);
  assert.equal(report.summary.adjusted_correct,0);
  assert.equal(report.questions[0].status,errors[question.id]?'error':'pending');
 }
 const older=buildReport({...dataset,academic_year:2025},{protocol:{model:'fixture'},groups:{},answers:{[question.id]:{decision:'answered',answer:4}},errors:{},usage:{},wall_time_seconds:0},[],{},'fixture');
 assert.equal(older.summary.correct,0);
 assert.equal(older.grading_policy,undefined);
});
test('Q37 policy does not credit other fourth-choice answers or change usage and timing',()=>{
 const ids=['2026-english-english-q37','2026-english-english-q36','2026-math-common-q37'];
 const questions=ids.map(id=>({id,kind:'multiple_choice',correct_answer:5,points:3}));
 const dataset={academic_year:2026,questions,solver_groups:[{id:'group',question_ids:ids}],exams:[{id:'exam',question_ids:ids,max_score:9}]};
 const run={protocol:{model:'fixture'},groups:{group:{attempts:[{usage:{input_tokens:100,output_tokens:20},time_seconds:9}]}},answers:Object.fromEntries(ids.map(id=>[id,{decision:'answered',answer:4,explanation:'original'}])),errors:{},usage:{input_tokens:100,output_tokens:20},wall_time_seconds:7};
 const report=buildReport(dataset,run,[],{input_per_million:2,cached_input_per_million:0.1,cache_write_per_million:0,output_per_million:10},'fixture');
 assert.deepEqual(report.questions.map(q=>q.status),['correct','incorrect','incorrect']);
 assert.equal(report.summary.correct,1);
 assert.equal(report.summary.incorrect,2);
 assert.equal(report.summary.score,3);
 assert.ok(Math.abs(report.summary.accuracy-33.33333333333333)<1e-12);
 assert.equal(report.official_summary.correct,0);
 for(const key of ['usage','wall_time_seconds','solver_time_seconds','estimated_cost_usd'])assert.deepEqual(report.summary[key],report.official_summary[key]);
});

test('solve time counts only the request that submitted each answer, not failed attempts or retries',()=>{
 const questions=[{id:'a',kind:'multiple_choice',correct_answer:1,points:2},{id:'b',kind:'multiple_choice',correct_answer:2,points:2},{id:'c',kind:'multiple_choice',correct_answer:3,points:2}];
 const dataset={academic_year:2027,questions,solver_groups:[{id:'g',question_ids:['a','b','c']}],exams:[{id:'e',question_ids:['a','b','c'],max_score:6}]};
 const run={run_id:'t',academic_year:2027,protocol:{model:'fixture'},completed:true,wall_time_seconds:2000,usage:{},errors:{},
  answers:{a:{decision:'answered',answer:1},b:{decision:'answered',answer:2},c:{decision:'answered',answer:3}},
  groups:{g:{attempts:[{started_at:'1',status:'error',time_seconds:900,question_ids:['a','b','c'],usage:{}},{started_at:'2',status:'completed',time_seconds:60,question_ids:['a','b'],usage:{}}]},
   'g--retry1-c':{original_group_id:'g',attempts:[{started_at:'3',status:'error',time_seconds:5,question_ids:['c'],usage:{}},{started_at:'4',status:'completed',time_seconds:30,question_ids:['c'],usage:{},user_retry:1}]}}};
 const report=buildReport(dataset,run,[],{input_per_million:0,cached_input_per_million:0,cache_write_per_million:0,output_per_million:0},'fixture');
 assert.equal(report.summary.solve_time_seconds,90);
 assert.deepEqual(report.questions.map(q=>q.solve_time_seconds),[30,30,30]);
 assert.equal(report.exams[0].summary.solve_time_seconds,90);
 assert.equal(report.summary.wall_time_seconds,2000);
 assert.equal(report.summary.solve_time_basis,'attempt');
});
test('solve time uses model stream time when recorded and excludes auth, pacing and startup',()=>{
 const questions=[{id:'a',kind:'multiple_choice',correct_answer:1,points:2},{id:'b',kind:'multiple_choice',correct_answer:2,points:2}];
 const dataset={academic_year:2027,questions,solver_groups:[{id:'g',question_ids:['a']},{id:'h',question_ids:['b']}],exams:[{id:'e',question_ids:['a','b'],max_score:4}]};
 const run={run_id:'t',academic_year:2027,protocol:{model:'fixture'},completed:true,wall_time_seconds:100,usage:{},errors:{},answers:{a:{decision:'answered',answer:1},b:{decision:'answered',answer:2}},
  groups:{g:{attempts:[{started_at:'1',status:'completed',time_seconds:50,model_time_seconds:44.5,question_ids:['a'],usage:{}}]},h:{attempts:[{started_at:'2',status:'completed',time_seconds:20,question_ids:['b'],usage:{}}]}}};
 const report=buildReport(dataset,run,[],{input_per_million:0,cached_input_per_million:0,cache_write_per_million:0,output_per_million:0},'fixture');
 assert.equal(report.summary.solve_time_seconds,64.5);
 assert.equal(report.summary.solve_time_basis,'mixed');
 assert.deepEqual(report.questions.map(q=>q.solve_time_seconds),[44.5,20]);
});
test('provider usage audit replaces the response-based cost and keeps per-question shares',async()=>{
 const {applyProviderUsage}=await import('../report.mjs');
 const report={summary:{estimated_cost_usd:1},questions:[{estimated_cost_usd:0.25},{estimated_cost_usd:0.75}],exams:[{summary:{estimated_cost_usd:1}}],limitations:[]};
 applyProviderUsage(report,{source:'google_cloud_monitoring',input_tokens:1_000_000,output_tokens_including_thinking:500_000,window:{start:'a',end:'b'},queried_at:'2026-11-21T00:00:00Z'},{input_per_million:2,cached_input_per_million:0.1,cache_write_per_million:0,output_per_million:10});
 assert.equal(report.summary.estimated_cost_usd,7);assert.equal(report.summary.response_estimated_cost_usd,1);
 assert.equal(report.summary.cost_basis,'provider_usage_metrics');
 assert.deepEqual(report.questions.map(q=>q.estimated_cost_usd),[1.75,5.25]);
 assert.equal(report.limitations.length,1);
});
test('Gemini profiles accept the native route that reports thinking tokens, and reject mismatched routes',async()=>{
 const {validateProfile}=await import('../profiles.mjs');
 const base={id:'gemini-x',label:'Gemini X',provider:'google',agent:'pi',directory:'results/pi-2026-gemini-x',pricing:{input_per_million:1,cached_input_per_million:0.1,cache_write_per_million:0,output_per_million:5,currency:'USD',as_of:'2026-11-21',basis:'test',source:'https://ai.google.dev/gemini-api/docs/pricing'},pi:{provider:'ksat-pi',model_id:'gemini-x',secret_name:'GEMINI_API_KEY',context_window:1000,max_tokens:100}};
 assert.ok(validateProfile({...base,pi:{...base.pi,api:'google-generative-ai',base_url:'https://generativelanguage.googleapis.com/v1beta'}}));
 assert.ok(validateProfile({...base,pi:{...base.pi,base_url:'https://generativelanguage.googleapis.com/v1beta/openai/'}}));
 assert.throws(()=>validateProfile({...base,pi:{...base.pi,api:'google-generative-ai',base_url:'https://generativelanguage.googleapis.com/v1beta/openai/'}}),/official Gemini API route/);
});
test('a confirmed unsolved question scores 0 and is not counted as an execution error',async()=>{
 const {summarize}=await import('../core.mjs');
 const qs=[{id:'a',kind:'multiple_choice',correct_answer:1,points:2},{id:'b',kind:'multiple_choice',correct_answer:2,points:3}];
 const s=summarize(qs,{a:{decision:'answered',answer:1}},{b:{status:'error',unsolved:true}},{},0,0);
 assert.equal(s.unsolved,1);assert.equal(s.errors,0);assert.equal(s.pending,0);assert.equal(s.score,2);assert.equal(s.accuracy,50);assert.equal(s.attempt_accuracy,50);
});
test('agy route strips API keys, keeps AI credits off and counts thinking in output tokens',async()=>{
 const {agyEnvironment,normalizeAgyUsage,AGY_SETTINGS}=await import('../agy-adapter.mjs');
 const env=agyEnvironment({PATH:'/bin',GEMINI_API_KEY:'x',GOOGLE_API_KEY:'y',HOME:'/h'});
 assert.deepEqual(Object.keys(env).sort(),['HOME','PATH']);
 assert.equal(AGY_SETTINGS.useG1Credits,false);
 assert.deepEqual(normalizeAgyUsage({inputTokens:26926,outputTokens:1758,cachedReadTokens:12557,thoughtTokens:244}),{input_tokens:39483,cached_input_tokens:12557,cache_write_input_tokens:0,output_tokens:1758,reasoning_output_tokens:244});
});

test('failed requests separate reported usage from unknown usage', async () => {
 const {failedRequests}=await import('../report.mjs');
 const run={groups:{g:{attempts:[
  {status:'completed',usage:{input_tokens:1000,output_tokens:10}},
  {status:'error',usage:{input_tokens:1000,output_tokens:5000}},
  {status:'error',error:'PI_ABORTED: request cancelled or timed out',time_seconds:900,api_usage_unknown:true,estimated_input_tokens:1000},
  {status:'error',error:'AGY_ABORTED: request cancelled',time_seconds:900,question_ids:['x'],api_usage_unknown:true},
  {status:'error',error:'PI_TURN_FAILED: provider did not finish a complete answer',time_seconds:2}]}}};
 const f=failedRequests(run,{input_per_million:2,cached_input_per_million:0.1,cache_write_per_million:0,output_per_million:10});
 assert.equal(f.total,4);assert.equal(f.with_usage,1);assert.equal(f.rejected_before_processing,1);assert.equal(f.usage_unknown,2);
 assert.equal(f.recorded_cost_usd,0.052);assert.equal(f.unknown_estimated_input_tokens,1000);assert.equal(f.unknown_estimated_input_cost_usd,0.002);
});
