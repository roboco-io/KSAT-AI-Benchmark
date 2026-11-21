import {MODELS} from './models.mjs';
import {routeAgent} from './profiles.mjs';
export const MODELS_2026=['gpt-6.1-sol','gpt-6-astra','gpt-6-luna','claude-sonnet-5-5','claude-opus-5-5','claude-haiku-5-5','claude-fable-5-1','deepseek-v4.1-flash','glm-5.3-flash','qwen3.8-27b','kimi-k3','gemini-4-argon','k-exaone-2.5','solar-pro-4'];
// 2027: newest model of each provider as of the exam day (2026-11-19); K-EXAONE excluded by user decision.
export const MODELS_2027=['gpt-6.2-sol','gpt-6.2-astra','gpt-6-luna','gpt-6.1-terra','claude-fable-5-2','claude-opus-5-5','claude-sonnet-5-5','claude-haiku-5-5','gemini-4-neon','gemini-4-carbon','deepseek-v4.1-flash','glm-5.3-flash','qwen4-max','kimi-k3.1-pro','solar-pro-4','solar-mini-4-5-preview'];
export const MODELS_2025=['gpt-6-luna','gpt-6.1-sol','gpt-6-astra','claude-haiku-5-5','claude-sonnet-5-5','claude-opus-5-5','claude-fable-5-1','gemini-4-argon','kimi-k3'];
// A session is one exam period group: 'main' is Korean·math·English (periods 1-3); 'period4' is Korean history and social/science inquiry.
export const SESSIONS={2025:['main'],2026:['main'],2027:['main','period4']};
export function yearPaths(year,session='main') {
 if(![2025,2026,2027].includes(year))throw new Error('Academic year not supported');
 if(!SESSIONS[year].includes(session))throw new Error('Exam session not supported for this academic year');
 if(session==='period4')return {session,dataset:`exams/datasets/${year}-ksat-period4.json`,manifest:`exams/pdf/${year}/period4/sources.json`,comparison:`benchmark-comparison-${year}-period4.json`,transcripts:`exams/transcripts/${year}-period4/manifest.json`};
 return {session,dataset:`exams/datasets/${year}-ksat.json`,manifest:`exams/pdf/${year}/sources.json`,comparison:year===2026?'benchmark-comparison.json':`benchmark-comparison-${year}.json`,transcripts:`exams/transcripts/${year}/manifest.json`};
}
export function modelForYear(model,year,session='main') {
 yearPaths(year,session);
 if(session!=='main')return {...model,directory:`results/${routeAgent(model)}-${year}-${session}-${model.id}`};
 return year===2026?model:{...model,directory:`results/${routeAgent(model)}-${year}-${model.id}`};
}
export function modelsForYear(year,session='main') {
 yearPaths(year,session);
 const ids={2025:MODELS_2025,2026:MODELS_2026,2027:MODELS_2027}[year];
 return ids.map(id=>{const model=MODELS.find(m=>m.id===id);if(!model)throw new Error(`Unregistered model for ${year}: ${id}`);return modelForYear(model,year,session);});
}
