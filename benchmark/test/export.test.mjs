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
});
