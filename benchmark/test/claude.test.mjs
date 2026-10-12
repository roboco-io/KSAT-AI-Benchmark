import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeClaudeUsage, claudeCompletionEvent, claudeModelMatches, assertClaudeSubscription, assertClaudeEvent} from '../claude-adapter.mjs';

test('usage includes cache reads and writes once across every result model', () => {
 const result={modelUsage:{'claude-sonnet-5-5':{inputTokens:100,cacheReadInputTokens:200,cacheCreationInputTokens:30,outputTokens:40},'claude-haiku-5-5':{inputTokens:5,cacheReadInputTokens:6,cacheCreationInputTokens:7,outputTokens:8}},usage:{input_tokens:999,output_tokens:999}};
 assert.deepEqual(normalizeClaudeUsage(result),{input_tokens:348,cached_input_tokens:206,cache_write_input_tokens:37,output_tokens:48,reasoning_output_tokens:0});
});

test('missing or malformed model usage fails instead of understating tokens', () => {
 for (const result of [{usage:{input_tokens:1}},{modelUsage:{}},{modelUsage:{x:{inputTokens:1,cacheReadInputTokens:0,cacheCreationInputTokens:-1,outputTokens:2}}}]) assert.throws(()=>normalizeClaudeUsage(result),/usage/i);
});

test('exact requested model rejects silent fallback and ambiguous aliases', () => {
 assert.equal(claudeModelMatches('claude-sonnet-5-5','claude-sonnet-5-5'),true);
 assert.equal(claudeModelMatches('claude-sonnet-5-5','claude-sonnet-5-5-20261001'),true);
 assert.equal(claudeModelMatches('claude-sonnet-5-5','claude-sonnet-5-4'),false);
 assert.equal(claudeModelMatches('claude-opus-5-5','claude-sonnet-5-5'),false);
 assert.equal(claudeModelMatches('sonnet','claude-sonnet-5-5'),false);
});

test('authentication requires personal first party subscription OAuth without an API key', () => {
 assert.doesNotThrow(()=>assertClaudeSubscription({apiProvider:'firstParty',subscriptionType:'max',tokenSource:'/login',apiKeySource:'none'}));
 for (const override of [{apiProvider:'bedrock'},{subscriptionType:'api'},{tokenSource:'ANTHROPIC_AUTH_TOKEN'},{apiKeySource:'ANTHROPIC_API_KEY'},{apiKeySource:'apiKeyHelper'},{tokenSource:undefined}]) {
  assert.throws(()=>assertClaudeSubscription({apiProvider:'firstParty',subscriptionType:'max',tokenSource:'/login',apiKeySource:'none',...override}),/SUBSCRIPTION_BLOCKED/);
 }
});

test('runtime guards reject paid overage, tools, and model fallback', () => {
 const model='claude-opus-5-5';
 assert.doesNotThrow(()=>assertClaudeEvent({type:'system',subtype:'init',apiKeySource:'none',model},model));
 for (const key of ['overageEnabled','overageInUse','isUsingOverage']) assert.throws(()=>assertClaudeEvent({type:'rate_limit_event',rate_limit_info:{status:'allowed',[key]:true}},model),/SUBSCRIPTION_BLOCKED/);
 assert.throws(()=>assertClaudeEvent({type:'rate_limit_event',rate_limit_info:{status:'allowed',rateLimitType:'overage'}},model),/SUBSCRIPTION_BLOCKED/);
 assert.throws(()=>assertClaudeEvent({type:'assistant',message:{model,content:[{type:'tool_use',name:'Bash'}]}},model),/TOOL_BLOCKED/);
 assert.throws(()=>assertClaudeEvent({type:'assistant',message:{model:'claude-sonnet-5-5',content:[]}},model),/MODEL_MISMATCH/);
 assert.throws(()=>assertClaudeEvent({type:'system',subtype:'init',apiKeySource:'apiKeyHelper',model},model),/SUBSCRIPTION_BLOCKED/);
});


test('native StructuredOutput carrier is permitted while tools and misspelled carriers are blocked', () => {
 const model='claude-sonnet-5-5';
 for (const type of ['assistant','stream_event']) {
  const event=name=>type==='assistant'?{type,message:{model,content:[{type:'tool_use',name,input:{answers:[]}}]}}:{type,event:{type:'content_block_start',content_block:{type:'tool_use',name,input:{answers:[]}}}};
  assert.doesNotThrow(()=>assertClaudeEvent(event('StructuredOutput'),model));
  for (const name of ['Bash','Read','WebSearch','structuredoutput','Structuredoutput','StructuredOutput ',undefined]) assert.throws(()=>assertClaudeEvent(event(name),model),/TOOL_BLOCKED/);
 }
 assert.throws(()=>assertClaudeEvent({type:'assistant',message:{model,content:[{type:'server_tool_use',name:'StructuredOutput'}]}},model),/TOOL_BLOCKED/);
});


test('completion exposes SDK pricing estimate separately from token accounting', () => {
 const result={modelUsage:{model:{inputTokens:10,cacheReadInputTokens:20,cacheCreationInputTokens:3,outputTokens:4}},total_cost_usd:0.125};
 assert.deepEqual(claudeCompletionEvent(result),{type:'turn.completed',usage:{input_tokens:33,cached_input_tokens:20,cache_write_input_tokens:3,output_tokens:4,reasoning_output_tokens:0},estimated_cost_usd:0.125});
 for (const cost of [undefined,NaN,-1,Infinity,'0.125']) assert.equal(Object.hasOwn(claudeCompletionEvent({...result,total_cost_usd:cost}),'estimated_cost_usd'),false);
 assert.equal(claudeCompletionEvent({...result,total_cost_usd:0}).estimated_cost_usd,0);
});


test('SDK metadata without source fields requires matching fresh CLI OAuth proof', () => {
 const account={subscriptionType:'Claude Max',apiProvider:'firstParty'};
 const proof={loggedIn:true,authMethod:'claude.ai',apiProvider:'firstParty',subscriptionType:'max'};
 assert.doesNotThrow(()=>assertClaudeSubscription(account,proof));
 assert.doesNotThrow(()=>assertClaudeSubscription({...account,subscriptionType:'cLaUdE mAx'},proof));
 for (const invalid of [undefined,{...proof,loggedIn:false},{...proof,authMethod:'api_key'},{...proof,apiProvider:'bedrock'},{...proof,subscriptionType:'pro'}]) assert.throws(()=>assertClaudeSubscription(account,invalid),/SUBSCRIPTION_BLOCKED/);
 for (const sources of [{apiKeySource:'ANTHROPIC_API_KEY'},{apiKeySource:'apiKeyHelper'},{tokenSource:'ANTHROPIC_AUTH_TOKEN'},{apiKeySource:null},{tokenSource:null}]) assert.throws(()=>assertClaudeSubscription({...account,...sources},proof),/SUBSCRIPTION_BLOCKED/);
 assert.doesNotThrow(()=>assertClaudeSubscription({...account,apiKeySource:'none'},proof));
 assert.doesNotThrow(()=>assertClaudeSubscription({...account,tokenSource:'oauth'},proof));
});
