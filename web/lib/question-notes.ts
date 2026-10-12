type QuestionNote = {
  title: string;
  paragraphs: string[];
  sources: { label: string; url: string }[];
};

export const questionNotes: Record<string, QuestionNote> = {
  '2026-english-english-q37': {
    title: '정답 논쟁 기록 · 공식 정답 ⑤번 유지',
    paragraphs: [
      '2026학년도 영어 37번은 글의 순서를 고르는 문항입니다. 공식 정답은 ⑤번 (C) → (B) → (A)이며, ④번 (C) → (A) → (B)도 성립한다는 복수정답 주장이 제기됐습니다.',
      '2025년 11월 17일 에듀진 외부 필진은 (A)의 “This means that”이 (C)의 비경험적 접근을 받아, 경험적 연구로 보완해야 한다는 (A)와 신경과학과 협력해야 한다는 (B)로 이어질 수 있다고 주장했습니다. Opus와 Fable이 제출한 ④번 풀이도 이 논거와 일치합니다.',
      '한국교육과정평가원은 2025년 11월 25일 이의심사에서 37번을 “정답에 이상 없음”으로 판정했습니다. 공개 답변자료에는 37번의 별도 설명이 없으며, 영어 영역의 상세 설명은 24번에만 제시됐습니다. 11월 26일 후속 기고는 이 설명 부재를 비판했습니다.',
      '복수정답 주장은 공식적으로 인정되지 않았습니다. 이 대시보드는 공식 정답 ⑤번으로 채점하며, 논쟁 기록은 점수·정답률·순위를 변경하지 않습니다.',
    ],
    sources: [
      { label: '복수정답 주장 원문 · 에듀진, 2025.11.17', url: 'https://www.edujin.co.kr/news/articleView.html?idxno=51529' },
      { label: '평가원 공식 이의심사 결과 · 첨부 답변자료 인쇄 쪽수 4쪽, 2025.11.25', url: 'https://www.suneung.re.kr/boardCnts/view.do?boardID=1500230&boardSeq=5094220&lev=0&m=0302&s=suneung' },
      { label: '별도 설명 부재를 지적한 후속 기고 · 에듀진, 2025.11.26', url: 'https://www.edujin.co.kr/news/articleView.html?idxno=51635' },
    ],
  },
};
