// Korea has no daylight-saving transition. Avoid build/browser ICU differences.
export function formatKst(value) {
  if (!value) return '결과 생성 대기';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '결과 생성 대기';
  return new Date(timestamp + 9 * 60 * 60 * 1000)
    .toISOString().slice(0, 16).replace('T', ' ');
}
