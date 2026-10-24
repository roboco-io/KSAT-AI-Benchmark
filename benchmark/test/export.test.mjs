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
 const report=buildReport(dataset,run,[],{input_per_million:2,output_per_million:10},'fixture');
 assert.deepEqual(report.questions.map(q=>q.status),['correct','incorrect','incorrect']);
 assert.equal(report.summary.correct,1);
 assert.equal(report.summary.incorrect,2);
 assert.equal(report.summary.score,3);
 assert.ok(Math.abs(report.summary.accuracy-33.33333333333333)<1e-12);
 assert.equal(report.official_summary.correct,0);
 for(const key of ['usage','wall_time_seconds','solver_time_seconds','estimated_cost_usd'])assert.deepEqual(report.summary[key],report.official_summary[key]);
});
