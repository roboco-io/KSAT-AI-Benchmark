import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,existsSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {renderPages} from '../render.mjs';

test('render cache publishes complete images only and reuses completed files',t=>{
 const root=mkdtempSync(join(tmpdir(),'ksat-render-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const renderDir=join(root,'cache'),prefix=join(renderDir,'1234567890-1');let sawPartial=false;
 const exec=(command,args)=>{
  const path=command==='pdftoppm'?args.at(-1)+'.png':args.at(-1);
  writeFileSync(path,'first');
  sawPartial ||=existsSync(command==='pdftoppm'?prefix+'.png':prefix+'.webp');
  writeFileSync(path,'complete');
 };
 const options={root,renderDir,pdf:'fixture.pdf',pages:[1],sourceHashes:{'fixture.pdf':'1234567890abcdef'},exec};
 assert.deepEqual(renderPages(options),[prefix+'.webp']);
 assert.equal(sawPartial,false);
 assert.equal(readFileSync(prefix+'.webp','utf8'),'complete');
 assert.deepEqual(renderPages({...options,exec:()=>{throw new Error('unexpected regeneration');}}),[prefix+'.webp']);
 assert.deepEqual(readdirSync(renderDir).sort(),['1234567890-1.png','1234567890-1.webp']);
});
