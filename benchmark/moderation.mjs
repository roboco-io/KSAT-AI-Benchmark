// Provider policy rejections are distinct from transient transport failures.
export function inspectionScope(error) {
 const value=String(error??'');
 if(!/DataInspectionFailed|data_inspection_failed|PI_CONTENT_BLOCKED/i.test(value))return null;
 if(/output(?: data)?|scope=output/i.test(value))return 'output';
 if(/input(?: data)?|scope=input/i.test(value))return 'input';
 return 'unspecified';
}

export function repeatedInspectionBlock(attempts=[]) {
 return attempts.filter(attempt=>inspectionScope(attempt.error)!==null).length>=2;
}
