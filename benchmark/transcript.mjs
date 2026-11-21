import {readFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

// Frozen text transcription of the exam PDFs, used only by models that cannot take image input.
export const TRANSCRIPT_FORMAT_VERSION=1;
const sha=data=>createHash('sha256').update(data).digest('hex');
const PAGE_PATH=/^exams\/transcripts\/\d{4}(?:-period4)?\/[a-z][a-z0-9_]*\/page-\d{2}\.md$/;
export const transcriptManifestPath=(year,session='main')=>`exams/transcripts/${year}${session==='main'?'':`-${session}`}/manifest.json`;

export function loadTranscriptManifest(root,year,session='main') {
 const path=join(root,transcriptManifestPath(year,session));
 if(!existsSync(path))throw new Error('TRANSCRIPT_BLOCKED: frozen transcript manifest is missing for this academic year');
 const raw=readFileSync(path);
 let manifest;try{manifest=JSON.parse(raw);}catch{throw new Error('TRANSCRIPT_BLOCKED: transcript manifest is not valid JSON');}
 if(manifest?.academic_year!==year||(manifest.session??'main')!==session||manifest.format_version!==TRANSCRIPT_FORMAT_VERSION||!manifest.sources||typeof manifest.sources!=='object'||!Array.isArray(manifest.figure_dependent)||manifest.figure_dependent.some(id=>typeof id!=='string'))throw new Error('TRANSCRIPT_BLOCKED: transcript manifest is invalid');
 return {manifest,hash:sha(raw)};
}

// Returns the frozen pages of one source PDF in page order; every page is hash-checked before use.
export function transcriptPages(root,manifest,pdf,pages,sourceHashes) {
 const source=manifest.sources[pdf];
 if(!source||!sourceHashes[pdf]||source.sha256!==sourceHashes[pdf])throw new Error('TRANSCRIPT_BLOCKED: transcript does not match the verified source PDF');
 let wanted=pages;
 if(!wanted) { // whole document (listening script): the manifest must record the PDF page count and list every page
  if(!Number.isSafeInteger(source.page_count)||source.page_count<1||Object.keys(source.pages).length!==source.page_count)throw new Error('TRANSCRIPT_BLOCKED: whole-document transcript is incomplete: '+pdf);
  wanted=Array.from({length:source.page_count},(_,i)=>i+1);
 }
 return wanted.map(page=>{
  const entry=source.pages[page];
  if(!entry||!PAGE_PATH.test(entry.path))throw new Error(`TRANSCRIPT_BLOCKED: transcript page is missing: ${pdf} page ${page}`);
  const data=readFileSync(join(root,entry.path));
  if(sha(data)!==entry.sha256)throw new Error(`TRANSCRIPT_BLOCKED: transcript page changed after it was frozen: ${entry.path}`);
  return {page,path:entry.path,sha256:entry.sha256,text:data.toString('utf8').trim()};
 });
}

export function groupTranscript(root,manifest,group,sourceHashes) {
 const exam=transcriptPages(root,manifest,group.pdf_path,group.pages,sourceHashes);
 const listening=group.transcript_path?transcriptPages(root,manifest,group.transcript_path,null,sourceHashes):[];
 const join2=pages=>pages.map(p=>p.text).filter(Boolean).join('\n\n');
 if(!join2(exam))throw new Error('TRANSCRIPT_BLOCKED: transcript for this group is empty');
 const text='[문제지 전사본 시작]\n'+join2(exam)+'\n[문제지 전사본 끝]'+(listening.length?'\n\n[영어 듣기 공식 대본 전사본 시작]\n'+join2(listening)+'\n[영어 듣기 공식 대본 전사본 끝]':'');
 return {text,hashes:[...exam,...listening].map(p=>p.sha256)};
}

export function verifyTranscripts(root,manifest,groups,sourceHashes) {
 for(const group of groups)groupTranscript(root,manifest,group,sourceHashes);
}
