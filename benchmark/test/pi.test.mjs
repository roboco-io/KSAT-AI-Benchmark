import {redactPiError} from '../pi-adapter.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {PiJsonlDecoder,normalizePiUsage,parsePiAnswers,assertPiMessage} from '../pi-adapter.mjs';

const model={id:'qwen3.8-27b',pi:{provider:'ksat-pi',model_id:'qwen3.8-27b',base_url:'https://example.invalid/v1',context_window:262144,max_tokens:32768}};

test('LF-only JSONL decoding preserves Unicode line separators and split UTF8',()=>{
 const decoder=new PiJsonlDecoder();
 const bytes=Buffer.from('{"type":"text","text":"한국\u2028말\u2029"}\r\n{"type":"agent_settled"}\n');
 const results=[];
 for (const byte of bytes) results.push(...decoder.push(Buffer.from([byte])));
 results.push(...decoder.finish());
 assert.deepEqual(results,[{type:'text',text:'한국\u2028말\u2029'},{type:'agent_settled'}]);
});

test('truncated and non JSON stdout fails closed',()=>{
 const decoder=new PiJsonlDecoder();decoder.push(Buffer.from('{"type":"agent_settled"}'));
 assert.throws(()=>decoder.finish(),/PI_PROTOCOL_INVALID/);
 assert.throws(()=>new PiJsonlDecoder().push(Buffer.from('not-json\n')),/PI_PROTOCOL_INVALID/);
});

test('usage counts cached input once and reasoning stays inside output',()=>{
 assert.deepEqual(normalizePiUsage({input:100,cacheRead:20,cacheWrite:3,output:40,reasoning:12,cost:{total:0.002}}),{input_tokens:123,cached_input_tokens:20,cache_write_input_tokens:3,output_tokens:40,reasoning_output_tokens:12});
 for(const usage of [undefined,{input:1,cacheRead:0,cacheWrite:0,output:-1},{input:1,cacheRead:0,cacheWrite:0,output:3,reasoning:4}]) assert.throws(()=>normalizePiUsage(usage),/PI_USAGE_INVALID/);
});

test('only a complete JSON or JSON fenced answer payload is accepted',()=>{
 const output={answers:[{id:'q1',answer:2}]};
 assert.deepEqual(parsePiAnswers(JSON.stringify(output)),output);
 assert.deepEqual(parsePiAnswers('```json\n'+JSON.stringify(output)+'\n```'),output);
 for (const text of ['Explanation '+JSON.stringify(output),'```js\n{}\n```','{"answers":{}}','{"answers":[]} trailing']) assert.throws(()=>parsePiAnswers(text),/PI_OUTPUT_INVALID/);
});

test('authoritative model/provider mismatch and every tool are rejected',()=>{
 const message={role:'assistant',provider:'ksat-pi',model:'qwen3.8-27b',content:[{type:'text',text:'{}'}],stopReason:'stop'};
 assert.doesNotThrow(()=>assertPiMessage(message,model));
 for(const override of [{provider:'openrouter'},{model:'different'},{responseModel:'different'},{content:[{type:'toolCall',name:'bash'}]},{stopReason:'toolUse'}]) assert.throws(()=>assertPiMessage({...message,...override},model),/MODEL_MISMATCH|TOOL_BLOCKED/);
});

import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {piEvents} from '../pi-adapter.mjs';

async function fakePi(t,fixture={}) {
 const dir=await mkdtemp(join(tmpdir(),'ksat-pi-test-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 const path=join(dir,'pi');
 await writeFile(path,`#!/usr/bin/env node
const fs=require('node:fs');const path=require('node:path');
const fixture=${JSON.stringify(fixture)};
if(process.argv.includes('--version')){console.log(fixture.version??'0.87.1');process.exit(0);}
const argv=process.argv.slice(2);
const required=['--offline','--no-tools','--no-extensions','--no-skills','--no-prompt-templates','--no-context-files','--no-themes','--no-approve','--no-session','--print','--system-prompt'];
if(required.some(flag=>!argv.includes(flag))||argv.includes('offline-test-key')||argv[argv.indexOf('--thinking')+1]!=='high'||argv[argv.indexOf('--mode')+1]!=='json'||!argv[argv.indexOf('--system-prompt')+1]?.includes('KSAT'))process.exit(7);
const agent=process.env.PI_CODING_AGENT_DIR;
const settings=JSON.parse(fs.readFileSync(path.join(agent,'settings.json'),'utf8'));
const models=JSON.parse(fs.readFileSync(path.join(agent,'models.json'),'utf8'));
if(settings.images.autoResize!==false||settings.compaction.enabled!==false||settings.retry.enabled!==false||settings.retry.provider.maxRetries!==0||settings.cacheWarming!=='off'||models.providers['ksat-pi'].apiKey!=='$KSAT_PI_API_KEY'||process.env.KSAT_PI_API_KEY!=='offline-test-key')process.exit(8);
const promptPath=argv.find(a=>a.startsWith('@')).slice(1);
if(!fs.readFileSync(promptPath,'utf8').includes('"answers"'))process.exit(9);
if(fixture.hang){setInterval(()=>{},1000);return;}
const message={role:'assistant',provider:'ksat-pi',model:'qwen3.8-27b',content:[{type:'thinking',thinking:'private reasoning'},{type:'text',text:fixture.text??'{"answers":[{"id":"q1","answer":2}]}'}],usage:{input:100,cacheRead:20,cacheWrite:3,output:40,reasoning:12,cost:{total:0.002}},stopReason:fixture.stopReason??'stop',errorMessage:fixture.errorMessage,timestamp:1};
const events=[{type:'session',id:'offline-session'},{type:'agent_start'},{type:'message_end',message},{type:'agent_end',willRetry:false}];
if(!fixture.noSettled)events.push({type:'agent_settled'});
for(const event of events)process.stdout.write(JSON.stringify(event)+'\\n');
process.stderr.write('private stderr offline-test-key');
process.exitCode=fixture.exitCode??0;
`,{mode:0o700});
 return path;
}

async function collectPi(options) {
 const events=[];
 try {for await(const event of piEvents({model,prompt:'Solve supplied question.',images:[],schema:{type:'object',properties:{answers:{type:'array'}}},apiKey:'offline-test-key',...options}))events.push(event);return {events};}
 catch(error){return {events,error};}
}

test('isolated Pi command returns answers only after settled successful process exit',async t=>{
 const result=await collectPi({piExecutable:await fakePi(t)});
 assert.equal(result.error,undefined);
 assert.deepEqual(result.events.map(e=>e.type),['thread.started','turn.completed','item.completed']);
 assert.deepEqual(result.events[1].usage,{input_tokens:123,cached_input_tokens:20,cache_write_input_tokens:3,output_tokens:40,reasoning_output_tokens:12});
 assert.equal(result.events[1].estimated_cost_usd,0.002);
 assert.deepEqual(JSON.parse(result.events[2].item.text),{answers:[{id:'q1',answer:2}]});
 assert.ok(!JSON.stringify(result.events).includes('private reasoning'));
});

test('invalid answer JSON retains usage and never emits submitted answer',async t=>{
 const result=await collectPi({piExecutable:await fakePi(t,{text:'private malformed text'})});
 assert.match(result.error.message,/PI_OUTPUT_INVALID/);
 assert.deepEqual(result.events.map(e=>e.type),['thread.started','turn.completed']);
 assert.equal(result.events[1].usage.input_tokens,123);
 assert.ok(!result.error.message.includes('private'));
});

test('missing settled, nonzero exit, and wrong Pi version cannot submit answers',async t=>{
 for (const [fixture,want] of [[{noSettled:true},/PI_PROTOCOL_INVALID/],[{exitCode:2},/PI_TURN_FAILED/],[{version:'0.88.0'},/PI_BLOCKED/]]) {
  const result=await collectPi({piExecutable:await fakePi(t,fixture)});
  assert.match(result.error?.message??'',want);
  assert.equal(result.events.some(e=>e.type==='item.completed'),false);
  assert.ok(!result.error.message.includes('offline-test-key'));
 }
});

test('bounded timeout terminates Pi subprocess without exposing provider text',async t=>{
 const result=await collectPi({piExecutable:await fakePi(t,{hang:true}),timeoutMs:1000});
 assert.match(result.error.message,/PI_ABORTED/);
 assert.equal(result.events.some(e=>e.type==='item.completed'),false);
});


test('Kimi-style normalized cache reads and writes preserve original prompt total',()=>{
 // A 1000-token provider prompt has 200 read tokens and 100 newly written tokens.
 assert.deepEqual(normalizePiUsage({input:700,cacheRead:200,cacheWrite:100,output:30,reasoning:12}),{input_tokens:1000,cached_input_tokens:200,cache_write_input_tokens:100,output_tokens:30,reasoning_output_tokens:12});
});

test('private transport diagnostics redact exact credentials and authorization headers',()=>{
 const value=redactPiError('Authorization: Bearer fixture-private-key; api=fixture-private-key; token=sk-fixturefragment', 'fixture-private-key');
 assert.equal(value.includes('fixture-private-key'),false);
 assert.equal(value.includes('sk-fixturefragment'),false);
});

test('Pi provider timeout detail remains identifiable after public error normalization',async t=>{
 const result=await collectPi({piExecutable:await fakePi(t,{stopReason:'error',errorMessage:'Request timed out.'})});
 assert.match(result.error.message,/code=RequestTimeout/);
 assert.equal(result.events.some(event=>event.type==='item.completed'),false);
});
