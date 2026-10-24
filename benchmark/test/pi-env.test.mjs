import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLiteralSecret,piEnvironment} from '../pi-env.mjs';
test('secret loader reads only requested literal assignment without shell evaluation',()=>{
 assert.equal(parseLiteralSecret('export DEEPSEEK_API_KEY="fixture-token" # private\nOTHER_KEY="unrelated"','DEEPSEEK_API_KEY'),'fixture-token');
 assert.equal(parseLiteralSecret("GLM_API_KEY='fixture-token'",'GLM_API_KEY'),'fixture-token');
 assert.throws(()=>parseLiteralSecret('KIMI_API_KEY=$(cat /secret)','KIMI_API_KEY'),/API_SECRET_INVALID/);
 assert.throws(()=>parseLiteralSecret('OTHER_KEY="unrelated"','KIMI_API_KEY'),/API_SECRET_MISSING/);
});
test('Pi child receives only selected API credential and isolated configuration',()=>{
 const env=piEnvironment('fixture-selected','/private/agent',{PATH:'/bin',HOME:'/home',OPENAI_API_KEY:'unrelated',DEEPSEEK_API_KEY:'unrelated',AWS_SECRET_ACCESS_KEY:'unrelated'});
 assert.equal(env.KSAT_PI_API_KEY,'fixture-selected');
 assert.equal(env.PI_CODING_AGENT_DIR,'/private/agent');
 assert.equal(env.OPENAI_API_KEY,undefined);
 assert.equal(env.DEEPSEEK_API_KEY,undefined);
 assert.equal(env.AWS_SECRET_ACCESS_KEY,undefined);
});
