import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildSolverPrompt} from '../solver-prompt.mjs';

test('legacy resume keeps the exact locked 2025 and 2026 prompts',()=>{
 for(const year of [2025,2026]){
  const directory=year===2026?'codex-2026':'codex-2025-gpt-6.1-sol';
  const state=JSON.parse(readFileSync(new URL(`../../results/${directory}/run.json`,import.meta.url)));
  assert.equal(createHash('sha256').update(buildSolverPrompt(year,1)).digest('hex'),state.prompt_hash);
 }
});
test('new runs request delimited LaTeX in explanations while retaining the original answer schema',()=>{
 const old=buildSolverPrompt(2025,1),current=buildSolverPrompt(2025,2);
 assert.ok(current.startsWith(old));assert.match(current,/LaTeX/);assert.match(current,/explanation/);assert.match(current,/\$\.\.\.\$/);assert.match(current,/answer.*정수/);assert.notEqual(current,old);
 assert.throws(()=>buildSolverPrompt(2025,99),/version/);
});
