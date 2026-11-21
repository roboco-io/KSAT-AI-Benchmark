import test from 'node:test';
import assert from 'node:assert/strict';
import {academicYearFromSearch,academicYearUrl} from '../../web/lib/academic-year.mjs';
test('only available academic years can be selected, including direct query links',()=>{
 assert.equal(academicYearFromSearch('?year=2025'),2025);
 assert.equal(academicYearFromSearch('?year=2026&model=gemini-4-argon'),2026);
 assert.equal(academicYearFromSearch('?year=2027'),2027);
 for(const value of ['', '?year=2028','?year=2025junk','?year=unknown'])assert.equal(academicYearFromSearch(value),2027);
});
test('year changes clear model and question state while preserving unrelated sharing parameters',()=>{
 assert.equal(academicYearUrl('https://roboco.io/KSAT-AI-Benchmark/?model=gemini-4-argon&campaign=sns&subject=english&question=37#model-records',2025),'https://roboco.io/KSAT-AI-Benchmark/?campaign=sns&year=2025');
 assert.throws(()=>academicYearUrl('https://roboco.io/KSAT-AI-Benchmark/',2028),/unavailable/);
});
test('2027 exam session follows ?session=period4 and resets on year change',async()=>{
 const {examSessionFromSearch,examSessionUrl}=await import('../../web/lib/academic-year.mjs');
 assert.equal(examSessionFromSearch('?year=2027&session=period4'),'period4');
 assert.equal(examSessionFromSearch('?session=other'),'main');
 assert.equal(examSessionUrl('https://x.test/?year=2027&model=a#q','period4'),'https://x.test/?year=2027&session=period4');
 assert.equal(examSessionUrl('https://x.test/?year=2027&session=period4','main'),'https://x.test/?year=2027');
 assert.equal(academicYearUrl('https://x.test/?year=2027&session=period4',2026),'https://x.test/?year=2026');
});
