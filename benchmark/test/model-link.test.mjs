import test from 'node:test';
import assert from 'node:assert/strict';
import {modelFromSearch, modelShareUrl} from '../../web/lib/model-link.mjs';

test('model query selects only an exact registered model ID',()=>{
 const ids=['gemini-4-argon','gpt-6-astra'];
 assert.equal(modelFromSearch('?model=gemini-4-argon',ids),'gemini-4-argon');
 for(const search of ['', '?model=', '?model=unknown', '?model=Gemini%204%20Argon', '?model=__proto__']) {
  assert.equal(modelFromSearch(search,ids),null);
 }
});

test('model selection updates a share URL while preserving its path, other queries and anchor',()=>{
 assert.equal(modelShareUrl('https://roboco.io/KSAT-AI-Benchmark/?campaign=sns&model=gpt-6-astra#model-records','gemini-4-argon'),'https://roboco.io/KSAT-AI-Benchmark/?campaign=sns&model=gemini-4-argon#model-records');
 assert.equal(modelShareUrl('http://localhost:3000/','gpt-6-astra'),'http://localhost:3000/?model=gpt-6-astra');
});
