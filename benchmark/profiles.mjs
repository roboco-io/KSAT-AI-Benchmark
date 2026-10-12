import {existsSync,readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
export function routeAgent(model) {
 return model.provider==='openai'?'codex':model.provider==='anthropic'?'claude':model.provider==='google'?'antigravity':'pi';
}
export function validateProfile(model) {
 if(!model||!/^[a-z0-9][a-z0-9._-]*$/.test(model.id)||typeof model.label!=='string'||!model.label.trim()||!/^[a-z][a-z0-9_-]*$/.test(model.provider))throw new Error('MODEL_PROFILE_INVALID: exact ID, label and provider required');
 const agent=routeAgent(model);
 if(model.agent!==agent||model.directory!==`results/${agent}-2026-${model.id}`)throw new Error('MODEL_PROFILE_INVALID: provider route or result directory differs from its agent');
 const price=model.pricing;
 if(!price||['input_per_million','cached_input_per_million','cache_write_per_million','output_per_million'].some(k=>!Number.isFinite(price[k])||price[k]<0)||price.currency!=='USD'||!/^\d{4}-\d{2}-\d{2}$/.test(price.as_of)||typeof price.basis!=='string'||!/^https:\/\//.test(price.source||''))throw new Error('MODEL_PROFILE_INVALID: verified dated USD pricing and source are required');
 const encoded=JSON.stringify(model);
 if(/"(?:apiKey|api_key|authorization|accessToken|refreshToken|password|credentials?|token|secret|key)"\s*:/i.test(encoded))throw new Error('MODEL_PROFILE_INVALID: credential values must not be stored in a profile');
 const fields=(value,allowed)=>{
  if(Object.keys(value).some(key=>!allowed.includes(key)))throw new Error('MODEL_PROFILE_INVALID: only approved metadata fields may be registered');
 };
 fields(model,['id','label','provider','agent','directory','pricing','pi','google']);
 fields(price,['input_per_million','cached_input_per_million','cache_write_per_million','output_per_million','currency','as_of','basis','source']);
 if(agent==='pi') {
  const p=model.pi;let url;try{url=new URL(p?.base_url);}catch{}
  if(!p||p.provider!=='ksat-pi'||typeof p.model_id!=='string'||!p.model_id||!url||url.protocol!=='https:'||url.username||url.password||url.search||url.hash||!/^[A-Z][A-Z0-9_]*$/.test(p.secret_name)||![p.context_window,p.max_tokens].every(n=>Number.isSafeInteger(n)&&n>0)||p.max_tokens>p.context_window)throw new Error('MODEL_PROFILE_INVALID: explicit Pi image-capable route and credential variable required');
  fields(p,['provider','model_id','base_url','secret_name','context_window','max_tokens','compat','effort_semantics','thinking_level_map','api']);
  if(p.compat)fields(p.compat,['thinkingFormat','supportsReasoningEffort','supportsDeveloperRole','supportsStore','maxTokensField','supportsUsageInStreaming','supportsFinishReason','requiresReasoningContentOnAssistantMessages','supportsStrictMode','supportsThinkingTokenBudget','thinkingTokenBudgetField']);
  if(p.thinking_level_map) {
   const levels=['off','minimal','low','medium','high','xhigh','max'];
   fields(p.thinking_level_map,levels);
   if(Object.values(p.thinking_level_map).some(v=>v!==null&&!levels.includes(v)&&!(Number.isSafeInteger(v)&&v>=0)))throw new Error('MODEL_PROFILE_INVALID: thinking mappings must be levels or numeric budgets');
  }
 }else if(model.pi)throw new Error('MODEL_PROFILE_INVALID: SDK or Google models cannot be routed through Pi');
 if(model.google)fields(model.google,['model_id']);
 return model;
}
export function loadProfiles(directory) {
 if(!existsSync(directory))return [];
 return readdirSync(directory).filter(name=>name.endsWith('.json')).sort().map(name=>{
  const model=validateProfile(JSON.parse(readFileSync(join(directory,name),'utf8')));
  if(name!==`${model.id}.json`)throw new Error('MODEL_PROFILE_INVALID: filename must match model ID');
  return model;
 });
}
