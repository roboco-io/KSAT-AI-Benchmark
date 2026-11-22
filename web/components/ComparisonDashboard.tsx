'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { ModelExecutionDetails } from './ModelExecutionDetails';
import { GradingMark } from './GradingMark';
import { ThemeControl } from './ThemeControl';
import { BenchmarkDashboard } from './BenchmarkDashboard';
import { ModelIntro } from './ModelIntro';
import { SubjectScoreMatrix } from './SubjectScoreMatrix';
import type { BenchmarkComparison, BenchmarkData, RequestedModel } from './benchmark-types';
import { formatKst } from '@/lib/format-date.mjs';
import { RobocoBrand } from './RobocoBrand';
import { modelFromSearch, modelShareUrl } from '@/lib/model-link.mjs';

const providerLabels: Record<string, string> = { openai: 'OpenAI', anthropic: 'Anthropic', deepseek: 'DeepSeek', zai: 'Z.ai', qwen: 'Qwen', moonshot: 'Moonshot AI', google: 'Google', upstage: 'Upstage', lgai: 'LG AI Research' };
const states = { complete: '평가 완료', partial: '평가 불완전', pending: '평가 대기', blocked: '실행 차단' };
type Track = { subject: string; track: string; label: string; average?: boolean };
const mainTracks: Track[] = [
  { subject: 'korean', track: 'hwajak', label: '화작' },
  { subject: 'korean', track: 'language_media', label: '언매' },
  { subject: 'math', track: 'probability', label: '확통' },
  { subject: 'math', track: 'calculus', label: '미적' },
  { subject: 'math', track: 'geometry', label: '기하' },
  { subject: 'english', track: 'english', label: '영어' },
];
const mainSubjects = [
  { id: 'korean', label: '국어', columns: 2 },
  { id: 'math', label: '수학', columns: 3 },
  { id: 'english', label: '영어', columns: 1 },
];
// Period 4: Korean history score, and the average raw score over all social or science inquiry subjects (per-subject scores are in the records).
const period4Tracks: Track[] = [
  { subject: 'korean_history', track: 'korean_history', label: '한국사' },
  { subject: 'social', track: 'social', label: '과목 평균', average: true },
  { subject: 'science', track: 'science', label: '과목 평균', average: true },
];
const period4Subjects = [
  { id: 'korean_history', label: '한국사', columns: 1 },
  { id: 'social', label: '사회탐구', columns: 1 },
  { id: 'science', label: '과학탐구', columns: 1 },
];
type SortKey = string;
const baseSortLabels: Record<string, string> = { model: '모델', state: '평가 상태', accuracy: '정답률', abstention: '기권 횟수', time: '풀이 시간', cost: 'API 환산 USD' };
const mainSortLabels: Record<string, string> = { ...baseSortLabels, hwajak: '국어 · 화작 원점수', language_media: '국어 · 언매 원점수', probability: '수학 · 확통 원점수', calculus: '수학 · 미적 원점수', geometry: '수학 · 기하 원점수', english: '영어 원점수' };
const period4SortLabels: Record<string, string> = { ...baseSortLabels, korean_history: '한국사 원점수', social: '사회탐구 과목 평균 원점수', science: '과학탐구 과목 평균 원점수' };
// Score plus correct/total question counts, so a raw score is never mistaken for a question count (or vice versa).
type TrackScore = { score: number; correct: number; total: number; exam?: BenchmarkData['exams'][number] };
function trackScore(result: BenchmarkData, track: Track): TrackScore | null {
  if (track.average) {
    const exams = result.exams.filter(exam => exam.subject === track.subject && exam.summary.total_questions > exam.summary.pending);
    return exams.length ? { score: exams.reduce((sum, exam) => sum + exam.summary.score, 0) / exams.length, correct: exams.reduce((sum, exam) => sum + exam.summary.correct, 0), total: exams.reduce((sum, exam) => sum + exam.summary.total_questions, 0) } : null;
  }
  const exam = result.exams.find(item => item.subject === track.subject && (item.track === track.track || track.subject === 'english'));
  return exam && exam.summary.total_questions > exam.summary.pending ? { score: exam.summary.score, correct: exam.summary.correct, total: exam.summary.total_questions, exam } : null;
}
const percent = (value: number) => `${value.toFixed(1)}%`;
const elapsed = (seconds: number) => `${Math.floor(seconds / 60)}분 ${Math.floor(seconds % 60)}초`;
// Agent and reasoning effort shown under each model name; unrun models fall back to the provider's planned route.
function runSetup(model: RequestedModel, result?: BenchmarkData) {
  const protocol = result?.protocol;
  const agent = model.agent === 'antigravity' || protocol?.agent === 'Antigravity CLI'
    ? `Antigravity CLI${protocol?.sdk_version ? ` (${protocol.sdk_version})` : ' (agy ACP)'}`
    : protocol?.agent === 'Pi' || (!protocol && !['openai', 'anthropic'].includes(model.provider))
    ? (protocol?.sdk_version ?? 'Pi CLI')
    : model.provider === 'openai' ? `Codex SDK${protocol?.sdk_version ? ` ${protocol.sdk_version}` : ''}` : `Claude Agent SDK${protocol?.sdk_version ? ` ${protocol.sdk_version}` : ''}`;
  const semantics = protocol?.effort_semantics;
  const effort = semantics && semantics !== 'high' ? 'thinking 켬(강도 설정 없음)' : protocol?.effort ?? 'high';
  return { agent, effort };
}
function complete(model: RequestedModel, result?: BenchmarkData) {
  return model.state === 'complete' && result?.completed === true && result.summary.pending === 0 && result.summary.errors === 0;
}

// period4Data: when given on the periods 1-3 table, each model also shows its period 4 accuracy, linked to the period 4 tab.
export function ComparisonDashboard({ data, period4Data, onOpenPeriod4 }: { data: BenchmarkComparison; period4Data?: BenchmarkComparison; onOpenPeriod4?: () => void }) {
  const period4 = data.session === 'period4';
  const showPeriod4 = !period4 && !!period4Data;
  const tracks = period4 ? period4Tracks : mainTracks, scoreSubjects = period4 ? period4Subjects : mainSubjects;
  const sortLabels: Record<string, string> = period4 ? period4SortLabels : showPeriod4 ? { ...mainSortLabels, period4: '4교시 정답률' } : mainSortLabels;
  function period4Result(modelId: string) {
    const request = period4Data?.requested_models.find(model => model.id === modelId), result = period4Data?.models.find(model => model.model === modelId);
    return request && result && complete(request, result) ? result : undefined;
  }
  const period4Done = period4Data ? period4Data.requested_models.filter(model => period4Result(model.id)).length : 0;
  const defaultModel = data.models[0]?.model ?? data.requested_models[0]?.id ?? '';
  const [selected, setSelected] = useState(defaultModel);
  // Highlight a row only after a user or a shared ?model= link picks it, not for the implicit default.
  const [picked, setPicked] = useState(false);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  const [showRecords, setShowRecords] = useState(false);
  const [recordNavigation, setRecordNavigation] = useState(0);
  useEffect(() => {
    const syncSelection = () => {
      const model = modelFromSearch(window.location.search, data.requested_models.map(model => model.id));
      setSelected(model ?? defaultModel); setPicked(model !== null); setExpandedModel(model);
      setShowRecords(window.location.hash === '#model-records');
    };
    syncSelection();
    window.addEventListener('popstate', syncSelection);
    return () => window.removeEventListener('popstate', syncSelection);
  }, [data.requested_models, defaultModel]);
  function selectModel(modelId: string) {
    setSelected(modelId); setPicked(true);
    const url = modelShareUrl(window.location.href, modelId);
    if (url !== window.location.href) window.history.pushState(null, '', url);
  }
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'accuracy', direction: 'desc' });
  function changeSort(key: SortKey) {
    setSort(previous => ({ key, direction: previous.key === key ? (previous.direction === 'desc' ? 'asc' : 'desc') : key === 'model' || key === 'state' ? 'asc' : 'desc' }));
  }
  const sortDirection = (key: SortKey) => sort.key === key ? (sort.direction === 'asc' ? 'ascending' as const : 'descending' as const) : 'none' as const;
  const sortButton = (key: SortKey, label = sortLabels[key]) => <button type="button" className="sort-header" onClick={() => changeSort(key)} aria-label={`${label} 정렬`} title={`${label} 정렬 방향 전환`}>{label}<span aria-hidden="true">{sort.key === key ? sort.direction === 'asc' ? '↑' : '↓' : '↕'}</span></button>;
  const detailRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (showRecords) detailRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }, [showRecords, recordNavigation]);
  function toggleModel(modelId: string) {
    selectModel(modelId);
    setExpandedModel(previous => previous === modelId ? null : modelId);
  }
  function showModelRecords(modelId: string) {
    selectModel(modelId);
    setShowRecords(true);
    setRecordNavigation(previous => previous + 1);
  }
  const current = data.models.find(model => model.model === selected);
  const request = data.requested_models.find(model => model.id === selected);
  const comparisonFile = period4 ? `benchmark-comparison-${data.academic_year}-period4.json` : data.academic_year === 2026 ? 'benchmark-comparison.json' : `benchmark-comparison-${data.academic_year}.json`;
  const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
  function sortValue(model: RequestedModel): string | number | null {
    if (sort.key === 'model') return model.label;
    if (sort.key === 'state') return ['complete', 'partial', 'blocked', 'pending'].indexOf(model.state);
    const result = data.models.find(item => item.model === model.id);
    // Partial runs sort together with complete ones on their current (interim) numbers; only unmeasured models go last.
    if (!result || !(model.state === 'complete' || model.state === 'partial') || !result.questions.some(q => q.status !== 'pending')) return null;
    const summary = result.summary;
    switch (sort.key) {
      case 'accuracy': return summary.accuracy;
      case 'abstention': return summary.abstained;
      case 'time': return summary.solve_time_seconds ?? summary.wall_time_seconds;
      case 'cost': return summary.estimated_cost_usd;
      case 'period4': return period4Result(model.id)?.summary.accuracy ?? null;
      default: { const track = tracks.find(item => item.track === sort.key); return track ? trackScore(result, track)?.score ?? null : null; }
    }
  }
  const comparisonModels = [...data.requested_models].sort((a, b) => {
    const av = sortValue(a), bv = sortValue(b);
    if (av === null) return bv === null ? 0 : 1;
    if (bv === null) return -1;
    const difference = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv, 'en') : Number(av) - Number(bv);
    if (difference !== 0) return sort.direction === 'asc' ? difference : -difference;
    // Ties (e.g. equal accuracy) go to the shorter solve time (requests that submitted answers; retries excluded).
    const as = data.models.find(item => item.model === a.id)?.summary, bs = data.models.find(item => item.model === b.id)?.summary;
    const at = as && (as.solve_time_seconds ?? as.wall_time_seconds), bt = bs && (bs.solve_time_seconds ?? bs.wall_time_seconds);
    return sort.key === 'time' || at == null || bt == null ? 0 : at - bt;
  });
  const gradingPolicy = data.models.find(model => model.grading_policy)?.grading_policy;
  const piApiModels = data.billing_policy.pi_api_models ?? [];
  const executionPolicy = piApiModels.length
    ? `OpenAI·Anthropic 모델은 Codex·Claude 구독 인증으로 실행합니다. 추가 지정한 ${piApiModels.length}개 모델은 Pi API로 실행합니다. 구독 실행을 API 키로 대체하지 않습니다.`
    : data.billing_policy.subscription_only
      ? '구독 인증으로 실행합니다. API 키로 전환하지 않습니다.'
      : '모델별 실행 방식은 아래 평가 기록에서 확인할 수 있습니다.';
  const completed = data.requested_models.filter(model => complete(model, data.models.find(result => result.model === model.id))).length;
  return <div className="benchmark-shell comparison-shell">
    <a className="skip-link" href="#comparison">모델 비교로 이동</a>
    <header className="site-header"><RobocoBrand /><nav aria-label="주요 메뉴"><a href={data.repository_url} target="_blank" rel="noreferrer" className="repository-link">GitHub 저장소 ↗</a>{data.academic_year === 2026 && <a href={`${basePath}/debates/english-q37.html`}>영어 37번 정답 토론</a>}<a href={`${basePath}/archive.html`}>기존 평가</a><a className="download" href={`${basePath}/data/${comparisonFile}`} download={comparisonFile}>비교 JSON 다운로드</a><ThemeControl /></nav></header>
    <main>
      <section className="comparison-heading" aria-labelledby="comparison-title"><div><p className="year-label">{data.academic_year}학년도 대학수학능력시험 · 모델 평가</p><h1 id="comparison-title">{period4 ? '모델별 4교시 성적표' : '모델별 수능 성적표'}</h1><p className="intro">{period4 ? '한국사와 사회·과학탐구 17과목, 360문항을 모든 모델이 풀었습니다.' : '같은 국어·수학·영어 문제로 비교합니다.'} 모델을 누르면 실행 내역과 총평을 펼쳐 볼 수 있습니다.</p></div><div className="comparison-count"><strong>{completed}<span> / {data.requested_models.length}</span></strong><span>모델 평가 완료</span><small>{formatKst(data.generated_at)} (KST)</small></div></section>
      <section id="comparison" aria-labelledby="comparison-table-title"><div className="section-title"><h2 id="comparison-table-title">모델 비교</h2><span>{sortLabels[sort.key]} {sort.direction === 'desc' ? '내림차순' : '오름차순'} · 평가 불완전은 중간 집계로 함께 정렬 · 평가 대기는 맨 뒤</span></div>
        {data.requested_models.some(model => model.input_mode === 'text_transcript') && <p className="comparison-note"><strong>입력 조건의 차이:</strong> ‘텍스트 전사본 입력’으로 표시한 모델은 이미지 입력을 받지 않아, 문제지 이미지 대신 원본을 쪽 단위로 옮겨 적은 고정 텍스트로 평가했습니다. 다른 모델은 문제지 이미지를 직접 판독하므로 두 결과는 같은 입력 조건의 비교가 아닙니다. 그림·그래프·도표는 글로 기술해 전달했고, 해당 문항을 제외한 정답률을 함께 표시합니다.</p>}
        {data.requested_models.some(model => model.agent === 'antigravity') && <p className="comparison-note"><strong>agy(Antigravity CLI) 경로의 제약:</strong> Google AI Ultra 구독으로 실행하는 Gemini 모델은 agy의 ACP 모드로 문제지 이미지를 받습니다. agy는 웹 검색·URL 읽기·브라우저 같은 내장 도구를 끌 수 있는 설정이 없어, 도구가 켜진 채 실행됩니다. 모델이 도구를 한 번이라도 호출하면 그 요청을 즉시 취소하고 답을 버린 뒤 다시 시도하므로, 공개한 답은 모두 도구 없이 낸 답입니다. 다만 도구를 쓸 수 있는 상태에서 풀었다는 점과, agy가 이미지를 한 변 최대 2,000px(원본 2,339×3,309px의 약 60%)로 줄여 보낸다는 점이 다른 모델과 다릅니다.</p>}
        {gradingPolicy && <p className="grading-policy-note"><strong>채점 기준:</strong> 영어 37번 ④·⑤ 인정 · 보정 점수 * 표시 · 공식 점수 병기. <a href={`${basePath}/debates/english-q37.html#grading-policy`}>보정 근거·정책 보기 →</a></p>}
        {showPeriod4 && <div className="period4-callout" role="note"><span className="new-badge">NEW</span><p><strong>4교시 결과 추가:</strong> 한국사와 사회·과학탐구 17과목, 360문항을 웹 검색 없이 모델의 지식만으로 풀었습니다. 현재 {period4Done}/{period4Data!.requested_models.length}개 모델 채점 완료 · 표의 ‘4교시’ 열에서 정답률을 함께 볼 수 있습니다.</p><button type="button" onClick={onOpenPeriod4}>4교시 성적표 보기 →</button></div>}
        {period4 && <p className="comparison-note closed-book-note"><strong>외부 정보 없는 지식 시험:</strong> 4교시는 모델이 학습으로 이미 가진 지식만으로 풀도록 설계했습니다. 웹 검색·외부 문서·도구를 제공하지 않고(Codex는 네트워크·웹 검색 비활성, Claude는 도구 0개, Pi는 오프라인·도구 비활성), 모델이 도구를 호출하면 그 요청을 프로토콜 위반으로 중단합니다. 풀이 지시문에도 외부 조회를 하지 말라고 명시했습니다.</p>}
        {period4 && <p className="comparison-note"><strong>과목 구성:</strong> 수험생은 탐구를 최대 2과목만 고르지만, 모델은 사회탐구 9과목과 과학탐구 8과목을 모두 풀었습니다. 표의 탐구 점수는 과목별 원점수(50점 만점)의 평균이며, 18과목 각각의 점수는 아래 ‘과목별 원점수’ 표에서 비교할 수 있습니다. 직업탐구와 5교시(제2외국어·한문)는 평가하지 않았습니다.</p>}
        <div className="comparison-sort-controls"><label>정렬 기준<select value={sort.key} onChange={event => changeSort(event.target.value as SortKey)}>{Object.entries(sortLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button type="button" onClick={() => changeSort(sort.key)}>{sort.direction === 'desc' ? '내림차순 ↓' : '오름차순 ↑'}</button><span>헤더 클릭으로 정렬 · 다시 클릭하면 방향 전환</span></div>
        <div className="comparison-table-wrap"><table className="comparison-table"><caption className="sr-only">모델별 실행 상태, 정답률, 기권 횟수, 선택과목 원점수, 시간과 비용</caption><thead><tr><th scope="col" aria-sort={sortDirection('model')}>{sortButton('model')}</th><th scope="col" aria-sort={sortDirection('state')}>{sortButton('state')}</th><th scope="col" aria-sort={sortDirection('accuracy')}>{sortButton('accuracy')}</th><th scope="col" aria-sort={sortDirection('abstention')}>{sortButton('abstention')}</th>{showPeriod4 && <th scope="col" className="period4-column" aria-sort={sortDirection('period4')}>{sortButton('period4', '4교시')}<span className="new-badge">NEW</span></th>}<th scope="col" className="track-column" aria-sort={tracks.some(track => track.track === sort.key) ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}><span>{period4 ? '원점수(50점 만점, 탐구는 과목 평균) · 정답 문항수 · 정답률' : '원점수(100점 만점) · 정답 문항수 · 정답률'}</span><div className="subject-score-groups track-sort">{scoreSubjects.map(subject => <div className="subject-score-group" key={subject.id}><strong className="score-subject-label">{subject.label}</strong><div className="track-scores" style={{gridTemplateColumns: `repeat(${subject.columns}, 1fr)`}}>{tracks.filter(track => track.subject === subject.id).map(track => <span key={track.track}>{sortButton(track.track as SortKey, track.label)}</span>)}</div></div>)}</div></th><th scope="col" aria-sort={sortDirection('time')}>{sortButton('time')}</th><th scope="col" aria-sort={sortDirection('cost')}>{sortButton('cost')} <abbr className="cost-info" title="실측 청구액이 아님" aria-label="실측 청구액이 아님" tabIndex={0}>ⓘ</abbr></th></tr></thead><tbody>{comparisonModels.map(model => {
          const result = data.models.find(item => item.model === model.id);
          const isComplete = complete(model, result);
          const measured = result && result.questions.some(q => q.status !== 'pending') && (model.state === 'complete' || model.state === 'partial');
          const effectiveState = model.state === 'complete' && !isComplete ? 'partial' : model.state;
          return <Fragment key={model.id}><tr onClick={() => toggleModel(model.id)} className={`${picked && selected === model.id ? 'selected-row' : ''} ${effectiveState}`}><th scope="row" className="model-cell"><button aria-pressed={picked && selected === model.id} type="button" aria-controls={`analysis-${model.id}`} aria-expanded={expandedModel === model.id}>{model.label}<span className="accordion-indicator" aria-hidden="true">{expandedModel === model.id ? '−' : '+'}</span></button><GradingMark adjusted={result?.summary.adjusted_correct} /><small>{providerLabels[model.provider] || model.provider}</small>{(() => { const setup = runSetup(model, result); return <span className="run-setup"><span>에이전트: {setup.agent}</span><span>추론 강도: {setup.effort}</span></span>; })()}{model.agent === 'antigravity' && <span className="model-reason agy-constraint">agy 제약: 웹 검색 등 도구가 켜진 채 실행(도구 호출 시 해당 시도 무효·재시도) · 이미지 한 변 최대 2,000px로 축소 · Google AI Ultra 구독</span>}{model.input_mode === 'text_transcript' && <span className="model-reason">텍스트 전사본 입력{measured && result?.figure_dependent ? ` · 그림 의존 ${result.figure_dependent.excluded_question_ids.length}문항 제외 정답률 ${percent(result.figure_dependent.accuracy)}` : ''}</span>}{model.reason && <span className="model-reason">{model.reason}</span>}</th><td data-label="평가 상태"><span className={`comparison-state ${effectiveState}`}>{states[effectiveState]}</span></td><td data-label="정답률" className="comparison-accuracy">{measured ? <>{percent(result.summary.accuracy)}<GradingMark adjusted={result.summary.adjusted_correct} /><small className="track-count">{result.summary.correct}/{result.summary.total_questions}문항</small></> : '—'}{measured && !!result.summary.adjusted_correct && result.official_summary && <small>공식 {percent(result.official_summary.accuracy)}</small>}{measured && !isComplete && <small>중간 집계</small>}</td><td data-label="기권 횟수">{measured ? `${result.summary.abstained}회` : '—'}</td>{showPeriod4 && <td data-label="4교시 정답률" className="period4-column">{(() => { const p4 = period4Result(model.id); return p4 ? <button type="button" className="period4-link" onClick={event => { event.stopPropagation(); onOpenPeriod4?.(); }}>{percent(p4.summary.accuracy)}<small>{p4.summary.correct}/{p4.summary.total_questions}</small></button> : <small>{period4Data!.requested_models.some(item => item.id === model.id) ? '진행 중' : '—'}</small>; })()}</td>}<td data-label={period4 ? '원점수 / 50점' : '원점수 / 100점'} className="track-column"><div className="subject-score-groups">{scoreSubjects.map(subject => <div className="subject-score-group" key={subject.id}><strong className="score-subject-label">{subject.label}</strong><div className="track-scores" style={{gridTemplateColumns: `repeat(${subject.columns}, 1fr)`}}>{tracks.filter(track => track.subject === subject.id).map(track => {
            const scored = measured ? trackScore(result, track) : null, exam = scored?.exam;
            return <span key={track.track}><small>{track.label}</small><b>{scored ? <>{track.average ? scored.score.toFixed(1) : scored.score}<GradingMark adjusted={exam?.summary.adjusted_correct} /></> : '—'}</b>{scored && <small className="track-count">{scored.correct}/{scored.total} · {+(scored.correct / scored.total * 100).toFixed(1)}%</small>}{exam && !!exam.summary.adjusted_correct && <small>공식 {exam.official_summary?.score}</small>}</span>;
          })}</div></div>)}</div></td><td data-label="풀이 시간">{measured ? elapsed(result.summary.solve_time_seconds ?? result.summary.wall_time_seconds) : '—'}</td><td data-label="API 환산 USD">{measured ? `$${result.summary.estimated_cost_usd.toFixed(4)}` : '—'}{measured && result.summary.cost_basis === 'provider_usage_metrics' ? <small>Google 사용량 지표 기준 · 추론 포함</small> : measured && result.usage_complete === false && <small>보고된 사용량 기준</small>}</td></tr>{expandedModel === model.id && <tr className="model-analysis-row" id={`analysis-${model.id}`}><td colSpan={showPeriod4 ? 8 : 7}><ModelIntro modelId={model.id} label={model.label} />{result ? <ModelExecutionDetails data={result} label={model.label} onShowAnswers={() => showModelRecords(model.id)} /> : <p role="status">{model.reason || '아직 실행 기록이 없습니다.'}</p>}</td></tr>}</Fragment>;
        })}</tbody></table></div>
        <SubjectScoreMatrix data={data} order={comparisonModels} session={period4 ? 'period4' : 'main'} />
        <p className="comparison-note"><strong>API 환산 비용:</strong> 모든 모델의 비용은 추론(thinking) 토큰을 출력 토큰에 포함해 계산한 참고 추정이며 청구서 금액이 아닙니다. Gemini는 호환 API가 추론 토큰을 응답 사용량에서 빼고 보고해, Google Cloud 사용량 지표의 실제 토큰 수로 다시 계산했습니다(2026-11-21 보정). 다른 Pi 모델은 응답 사용량에 추론 토큰이 포함됨을 확인했고, Codex·Claude는 SDK가 보고한 출력 토큰(추론 포함)을 사용합니다.</p>
        <p className="comparison-note">기권 횟수는 기권을 확정한 문항 수입니다. 모델을 누르면 재시도·거부·타임아웃과 사용량을 확인할 수 있습니다.</p>
        <details className="comparison-method"><summary>실행·비용 산정 기준</summary><p className="comparison-note">{executionPolicy} 비용은 토큰 사용량을 API 단가로 환산한 추정값이며 실제 청구액이 아닙니다. 캐시 토큰은 입력에 포함됩니다. 화작·언매는 국어, 확통·미적·기하는 수학 선택과목입니다.</p></details>
      </section>
      {showRecords && <section id="model-records" ref={detailRef} className="model-detail-section" aria-labelledby="model-detail-title"><div className="detail-heading"><div><h2 id="model-detail-title" aria-live="polite">{request?.label} 평가 기록<GradingMark adjusted={current?.summary.adjusted_correct} /></h2><p>공통 문항은 전체 집계에서 한 번만 계산합니다.</p><button type="button" className="hide-model-answers" onClick={() => setShowRecords(false)}>문항 기록 접기</button></div><label>평가 모델<select value={selected} onChange={event => {selectModel(event.target.value); setExpandedModel(event.target.value);}}>{data.requested_models.map(model => <option key={model.id} value={model.id}>{model.label} · {states[model.state]}</option>)}</select></label></div>
        {current && (request?.state === 'complete' || request?.state === 'partial') ? <BenchmarkDashboard key={selected} data={current} embedded /> : <div className="unrun-model" role="status"><strong>{request?.label}</strong><span>{request ? states[request.state] : '평가 대기'}</span><p>{request?.reason || '이 모델의 실제 평가 결과가 아직 없습니다.'}</p></div>}
      </section>}
    </main><footer><a href={data.repository_url} target="_blank" rel="noreferrer">GitHub에서 코드·평가 자료 확인 ↗</a><span>roboco · KSAT AI Benchmark · {data.academic_year}학년도</span></footer>
  </div>;
}
