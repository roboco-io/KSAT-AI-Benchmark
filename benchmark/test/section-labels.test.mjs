import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sectionLabel, sectionTag, trackName, SECTION_LABELS} from '../../web/lib/section-labels.mjs';

test('known ids map to Korean names',()=>{
 assert.equal(sectionLabel('common'),'공통');
 assert.equal(sectionLabel('hwajak'),'화법과 작문');
 assert.equal(sectionLabel('physics1'),'물리학Ⅰ');
 assert.equal(sectionLabel('society_culture'),'사회·문화');
 assert.ok(Object.isFrozen(SECTION_LABELS));
});

test('unknown id is returned unchanged',()=>{
 assert.equal(sectionLabel('nope'),'nope');
 assert.equal(sectionLabel('toString'),'toString');
});

test('single-section subjects show no tag',()=>{
 assert.equal(sectionTag('common'),'');
 assert.equal(sectionTag('english'),'');
 assert.equal(sectionTag('korean_history'),'');
 assert.equal(sectionTag('calculus'),'미적분');
});

test('trackName keeps the part after the separator',()=>{
 assert.equal(trackName('2026학년도 국어 · 화법과 작문','국어'),'화법과 작문');
 assert.equal(trackName('2026학년도 영어','영어'),'영어');
});

test('every dataset track and section has a label',()=>{
 const dir=new URL('../../exams/datasets/',import.meta.url);
 const files=fs.readdirSync(dir).filter(f=>f.endsWith('.json'));
 assert.ok(files.length>0);
 const ids=new Set();
 const walk=o=>{if(Array.isArray(o))o.forEach(walk);else if(o&&typeof o==='object'){for(const k of ['track','section'])if(typeof o[k]==='string')ids.add(o[k]);Object.values(o).forEach(walk);}};
 for(const f of files)walk(JSON.parse(fs.readFileSync(new URL(f,dir),'utf8')));
 for(const id of ids)assert.notEqual(sectionLabel(id),id,id);
});
