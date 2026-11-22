const SUBJECT_LABEL = {
  korean: '국어', math: '수학', english: '영어',
  korean_history: '한국사', social: '사회탐구', science: '과학탐구',
};

export function median(values) {
  const v = values.filter((x) => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = v.length >> 1;
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

const pct1 = (num, den) => (den > 0 ? ((num / den) * 100).toFixed(1) : '0.0');
const num = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));

export function soloWrong(model, cohort) {
  const others = cohort.filter((m) => m.id !== model.id);
  if (!others.length) return [];
  const statusOf = (m) => new Map(m.questions.map((q) => [q.id, q.status]));
  const otherMaps = others.map(statusOf);
  return model.questions
    .filter((q) => {
      if (q.status !== 'incorrect') return false;
      const having = otherMaps.filter((m) => m.has(q.id));
      return having.length > 0 && having.every((m) => m.get(q.id) === 'correct');
    })
    .map((q) => q.id);
}

export function modelTraits(model, cohort) {
  const traits = [];
  const add = (key, tone, label, sentence) => traits.push({ key, tone, label, sentence });
  const scoredCohort = cohort.filter((m) => m.score != null);
  const hasScore = model.score != null && model.maxScore != null && model.maxScore > 0;
  const perfect = hasScore && model.score === model.maxScore;

  if (perfect) add('perfect', 'good', '만점', `${model.correct}문항을 모두 맞혔다.`);

  const costMed = median(scoredCohort.map((m) => m.costUsd));
  if (hasScore && model.score >= 0.9 * model.maxScore && model.costUsd != null && costMed != null
      && model.costUsd <= costMed / 2) {
    add('value', 'good', '저비용 고득점',
      `총점 ${model.score}점(만점 ${model.maxScore}점)을 비용 $${num(model.costUsd)}로 얻었다. 같은 학년도 비용 중앙값은 $${num(costMed)}다.`);
  }

  const timeMed = median(scoredCohort.map((m) => m.wallSeconds));
  if (model.score != null && model.wallSeconds != null && timeMed != null) {
    if (model.wallSeconds <= timeMed / 2) {
      add('fast', 'good', '빠름', `소요 시간은 ${num(model.wallSeconds)}초로 중앙값 ${num(timeMed)}초의 절반 이하다.`);
    } else if (model.wallSeconds >= timeMed * 3) {
      add('slow', 'neutral', '느림', `소요 시간은 ${num(model.wallSeconds)}초로 중앙값 ${num(timeMed)}초의 3배 이상이다.`);
    }
  }

  if (!perfect) {
    const entries = Object.entries(model.subjects || {}).filter(([, s]) => s && typeof s.pct === 'number');
    const best = entries.reduce((a, [, s]) => Math.max(a, s.pct), -Infinity);
    for (const [key, s] of entries) {
      if (s.pct < 60 || best - s.pct >= 25) {
        const label = SUBJECT_LABEL[key] || key;
        add(`weak-${key}`, 'bad', `${label} 약세`,
          `${label} 환산 점수는 ${num(s.pct)}점이고, 이 모델의 최고 과목은 ${num(best)}점이다.`);
      }
    }
  }

  const main = model.score != null;
  if (main && model.abstained >= 5) {
    add('abstains', 'neutral', `기권 ${model.abstained}문항`,
      `${model.abstained}문항에서 답을 내지 않았다. 답한 ${model.correct + model.incorrect}문항의 정답률은 ${pct1(model.correct, model.correct + model.incorrect)}%다.`);
  }

  if (main && model.incorrect >= 10 && model.abstained <= model.incorrect * 0.1) {
    add('guesses', 'bad', `기권 없이 오답 ${model.incorrect}문항`,
      `오답이 ${model.incorrect}문항이고 기권은 ${model.abstained}문항이다.`);
  }

  if (main && model.errors >= 1) {
    add('errors', 'bad', `실행 오류 ${model.errors}문항`, `${model.errors}문항에서 실행 오류가 났다.`);
  }

  if (!main) return traits;
  const solo = soloWrong(model, cohort);
  const wrongTotal = model.questions.filter((q) => q.status === 'incorrect').length;
  if (solo.length >= 3 && solo.length * 2 >= wrongTotal) {
    add('solo-wrong', 'neutral', `혼자 틀린 문항 ${solo.length}개`,
      `다른 모델은 모두 맞혔는데 이 모델만 틀린 문항이 ${solo.length}개이고, 전체 오답 ${wrongTotal}문항의 ${pct1(solo.length, wrongTotal)}%다.`);
  }
  return traits;
}
