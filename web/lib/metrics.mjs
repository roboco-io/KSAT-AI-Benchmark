const FIXED = [
  ['score', '총점', '점', 'linear', 'high'],
  ['accuracy', '정답률', '%', 'linear', 'high'],
  ['cost', '추정 비용', 'USD', 'log', 'low'],
  ['wall', '소요 시간', '초', 'log', 'low'],
  ['costPerPoint', '1점당 비용', 'USD', 'log', 'low'],
  ['secPerQuestion', '문항당 시간', '초', 'log', 'low'],
  ['abstention', '기권율', '%', 'linear', 'low'],
  ['errors', '실행 오류', '문항', 'linear', 'low'],
  ['tokens', '토큰 사용량', '토큰', 'log', 'low'],
].map(([key, label, unit, scale, better]) => ({key, label, unit, scale, better}));

const FILTERED = [
  {key: 'fAccuracy', label: '조건 정답률', unit: '%', scale: 'linear', better: 'high'},
  {key: 'fPoints', label: '조건 득점', unit: '점', scale: 'linear', better: 'high'},
];

const PERIOD4_METRIC = {key: 'period4', label: '4교시 득점률', unit: '%', scale: 'linear', better: 'high'};
const PERIOD4_SUBJECTS = ['korean_history', 'social', 'science'];

const SUBJECT_NAMES = {korean: '국어', math: '수학', english: '영어', korean_history: '한국사', social: '사회탐구', science: '과학탐구'};

export function metricsFor(subjects, filtered) {
  const subj = subjects.map(s => ({key: `subj:${s}`, label: `${SUBJECT_NAMES[s] ?? s} 점수`, unit: '점', scale: 'linear', better: 'high'}));
  const p4 = subjects.some(s => PERIOD4_SUBJECTS.includes(s)) ? [PERIOD4_METRIC] : [];
  return [...(filtered ? FILTERED : []), ...FIXED, ...p4, ...subj];
}

const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const pct = (a, b) => (num(a) === null || !b ? null : Math.round((a / b) * 1000) / 10);

export function metricValue(m, key, rescored) {
  switch (key) {
    case 'score': return num(m.score);
    case 'accuracy': return pct(m.correct, m.total);
    case 'cost': return num(m.costUsd);
    case 'wall': return num(m.wallSeconds);
    case 'costPerPoint': return num(m.costUsd) === null || !num(m.score) ? null : m.costUsd / m.score;
    case 'secPerQuestion': return num(m.wallSeconds) === null || !m.total ? null : m.wallSeconds / m.total;
    case 'abstention': return pct(m.abstained, m.total);
    case 'errors': return num(m.errors);
    case 'tokens': return num(m.inputTokens) === null || num(m.outputTokens) === null ? null : m.inputTokens + m.outputTokens;
    case 'period4': return m.period4 ? pct(m.period4.score, m.period4.max) : null;
    case 'fAccuracy': return rescored ? pct(rescored.correct, rescored.total) : null;
    case 'fPoints': return rescored ? num(rescored.points) : null;
    default:
      if (key.startsWith('subj:')) {
        const s = Object.hasOwn(m.subjects ?? {}, key.slice(5)) ? m.subjects[key.slice(5)] : null;
        return s ? num(s.pct) : null;
      }
      return null;
  }
}

// 득점률을 10% 구간 번호로 바꾼다: 0 은 10% 미만, 9 는 90% 이상(100% 포함)이다.
export function scoreBand(pct) {
  if (!Number.isFinite(pct)) return null;
  return Math.max(0, Math.min(9, Math.floor(pct / 10)));
}

function duration(sec) {
  const s = Math.round(sec);
  if (s < 60) return `${s}초`;
  const min = Math.floor(s / 60);
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60), r = min % 60;
  return r ? `${h}시간 ${r}분` : `${h}시간`;
}

export function formatMetric(key, value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '–';
  switch (key) {
    case 'cost':
    case 'costPerPoint': return `$${value.toFixed(value < 0.01 ? 4 : 2)}`;
    case 'wall':
    case 'secPerQuestion': return duration(value);
    case 'accuracy':
    case 'abstention':
    case 'fAccuracy': return `${value.toFixed(1)}%`;
    case 'tokens': return Math.round(value).toLocaleString('en-US');
    case 'period4': return value.toFixed(1);
    default: return key.startsWith('subj:') ? value.toFixed(1) : String(Math.round(value));
  }
}
