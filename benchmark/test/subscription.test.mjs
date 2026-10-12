import {test} from 'node:test';
import assert from 'node:assert/strict';
import {subscriptionEnvironment, assertIncludedCodexUsage, assertFreshClaudeProof} from '../subscription.mjs';
test('subscription child cannot inherit API or cloud provider credentials',()=>{
 const clean=subscriptionEnvironment({PATH:'/bin',HOME:'/real',OPENAI_API_KEY:'not-real',CODEX_API_KEY:'not-real',ANTHROPIC_API_KEY:'not-real',ANTHROPIC_AUTH_TOKEN:'not-real',CLAUDE_CODE_USE_VERTEX:'1',ANTHROPIC_BASE_URL:'https://example.invalid'});
 assert.equal(clean.PATH,'/bin');assert.equal(clean.HOME,'/real');assert.equal(clean.OPENAI_API_KEY,undefined);assert.equal(clean.CODEX_API_KEY,undefined);assert.equal(clean.ANTHROPIC_API_KEY,undefined);assert.equal(clean.ANTHROPIC_BASE_URL,undefined);
});
test('quota exhaustion, API auth or credit billing refuses a model request',()=>{
 const included={ordinaryUsageAllowed:true,rateLimits:{primary:{usedPercent:30},credits:{hasCredits:false,unlimited:false,balance:'0'}}};
 assert.doesNotThrow(()=>assertIncludedCodexUsage({type:'chatgpt'},included));
 assert.throws(()=>assertIncludedCodexUsage({type:'apiKey'},included));
 assert.throws(()=>assertIncludedCodexUsage({type:'chatgpt'},{...included,ordinaryUsageAllowed:false}));
 assert.throws(()=>assertIncludedCodexUsage({type:'chatgpt'},{...included,rateLimits:{...included.rateLimits,primary:{usedPercent:100}}}));
 assert.throws(()=>assertIncludedCodexUsage({type:'chatgpt'},{...included,rateLimits:{...included.rateLimits,credits:{hasCredits:true,unlimited:false,balance:'100'}}}));
});
test('expired or changed-account OFF proof cannot authorize a new prompt',()=>{
 const proof={extra_usage_disabled:true,verified_at:'2026-10-12T10:00:00Z',account_fingerprint:'same'};
 const now=Date.parse('2026-10-12T10:05:00Z');
 assert.doesNotThrow(()=>assertFreshClaudeProof(proof,'same',now));
 assert.throws(()=>assertFreshClaudeProof(proof,'other',now));
 assert.throws(()=>assertFreshClaudeProof(proof,'same',Date.parse('2026-10-12T10:31:00Z')));
 assert.throws(()=>assertFreshClaudeProof({...proof,extra_usage_disabled:false},'same',now));
});
