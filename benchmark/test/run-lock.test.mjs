import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {acquireRunLock} from '../run-lock.mjs';
test('a live run cannot be duplicated and release does not delete another owner',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ksat-lock-test-')),path=join(dir,'lock.json');
 try {
  const release=acquireRunLock(path,{});
  assert.throws(()=>acquireRunLock(path,{}),/RUN_BUSY/);
  writeFileSync(path,JSON.stringify({pid:process.pid,nonce:'other-owner'}));
  release();assert.equal(existsSync(path),true);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('dead locks can be reclaimed but a fresh legacy heartbeat stays protected',()=>{
 const dir=mkdtempSync(join(tmpdir(),'ksat-lock-test-')),path=join(dir,'lock.json');
 try {
  writeFileSync(path,JSON.stringify({pid:999999999,nonce:'dead-owner'}));
  const release=acquireRunLock(path,{});release();assert.equal(existsSync(path),false);
  const state={updated_at:new Date().toISOString(),groups:{one:{attempts:[{status:'running'}]}}};
  assert.throws(()=>acquireRunLock(path,state),/RUN_BUSY/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
