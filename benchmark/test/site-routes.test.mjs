import test from 'node:test';
import assert from 'node:assert/strict';
import {yearPath, modelPath, questionsPath, questionPath, comparePath, parseCompare, legacyRedirect} from '../../web/lib/site-routes.mjs';

test('year, model, question and compare paths have no basePath and no trailing slash',()=>{
 assert.equal(yearPath(2026),'/2026');
 assert.equal(modelPath(2026,'gpt-6.1-sol'),'/2026/models/gpt-6.1-sol');
 assert.equal(questionPath(2026,'q1'),'/2026/questions/q1');
 assert.equal(comparePath(2026,['a','b']),'/2026/compare?models=a,b');
 assert.equal(comparePath(2026,[]),'/2026/compare');
});

test('questions path adds the subject query only when a subject is given',()=>{
 assert.equal(questionsPath(2026,'math'),'/2026/questions?subject=math');
 assert.equal(questionsPath(2026),'/2026/questions');
});

test('compare query keeps the first four distinct non-empty model ids',()=>{
 assert.deepEqual(parseCompare('?models=a,b,a,c,d,e'),['a','b','c','d']);
 assert.deepEqual(parseCompare('?models=a,,b,a'),['a','b']);
 assert.deepEqual(parseCompare(''),[]);
});

test('legacy year and model query strings map to the new paths',()=>{
 assert.equal(legacyRedirect('?year=2026&model=x','#model-records'),'/2026/models/x');
 assert.equal(legacyRedirect('?year=2027&session=period4',''),'/2027');
 assert.equal(legacyRedirect('?year=2026&model=Gemini%204%20Argon',''),'/2026/models/Gemini%204%20Argon');
 assert.equal(legacyRedirect('?year=2026&model=a%2Fb',''),'/2026/models/a%2Fb');
});

test('legacy redirect leaves explore-state queries and plain anchors alone',()=>{
 assert.equal(legacyRedirect('?x=1&y=cost',''),null);
 assert.equal(legacyRedirect('?x=cost',''),null);
 assert.equal(legacyRedirect('','#research'),null);
 assert.equal(legacyRedirect('?year=26&model=x',''),null);
});
