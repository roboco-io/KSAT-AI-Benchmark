import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {loadTranscriptManifest,transcriptPages,groupTranscript,verifyTranscripts,transcriptManifestPath} from '../transcript.mjs';
import {validateProfile,loadProfiles} from '../profiles.mjs';
import {buildSolverPrompt} from '../solver-prompt.mjs';
import {piEvents} from '../pi-adapter.mjs';
import {buildReport,figureFreeSummary} from '../report.mjs';
import {createPacer} from '../core.mjs';

const sha=data=>createHash('sha256').update(data).digest('hex');
const exam='exams/pdf/2026/exam.pdf',script='exams/pdf/2026/script.pdf';
function fixture() {
 const root=mkdtempSync(join(tmpdir(),'ksat-transcript-'));
 const pages={[exam]:{1:'1. 첫 문항\n① 가\n',2:'2. 둘째 문항\n'},[script]:{1:'W: Hello.\n',2:'\n'}};
 const sourceHashes={[exam]:'a'.repeat(64),[script]:'b'.repeat(64)};
 const sources={};
 for(const [pdf,list] of Object.entries(pages)) {
  const dir=pdf===exam?'korean':'listening';
  mkdirSync(join(root,`exams/transcripts/2026/${dir}`),{recursive:true});
  sources[pdf]={sha256:sourceHashes[pdf],pages:{},...(pdf===script?{page_count:2}:{})};
  for(const [page,text] of Object.entries(list)) {
   const path=`exams/transcripts/2026/${dir}/page-0${page}.md`;
   writeFileSync(join(root,path),text);
   sources[pdf].pages[page]={path,sha256:sha(text)};
  }
 }
 const write=manifest=>writeFileSync(join(root,transcriptManifestPath(2026)),JSON.stringify(manifest));
 const manifest={academic_year:2026,format_version:1,sources,figure_dependent:['q2']};
 write(manifest);
 return {root,sourceHashes,manifest,write};
}

test('frozen transcript pages are joined in page order and listening script follows the exam text',()=>{
 const {root,sourceHashes}=fixture();
 const {manifest,hash}=loadTranscriptManifest(root,2026);
 assert.match(hash,/^[0-9a-f]{64}$/);
 const plain=groupTranscript(root,manifest,{pdf_path:exam,pages:[1,2]},sourceHashes);
 assert.equal(plain.text,'[문제지 전사본 시작]\n1. 첫 문항\n① 가\n\n2. 둘째 문항\n[문제지 전사본 끝]');
 assert.equal(plain.hashes.length,2);
 const listening=groupTranscript(root,manifest,{pdf_path:exam,pages:[2],transcript_path:script},sourceHashes);
 assert.ok(listening.text.endsWith('[영어 듣기 공식 대본 전사본 시작]\nW: Hello.\n[영어 듣기 공식 대본 전사본 끝]'));
 assert.equal(listening.hashes.length,3); // blank script pages are hash-checked but add no text
 verifyTranscripts(root,manifest,[{pdf_path:exam,pages:[1]},{pdf_path:exam,pages:[2],transcript_path:script}],sourceHashes);
});

test('changed, missing or mismatched transcript input is refused before any request',()=>{
 const {root,sourceHashes,manifest,write}=fixture();
 assert.throws(()=>loadTranscriptManifest(root,2025),/TRANSCRIPT_BLOCKED: frozen transcript manifest is missing/);
 assert.throws(()=>transcriptPages(root,manifest,exam,[3],sourceHashes),/transcript page is missing/);
 assert.throws(()=>transcriptPages(root,manifest,exam,[1],{...sourceHashes,[exam]:'c'.repeat(64)}),/does not match the verified source PDF/);
 assert.throws(()=>transcriptPages(root,manifest,'exams/pdf/2026/other.pdf',[1],sourceHashes),/does not match the verified source PDF/);
 writeFileSync(join(root,'exams/transcripts/2026/korean/page-01.md'),'1. 바뀐 문항\n');
 assert.throws(()=>groupTranscript(root,manifest,{pdf_path:exam,pages:[1]},sourceHashes),/changed after it was frozen: exams\/transcripts\/2026\/korean\/page-01\.md/);
 const short=structuredClone(manifest);delete short.sources[script].pages[2];
 assert.throws(()=>groupTranscript(root,short,{pdf_path:exam,pages:[2],transcript_path:script},sourceHashes),/whole-document transcript is incomplete/);
 const uncounted=structuredClone(manifest);delete uncounted.sources[script].page_count;
 assert.throws(()=>transcriptPages(root,uncounted,script,null,sourceHashes),/whole-document transcript is incomplete/);
 const escaped=structuredClone(manifest);escaped.sources[exam].pages[2].path='../outside.md';
 assert.throws(()=>transcriptPages(root,escaped,exam,[2],sourceHashes),/transcript page is missing/);
 write({...manifest,format_version:2});
 assert.throws(()=>loadTranscriptManifest(root,2026),/manifest is invalid/);
 write({...manifest,figure_dependent:'q2'});
 assert.throws(()=>loadTranscriptManifest(root,2026),/manifest is invalid/);
});

test('text input may be declared only by Pi profiles and both text-only models are registered that way',()=>{
 const base={id:'fixture-text',label:'Fixture text',provider:'vendor',agent:'pi',directory:'results/pi-2026-fixture-text',input:'text',pricing:{input_per_million:0,cached_input_per_million:0,cache_write_per_million:0,output_per_million:0,currency:'USD',as_of:'2026-11-19',basis:'fixture',source:'https://example.org/pricing'},pi:{provider:'ksat-pi',model_id:'fixture',base_url:'https://example.org/v1',secret_name:'FIXTURE_API_KEY',context_window:1000,max_tokens:100}};
 assert.equal(validateProfile(base),base);
 assert.throws(()=>validateProfile({...base,input:'image'}),/input may only declare text/);
 const {pi,...sdk}=base;
 assert.throws(()=>validateProfile({...sdk,provider:'openai',agent:'codex',directory:'results/codex-2026-fixture-text'}),/input may only declare text/);
 const profiles=loadProfiles(resolve(import.meta.dirname,'../profiles'));
 for(const [id,modelId,secret] of [['solar-pro-4','solar-pro4-260806','UPSTAGE_API_KEY'],['k-exaone-2.5','k-exaone_v2.5','EXAONE_API_KEY']]) {
  const model=profiles.find(profile=>profile.id===id);
  assert.equal(model.input,'text');assert.equal(model.pi.model_id,modelId);assert.equal(model.pi.secret_name,secret);
 }
 assert.equal(profiles.find(profile=>profile.id==='gemini-4-argon').input,undefined);
 assert.equal(profiles.find(profile=>profile.id==='k-exaone-2.5').publish,false);assert.equal(profiles.find(profile=>profile.id==='solar-pro-4').publish,undefined);
 assert.equal(validateProfile({...base,publish:false}).publish,false);
 assert.throws(()=>validateProfile({...base,publish:true}),/publish may only be set to false/);
});

test('a text-only Pi model never receives images',async()=>{
 const model={id:'fixture-text',input:'text',pi:{provider:'ksat-pi',model_id:'fixture',base_url:'https://example.org/v1',context_window:1000,max_tokens:100}};
 await assert.rejects(async()=>{for await(const event of piEvents({model,prompt:'Solve.',images:['/tmp/page.png'],schema:{type:'object'},apiKey:'offline-test-key'}))assert.fail(event.type);},/PI_BLOCKED: this model takes the frozen text transcript only/);
});

test('prompt version 3 describes the transcript and leaves locked versions unchanged',()=>{
 const image=buildSolverPrompt(2026,2),text=buildSolverPrompt(2026,3);
 assert.match(image,/제공한 원본 이미지와/);assert.match(image,/공식 대본 이미지가/);
 assert.doesNotMatch(text,/원본 이미지|대본 이미지/);
 assert.match(text,/제공한 문제지 전사본과/);assert.match(text,/공식 대본 전사본이/);assert.match(text,/\[그림 시작\]/);assert.match(text,/unsupported_input/);assert.match(text,/LaTeX/);
});

test('text-transcript reports state the input condition and add a score without figure-dependent questions',()=>{
 const questions=[{id:'plain',kind:'multiple_choice',correct_answer:1,points:2},{id:'figure',kind:'multiple_choice',correct_answer:2,points:4},{id:'other',kind:'multiple_choice',correct_answer:3,points:3}];
 const dataset={questions,solver_groups:[{id:'group',question_ids:['plain','figure','other']}],exams:[{id:'exam',question_ids:['plain','figure','other'],max_score:9}]};
 const answer=value=>({decision:'answered',answer:value,explanation:'',abstain_reason:null});
 const run={run_id:'text',academic_year:2026,phase:'pre_exam',protocol:{model:'solar-pro-4',agent:'Pi',effort_semantics:'high',input:'frozen text transcription of the original PDF, format version 1'},completed:true,answers:{plain:answer(1),figure:answer(5),other:answer(3)},errors:{},wall_time_seconds:1,usage:{input_tokens:10,output_tokens:10},groups:{group:{attempts:[{usage:{input_tokens:10,output_tokens:10},time_seconds:1}]}}};
 const report=buildReport(dataset,run,[],{},'Pi CLI',['figure','not-in-dataset']);
 assert.equal(report.input_mode,'text_transcript');
 assert.equal(report.summary.correct,2);assert.equal(report.summary.total_questions,3);
 assert.deepEqual(report.figure_dependent.excluded_question_ids,['figure']);
 assert.equal(report.figure_dependent.total_questions,2);assert.equal(report.figure_dependent.correct,2);assert.equal(report.figure_dependent.accuracy,100);assert.equal(report.figure_dependent.score,5);assert.equal(report.figure_dependent.max_score,5);
 assert.deepEqual(report.figure_dependent.exams,[{id:'exam',excluded:1,score:5,max_score:5,correct:2,total_questions:2}]);
 assert.ok(report.limitations.some(text=>text.includes('텍스트 전사본으로 평가했습니다')));
 assert.ok(!report.limitations.some(text=>text.includes('대본 이미지')||text.includes('200 DPI 이미지')));
 const imageReport=buildReport(dataset,{...run,protocol:{...run.protocol,input:'original PDF rendered at 200 DPI'}},[],{},'Pi CLI',['figure']);
 assert.equal(imageReport.input_mode,undefined);assert.equal(imageReport.figure_dependent,undefined);
 assert.ok(imageReport.limitations.some(text=>text.includes('200 DPI 이미지')));
 assert.equal(figureFreeSummary([],['figure']).accuracy,0);
});

test('the frozen 2026 transcript covers every solver group and lists only real questions',()=>{
 const root=resolve(import.meta.dirname,'../..');
 if(!existsSync(join(root,transcriptManifestPath(2026))))return; // not frozen yet in this checkout
 const {manifest}=loadTranscriptManifest(root,2026);
 const dataset=JSON.parse(readFileSync(join(root,'exams/datasets/2026-ksat.json'),'utf8'));
 const sourceHashes=Object.fromEntries(Object.entries(manifest.sources).map(([pdf,source])=>[pdf,source.sha256]));
 const listed=JSON.parse(readFileSync(join(root,'exams/pdf/2026/sources.json'),'utf8')).files;
 for(const [pdf,hash] of Object.entries(sourceHashes))assert.equal(listed.find(file=>file.path===pdf)?.sha256,hash);
 verifyTranscripts(root,manifest,dataset.solver_groups,sourceHashes);
 const ids=new Set(dataset.questions.map(question=>question.id));
 for(const id of manifest.figure_dependent)assert.ok(ids.has(id),id);
 for(const group of dataset.solver_groups) {
  const {text}=groupTranscript(root,manifest,group,sourceHashes);
  assert.doesNotMatch(text,/판독 불가|정답표|&lt;|&gt;/);
  assert.equal((text.match(/\[그림 시작\]/g)||[]).length,(text.match(/\[그림 끝\]/g)||[]).length);
 }
});

test('request pacing spaces concurrent starts by the provider interval and is off by default',async()=>{
 let clock=1000;const slept=[];
 const pace=createPacer(2000,()=>clock,async ms=>{slept.push(ms);});
 assert.deepEqual(await Promise.all([pace(),pace(),pace()]),[0,2000,4000]);
 assert.deepEqual(slept,[2000,4000]);
 clock=20000;assert.equal(await pace(),0);
 assert.equal(await createPacer(undefined)(),0);
 const base={id:'fixture-pace',label:'Fixture',provider:'vendor',agent:'pi',directory:'results/pi-2026-fixture-pace',pricing:{input_per_million:0,cached_input_per_million:0,cache_write_per_million:0,output_per_million:0,currency:'USD',as_of:'2026-11-19',basis:'fixture',source:'https://example.org/pricing'},pi:{provider:'ksat-pi',model_id:'fixture',base_url:'https://example.org/v1',secret_name:'FIXTURE_API_KEY',context_window:1000,max_tokens:100,min_request_interval_ms:2000}};
 assert.equal(validateProfile(base),base);
 assert.throws(()=>validateProfile({...base,pi:{...base.pi,min_request_interval_ms:0}}),/request interval/);
});
