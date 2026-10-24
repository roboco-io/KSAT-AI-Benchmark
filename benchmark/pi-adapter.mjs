import {StringDecoder} from 'node:string_decoder';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {piEnvironment} from './pi-env.mjs';
import {inspectionScope} from './moderation.mjs';

export class PiJsonlDecoder {
 decoder=new StringDecoder('utf8');
 buffer='';
 push(bytes) {
  this.buffer+=this.decoder.write(bytes);
  if (this.buffer.length>64*1024*1024) throw new Error('PI_PROTOCOL_INVALID: JSONL record exceeded size bound');
  const lines=this.buffer.split('\n');this.buffer=lines.pop();
  return lines.map(line=>{
   try {
    const record=JSON.parse(line.replace(/\r$/,''));
    if (!record || typeof record!=='object' || Array.isArray(record) || typeof record.type!=='string') throw new Error();
    return record;
   } catch {throw new Error('PI_PROTOCOL_INVALID: invalid JSONL event');}
  });
 }
 finish() {
  const records=this.push(Buffer.alloc(0));
  this.buffer+=this.decoder.end();
  if (this.buffer.length) throw new Error('PI_PROTOCOL_INVALID: incomplete final JSONL record');
  return records;
 }
}

export function normalizePiUsage(usage) {
 const values=[usage?.input,usage?.cacheRead,usage?.cacheWrite,usage?.output,usage?.reasoning??0];
 if (values.some(n=>!Number.isSafeInteger(n)||n<0) || values[4]>values[3]) throw new Error('PI_USAGE_INVALID: provider token accounting is missing or invalid');
 return {input_tokens:values[0]+values[1]+values[2],cached_input_tokens:values[1],cache_write_input_tokens:values[2],output_tokens:values[3],reasoning_output_tokens:values[4]};
}

export function parsePiAnswers(text) {
 try {
  let value=text.trim();
  const fence=value.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/);
  if (fence) value=fence[1];
  const output=JSON.parse(value);
  if (!output || typeof output!=='object' || !Array.isArray(output.answers)) throw new Error();
  return output;
 } catch {throw new Error('PI_OUTPUT_INVALID: response did not contain a complete JSON answer array');}
}

export function assertPiMessage(message,model) {
 if (message?.provider!==model.pi.provider || message.model!==model.pi.model_id || (message.responseModel && message.responseModel!==model.pi.model_id)) throw new Error('MODEL_MISMATCH: Pi provider response differs from requested route');
 if (message.stopReason==='toolUse' || message.content?.some(block=>block.type==='toolCall')) throw new Error('TOOL_BLOCKED: Pi attempted a tool call');
}

export const PI_VERSION='0.87.1';

function assertRoute(model,apiKey) {
 const route=model?.pi;
 if (!model?.id || route?.provider!=='ksat-pi' || typeof route.model_id!=='string' || !route.model_id || typeof apiKey!=='string' || !apiKey || /[\r\n]/.test(apiKey)) throw new Error('PI_BLOCKED: explicit model route and API credential are required');
 let url;try {url=new URL(route.base_url);} catch {throw new Error('PI_BLOCKED: invalid provider base URL');}
 if (url.protocol!=='https:' || url.username || url.password || url.search || url.hash) throw new Error('PI_BLOCKED: provider base URL must be credential-free HTTPS');
 if (![route.context_window,route.max_tokens].every(n=>Number.isSafeInteger(n)&&n>0) || route.max_tokens>route.context_window) throw new Error('PI_BLOCKED: invalid provider context or output limit');
}

function modelsConfig(model) {
 const route=model.pi;
 const pricing=model.pricing??{};
 const definition={id:route.model_id,name:model.id,reasoning:true,input:['text','image'],contextWindow:route.context_window,maxTokens:route.max_tokens,cost:{input:pricing.input_per_million??0,output:pricing.output_per_million??0,cacheRead:pricing.cached_input_per_million??0,cacheWrite:pricing.cache_write_per_million??0}};
 if (route.compat) definition.compat=route.compat;
 if (route.thinking_level_map) definition.thinkingLevelMap=route.thinking_level_map;
 return {providers:{'ksat-pi':{baseUrl:route.base_url,api:route.api??'openai-completions',apiKey:'$KSAT_PI_API_KEY',models:[definition]}}};
}

export function redactPiError(value,apiKey) {
 return String(value??'').replaceAll(apiKey,'[REDACTED]').replace(/Bearer\s+[^\s"',}]+/gi,'Bearer [REDACTED]').replace(/sk-[A-Za-z0-9._:+/-]+/g,'[REDACTED]').slice(0,8000);
}
async function privateFailure(model,message,apiKey) {
 try {
  const folder=resolve(import.meta.dirname,'../.runtime/pi-diagnostics');
  await mkdir(folder,{recursive:true,mode:0o700});
  await writeFile(join(folder,`${model.id}-${Date.now()}.json`),JSON.stringify({model:model.id,stop_reason:message.stopReason,error:redactPiError(message.errorMessage,apiKey)},null,2)+'\n',{mode:0o600});
 }catch{} // Diagnostics must never replace a billing or authentication rejection.
}
function responseFailure(message) {
 const detail=message.errorMessage??'';
 const scope=inspectionScope(detail);
 if(scope)return new Error(`PI_CONTENT_BLOCKED: provider content inspection rejected response; scope=${scope}; code=DataInspectionFailed`);
 const knownCodes=['RateLimitExceeded','PayloadTooLarge','Arrearage','InsufficientBalance','InvalidParameter','InvalidParameter.UnsupportedMediaType','DataInspectionFailed','RequestTimeout','InternalError','model_not_found','context_length_exceeded','insufficient_quota'];
 const normalized=detail.toLowerCase().replace(/[^a-z]/g,'');
 const code=/\btimed out\b|TimeoutError/i.test(detail)?'RequestTimeout':knownCodes.find(value=>normalized.includes(value.toLowerCase().replace(/[^a-z]/g,'')));
 if (/quota|Arrearage|insufficient.*(?:balance|funds)|credit|billing|payment|unauthorized|authentication|invalid.*api.?key|(?:^|\D)(?:401|402|403)(?:\D|$)/i.test(message.errorMessage??'')) return new Error('PI_BLOCKED: provider authentication, quota, or billing rejected the request');
 return new Error('PI_TURN_FAILED: provider did not finish a complete answer'+(code?`; code=${code}`:''));
}

// No credentials are read here. The caller supplies one explicitly authorized API key.
export async function* piEvents({model,prompt,images=[],schema,signal,apiKey,piExecutable='pi',timeoutMs=900000}) {
 assertRoute(model,apiKey);
 if (typeof prompt!=='string' || !prompt || !schema || typeof schema!=='object' || !Array.isArray(images)) throw new Error('PI_BLOCKED: prompt, image paths, and JSON schema are required');
 if (!Number.isFinite(timeoutMs) || timeoutMs<=0 || timeoutMs>900000) throw new Error('PI_BLOCKED: request timeout must be within fifteen minutes');
 if (signal?.aborted) throw new Error('PI_ABORTED: request cancelled');
 const dir=await mkdtemp(join(tmpdir(),'ksat-pi-'));
 const agentDir=join(dir,'agent');const cwd=join(dir,'work');
 let child;let exit;let timer;let killTimer;let aborted=false;
 const stop=()=>{
  if (!child || child.exitCode!==null || child.signalCode!==null) return;
  child.kill('SIGTERM');
  killTimer??=setTimeout(()=>child.kill('SIGKILL'),1000);
 };
 const abort=()=>{aborted=true;stop();};
 signal?.addEventListener('abort',abort,{once:true});
 try {
  await mkdir(agentDir,{mode:0o700});await mkdir(cwd,{mode:0o700});
  const env=piEnvironment(apiKey,agentDir);
  let version;
  try {({stdout:version}=await promisify(execFile)(piExecutable,['--version'],{env:piEnvironment('',agentDir),cwd,timeout:10000,signal,maxBuffer:1024}));}
  catch {throw new Error(signal?.aborted?'PI_ABORTED: request cancelled':'PI_BLOCKED: Pi version preflight failed');}
  if (version.trim()!==PI_VERSION) throw new Error('PI_BLOCKED: benchmark requires Pi 0.87.1');
  const settings={compaction:{enabled:false},retry:{enabled:false,maxRetries:0,provider:{maxRetries:0,timeoutMs}},cacheWarming:'off',images:{autoResize:false},enableInstallTelemetry:false};
  const promptPath=join(cwd,'prompt.txt');
  await writeFile(join(agentDir,'models.json'),JSON.stringify(modelsConfig(model)),{mode:0o600});
  await writeFile(join(agentDir,'settings.json'),JSON.stringify(settings),{mode:0o600});
  await writeFile(promptPath,prompt+'\n\nReturn only one JSON object matching this schema:\n'+JSON.stringify(schema),{mode:0o600});
  const imagePaths=[];
  for (const path of images) {
   const absolute=resolve(path);
   const data=await readFile(absolute);
   const webp=data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP';
   const png=data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
   const jpeg=data[0]===255&&data[1]===216;
   if (!webp&&!png&&!jpeg) throw new Error('PI_BLOCKED: unsupported or invalid input image');
   imagePaths.push(absolute);
  }
  if (signal?.aborted || aborted) throw new Error('PI_ABORTED: request cancelled');
  const argv=['--offline','--no-tools','--no-extensions','--no-skills','--no-prompt-templates','--no-context-files','--no-themes','--no-approve','--no-session','--thinking','high','--mode','json','--print','--system-prompt','You are taking the KSAT exam. Solve only from the supplied question images and text. Do not use external tools, search, code execution, or outside sources. Return only the requested JSON answer object.','--provider',model.pi.provider,'--model',model.pi.model_id,'@'+promptPath,...imagePaths.map(path=>'@'+path)];
  const requestStartedAt=new Date().toISOString();
  child=spawn(piExecutable,argv,{env,cwd,stdio:['ignore','pipe','pipe']});
  let spawnFailed=false;
  child.on('error',()=>{spawnFailed=true;});
  exit=new Promise(resolve=>child.on('close',(code)=>resolve({code,spawnFailed})));
  child.stderr.resume(); // Never publish raw provider errors, credentials, or reasoning.
  timer=setTimeout(abort,timeoutMs);
  const decoder=new PiJsonlDecoder();
  let settled=false;let sessionId;let messageCount=0;let output;let parseError;
  for await(const chunk of child.stdout) {
   for (const event of decoder.push(chunk)) {
    if (event.type==='session') {
     if (sessionId || typeof event.id!=='string' || !event.id) throw new Error('PI_PROTOCOL_INVALID: invalid Pi session header');
     sessionId=event.id;yield {type:'thread.started',thread_id:sessionId};
    }
    if (event.type.startsWith('tool_execution_') || event.assistantMessageEvent?.type?.startsWith('toolcall_')) throw new Error('TOOL_BLOCKED: Pi attempted a tool call');
    if (event.type==='compaction_start' || event.type==='auto_retry_start' || (event.type==='agent_end'&&event.willRetry===true)) throw new Error('PI_BLOCKED: Pi attempted disabled automatic recovery');
    if (event.type==='message_end' && event.message?.role==='assistant') {
     const message=event.message;
     const usage=normalizePiUsage(message.usage);
     const completion={type:'turn.completed',usage,request_started_at:requestStartedAt};
     if (Number.isFinite(message.usage.cost?.total)&&message.usage.cost.total>0) completion.estimated_cost_usd=message.usage.cost.total;
     yield completion; // Retain consumed tokens even when answer parsing fails.
     assertPiMessage(message,model);
     if (++messageCount!==1) throw new Error('PI_PROTOCOL_INVALID: unexpected additional assistant response');
     if (!['stop','length'].includes(message.stopReason)) {await privateFailure(model,message,apiKey);throw responseFailure(message);}
     if (message.stopReason==='length') throw new Error('PI_TURN_FAILED: response reached output token limit');
     try {output=parsePiAnswers(message.content.filter(block=>block.type==='text').map(block=>block.text).join(''));}
     catch(error) {parseError=error;}
    }
    if (event.type==='agent_settled') settled=true;
   }
  }
  decoder.finish();
  const status=await exit;
  if (aborted) throw new Error('PI_ABORTED: request cancelled or timed out');
  if (status.spawnFailed) throw new Error('PI_BLOCKED: Pi process could not start');
  if (status.code!==0) throw new Error('PI_TURN_FAILED: Pi process exited unsuccessfully');
  if (!settled || !sessionId || messageCount!==1) throw new Error('PI_PROTOCOL_INVALID: Pi ended without a settled assistant response');
  if (parseError) throw parseError;
  yield {type:'item.completed',item:{type:'agent_message',text:JSON.stringify(output)}};
 } catch(error) {
  if (/^(PI_[A-Z_]+|MODEL_MISMATCH|TOOL_BLOCKED):/.test(error?.message??'')) throw error;
  throw new Error(aborted||signal?.aborted?'PI_ABORTED: request cancelled or timed out':'PI_TURN_FAILED: isolated Pi request failed');
 } finally {
  clearTimeout(timer);signal?.removeEventListener('abort',abort);stop();
  if (exit) await exit;
  clearTimeout(killTimer);
  await rm(dir,{recursive:true,force:true});
 }
}
