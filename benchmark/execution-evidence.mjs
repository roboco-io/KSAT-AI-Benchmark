// Classification evidence supplements locked records; original errors are preserved.
const evidence=[{
 run_id:'2026-pre-exam-pi-gemini-4-argon',model:'gemini-4-argon',group_id:'2026-korean-language_media',iteration:1,
 started_at:'2026-10-16T04:06:11.585Z',original_error:'PI_TURN_FAILED: provider did not finish a complete answer',
 classification:'timeout',provider_diagnostic:'Request timed out.',
 basis:'Preserved Pi diagnostic gemini-4-argon-1792123874898.json; examined 2026-10-17. One failed request covering 11 questions; all were answered on retry.',
}];
export function executionEvidence(run) {
 return evidence.filter(item=>item.run_id===run.run_id&&item.model===run.protocol?.model&&run.groups?.[item.group_id]?.attempts?.some(attempt=>attempt.status==='error'&&attempt.iteration===item.iteration&&attempt.started_at===item.started_at&&attempt.error===item.original_error));
}
