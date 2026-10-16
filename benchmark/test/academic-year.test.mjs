import test from 'node:test';
import assert from 'node:assert/strict';
import {academicYearFromSearch,academicYearUrl} from '../../web/lib/academic-year.mjs';
test('only available academic years can be selected, including direct query links',()=>{
 assert.equal(academicYearFromSearch('?year=2025'),2025);
 assert.equal(academicYearFromSearch('?year=2026&model=gemini-4-argon'),2026);
 for(const value of ['', '?year=2027','?year=2025junk','?year=unknown'])assert.equal(academicYearFromSearch(value),2026);
});
test('year changes clear model and question state while preserving unrelated sharing parameters',()=>{
 assert.equal(academicYearUrl('https://roboco.io/KSAT-AI-Benchmark/?model=gemini-4-argon&campaign=sns&subject=english&question=37#model-records',2025),'https://roboco.io/KSAT-AI-Benchmark/?campaign=sns&year=2025');
 assert.throws(()=>academicYearUrl('https://roboco.io/KSAT-AI-Benchmark/',2027),/unavailable/);
});
