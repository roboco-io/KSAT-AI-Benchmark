import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {yearPaths,modelsForYear,MODELS_2027} from '../academic-years.mjs';
import {buildSolverPrompt,CLOSED_BOOK_NOTE} from '../solver-prompt.mjs';
const root=join(import.meta.dirname,'../..');
test('2027 period 4 dataset covers Korean history and 17 social/science inquiry subjects with 50-point keys',()=>{
 const paths=yearPaths(2027,'period4');
 const dataset=JSON.parse(readFileSync(join(root,paths.dataset),'utf8'));
 assert.equal(dataset.session,'period4');
 assert.equal(dataset.exams.length,18);assert.equal(dataset.questions.length,360);
 for(const exam of dataset.exams) {
  const qs=dataset.questions.filter(q=>exam.question_ids.includes(q.id));
  assert.equal(qs.length,20);assert.equal(qs.reduce((s,q)=>s+q.points,0),50);
  assert.ok(qs.every(q=>q.kind==='multiple_choice'&&q.correct_answer>=1&&q.correct_answer<=5));
 }
 const manifest=JSON.parse(readFileSync(join(root,paths.manifest),'utf8'));
 for(const group of dataset.solver_groups)assert.ok(manifest.files.some(f=>f.path===group.pdf_path&&f.kind==='exam'));
 const q=Object.fromEntries(dataset.questions.map(x=>[x.id,x]));
 assert.equal(q['2027-p4-korean_history-q01'].correct_answer,3);assert.equal(q['2027-p4-ethics_life-q06'].correct_answer,2);
});
test('period 4 runs keep separate result directories and a closed-book prompt',()=>{
 assert.deepEqual(modelsForYear(2027,'period4').map(m=>m.id),MODELS_2027);
 assert.equal(modelsForYear(2027,'period4').find(m=>m.id==='glm-5.3-flash').directory,'results/pi-2027-period4-glm-5.3-flash');
 assert.equal(yearPaths(2027,'period4').comparison,'benchmark-comparison-2027-period4.json');
 assert.throws(()=>yearPaths(2026,'period4'),/session not supported/i);
 assert.ok(buildSolverPrompt(2027,2,'period4').endsWith(CLOSED_BOOK_NOTE));
 assert.equal(buildSolverPrompt(2027,2),buildSolverPrompt(2027,2,'main'));
});
