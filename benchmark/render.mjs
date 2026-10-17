import {existsSync,mkdirSync,renameSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';

export function renderPages({root,renderDir,pdf,pages,sourceHashes,exec=execFileSync}) {
 mkdirSync(renderDir,{recursive:true});
 return pages.map(page=>{
  const prefix=join(renderDir,`${sourceHashes[pdf].slice(0,10)}-${page}`);
  const temporary=join(renderDir,`.render-${process.pid}-${randomUUID()}`);
  try {
   if(!existsSync(prefix+'.png')) {
    exec('pdftoppm',['-f',String(page),'-l',String(page),'-r','200','-singlefile','-png',join(root,pdf),temporary],{stdio:'ignore'});
    renameSync(temporary+'.png',prefix+'.png');
   }
   if(!existsSync(prefix+'.webp')) {
    exec('cwebp',['-lossless','-z','6',prefix+'.png','-o',temporary+'.webp'],{stdio:'ignore'});
    renameSync(temporary+'.webp',prefix+'.webp');
   }
   return prefix+'.webp';
  } finally {
   rmSync(temporary+'.png',{force:true});rmSync(temporary+'.webp',{force:true});
  }
 });
}
