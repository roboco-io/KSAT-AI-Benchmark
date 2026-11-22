// Antigravity CLI (agy) route for Gemini models billed to a Google AI Ultra subscription.
// agy headless print mode accepts text only, so the solver talks to `agy acp` (Agent Client Protocol), whose prompt
// accepts inline image blocks. Constraints that differ from the other routes (shown on the dashboard):
// - agy starts its agent with built-in tools (web search, URL fetch, browser, files) that no setting can turn off.
//   Any tool call invalidates the attempt: the session is cancelled and its output is discarded.
// - agy downscales images to at most 2,000 px per side before sending them to the model.
import {spawn,execFileSync} from 'node:child_process';
import {mkdtemp,readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,extname} from 'node:path';
import {parsePiAnswers} from './pi-adapter.mjs';

// agy updates itself; require at least the version whose ACP image input was verified and record the actual version per request.
export const AGY_MIN_VERSION='1.5.12';
export const AGY_IMAGE_MAX_SIDE_PX=2000;
const MIME={'.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
// Subscription only: no API key may reach agy, and paid AI credits after the quota stay off.
export function agyEnvironment(source=process.env) {
 return Object.fromEntries(Object.entries(source).filter(([name])=>!/^(GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_GENAI_|GOOGLE_APPLICATION_CREDENTIALS|GOOGLE_CLOUD_PROJECT)/.test(name)));
}
export const AGY_SETTINGS={useG1Credits:false};

// Reads agy's effective settings and refuses a run that could bill outside the subscription.
export function assertAgySubscription(run=args=>execFileSync('agy',args,{env:agyEnvironment(),encoding:'utf8',timeout:30000})) {
 const version=run(['--version']).trim();
 const parts=v=>v.split('.').map(Number),[a,b]=[parts(version),parts(AGY_MIN_VERSION)];
 if(!/^\d+\.\d+\.\d+$/.test(version)||a[0]!==b[0]||a[1]<b[1]||(a[1]===b[1]&&a[2]<b[2]))throw new Error(`AGY_BLOCKED: benchmark requires agy ${AGY_MIN_VERSION} or later within ${b[0]}.x`);
 const config=Object.fromEntries(run(['--settings',JSON.stringify(AGY_SETTINGS),'-p=/config']).split('\n').filter(Boolean).map(line=>line.split('\t')));
 if(config.useG1Credits!=='false')throw new Error('SUBSCRIPTION_BLOCKED: agy AI credits fallback (useG1Credits) must be off');
 if(config.modelProvider)throw new Error('SUBSCRIPTION_BLOCKED: agy modelProvider must be unset so requests stay on the subscription');
 return {version,useG1Credits:false};
}

export function normalizeAgyUsage(usage) {
 const n=k=>Number.isSafeInteger(usage?.[k])&&usage[k]>=0?usage[k]:0;
 // outputTokens already includes thoughtTokens; cachedReadTokens is reported apart from inputTokens.
 return {input_tokens:n('inputTokens')+n('cachedReadTokens'),cached_input_tokens:n('cachedReadTokens'),cache_write_input_tokens:n('cachedWriteTokens'),output_tokens:Math.max(n('outputTokens'),n('thoughtTokens')),reasoning_output_tokens:n('thoughtTokens')};
}

// Same instructions as the Pi route: the system line and the JSON schema are appended to the user prompt.
export const AGY_PREAMBLE='You are taking the KSAT exam. Solve only from the supplied question images and text. Do not use any tools, search, code execution, or outside sources. Return only the requested JSON answer object.';
export async function* agyEvents({model,prompt,images=[],schema,signal,timeoutMs=900000,executable='agy'}) {
 const modelId=model?.google?.model_id;
 if(!modelId)throw new Error('AGY_BLOCKED: explicit agy model id is required');
 const cwd=await mkdtemp(join(tmpdir(),'ksat-agy-')); // empty workspace: nothing for file tools to read
 if(!schema||typeof schema!=='object')throw new Error('AGY_BLOCKED: JSON schema is required');
 const blocks=[{type:'text',text:AGY_PREAMBLE+'\n\n'+prompt+'\n\nReturn only one JSON object matching this schema:\n'+JSON.stringify(schema)}];
 for(const path of images){const mimeType=MIME[extname(path).toLowerCase()];if(!mimeType)throw new Error('AGY_BLOCKED: unsupported image type');blocks.push({type:'image',mimeType,data:(await readFile(path)).toString('base64')});}
 const child=spawn(executable,['--settings',JSON.stringify(AGY_SETTINGS),'acp'],{env:agyEnvironment(),cwd,stdio:['pipe','pipe','ignore']});
 let id=0,buffer='',failure=null,sessionId=null;const pending=new Map(),queue=[];let wake=null;
 const push=item=>{queue.push(item);wake?.();};
 const fail=error=>{if(!failure){failure=error;if(sessionId)child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'session/cancel',params:{sessionId}})+'\n');setTimeout(()=>child.kill('SIGTERM'),500);}push({type:'fail'});};
 const send=(method,params)=>new Promise((resolve,reject)=>{const i=++id;pending.set(i,{resolve,reject});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:i,method,params})+'\n');});
 let text='';
 child.stdout.on('data',chunk=>{buffer+=chunk;let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line.trim())continue;let message;try{message=JSON.parse(line);}catch{continue;}
  if(message.id!==undefined&&!message.method){const p=pending.get(message.id);if(p){pending.delete(message.id);message.error?p.reject(new Error(`AGY_TURN_FAILED: ${message.error.message??'request failed'}`)):p.resolve(message.result);}continue;}
  if(message.method==='session/update'){const update=message.params?.update??{};
   if(update.sessionUpdate==='tool_call')fail(new Error(`TOOL_BLOCKED: agy agent called ${update.name??'a tool'}; attempt invalidated`));
   else if(update.sessionUpdate==='agent_message_chunk')text+=update.content?.text??'';
   continue;}
  if(message.method&&message.id!==undefined){ // permission or client request: refuse and invalidate
   child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:message.id,result:{outcome:{outcome:'cancelled'}}})+'\n');
   fail(new Error(`TOOL_BLOCKED: agy requested ${message.method}; attempt invalidated`));}
 }});
 child.on('exit',()=>{for(const p of pending.values())p.reject(failure??new Error('AGY_TURN_FAILED: agy exited early'));pending.clear();push({type:'exit'});});
 const timer=setTimeout(()=>fail(new Error('AGY_ABORTED: request timed out')),timeoutMs);
 const onAbort=()=>fail(new Error('AGY_ABORTED: request cancelled'));signal?.addEventListener('abort',onAbort,{once:true});
 try {
  await send('initialize',{protocolVersion:1,clientCapabilities:{fs:{readTextFile:false,writeTextFile:false},terminal:false}});
  const session=await send('session/new',{cwd,mcpServers:[]});sessionId=session.sessionId;
  if(!session.models?.availableModels?.some(m=>m.modelId===modelId))throw new Error(`MODEL_MISMATCH: agy does not offer ${modelId}`);
  yield {type:'thread.started',thread_id:sessionId};
  await send('session/set_model',{sessionId,modelId});
  const result=await send('session/prompt',{sessionId,prompt:blocks});
  // Usage is recorded even when the attempt failed (cancelled, tool call): the provider may still bill those tokens.
  if(result?.usage)yield {type:'turn.completed',usage:normalizeAgyUsage(result.usage)};
  if(failure)throw failure;
  if(!result?.usage)yield {type:'turn.completed',usage:normalizeAgyUsage(undefined)};
  if(result?.stopReason!=='end_turn')throw new Error(result?.stopReason==='max_tokens'?'AGY_TURN_FAILED: response reached output token limit':`AGY_TURN_FAILED: stop reason ${result?.stopReason}`);
  let output;try{output=parsePiAnswers(text);}catch{
   // Keep the unparsable response privately for diagnosis (never published).
   const folder=join(process.cwd(),'.runtime/agy-diagnostics');await mkdir(folder,{recursive:true});
   await writeFile(join(folder,`${modelId}-${Date.now()}.txt`),text);
   throw new Error('AGY_OUTPUT_INVALID: response did not contain a complete JSON answer array');}
  yield {type:'item.completed',item:{type:'agent_message',text:JSON.stringify(output)}};
 } catch(error) {throw failure??error;}
 finally {clearTimeout(timer);signal?.removeEventListener('abort',onAbort);if(child.exitCode===null)child.kill('SIGTERM');}
}
