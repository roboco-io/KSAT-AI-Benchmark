import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateAnswers, estimateCost, summarize, mergeSubmitted, fatalStreamError, attemptsRemaining, elapsedWall, verifyResume, runBatches} from '../core.mjs';
import {modelById} from '../models.mjs';

const questions=[
 {id:'q1',kind:'multiple_choice',correct_answer:2,points:2},
 {id:'q2',kind:'short_answer',correct_answer:97,points:4},
 {id:'q3',kind:'multiple_choice',correct_answer:5,points:3},
 {id:'q4',kind:'multiple_choice',correct_answer:1,points:3},
];
test('abstention is distinct from errors and retains full score denominator',()=>{
 const answers=validateAnswers([{question_id:'q1',decision:'answered',answer:2,explanation:'ok',abstain_reason:null},{question_id:'q2',decision:'abstained',answer:null,explanation:'uncertain',abstain_reason:'uncertain'},{question_id:'q3',decision:'answered',answer:2,explanation:'wrong',abstain_reason:null}],questions);
 const s=summarize(questions,answers,{q4:{status:'error'}},{input_tokens:1000000,cached_input_tokens:0,output_tokens:100000},30,20);
 assert.equal(s.correct,1);assert.equal(s.incorrect,1);assert.equal(s.abstained,1);assert.equal(s.errors,1);assert.equal(s.score,2);assert.equal(s.max_score,12);assert.equal(s.accuracy,25);assert.equal(s.abstention_rate,25);assert.equal(s.attempt_accuracy,50);assert.equal(s.wall_time_seconds,30);
});
test('unknown duplicate IDs and contradictory abstention cannot become submitted answers',()=>{
 assert.throws(()=>validateAnswers([{question_id:'q1',decision:'abstained',answer:2,explanation:'',abstain_reason:'uncertain'}],questions));
 assert.throws(()=>validateAnswers([{question_id:'foreign',decision:'answered',answer:1,explanation:'',abstain_reason:null}],questions));
 const a={question_id:'q1',decision:'answered',answer:2,explanation:'',abstain_reason:null};
 assert.throws(()=>validateAnswers([a,a],questions));
 assert.throws(()=>validateAnswers([{...a,answer:1.5}],questions));
});
test('cached tokens charged once and zero attempts have null accuracy',()=>{
 assert.equal(estimateCost({input_tokens:1000000,cached_input_tokens:200000,output_tokens:100000}),2.62);
 const s=summarize(questions,{}, {},{},0,0);assert.equal(s.attempt_accuracy,null);assert.equal(s.pending,4);
});
test('different model rates produce different token cost estimates',()=>{
 const usage={input_tokens:1000000,cached_input_tokens:200000,output_tokens:100000};
 assert.equal(estimateCost(usage,{input_per_million:10,cached_input_per_million:1,cache_write_per_million:12.5,output_per_million:50}),13.2);
 assert.equal(estimateCost(usage,{input_per_million:0.1,cached_input_per_million:0.01,cache_write_per_million:0.125,output_per_million:0.5}),0.132);
});
test('Pi Kimi cache writes use the published 5m write rate rather than a generic multiplier',()=>{
 const price=modelById('kimi-k3').pricing;
 assert.equal(estimateCost({input_tokens:1000000,cache_write_input_tokens:1000000,output_tokens:0},price),3);
 assert.equal(estimateCost({input_tokens:1000000,cached_input_tokens:1000000,output_tokens:0},price),0.3);
});
test('Claude current cache-only fallback estimates use provider model rates',()=>{
 const allCached={input_tokens:1000000,cached_input_tokens:1000000,output_tokens:0};
 assert.equal(estimateCost(allCached,modelById('claude-sonnet-5-5').pricing),0.1);
 assert.equal(estimateCost(allCached,modelById('claude-opus-5-5').pricing),0.2);
 assert.equal(estimateCost(allCached,modelById('claude-fable-5-1').pricing),0.25);
});
test('aborted billing batch never starts subsequent requests',async()=>{
 const controller=new AbortController(),started=[];
 await runBatches([1,2,3,4],2,controller,()=>false,async item=>{started.push(item);if(item===1)controller.abort();});
 assert.deepEqual(started,[1]);
});
test('Ralph resumes only unfinished work without changing submitted answer or abstention',()=>{
 const original={q1:{decision:'answered',answer:2},q2:{decision:'abstained',answer:null}};
 const merged=mergeSubmitted(original,{q1:{decision:'answered',answer:3},q3:{decision:'answered',answer:5}});
 assert.equal(merged.q1.answer,2);assert.equal(merged.q2.decision,'abstained');assert.equal(merged.q3.answer,5);
});
test('SDK reconnect notice does not discard a stream that can still complete',()=>{
 assert.equal(fatalStreamError({type:'error',message:'Reconnecting... 2/5 (stream disconnected before completion)'}),null);
 assert.equal(fatalStreamError({type:'turn.failed',error:{message:'quota exceeded'}}),'quota exceeded');
 assert.equal(fatalStreamError({type:'error',message:'stream retry limit exceeded'}),'stream retry limit exceeded');
});
test('resume preserves total per-group retry limit across invocations',()=>{
 assert.equal(attemptsRemaining([{status:'error'},{status:'error'}],3),1);
 assert.equal(attemptsRemaining([{status:'error'},{status:'error'},{status:'error'}],3),0);
});
test('heartbeat wall time uses persisted base rather than double-counting',()=>{
 assert.equal(elapsedWall(50,1000,21000),70);
 assert.equal(elapsedWall(50,1000,31000),80);
});
test('resume refuses modified prompt or source hashes',()=>{
 const state={dataset_hash:'dataset',prompt_hash:'prompt',source_hashes:{pdf:'one'},protocol:{model:'model'}};
 assert.throws(()=>verifyResume(state,{model:'model'},'dataset','other',{pdf:'one'}));
 assert.throws(()=>verifyResume(state,{model:'model'},'dataset','prompt',{pdf:'two'}));
 assert.doesNotThrow(()=>verifyResume(state,{model:'model'},'dataset','prompt',{pdf:'one'}));
});
