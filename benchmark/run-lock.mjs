import {mkdirSync,openSync,writeFileSync,closeSync,readFileSync,unlinkSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
export function acquireRunLock(path,state={}) {
 const active=Object.values(state.groups||{}).some(g=>g.attempts?.some(a=>a.status==='running'));
 if(active&&Date.now()-Date.parse(state.updated_at)<30000)throw new Error('RUN_BUSY: existing invocation is updating this run; do not duplicate API requests');
 mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const nonce=randomUUID();let fd;
 try{fd=openSync(path,'wx',0o600);}catch(error){
  if(error.code!=='EEXIST')throw error;
  let previous;try{previous=JSON.parse(readFileSync(path,'utf8'));}catch{throw new Error('RUN_BUSY: run lock needs inspection');}
  if(!Number.isSafeInteger(previous.pid)||previous.pid<=0)throw new Error('RUN_BUSY: invalid run lock needs inspection');
  try{process.kill(previous.pid,0);throw new Error('RUN_BUSY: another invocation owns this model run');}catch(error){if(error.code!=='ESRCH')throw error;}
  unlinkSync(path);
  try{fd=openSync(path,'wx',0o600);}catch{throw new Error('RUN_BUSY: another invocation acquired this model run');}
 }
 try{writeFileSync(fd,JSON.stringify({pid:process.pid,nonce,started_at:new Date().toISOString()})+'\n');}finally{closeSync(fd);}
 return ()=>{
  try{const owner=JSON.parse(readFileSync(path,'utf8'));if(owner.pid===process.pid&&owner.nonce===nonce)unlinkSync(path);}catch{}
 };
}
