import test from 'node:test';
import assert from 'node:assert/strict';
import {routeAgent,validateProfile} from '../profiles.mjs';
const example={id:'fixture-openai-model',label:'Fixture model',provider:'openai',agent:'codex',directory:'results/codex-2026-fixture-openai-model',pricing:{input_per_million:2,cached_input_per_million:0.1,cache_write_per_million:2.5,output_per_million:10,currency:'USD',as_of:'2026-10-12',basis:'reference estimate',source:'https://example.org/model'}};
test('provider route always uses the user-selected agent family',()=>{
 assert.equal(routeAgent({provider:'openai'}),'codex');
 assert.equal(routeAgent({provider:'anthropic'}),'claude');
 assert.equal(routeAgent({provider:'google'}),'antigravity');
 assert.equal(routeAgent({provider:'new-vendor'}),'pi');
 assert.equal(validateProfile(example),example);
 assert.throws(()=>validateProfile({...example,agent:'pi'}),/MODEL_PROFILE_INVALID/);
});
test('new profiles cannot overwrite old directories, escape paths, or store credentials',()=>{
 assert.throws(()=>validateProfile({...example,id:'../escape'}),/MODEL_PROFILE_INVALID/);
 assert.throws(()=>validateProfile({...example,directory:'results/codex-2026'}),/MODEL_PROFILE_INVALID/);
 assert.throws(()=>validateProfile({...example,apiKey:'fixture-credential'}),/credential values/);
 assert.throws(()=>validateProfile({...example,credentials:{token:'fixture-only'}}),/MODEL_PROFILE_INVALID/);
 assert.throws(()=>validateProfile({...example,pricing:{...example.pricing,credentials:{token:'fixture-only'}}}),/MODEL_PROFILE_INVALID/);
 assert.throws(()=>validateProfile({...example,provider:'google',agent:'antigravity',directory:'results/antigravity-2026-fixture-openai-model',pi:{}}),/cannot be routed through Pi/);
});
test('Google Pi API route is explicit and restricted to the official endpoint',()=>{
 const model={...example,id:'gemini-4-argon',label:'Gemini 4 Argon',provider:'google',agent:'pi',directory:'results/pi-2026-gemini-4-argon',pi:{provider:'ksat-pi',model_id:'gemini-4-argon',base_url:'https://generativelanguage.googleapis.com/v1beta/openai/',secret_name:'GEMINI_API_KEY',context_window:1048576,max_tokens:32768}};
 assert.equal(routeAgent(model),'pi');
 assert.equal(validateProfile(model),model);
 assert.throws(()=>validateProfile({...model,pi:{...model.pi,base_url:'https://example.invalid/v1'}}),/MODEL_PROFILE_INVALID/);
 assert.equal(routeAgent({provider:'google'}),'antigravity');
});
