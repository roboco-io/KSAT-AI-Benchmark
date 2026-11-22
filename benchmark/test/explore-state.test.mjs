import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_EXPLORE,parseExplore,serializeExplore,PRESETS} from '../../web/lib/explore-state.mjs';

const FULL={x:'wall',y:'subj:math',sort:'accuracy',asc:true,cols:['score','tokens','subj:korean'],providers:['OpenAI','Goo,gle'],engines:['codex','pi cli'],maxCost:12.5,picked:['gpt-6-astra','a/b'],open:'gemini-4-argon',q:{subjects:['korean','math'],minPoints:3,kind:'short_answer',minMissShare:0.3}};

test('round_trip: every field survives parse(serialize(s))',()=>{
 assert.deepEqual(parseExplore(serializeExplore(FULL)),FULL);
});
test('defaults_omitted',()=>{
 assert.equal(serializeExplore(DEFAULT_EXPLORE),'');
 assert.equal(serializeExplore({...DEFAULT_EXPLORE,x:'wall'}),'?x=wall');
 assert.deepEqual(parseExplore(''),DEFAULT_EXPLORE);
});
test('unknown_metric_falls_back',()=>{
 assert.equal(parseExplore('?x=bogus').x,'cost');
 assert.equal(parseExplore('?x=wall&p=OpenAI,Google&qmin=3').x,'wall');
 assert.deepEqual(parseExplore('?p=OpenAI,Google&qmin=3').providers,['OpenAI','Google']);
 assert.equal(parseExplore('?qmin=3').q.minPoints,3);
});
test('caps: cols at 8, picked at 50',()=>{
 const cols=['score','accuracy','cost','wall','costPerPoint','secPerQuestion','abstention','errors','tokens','fPoints'];
 assert.equal(parseExplore('?cols='+cols.join(',')).cols.length,8);
 const ids=Array.from({length:60},(_,i)=>'m'+i);
 assert.equal(parseExplore('?pick='+ids.join(',')).picked.length,50);
});
test('presets_match_spec',()=>{
 assert.deepEqual(PRESETS.map(p=>p.id),['value','speed','korean','hard','uncertainty']);
 const get=id=>({...DEFAULT_EXPLORE,...PRESETS.find(p=>p.id===id).patch});
 assert.deepEqual([get('value').x,get('value').y],['cost','score']);
 assert.deepEqual([get('speed').x,get('speed').y],['wall','score']);
 assert.deepEqual([get('korean').x,get('korean').y],['cost','subj:korean']);
 assert.deepEqual([get('hard').x,get('hard').y,get('hard').q.minMissShare],['cost','fAccuracy',0.3]);
 assert.deepEqual([get('uncertainty').x,get('uncertainty').y],['abstention','accuracy']);
 for(const p of PRESETS) assert.equal(typeof p.label,'string');
 assert.ok(Object.isFrozen(PRESETS)&&Object.isFrozen(DEFAULT_EXPLORE));
});
test('legacy_keys_ignored',()=>{
 assert.deepEqual(parseExplore('?year=2026&model=a'),DEFAULT_EXPLORE);
});
test('hostile_values: invalid input never throws and yields defaults or plain strings',()=>{
 const s=parseExplore('?qmiss=NaN&max=-1&open=<script>');
 assert.equal(s.q.minMissShare,null);
 assert.equal(s.maxCost,null);
 assert.equal(s.open,'<script>');
 for(const q of ['?qmiss=2','?qmiss=-0.1','?max=Infinity','?max=','?qmin=-3','?qkind=essay','?qs=korean,bogus,__proto__','?x=__proto__','?x=constructor','?cols=%E0%A4%A,score','?pick=%,,a,a','?open=%FF','?=&&=x&x','?p=%00,%00','?__proto__=1&constructor=2']) {
  const r=parseExplore(q);
  assert.ok(r.picked.every(v=>typeof v==='string')&&r.providers.every(v=>typeof v==='string'));
  assert.ok(r.open===null||typeof r.open==='string');
 }
 assert.deepEqual(parseExplore('?qs=korean,bogus,korean').q.subjects,['korean']);
 assert.equal(parseExplore('?qkind=essay').q.kind,null);
 assert.equal(parseExplore('?x=__proto__').x,'cost');
 assert.deepEqual(parseExplore('?pick=%,,a,a').picked,['a']);
 assert.equal(parseExplore(undefined).x,'cost');
 assert.equal(parseExplore(null).x,'cost');
});

test('period4_is_a_valid_metric_key',()=>{
 const s=parseExplore(serializeExplore({...DEFAULT_EXPLORE,y:'period4',cols:['score','period4']}));
 assert.equal(s.y,'period4');assert.deepEqual(s.cols,['score','period4']);
});
