import {access, readFile, mkdtemp, rm} from 'node:fs/promises';
import {constants} from 'node:fs';
import {tmpdir} from 'node:os';
import {delimiter, join} from 'node:path';
import {query} from '@anthropic-ai/claude-agent-sdk';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {subscriptionEnvironment} from './subscription.mjs';

export function claudeModelMatches(requested, actual) {
 if (!/^claude-(sonnet|opus|haiku|fable)-\d+-\d+$/.test(requested ?? '')) return false;
 return actual === requested || (typeof actual === 'string' && actual.replace(/-\d{8}$/, '') === requested);
}

const planName=value=>typeof value==='string'?value.replace(/^claude\s+/i,'').toLowerCase():undefined;

export function assertClaudeSubscription(account, proof) {
 const plan=planName(account?.subscriptionType);
 const personal=account?.apiProvider==='firstParty' && ['max','pro'].includes(plan);
 const keyAbsent=account?.apiKeySource===undefined;
 const tokenAbsent=account?.tokenSource===undefined;
 const validSources=(keyAbsent || account.apiKeySource==='none') && (tokenAbsent || ['/login','oauth','claude.ai'].includes(account.tokenSource));
 const validProof=proof?.loggedIn===true && proof.authMethod==='claude.ai' && proof.apiProvider==='firstParty' && proof.subscriptionType===plan;
 if (!personal || !validSources || ((keyAbsent || tokenAbsent) && !validProof)) {
  throw new Error('SUBSCRIPTION_BLOCKED: personal Claude OAuth subscription authentication is required');
 }
}

async function readClaudeAuthProof(executable, cwd, signal) {
 try {
  const {stdout}=await promisify(execFile)(executable,['auth','status'],{env:subscriptionEnvironment(),cwd,signal,timeout:20000,maxBuffer:1024*1024});
  const status=JSON.parse(stdout);
  // Retain only auth routing fields; never emit email, organization, or credentials.
  const proof={loggedIn:status.loggedIn,authMethod:status.authMethod,apiProvider:status.apiProvider,subscriptionType:status.subscriptionType};
  if (proof.loggedIn!==true || proof.authMethod!=='claude.ai' || proof.apiProvider!=='firstParty' || !['max','pro'].includes(proof.subscriptionType)) throw new Error();
  return proof;
 } catch {
  throw new Error('SUBSCRIPTION_BLOCKED: fresh Claude CLI OAuth authentication proof unavailable');
 }
}

export function assertClaudeEvent(event, model) {
 if (event.type === 'system' && event.subtype === 'init') {
  if (event.apiKeySource !== 'none') throw new Error('SUBSCRIPTION_BLOCKED: Claude reported an API key credential');
  if (!claudeModelMatches(model,event.model)) throw new Error('MODEL_MISMATCH: Claude initialized a different model');
 }
 if (event.type === 'rate_limit_event') {
  const info=event.rate_limit_info;
  if (!info || info.overageEnabled === true || info.overageInUse === true || info.isUsingOverage === true || info.rateLimitType === 'overage' || info.status === 'rejected') {
   throw new Error('SUBSCRIPTION_BLOCKED: Claude included usage is unavailable or extra usage is enabled');
  }
 }
 if (event.type === 'assistant') {
  if (!claudeModelMatches(model,event.message?.model)) throw new Error('MODEL_MISMATCH: Claude answered with a different model');
  if (event.message?.content?.some(block=>block.type === 'server_tool_use' || (block.type === 'tool_use' && block.name !== 'StructuredOutput'))) throw new Error('TOOL_BLOCKED: Claude attempted a tool call');
 }
 if (event.type === 'stream_event') {
  const block=event.event?.content_block;
  if (block?.type === 'server_tool_use' || (block?.type === 'tool_use' && block.name !== 'StructuredOutput')) throw new Error('TOOL_BLOCKED: Claude attempted a tool call');
 }
 if (event.type === 'system' && /model_refusal.*fallback/.test(event.subtype ?? '')) throw new Error('MODEL_MISMATCH: Claude attempted model fallback');
}

export function claudeCompletionEvent(result) {
 const event={type:'turn.completed',usage:normalizeClaudeUsage(result)};
 // This is the SDK list-price estimate, never proof of an actual charge.
 if (typeof result.total_cost_usd === 'number' && Number.isFinite(result.total_cost_usd) && result.total_cost_usd>=0) event.estimated_cost_usd=result.total_cost_usd;
 return event;
}

export function normalizeClaudeUsage(result) {
 const entries=Object.values(result?.modelUsage ?? {});
 if (!entries.length) throw new Error('CLAUDE_USAGE_INVALID: result model usage is missing');
 const usage={input_tokens:0,cached_input_tokens:0,cache_write_input_tokens:0,output_tokens:0,reasoning_output_tokens:0};
 for (const entry of entries) {
  const values=[entry.inputTokens,entry.cacheReadInputTokens,entry.cacheCreationInputTokens,entry.outputTokens];
  if (values.some(n=>!Number.isSafeInteger(n)||n<0)) throw new Error('CLAUDE_USAGE_INVALID: model usage contains invalid token counts');
  usage.input_tokens+=entry.inputTokens+entry.cacheReadInputTokens+entry.cacheCreationInputTokens;
  usage.cached_input_tokens+=entry.cacheReadInputTokens;
  usage.cache_write_input_tokens+=entry.cacheCreationInputTokens;
  usage.output_tokens+=entry.outputTokens;
 }
 return usage;
}

async function findClaudeExecutable(explicit) {
 if (explicit) { await access(explicit,constants.X_OK); return explicit; }
 for (const dir of (process.env.PATH ?? '').split(delimiter)) {
  if (!dir) continue;
  const candidate=join(dir,'claude');
  try { await access(candidate,constants.X_OK); return candidate; } catch {}
 }
 throw new Error('CLAUDE_EXECUTABLE_MISSING: configure pathToClaudeCodeExecutable or put claude on PATH');
}

// The parent must verify the web extra-usage switch is OFF before calling this.
// Runtime events are a second guard; they cannot undo a charge already incurred.
export async function* claudeEvents({model,prompt,images=[],schema,signal,pathToClaudeCodeExecutable,timeoutMs=600000}) {
 if (!claudeModelMatches(model,model)) throw new Error('CLAUDE_MODEL_INVALID: use an exact versioned Claude model ID');
 if (!schema || typeof schema !== 'object' || !prompt || !Array.isArray(images) || images.length > 100) throw new Error('CLAUDE_INPUT_INVALID: prompt, JSON schema, and at most 100 images are required');
 if (!Number.isFinite(timeoutMs) || timeoutMs<=0 || timeoutMs>600000) throw new Error('CLAUDE_INPUT_INVALID: timeout must be within ten minutes');
 signal?.throwIfAborted();
 const executable=await findClaudeExecutable(pathToClaudeCodeExecutable);
 const content=[{type:'text',text:prompt}];
 let payloadBytes=0;
 for (const path of images) {
  const data=await readFile(path);
  if (data.subarray(0,4).toString()!=='RIFF' || data.subarray(8,12).toString()!=='WEBP') throw new Error('CLAUDE_INPUT_INVALID: image must be WebP');
  if (data.length>5*1024*1024) throw new Error('CLAUDE_INPUT_INVALID: image exceeds 5 MiB');
  const encoded=data.toString('base64'); payloadBytes+=encoded.length;
  content.push({type:'image',source:{type:'base64',media_type:'image/webp',data:encoded}});
 }
 if (payloadBytes+Buffer.byteLength(prompt)>24*1024*1024) throw new Error('CLAUDE_INPUT_INVALID: image payload exceeds 24 MiB');
 const cwd=await mkdtemp(join(tmpdir(),'ksat-claude-'));
 const controller=new AbortController();
 let session;
 let releaseInput;
 const ready=new Promise(resolve=>{releaseInput=resolve;});
 const abort=()=>{controller.abort(); releaseInput(false); session?.close();};
 const timer=setTimeout(abort,timeoutMs);
 signal?.addEventListener('abort',abort,{once:true});
 const input=(async function*(){
  if (await ready) yield {type:'user',message:{role:'user',content},parent_tool_use_id:null};
 })();
 try {
  signal?.throwIfAborted();
  const proof=await readClaudeAuthProof(executable,cwd,controller.signal);
  session=query({prompt:input,options:{model,effort:'high',cwd,env:subscriptionEnvironment(),tools:[],settingSources:[],mcpServers:{},strictMcpConfig:true,permissionMode:'dontAsk',pathToClaudeCodeExecutable:executable,outputFormat:{type:'json_schema',schema},abortController:controller,persistSession:false,includePartialMessages:false,plugins:[]}});
  // Hold stdin until the initialization control response verifies OAuth.
  assertClaudeSubscription(await session.accountInfo(),proof);
  if (controller.signal.aborted) throw new Error('CLAUDE_ABORTED: request cancelled or timed out');
  releaseInput(true);
  let initialized=false;
  let completed=false;
  for await (const event of session) {
   assertClaudeEvent(event,model);
   if (event.type==='system' && event.subtype==='init') {
    if (!initialized) yield {type:'thread.started',thread_id:event.session_id};
    initialized=true;
   }
   if (event.type==='result') {
    if (event.subtype!=='success' || event.is_error) throw new Error(`CLAUDE_TURN_FAILED: ${event.subtype}`);
    if (!initialized) throw new Error('CLAUDE_PROTOCOL_INVALID: result arrived before authenticated init');
    const output=event.structured_output ?? (()=>{try{return JSON.parse(event.result);}catch{throw new Error('CLAUDE_OUTPUT_INVALID: structured answer missing');}})();
    if (!output || !Array.isArray(output.answers)) throw new Error('CLAUDE_OUTPUT_INVALID: answer array missing');
    const completion=claudeCompletionEvent(event);
    yield {type:'item.completed',item:{type:'agent_message',text:JSON.stringify(output)}};
    yield completion;
    completed=true;
    break;
   }
  }
  if (!completed) throw new Error(controller.signal.aborted?'CLAUDE_ABORTED: request cancelled or timed out':'CLAUDE_TURN_FAILED: stream ended without result');
 } catch (error) {
  // SDK errors may contain user account information or raw subprocess output.
  if (/^(SUBSCRIPTION_BLOCKED|MODEL_MISMATCH|TOOL_BLOCKED|CLAUDE_)/.test(error?.message ?? '')) throw error;
  throw new Error(controller.signal.aborted?'CLAUDE_ABORTED: request cancelled or timed out':'CLAUDE_SDK_FAILED: Claude request failed');
 } finally {
  releaseInput(false);
  clearTimeout(timer);
  signal?.removeEventListener('abort',abort);
  controller.abort();
  session?.close();
  await rm(cwd,{recursive:true,force:true});
 }
}
