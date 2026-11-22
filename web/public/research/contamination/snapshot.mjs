// Read-only snapshot: grades results/*/run.json with the benchmark's own buildReport and
// writes compact per-question records under research/contamination/inputs. No model calls.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {modelsForYear,yearPaths} from '../../benchmark/academic-years.mjs';
import {buildReport} from '../../benchmark/report.mjs';
const root=resolve(import.meta.dirname,'../..'),out=join(import.meta.dirname,'inputs');
const sha=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
const manifest=[];
for(const year of [2025,2026,2027]) {
 const paths=yearPaths(year,'main'),datasetPath=join(root,paths.dataset);
 const dataset=JSON.parse(readFileSync(datasetPath,'utf8'));
 manifest.push({source:paths.dataset,sha256:sha(datasetPath)});
 const models=[];
 for(const model of modelsForYear(year,'main')) {
  const path=join(root,model.directory,'run.json');
  if(!existsSync(path))continue;
  const run=JSON.parse(readFileSync(path,'utf8'));
  const report=buildReport(dataset,run,[],model.pricing,'');
  manifest.push({source:join(model.directory,'run.json'),sha256:sha(path)});
  models.push({model:model.id,provider:model.provider,directory:model.directory,started_at:run.started_at,completed:!!run.completed,
   prompt_version:run.prompt_version??null,prompt_hash:run.prompt_hash,protocol:run.protocol,summary:report.summary,
   exams:report.exams.map(e=>({id:e.id,subject:e.subject,track:e.track,max_score:e.max_score,question_ids:e.question_ids})),
   questions:report.questions.map(q=>({id:q.id,number:q.number,subject:q.subject,section:q.section,kind:q.kind,points:q.points,
    correct_answer:q.correct_answer,accepted_answers:q.accepted_answers,status:q.status,answer:q.answer,time_seconds:q.time_seconds}))});
 }
 writeFileSync(join(out,`${year}-answers.json`),JSON.stringify({academic_year:year,exam_date:dataset.exam_date??null,models},null,1)+'\n');
 console.log(year,dataset.exam_date,models.map(m=>`${m.model}:${m.summary.score}/${m.summary.max_score}${m.completed?'':'(partial)'}`).join(' '));
}
writeFileSync(join(out,'manifest.json'),JSON.stringify(manifest,null,1)+'\n');
