export function GradingMark({ adjusted }: { adjusted?: number | boolean }) {
  return adjusted ? <abbr className="grading-mark" title="영어 37번 ④번을 벤치마크 정답으로 인정한 보정입니다. 공식 정답은 ⑤번입니다." aria-label="영어 37번 보정 정답">*</abbr> : null;
}
