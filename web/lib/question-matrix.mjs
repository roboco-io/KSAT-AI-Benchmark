// Question-level views over a YearView: grid, detail page, compare data, filters.

const cmpSection = (a, b) => (a === b ? 0 : a === 'common' ? -1 : b === 'common' ? 1 : a < b ? -1 : 1);

function subjectColumns(view, subject) {
  const cols = new Map();
  for (const m of view.models) {
    for (const q of m.questions) {
      if (q.subject !== subject) continue;
      if (!cols.has(q.id)) cols.set(q.id, {id: q.id, number: q.number, section: q.section, points: q.points, missCount: 0});
      if (q.status !== 'correct') cols.get(q.id).missCount += 1;
    }
  }
  return [...cols.values()].sort((a, b) => cmpSection(a.section, b.section) || a.number - b.number);
}

export function questionMatrix(view, subject) {
  const columns = subjectColumns(view, subject);
  const rows = view.models.map((m) => {
    const byId = new Map(m.questions.map((q) => [q.id, q.status]));
    return {modelId: m.id, cells: columns.map((c) => byId.get(c.id) ?? null)};
  });
  return {columns, rows};
}

export function questionDetail(view, id) {
  let head = null;
  const answers = [];
  for (const m of view.models) {
    const q = m.questions.find((x) => x.id === id);
    if (!q) continue;
    head ??= q;
    answers.push({modelId: m.id, status: q.status, answer: q.answer ?? null, explanation: q.explanation ?? null, timeSeconds: q.time_seconds ?? null});
  }
  if (!head) return null;
  return {id, number: head.number, subject: head.subject, section: head.section, points: head.points,
    correctAnswer: head.correct_answer ?? null, sourcePage: head.source_page ?? null, answers};
}

export function compareData(view) {
  const byId = new Map();
  for (const m of view.models) {
    for (const q of m.questions) {
      if (!byId.has(q.id)) byId.set(q.id, {id: q.id, subject: q.subject, section: q.section, number: q.number, points: q.points, kind: q.kind, answers: {}});
      byId.get(q.id).answers[m.id] = [q.status, q.answer ?? null];
    }
  }
  const models = view.models.map(({questions, limitations, ...summary}) => summary);
  return {models, questions: [...byId.values()]};
}

export function disagreements(data, ids) {
  const out = [];
  for (const q of data.questions) {
    const seen = ids.filter((id) => Object.hasOwn(q.answers, id)).map((id) => q.answers[id]);
    if (seen.length < 2) continue;
    const [s0, a0] = seen[0];
    if (seen.some(([s, a]) => s !== s0 || a !== a0)) out.push(q.id);
  }
  return out;
}

export function filterQuestions(data, f) {
  return data.questions.filter((q) => {
    if (f.subjects.length && !f.subjects.includes(q.subject)) return false;
    if (f.minPoints != null && q.points < f.minPoints) return false;
    if (f.kind && q.kind !== f.kind) return false;
    if (f.minMissShare != null) {
      const results = Object.values(q.answers);
      if (!results.length) return false;
      const miss = results.filter(([s]) => s !== 'correct').length;
      if (miss / results.length < f.minMissShare) return false;
    }
    return true;
  }).map((q) => q.id);
}

export function rescore(data, questionIds) {
  const wanted = new Set(questionIds);
  const out = {};
  for (const m of data.models) out[m.id] = {correct: 0, total: 0, points: 0, maxPoints: 0};
  for (const q of data.questions) {
    if (!wanted.has(q.id)) continue;
    for (const [modelId, [status]] of Object.entries(q.answers)) {
      const r = out[modelId];
      if (!r) continue;
      r.total += 1;
      r.maxPoints += q.points;
      if (status === 'correct') { r.correct += 1; r.points += q.points; }
    }
  }
  return out;
}
