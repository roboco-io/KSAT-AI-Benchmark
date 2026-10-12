import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export function claudeAccountFingerprint() {
 const status=JSON.parse(execFileSync('claude',['auth','status'],{env:subscriptionEnvironment(),encoding:'utf8',timeout:20000}));
 if(status.loggedIn!==true||status.authMethod!=='claude.ai'||status.apiProvider!=='firstParty')throw new Error('SUBSCRIPTION_BLOCKED: CLI is not a personal Claude subscription');
 return createHash('sha256').update(JSON.stringify([status.email,status.orgId])).digest('hex');
}
export function assertFreshClaudeProof(proof,fingerprint,now=Date.now()) {
 const age=now-Date.parse(proof?.verified_at);
 if(proof?.extra_usage_disabled!==true||proof.account_fingerprint!==fingerprint||!Number.isFinite(age)||age<0||age>30*60*1000)throw new Error('SUBSCRIPTION_BLOCKED: refresh live Claude Usage credits OFF confirmation for this account (within30minutes)');
}
export function subscriptionEnvironment(env=process.env) {
 return Object.fromEntries(Object.entries(env).filter(([k])=>!/^OPENAI_|^ANTHROPIC_|^AWS_|^AZURE_|^GOOGLE_APPLICATION_CREDENTIALS$|^CLAUDE_CODE_USE_|^CLAUDE_CODE_OAUTH_TOKEN$|^CODEX_API_KEY$/.test(k)));
}
export function assertIncludedCodexUsage(account,limits) {
 if(account?.type!=='chatgpt')throw new Error('SUBSCRIPTION_BLOCKED: Codex is not authenticated through ChatGPT');
 const l=limits?.rateLimits;
 if(limits.ordinaryUsageAllowed!==true||!l)throw new Error('SUBSCRIPTION_BLOCKED: included usage could not be verified');
 if(l.credits?.hasCredits!==false||l.credits?.unlimited!==false||Number(l.credits?.balance)!==0)throw new Error('SUBSCRIPTION_BLOCKED: purchased/credit-based usage is available; refuse paid fallback');
 const buckets=[l.primary,l.secondary,l.individualLimit].filter(Boolean);
 if(!buckets.length||buckets.some(b=>b.usedPercent>=100)||l.spendControlReached||l.rateLimitReachedType)throw new Error('SUBSCRIPTION_BLOCKED: included quota exhausted');
}
export async function codexSubscriptionStatus() {
 const process=spawn('codex',['app-server','--stdio','-c','features.apps=false','-c','features.plugins=false'],{env:subscriptionEnvironment(),stdio:['pipe','pipe','ignore']});
 const lines=createInterface({input:process.stdout});const waiting=new Map();let id=0;
 lines.on('line',line=>{let event;try{event=JSON.parse(line);}catch{return;}const p=waiting.get(event.id);if(p){waiting.delete(event.id);clearTimeout(p.timer);event.error?p.reject(new Error(event.error.message)):p.resolve(event.result);}});
 process.on('exit',()=>{for(const p of waiting.values()){clearTimeout(p.timer);p.reject(new Error('SUBSCRIPTION_BLOCKED: authentication status process exited'));}waiting.clear();});
 const request=(method,params)=>new Promise((resolve,reject)=>{const current=++id;const timer=setTimeout(()=>{waiting.delete(current);reject(new Error('SUBSCRIPTION_BLOCKED: authentication status timed out'));},20000);waiting.set(current,{resolve,reject,timer});process.stdin.write(JSON.stringify({id:current,method,params})+'\n');});
 try {
  await request('initialize',{clientInfo:{name:'ksat-subscription-guard',version:'1.0.0'}});
  process.stdin.write(JSON.stringify({method:'initialized',params:{}})+'\n');
  const {account}=await request('account/read',{refreshToken:false});
  const limits=await request('account/rateLimits/read',{});
  assertIncludedCodexUsage(account,limits);
  return {method:'chatgpt_subscription',plan:account.planType,api_key_used:false,purchased_credits_available:false,included_usage_allowed:true,used_percent:limits.rateLimits.primary?.usedPercent,verified_at:new Date().toISOString()};
 } finally {lines.close();process.kill('SIGTERM');}
}
