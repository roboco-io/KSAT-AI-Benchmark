import {MODELS} from './models.mjs';
import {routeAgent} from './profiles.mjs';
export const MODELS_2025=['gpt-6-luna','gpt-6.1-sol','claude-haiku-5-5'];
export function yearPaths(year) {
 if(![2025,2026].includes(year))throw new Error('Academic year not supported');
 return {dataset:`exams/datasets/${year}-ksat.json`,manifest:`exams/pdf/${year}/sources.json`,comparison:year===2026?'benchmark-comparison.json':`benchmark-comparison-${year}.json`};
}
export function modelForYear(model,year) {
 yearPaths(year);
 return year===2026?model:{...model,directory:`results/${routeAgent(model)}-${year}-${model.id}`};
}
export function modelsForYear(year) {
 yearPaths(year);
 return (year===2026?MODELS:MODELS_2025.map(id=>MODELS.find(model=>model.id===id))).map(model=>modelForYear(model,year));
}
