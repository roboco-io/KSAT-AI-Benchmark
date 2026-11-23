const MAIN_SUBJECTS = ['korean', 'math', 'english'];
const SUBJECT_ORDER = ['korean', 'math', 'english', 'korean_history', 'social', 'science'];
const PROVIDERS = [
  ['gpt', 'OpenAI'], ['claude', 'Anthropic'], ['gemini', 'Google'], ['deepseek', 'DeepSeek'],
  ['glm', 'Zhipu'], ['qwen', 'Alibaba'], ['kimi', 'Moonshot'], ['solar', 'Upstage'], ['exaone', 'LG'],
  ['midm', 'KT'], ['motif', 'Motif Technologies'], ['muse', 'Meta'],
];

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function providerOf(id) {
  const lower = String(id ?? '').toLowerCase();
  for (const [prefix, name] of PROVIDERS) if (lower.startsWith(prefix)) return name;
  return '기타';
}

function subjectsOf(exams) {
  const subjects = {};
  for (const e of exams ?? []) {
    const score = num(e?.summary?.score);
    const max = num(e?.max_score);
    if (score === null || !max || !e.subject) continue;
    (subjects[e.subject] ??= {pct: 0, tracks: []}).tracks.push({id: e.id, title: e.title, score, max});
  }
  for (const s of Object.values(subjects)) {
    // 선택과목 득점률의 평균을 소수 첫째 자리까지 둔다. 반올림으로 100이 되더라도 만점이 아닌 과목이 있으면 99.9로 둔다.
    const pct = Math.round((s.tracks.reduce((sum, t) => sum + (t.score / t.max) * 100, 0) / s.tracks.length) * 10) / 10;
    s.pct = pct === 100 && s.tracks.some((t) => t.score < t.max) ? 99.9 : pct;
  }
  return subjects;
}

function baseView(m) {
  const s = m.summary ?? {};
  // 제공사 사용량 지표가 있으면 그 값을 쓴다. Gemini 호환 API는 추론 토큰을 응답 사용량에서 빼고
  // 보고하므로, 응답 사용량만 쓰면 출력 토큰이 실제보다 훨씬 적게 나온다.
  const metered = s.provider_usage;
  const input = num(metered?.input_tokens) ?? num(s.usage?.input_tokens);
  const output = num(metered?.output_tokens_including_thinking) ?? num(s.usage?.output_tokens);
  return {
    id: m.model, provider: providerOf(m.model), engine: m.engine ?? '',
    effort: m.protocol?.effort ?? null, inputMode: m.input_mode ?? null,
    score: null, maxScore: null, main: null, period4: null, period4Pending: false,
    correct: num(s.correct) ?? 0, incorrect: num(s.incorrect) ?? 0, abstained: num(s.abstained) ?? 0,
    errors: num(s.errors) ?? 0, total: num(s.total_questions) ?? 0,
    costUsd: num(s.estimated_cost_usd), wallSeconds: num(s.wall_time_seconds),
    inputTokens: input, outputTokens: output,
    subjects: subjectsOf(m.exams), questions: m.questions ?? [], limitations: m.limitations ?? [],
  };
}

const ROUTE_SUFFIXES = ['-agy'];

function routeBaseId(id, period4, byId) {
  if (byId.has(id)) return id;
  const requested = (period4?.requested_models ?? []).find((r) => r.id === id);
  if (!requested?.agent) return id;
  const suffix = ROUTE_SUFFIXES.find((x) => id.endsWith(x));
  if (!suffix) return id;
  const base = id.slice(0, -suffix.length);
  const baseAlsoInPeriod4 = (period4?.models ?? []).some((m) => m.model === base);
  return byId.has(base) && !baseAlsoInPeriod4 ? base : id;
}

export function buildYearView(main, period4) {
  const byId = new Map();
  for (const m of main?.models ?? []) {
    const v = baseView(m);
    if ((m.exams ?? []).some((e) => MAIN_SUBJECTS.includes(e.subject))) {
      v.score = num(m.summary?.score);
      v.maxScore = num(m.summary?.max_score);
    }
    byId.set(v.id, v);
  }
  const p4Tokens = new Map();
  for (const m of period4?.models ?? []) {
    // 4교시 풀이가 끝나지 않은 모델은 일부 문항만 채점된 점수를 싣지 않고 진행 중으로만 표시한다.
    if (m.completed === false) {
      const main = byId.get(routeBaseId(m.model, period4, byId));
      if (main) main.period4Pending = true;
      continue;
    }
    const score = num(m.summary?.score);
    const max = num(m.summary?.max_score);
    const t = baseView(m);
    const p4 = score !== null && max !== null
      ? {score, max, correct: t.correct, incorrect: t.incorrect, abstained: t.abstained, errors: t.errors,
        total: t.total, costUsd: t.costUsd, wallSeconds: t.wallSeconds}
      : null;
    // 4교시를 다른 실행 경로로 푼 모델은 요청 목록에 `<모델>-agy` 처럼 경로 접미사가 붙은 id로 올라온다
    // (benchmark/academic-years.mjs 의 MODELS_2027_PERIOD4). 같은 모델이므로 1-3교시 결과에 합친다.
    const baseId = routeBaseId(m.model, period4, byId);
    const existing = byId.get(baseId);
    if (p4) {
      p4.sourceId = baseId === m.model ? null : m.model;
      p4.engine = existing && existing.engine !== t.engine ? t.engine : null;
    }
    if (existing) {
      existing.period4 = p4;
      p4Tokens.set(baseId, {input: t.inputTokens, output: t.outputTokens});
      Object.assign(existing.subjects, subjectsOf(m.exams));
      existing.questions = [...existing.questions, ...(m.questions ?? [])];
    } else {
      const v = baseView(m);
      Object.assign(v, {
        period4: p4, score: null, maxScore: null, costUsd: null, wallSeconds: null,
        inputTokens: null, outputTokens: null, correct: 0, incorrect: 0, abstained: 0, errors: 0, total: 0,
      });
      byId.set(v.id, v);
    }
  }
  // 4교시 실행 기록이 아직 없거나 끝나지 않은 모델도 요청 목록의 상태로 진행 중임을 표시한다.
  for (const r of period4?.requested_models ?? []) {
    if (r.state === 'complete') continue;
    const main = byId.get(routeBaseId(r.id, period4, byId));
    if (main && !main.period4) main.period4Pending = true;
  }
  // 1-3교시와 4교시를 모두 마친 모델은 총점·정답 수·비용·시간·토큰을 두 회차의 합으로 집계하고,
  // 1-3교시만의 값은 `main` 에 남긴다. 4교시가 없는 모델의 집계는 1-3교시 값 그대로다.
  const add = (a, b) => (a === null || b === null ? null : a + b);
  for (const [id, v] of byId) {
    const p = v.period4;
    if (v.score === null || !p) continue;
    v.main = {score: v.score, max: v.maxScore, correct: v.correct, incorrect: v.incorrect, abstained: v.abstained,
      errors: v.errors, total: v.total, costUsd: v.costUsd, wallSeconds: v.wallSeconds};
    v.score += p.score; v.maxScore = add(v.maxScore, p.max);
    for (const k of ['correct', 'incorrect', 'abstained', 'errors', 'total']) v[k] += p[k];
    v.costUsd = add(v.costUsd, p.costUsd); v.wallSeconds = add(v.wallSeconds, p.wallSeconds);
    const tokens = p4Tokens.get(id) ?? {input: null, output: null};
    v.inputTokens = add(v.inputTokens, tokens.input); v.outputTokens = add(v.outputTokens, tokens.output);
  }
  const p4Rate = (m) => (m.period4 && m.period4.max ? m.period4.score / m.period4.max : -1);
  // 4교시가 있는 학년도에서 1-3교시만 집계된 모델은 만점이 달라 총점을 비교할 수 없으므로 전체 집계 모델 뒤에 둔다.
  const anyCombined = [...byId.values()].some((m) => m.main);
  const mainOnly = (m) => anyCombined && m.score !== null && !m.main;
  const models = [...byId.values()].sort((a, b) => {
    if ((a.score === null) !== (b.score === null)) return a.score === null ? 1 : -1;
    if (a.score === null) return p4Rate(b) - p4Rate(a);
    if (mainOnly(a) !== mainOnly(b)) return mainOnly(a) ? 1 : -1;
    if (a.score !== b.score) return b.score - a.score;
    return (a.costUsd ?? Infinity) - (b.costUsd ?? Infinity);
  });
  const pending = (main?.requested_models ?? [])
    .filter((r) => r.state !== 'complete' && !byId.has(r.id))
    .map((r) => ({model: r.id, state: r.state}));
  const present = new Set(models.flatMap((m) => Object.keys(m.subjects)));
  const subjects = SUBJECT_ORDER.filter((s) => present.has(s));
  return {year: main?.academic_year ?? 0, models, pending, subjects};
}

export function slimModel(m) {
  const {questions, limitations, ...rest} = m;
  return rest;
}

export function latestYearWithResults(views) {
  return views.filter((v) => v.models.length > 0).reduce((max, v) => Math.max(max, v.year), 0);
}
