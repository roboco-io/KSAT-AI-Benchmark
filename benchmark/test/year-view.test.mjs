import test from 'node:test';
import assert from 'node:assert/strict';
import {buildYearView, slimModel, latestYearWithResults} from '../../web/lib/year-view.mjs';

const exam=(subject,track,score,max=100)=>({id:`2026-${subject}-${track}`,title:`${subject} ${track}`,subject,track,max_score:max,summary:{score}});
const model=(id,score,cost,extra={})=>({
 model:id,engine:'E',protocol:{effort:'high'},input_mode:'pdf',
 summary:{score,max_score:376,correct:1,incorrect:2,abstained:3,errors:4,total_questions:10,
  ...(cost===undefined?{}:{estimated_cost_usd:cost}),wall_time_seconds:12,usage:{input_tokens:10,output_tokens:5}},
 exams:[exam('korean','a',score>>1,100)],questions:[{id:'q'}],limitations:[],...extra});
const data=(models,requested=[])=>({academic_year:2026,models,requested_models:requested});

test('sorts_by_score_then_cost',()=>{
 const v=buildYearView(data([model('c',300,1),model('b',376,4),model('a',376,3)]),null);
 assert.deepEqual(v.models.map(m=>m.id),['a','b','c']);
 assert.equal(v.year,2026);
});

test('subject_pct_averages_tracks',()=>{
 const m=model('a',376,1,{exams:[exam('korean','x',92),exam('korean','y',100),exam('math','z',100)]});
 const v=buildYearView(data([m]),null).models[0];
 assert.equal(v.subjects.korean.pct,96);
 assert.equal(v.subjects.korean.tracks.length,2);
 assert.deepEqual(v.subjects.korean.tracks[0],{id:'2026-korean-x',title:'korean x',score:92,max:100});
 assert.equal(v.score,376);assert.equal(v.maxScore,376);assert.equal(v.period4,null);
 const r=buildYearView(data([model('a',1,1,{exams:[exam('math','p',1,3),exam('math','q',1,3)]})]),null).models[0];
 assert.equal(r.subjects.math.pct,33);
});

test('period4_only_model_listed_last',()=>{
 const p4=data([{...model('p',50,1),exams:[exam('social','s',40,50)]},model('a',376,1,{exams:[exam('korean','k',90)]})]);
 p4.models[1].summary.score=10;p4.models[1].summary.max_score=50;
 const v=buildYearView(data([model('a',376,1)]),p4);
 assert.deepEqual(v.models.map(m=>m.id),['a','p']);
 const p=v.models[1];
 assert.equal(p.score,null);assert.equal(p.maxScore,null);
 assert.deepEqual(p.period4,{score:50,max:376,correct:1,incorrect:2,abstained:3,errors:4,total:10,costUsd:1,wallSeconds:12,sourceId:null,engine:null});
 assert.equal(p.costUsd,null);assert.equal(p.correct,0);
 assert.equal(v.models[0].period4.score,10);
 assert.ok(v.subjects.includes('social'));
});

test('pending_from_requested',()=>{
 const v=buildYearView(data([model('a',1,1)],[{id:'a',state:'complete'},{id:'z',state:'pending'}]),null);
 assert.deepEqual(v.pending,[{model:'z',state:'pending'}]);
});

test('provider_prefixes',()=>{
 const v=buildYearView(data([model('gpt-x',4,1),model('claude-x',3,1),model('gemini-x',2,1),model('zzz',1,1),model('glm-5',0,1)]),null);
 const by=Object.fromEntries(v.models.map(m=>[m.id,m.provider]));
 assert.deepEqual(by,{'gpt-x':'OpenAI','claude-x':'Anthropic','gemini-x':'Google',zzz:'기타','glm-5':'Zhipu'});
});

test('tokens_sum',()=>{
 const m=buildYearView(data([model('a',1,1)]),null).models[0];
 assert.equal(m.inputTokens,10);assert.equal(m.outputTokens,5);
});

test('slim_drops_questions',()=>{
 const m=buildYearView(data([model('a',1,1)]),null).models[0];
 assert.ok(m.questions.length===1);
 const s=slimModel(m);
 assert.equal('questions' in s,false);assert.equal('limitations' in s,false);
 assert.equal(s.id,'a');
});

test('missing_summary_fields_null',()=>{
 const m=model('a',1);
 delete m.summary.wall_time_seconds;delete m.summary.usage;delete m.protocol;delete m.input_mode;
 const v=buildYearView(data([m]),null).models[0];
 assert.equal(v.costUsd,null);assert.equal(v.wallSeconds,null);
 assert.equal(v.inputTokens,null);assert.equal(v.outputTokens,null);
 assert.equal(v.effort,null);assert.equal(v.inputMode,null);
 const e=buildYearView(data([]),null);
 assert.deepEqual(e.models,[]);assert.deepEqual(e.pending,[]);
 assert.equal(buildYearView(data([model('a',1,1)]),data([])).models[0].period4,null);
 assert.equal(buildYearView(data([model('a',1,1)]),null).models[0].costUsd,1);
});

test('latestYearWithResults',()=>{
 const m={id:'a'};
 assert.equal(latestYearWithResults([{year:2026,models:[m]},{year:2027,models:[]}]),2026);
 assert.equal(latestYearWithResults([{year:2026,models:[m]},{year:2027,models:[m]}]),2027);
 assert.equal(latestYearWithResults([]),0);
});

test('period4_group_separate_from_main_aggregates',()=>{
 const p4m=model('both',10,5,{exams:[exam('social','s',40,50)]});
 p4m.summary={...p4m.summary,score:40,max_score:50,correct:7,incorrect:1,abstained:0,errors:0,total_questions:8,estimated_cost_usd:9,wall_time_seconds:99};
 const only=model('only',10,2,{exams:[exam('science','s',20,50)]});
 only.summary={...only.summary,score:20,max_score:50,correct:5,total_questions:6};
 const v=buildYearView(data([model('both',300,1)]),data([p4m,only]));
 const b=v.models.find(m=>m.id==='both');
 assert.equal(b.correct,1);assert.equal(b.total,10);assert.equal(b.costUsd,1);assert.equal(b.wallSeconds,12);
 assert.deepEqual(b.period4,{score:40,max:50,correct:7,incorrect:1,abstained:0,errors:0,total:8,costUsd:9,wallSeconds:99,sourceId:null,engine:null});
 const o=v.models.find(m=>m.id==='only');
 assert.equal(o.costUsd,null);assert.equal(o.wallSeconds,null);assert.equal(o.inputTokens,null);
 assert.equal(o.correct,0);assert.equal(o.total,0);assert.equal(o.period4.correct,5);assert.equal(o.period4.costUsd,2);
});

test('period4_route_variant_merges_into_base_model', () => {
  const report = (model, engine, subject, score, max) => ({
    model, engine, summary: {score, max_score: max, correct: 1, incorrect: 0, abstained: 0, errors: 0, total_questions: 1, estimated_cost_usd: 1, wall_time_seconds: 10, usage: {input_tokens: 1, output_tokens: 1}},
    exams: [{id: `${model}-${subject}`, title: subject, subject, track: subject, max_score: max, summary: {score}}],
    questions: [{id: `${model}-${subject}-q1`, subject, status: 'correct'}],
  });
  const main = {academic_year: 2027, requested_models: [], models: [report('m-carbon', 'Pi CLI', 'english', 100, 100), report('m-neon', 'Pi CLI', 'english', 90, 100)]};
  const p4 = {
    academic_year: 2027,
    requested_models: [{id: 'm-carbon-agy', agent: 'antigravity', state: 'complete'}, {id: 'm-neon', state: 'complete'}, {id: 'x-agy', state: 'complete'}],
    models: [report('m-carbon-agy', 'Antigravity CLI', 'korean_history', 48, 50), report('m-neon', 'Pi CLI', 'korean_history', 40, 50), report('x-agy', 'Other', 'korean_history', 30, 50)],
  };
  const view = buildYearView(main, p4);
  assert.deepEqual(view.models.map((m) => m.id), ['m-carbon', 'm-neon', 'x-agy']);
  const carbon = view.models[0];
  assert.equal(carbon.period4.score, 48);
  assert.equal(carbon.period4.sourceId, 'm-carbon-agy');
  assert.equal(carbon.period4.engine, 'Antigravity CLI');
  assert.equal(carbon.questions.length, 2);
  assert.ok(carbon.subjects.korean_history);
  assert.equal(carbon.engine, 'Pi CLI');
  const neon = view.models[1];
  assert.equal(neon.period4.sourceId, null);
  assert.equal(neon.period4.engine, null);
  assert.equal(view.models[2].score, null);
});

test('tokens_prefer_provider_usage_metrics', () => {
  const model = (name, summary) => ({model: name, engine: 'e', summary: {score: 1, max_score: 1, total_questions: 1, correct: 1, ...summary},
    exams: [{id: name, title: 't', subject: 'english', track: 'english', max_score: 1, summary: {score: 1}}], questions: []});
  const view = buildYearView({academic_year: 2027, requested_models: [], models: [
    model('gemini-x', {usage: {input_tokens: 100, output_tokens: 10}, provider_usage: {input_tokens: 150, output_tokens_including_thinking: 900}}),
    model('other', {usage: {input_tokens: 100, output_tokens: 10}}),
  ]}, null);
  const byId = Object.fromEntries(view.models.map((m) => [m.id, m]));
  assert.deepEqual([byId['gemini-x'].inputTokens, byId['gemini-x'].outputTokens], [150, 900]);
  assert.deepEqual([byId.other.inputTokens, byId.other.outputTokens], [100, 10]);
});

test('unfinished_period4_run_is_marked_in_progress_without_partial_scores',()=>{
 const main=data([model('a',300,1),model('b',200,1)]);
 const p4={academic_year:2026,session:'period4',models:[model('a',40,2,{completed:false,exams:[exam('history','h',40,50)],questions:[{id:'p'}]}),model('b',45,2,{completed:true,exams:[exam('history','h',45,50)]})],requested_models:[{id:'a',state:'partial'},{id:'b',state:'complete'}]};
 const v=buildYearView(main,p4);
 const a=v.models.find(m=>m.id==='a'),b=v.models.find(m=>m.id==='b');
 assert.equal(a.period4,null);assert.equal(a.period4Pending,true);
 assert.equal(a.subjects.history,undefined);assert.deepEqual(a.questions,[{id:'q'}]);
 assert.equal(b.period4.score,45);assert.equal(b.period4Pending,false);
 const noRecord=buildYearView(main,{...p4,models:[p4.models[1]],requested_models:[{id:'a',state:'pending'},{id:'b',state:'complete'}]});
 assert.equal(noRecord.models.find(m=>m.id==='a').period4Pending,true);
 assert.equal(noRecord.models.find(m=>m.id==='b').period4Pending,false);
});
