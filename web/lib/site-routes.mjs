// Paths for the year-based site. basePath (/KSAT-AI-Benchmark) is added by Next.js, not here.

const seg = (value) => encodeURIComponent(String(value));

export function yearPath(year) {
 return `/${year}`;
}

export function modelPath(year, id) {
 return `/${year}/models/${seg(id)}`;
}

export function questionsPath(year, subject) {
 const base = `/${year}/questions`;
 return subject ? `${base}?subject=${seg(subject)}` : base;
}

export function questionPath(year, questionId) {
 return `/${year}/questions/${seg(questionId)}`;
}

export function comparePath(year, ids) {
 const base = `/${year}/compare`;
 return ids.length ? `${base}?models=${ids.map(seg).join(',')}` : base;
}

export function parseCompare(search) {
 const raw = new URLSearchParams(search).get('models');
 if (!raw) return [];
 const out = [];
 for (const id of raw.split(',')) {
  if (id === '' || out.includes(id)) continue;
  out.push(id);
  if (out.length === 4) break;
 }
 return out;
}

// Maps the old query-string URLs (?year=Y, ?year=Y&model=M) to the new paths.
// Returns null for every other input, so explore-state queries and plain anchors are left alone.
// The hash argument is accepted for the call shape in the contract; the mapping does not read it.
export function legacyRedirect(search, hash, fallbackYear) {
 const params = new URLSearchParams(search);
 const year = params.get('year');
 const model = params.get('model');
 if (!year || !/^\d{4}$/.test(year)) {
  return model && fallbackYear ? modelPath(fallbackYear, model) : null;
 }
 return model ? modelPath(year, model) : yearPath(year);
}
