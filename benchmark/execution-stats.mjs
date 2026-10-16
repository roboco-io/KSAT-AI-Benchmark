import {executionEvidence} from './execution-evidence.mjs';
export function executionStats(run) {
 const stats={refusal_count:0,timeout_count:0};
 const evidence=executionEvidence(run);
 for(const [groupId,group] of Object.entries(run.groups??{}))for(const attempt of group.attempts??[]) {
  if(attempt.status!=='error')continue;
  const error=attempt.error??'';
  if(/PI_CONTENT_BLOCKED|DataInspectionFailed|MODEL_REFUSAL|content_filter|safety refusal/i.test(error))stats.refusal_count++;
  const ambiguous=/cancelled or timed out/i.test(error);
  // Legacy adapters combined cancellation and timeout. Require duration evidence.
  const timeout=ambiguous
   ? Number.isFinite(run.protocol?.group_timeout_seconds)&&run.protocol.group_timeout_seconds>0&&Number.isFinite(attempt.time_seconds)&&attempt.time_seconds>=run.protocol.group_timeout_seconds-1
   : /timeout|timed out|time limit exceeded/i.test(error);
  if(timeout||evidence.some(item=>item.group_id===groupId&&item.iteration===attempt.iteration&&item.started_at===attempt.started_at&&item.classification==='timeout'))stats.timeout_count++;
 }
 return stats;
}
