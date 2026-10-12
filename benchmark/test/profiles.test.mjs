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
