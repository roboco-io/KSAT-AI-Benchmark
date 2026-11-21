// Records the SHA-256 of every transcript page so that solver runs can refuse changed text.
// Usage: node freeze-transcripts.mjs --year 2026 [--session period4] [--figures path/to/question-ids.json]
// Never sends anything to a model; it only reads local files and writes the manifest.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {yearPaths} from './academic-years.mjs';
import {sourcePath} from './source-path.mjs';
import {transcriptManifestPath,TRANSCRIPT_FORMAT_VERSION} from './transcript.mjs';
const root=resolve(import.meta.dirname,'..');
const arg=name=>{const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null;};
const year=Number(arg('--year')??2026);
const session=arg('--session')??'main';
const folderRoot=`exams/transcripts/${year}${session==='main'?'':`-${session}`}`;
const sha=data=>createHash('sha256').update(data).digest('hex');
const dataset=JSON.parse(readFileSync(join(root,yearPaths(year,session).dataset),'utf8'));
const folder={korean:'korean',math:'math',english:'english'};
// Period 4 keeps one folder per subject PDF, named by its section.
const folderOf=group=>session==='main'?folder[group.subject]:group.section;
const manifestFile=join(root,transcriptManifestPath(year,session));
const previous=existsSync(manifestFile)?JSON.parse(readFileSync(manifestFile,'utf8')):{};
const figures=arg('--figures')?JSON.parse(readFileSync(resolve(arg('--figures')),'utf8')):previous.figure_dependent??[];
const known=new Set(dataset.questions.map(q=>q.id));
for(const id of figures)if(!known.has(id))throw new Error(`Unknown figure-dependent question id: ${id}`);
const sources={},owners={};
function add(pdf,pages,dir,pageCount) {
 if((owners[dir]??=pdf)!==pdf)throw new Error(`Two source PDFs map to the same transcript folder: ${dir}`);
 const entry=sources[pdf]??={sha256:sha(readFileSync(sourcePath(root,pdf))),pages:{}};
 for(const page of pages) {
  const path=`${folderRoot}/${dir}/page-${String(page).padStart(2,'0')}.md`;
  entry.pages[page]={path,sha256:sha(readFileSync(join(root,path)))};
 }
 if(pageCount)entry.page_count=pageCount;
}
for(const group of dataset.solver_groups) {
 add(group.pdf_path,group.pages,folderOf(group));
 if(group.transcript_path) {
  const count=Number(execFileSync('pdfinfo',[sourcePath(root,group.transcript_path)],{encoding:'utf8'}).match(/^Pages:\s+(\d+)/m)[1]);
  add(group.transcript_path,Array.from({length:count},(_,i)=>i+1),'listening',count);
 }
}
const manifest={academic_year:year,...(session==='main'?{}:{session}),format_version:TRANSCRIPT_FORMAT_VERSION,frozen_at:new Date().toISOString(),method:previous.method??'Pages transcribed from the original PDF by a Claude Code session without access to answer keys, checked against the PDF text layer and by a second independent read; see exams/transcripts/README.md',sources,figure_dependent:[...new Set(figures)].sort()};
writeFileSync(manifestFile,JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({year,pages:Object.values(sources).reduce((n,s)=>n+Object.keys(s.pages).length,0),figure_dependent:manifest.figure_dependent.length}));
