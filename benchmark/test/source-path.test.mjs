import test from 'node:test';
import assert from 'node:assert/strict';
import {sourcePath} from '../source-path.mjs';
test('PDF paths resolve to the NFC filenames stored by Git without changing dataset identifiers',()=>{
 const original='exams/pdf/2025/국어.pdf'.normalize('NFD');
 assert.equal(sourcePath('/repo',original),'/repo/exams/pdf/2025/국어.pdf');
 assert.notEqual(original,original.normalize('NFC'));
 assert.throws(()=>sourcePath('/repo','../private.pdf'),/outside repository/);
});
