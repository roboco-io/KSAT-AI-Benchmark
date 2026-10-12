const pricing=(input,cached,output)=>({input_per_million:input,cached_input_per_million:cached,cache_write_per_million:input*1.25,output_per_million:output,currency:'USD',as_of:'2026-10-12',basis:'API-equivalent estimate only; subscription actual billing differs'});
export const MODELS=[
 {id:'gpt-6.1-sol',label:'GPT-6.1 Sol',provider:'openai',directory:'results/codex-2026',pricing:pricing(2,0.1,10)},
 {id:'gpt-6-astra',label:'GPT-6 Astra',provider:'openai',directory:'results/codex-2026-gpt-6-astra',pricing:pricing(10,1,50)},
 {id:'gpt-6-luna',label:'GPT-6 Luna',provider:'openai',directory:'results/codex-2026-gpt-6-luna',pricing:pricing(0.1,0.01,0.5)},
 {id:'claude-sonnet-5-5',label:'Claude Sonnet 5.5',provider:'anthropic',directory:'results/claude-2026-sonnet-5-5',pricing:pricing(2,0.1,10)},
 {id:'claude-opus-5-5',label:'Claude Opus 5.5',provider:'anthropic',directory:'results/claude-2026-opus-5-5',pricing:pricing(4,0.2,20)},
 {id:'claude-haiku-5-5',label:'Claude Haiku 5.5',provider:'anthropic',directory:'results/claude-2026-haiku-5-5',pricing:{...pricing(0.1,0.01,0.5),basis:'Base tier through100K prompt; SDK total_cost_usd takes precedence for tier/cache TTL differences'}},
 {id:'claude-fable-5-1',label:'Claude Fable 5.1',provider:'anthropic',directory:'results/claude-2026-fable-5-1',pricing:pricing(10,0.25,50)},
];
for(const model of MODELS.filter(m=>m.provider==='anthropic'))model.pricing.basis+='; cache write is 5m base; SDK estimate takes precedence for tier/TTL';
export function modelById(id) {const model=MODELS.find(m=>m.id===id);if(!model)throw new Error(`Unsupported exact model: ${id}`);return model;}
