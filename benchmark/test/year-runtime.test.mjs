import test from 'node:test';
import assert from 'node:assert/strict';
import {modelForYear,modelsForYear,yearPaths} from '../academic-years.mjs';
import {MODELS} from '../models.mjs';
test('2025 selects the approved subscription subset and isolates results from every existing run',()=>{
 assert.deepEqual(modelsForYear(2025).map(m=>m.id),['gpt-6-luna','gpt-6.1-sol','claude-haiku-5-5']);
 const original=MODELS.find(m=>m.id==='gpt-6.1-sol');
 assert.equal(modelForYear(original,2026),original);
 assert.equal(modelForYear(original,2025).directory,'results/codex-2025-gpt-6.1-sol');
 assert.equal(original.directory,'results/codex-2026');
 assert.equal(yearPaths(2025).dataset,'exams/datasets/2025-ksat.json');
 assert.throws(()=>yearPaths(2027),/not supported/);
});
