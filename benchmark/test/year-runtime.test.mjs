import test from 'node:test';
import assert from 'node:assert/strict';
import {modelForYear,modelsForYear,yearPaths} from '../academic-years.mjs';
import {MODELS} from '../models.mjs';
test('2025 selects the requested current models and isolates results from every existing run',()=>{
 assert.deepEqual(modelsForYear(2025).map(m=>m.id),['gpt-6-luna','gpt-6.1-sol','gpt-6-astra','claude-haiku-5-5','claude-sonnet-5-5','claude-opus-5-5','claude-fable-5-1','gemini-4-argon','kimi-k3']);
 const original=MODELS.find(m=>m.id==='gpt-6.1-sol');
 assert.equal(modelForYear(original,2026),original);
 assert.equal(modelForYear(original,2025).directory,'results/codex-2025-gpt-6.1-sol');
 assert.equal(original.directory,'results/codex-2026');
 for(const id of ['gemini-4-argon','kimi-k3']) {
  const base=MODELS.find(m=>m.id===id);
  assert.equal(modelForYear(base,2025).directory,`results/pi-2025-${id}`);
  assert.equal(modelForYear(base,2025).pi,base.pi);
 }
 assert.equal(yearPaths(2025).dataset,'exams/datasets/2025-ksat.json');
 assert.throws(()=>yearPaths(2028),/not supported/);
});

test('2027 runs the newest model of each provider and isolates its results',async()=>{
 const {MODELS_2027,MODELS_2026}=await import('../academic-years.mjs');
 const ids=modelsForYear(2027).map(m=>m.id);
 assert.deepEqual(ids,MODELS_2027);
 assert.ok(modelsForYear(2027).every(m=>m.directory.includes('-2027-')));
 assert.deepEqual(modelsForYear(2026).map(m=>m.id),MODELS_2026);
 assert.ok(!MODELS_2026.some(id=>['gpt-6.2-sol','claude-fable-5-2','qwen4-max'].includes(id)));
 assert.equal(yearPaths(2027).comparison,'benchmark-comparison-2027.json');
});
