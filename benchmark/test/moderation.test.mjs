import test from 'node:test';
import assert from 'node:assert/strict';
import * as moderation from '../moderation.mjs';

test('repeated content inspection blocks stop a group even after a later timeout',()=>{
 const error='PI_TURN_FAILED: provider did not finish a complete answer; code=DataInspectionFailed';
 assert.equal(moderation.repeatedInspectionBlock([{error}]),false);
 assert.equal(moderation.repeatedInspectionBlock([{error},{error},{error:'PI_ABORTED: timed out'}]),true);
 assert.equal(moderation.repeatedInspectionBlock([{error:'PI_ABORTED'},{error:'output token limit'}]),false);
});

test('content inspection classification preserves input and output scope',()=>{
 assert.equal(moderation.inspectionScope('InternalError.Algo.DataInspectionFailed: Output data may contain inappropriate content.'),'output');
 assert.equal(moderation.inspectionScope('data_inspection_failed: Input data may contain inappropriate content.'),'input');
 assert.equal(moderation.inspectionScope('code=DataInspectionFailed'),'unspecified');
 assert.equal(moderation.inspectionScope('InternalError: connection reset'),null);
});
