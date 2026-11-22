export const SECTION_LABELS = Object.freeze({
  common: '공통', hwajak: '화법과 작문', language_media: '언어와 매체',
  probability: '확률과 통계', calculus: '미적분', geometry: '기하',
  english: '영어', korean_history: '한국사',
  ethics_life: '생활과 윤리', ethics_thought: '윤리와 사상', korean_geography: '한국지리',
  world_geography: '세계지리', east_asian_history: '동아시아사', world_history: '세계사',
  economics: '경제', politics_law: '정치와 법', society_culture: '사회·문화',
  physics1: '물리학Ⅰ', chemistry1: '화학Ⅰ', life_science1: '생명과학Ⅰ', earth_science1: '지구과학Ⅰ',
  physics2: '물리학Ⅱ', chemistry2: '화학Ⅱ', life_science2: '생명과학Ⅱ', earth_science2: '지구과학Ⅱ',
});

export function sectionLabel(section) {
  return Object.hasOwn(SECTION_LABELS, section) ? SECTION_LABELS[section] : section;
}

// Label to show next to a question, or '' when the subject has only one section.
export function sectionTag(section) {
  return section === 'common' || section === 'english' || section === 'korean_history' ? '' : sectionLabel(section);
}

// "2026학년도 국어 · 화법과 작문" -> "화법과 작문"; no " · " -> fallback.
export function trackName(title, fallback) {
  const i = title.indexOf(' · ');
  return i >= 0 ? title.slice(i + 3) : fallback;
}
