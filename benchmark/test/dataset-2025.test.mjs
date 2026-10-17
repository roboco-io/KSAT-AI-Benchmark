import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {yearPaths} from '../academic-years.mjs';

const root=new URL('../../',import.meta.url);
const paths=yearPaths(2025);
const readJson=path=>JSON.parse(readFileSync(new URL(path,root),'utf8'));
const dataset=readJson(paths.dataset);
const manifest=readJson(paths.manifest);
const questions=new Map(dataset.questions.map(question=>[question.id,question]));

test('selected 2025 dataset contains the complete odd exam with valid question types and answers',()=>{
 assert.equal(dataset.academic_year,2025);
 assert.equal(dataset.exam_date,'2024-11-14');
 assert.equal(dataset.variant,'odd');
 assert.equal(dataset.questions.length,147);
 assert.equal(questions.size,147);
 const counts={};
 for(const question of dataset.questions){
  const {id,number,subject,section,kind,points,correct_answer:answer,source_page:page}=question;
  assert.equal(id,`2025-${subject}-${section}-q${String(number).padStart(2,'0')}`);
  assert.ok(Number.isInteger(number)&&number>0,id);
  assert.ok(Number.isInteger(page)&&page>0,id);
  assert.ok([2,3,4].includes(points),id);
  const short=subject==='math'&&(section==='common'?number>=16:number>=29);
  assert.equal(kind,short?'short_answer':'multiple_choice',id);
  assert.ok(Number.isInteger(answer)&&answer>=(short?0:1)&&answer<=(short?999:5),id);
  const key=`${subject}/${section}`;
  counts[key]=(counts[key]??0)+1;
 }
 assert.deepEqual(counts,{'korean/common':34,'korean/hwajak':11,'korean/language_media':11,
  'math/common':22,'math/probability':8,'math/calculus':8,'math/geometry':8,'english/english':45});
});

test('all six 2025 tracks contain their full question sequence and score exactly 100',()=>{
 assert.equal(dataset.exams.length,6);
 assert.equal(new Set(dataset.exams.map(exam=>exam.id)).size,6);
 for(const exam of dataset.exams){
  assert.equal(exam.id,`2025-${exam.subject}-${exam.track}`);
  const selected=exam.question_ids.map(id=>{
   assert.ok(questions.has(id),id);
   return questions.get(id);
  });
  assert.equal(new Set(exam.question_ids).size,exam.question_ids.length,exam.id);
  assert.deepEqual(selected.map(question=>question.number),Array.from({length:exam.subject==='math'?30:45},(_,i)=>i+1),exam.id);
  assert.ok(selected.every(question=>question.subject===exam.subject&&(question.section==='common'||question.section===exam.track)),exam.id);
  assert.equal(selected.reduce((sum,question)=>sum+question.points,0),100,exam.id);
  assert.equal(exam.max_score,100,exam.id);
 }
});

test('solver groups partition 2025 questions and cover every source page with the correct PDF',()=>{
 const grouped=[];
 for(const group of dataset.solver_groups){
  assert.equal(group.id,`2025-${group.subject}-${group.section}`);
  const source=manifest.files.find(file=>file.subject===group.subject&&file.kind==='exam');
  assert.ok(source,group.id);
  assert.equal(group.pdf_path,source.path,group.id);
  assert.ok(group.pages.length>0,group.id);
  assert.equal(new Set(group.pages).size,group.pages.length,group.id);
  assert.ok(group.pages.every(page=>Number.isInteger(page)&&page>=1&&page<=source.pages),group.id);
  for(const id of group.question_ids){
   const question=questions.get(id);
   assert.ok(question,id);
   assert.equal(question.subject,group.subject,id);
   assert.equal(question.section,group.section,id);
   assert.ok(group.pages.includes(question.source_page),id);
   grouped.push(id);
  }
  if(group.subject==='english'){
   const transcript=manifest.files.find(file=>file.subject==='english'&&file.kind==='listening_transcript');
   assert.ok(transcript);
   assert.equal(group.transcript_path,transcript.path);
  }
 }
 assert.equal(grouped.length,147);
 assert.equal(new Set(grouped).size,147);
 assert.deepEqual([...grouped].sort(),[...questions.keys()].sort());
});

test('2025 manifest identifies official sources and matches every local PDF hash and size',()=>{
 assert.equal(manifest.academic_year,2025);
 assert.equal(manifest.exam_date,'2024-11-14');
 assert.equal(manifest.files.length,7);
 assert.equal(new Set(manifest.files.map(file=>file.path)).size,7);
 for(const file of manifest.files){
  assert.ok(file.path.startsWith('exams/pdf/2025/'),file.path);
  assert.equal(new URL(file.source_page).hostname,'www.suneung.re.kr');
  assert.equal(new URL(file.download_url).hostname,'www.suneung.re.kr');
  const bytes=readFileSync(new URL(file.path,root));
  assert.equal(bytes.subarray(0,5).toString(),'%PDF-',file.path);
  assert.equal(bytes.length,file.size_bytes,file.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path);
 }
 for(const subject of ['korean','math','english']){
  for(const kind of ['exam','answer_key'])assert.equal(manifest.files.filter(file=>file.subject===subject&&file.kind===kind).length,1);
 }
});

test('visually verified 2025 official anchors retain their academic year and option-specific answers',()=>{
 const anchors={'2025-english-english-q37':3,'2025-math-common-q22':64,
  '2025-math-geometry-q30':316,'2025-korean-common-q34':2,'2025-korean-language_media-q45':3};
 for(const [id,answer] of Object.entries(anchors))assert.equal(questions.get(id)?.correct_answer,answer,id);
});
