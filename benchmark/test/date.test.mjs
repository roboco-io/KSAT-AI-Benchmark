import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatKst} from '../../web/lib/format-date.mjs';
test('static and browser timestamps use identical Korean-time text independent of ICU locale',()=>{
 assert.equal(formatKst('2026-10-12T10:03:00.000Z'),'2026-10-12 19:03');
 assert.equal(formatKst('2026-10-12T23:55:00Z'),'2026-10-13 08:55');
 assert.equal(formatKst(''),'결과 생성 대기');
 assert.equal(formatKst('invalid'),'결과 생성 대기');
});
