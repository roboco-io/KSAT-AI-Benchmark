'use client';

import { useEffect, useRef, useState } from 'react';
import { GradingMark } from './GradingMark';
import { ThemeControl } from './ThemeControl';
import { BenchmarkDashboard } from './BenchmarkDashboard';
import type { BenchmarkComparison, BenchmarkData, RequestedModel } from './benchmark-types';
import { formatKst } from '@/lib/format-date.mjs';
import { RobocoBrand } from './RobocoBrand';
import { modelFromSearch, modelShareUrl } from '@/lib/model-link.mjs';

const providerLabels: Record<string, string> = { openai: 'OpenAI', anthropic: 'Anthropic', deepseek: 'DeepSeek', zai: 'Z.ai', qwen: 'Qwen', moonshot: 'Moonshot AI', google: 'Google' };
const states = { complete: '평가 완료', partial: '평가 불완전', pending: '평가 대기', blocked: '실행 차단' };
const tracks = [
  { subject: 'korean', track: 'hwajak', label: '화작' },
  { subject: 'korean', track: 'language_media', label: '언매' },
  { subject: 'math', track: 'probability', label: '확통' },
  { subject: 'math', track: 'calculus', label: '미적' },
  { subject: 'math', track: 'geometry', label: '기하' },
  { subject: 'english', track: 'english', label: '영어' },
];
const scoreSubjects = [
  { id: 'korean', label: '국어', columns: 2 },
  { id: 'math', label: '수학', columns: 3 },
  { id: 'english', label: '영어', columns: 1 },
];
type SortKey = 'model' | 'state' | 'accuracy' | 'abstention' | 'time' | 'tokens' | 'cost' | 'refusals' | 'timeouts' | 'hwajak' | 'language_media' | 'probability' | 'calculus' | 'geometry' | 'english';
const sortLabels: Record<SortKey, string> = { model: '모델', state: '평가 상태', accuracy: '정답률', abstention: '기권률', time: '총 실행 시간', tokens: '토큰 사용량', cost: 'API 환산 USD', refusals: '답변 거부', timeouts: '타임아웃', hwajak: '국어 · 화작 원점수', language_media: '국어 · 언매 원점수', probability: '수학 · 확통 원점수', calculus: '수학 · 미적 원점수', geometry: '수학 · 기하 원점수', english: '영어 원점수' };
const percent = (value: number) => `${value.toFixed(1)}%`;
const number = (value: number) => value.toLocaleString('ko-KR');
const elapsed = (seconds: number) => `${Math.floor(seconds / 60)}분 ${Math.floor(seconds % 60)}초`;
function complete(model: RequestedModel, result?: BenchmarkData) {
  return model.state === 'complete' && result?.completed === true && result.summary.pending === 0 && result.summary.errors === 0;
}

export function ComparisonDashboard({ data }: { data: BenchmarkComparison }) {
  const defaultModel = data.models[0]?.model ?? data.requested_models[0]?.id ?? '';
  const [selected, setSelected] = useState(defaultModel);
  useEffect(() => {
    const syncSelection = () => setSelected(modelFromSearch(window.location.search, data.requested_models.map(model => model.id)) ?? defaultModel);
    syncSelection();
    window.addEventListener('popstate', syncSelection);
    return () => window.removeEventListener('popstate', syncSelection);
  }, [data.requested_models, defaultModel]);
  function selectModel(modelId: string) {
    setSelected(modelId);
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
  function showModelRecords(modelId: string) {
    selectModel(modelId);
    detailRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
  const current = data.models.find(model => model.model === selected);
  const request = data.requested_models.find(model => model.id === selected);
  const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
  function sortValue(model: RequestedModel): string | number | null {
    if (sort.key === 'model') return model.label;
    if (sort.key === 'state') return ['complete', 'partial', 'blocked', 'pending'].indexOf(model.state);
    const result = data.models.find(item => item.model === model.id);
    if (sort.key === 'refusals') return result?.execution_stats?.refusal_count ?? null;
    if (sort.key === 'timeouts') return result?.execution_stats?.timeout_count ?? null;
    if (!complete(model, result) || !result) return null;
    const summary = result.summary;
    switch (sort.key) {
      case 'accuracy': return summary.accuracy;
      case 'abstention': return summary.abstention_rate;
      case 'time': return summary.wall_time_seconds;
      case 'tokens': return summary.usage.input_tokens + summary.usage.output_tokens;
      case 'cost': return summary.estimated_cost_usd;
      default: return result.exams.find(exam => exam.track === sort.key)?.summary.score ?? null;
    }
  }
  const comparisonModels = [...data.requested_models].sort((a, b) => {
    const av = sortValue(a), bv = sortValue(b);
    if (av === null) return bv === null ? 0 : 1;
    if (bv === null) return -1;
    const difference = typeof av === 'string' && typeof bv === 'string' ? av.localeCompare(bv, 'en') : Number(av) - Number(bv);
    return sort.direction === 'asc' ? difference : -difference;
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
    <header className="site-header"><RobocoBrand /><nav aria-label="주요 메뉴"><a href={data.repository_url} target="_blank" rel="noreferrer" className="repository-link">GitHub 저장소 ↗</a><a href={`${basePath}/debates/english-q37.html`}>영어 37번 정답 토론</a><a href={`${basePath}/archive.html`}>기존 평가</a><a className="download" href={`${basePath}/data/benchmark-comparison.json`} download="benchmark-comparison.json">비교 JSON 다운로드</a><ThemeControl /></nav></header>
    <main>
      <section className="comparison-heading" aria-labelledby="comparison-title"><div><p className="year-label">{data.academic_year}학년도 대학수학능력시험 · 사전 평가</p><h1 id="comparison-title">모델별 수능 성적표</h1><p className="intro">같은 국어·수학·영어 문제로 비교합니다. 모델을 선택하면 문항별 답과 풀이를 볼 수 있습니다.</p></div><div className="comparison-count"><strong>{completed}<span> / {data.requested_models.length}</span></strong><span>모델 평가 완료</span><small>{formatKst(data.generated_at)} (KST)</small></div></section>
      <section id="comparison" aria-labelledby="comparison-table-title"><div className="section-title"><h2 id="comparison-table-title">모델 비교</h2><span>{sortLabels[sort.key]} {sort.direction === 'desc' ? '내림차순' : '오름차순'} · {sort.key === 'refusals' || sort.key === 'timeouts' ? '불완전 실행도 요청 횟수 집계' : '불완전 실행은 지표 순위에서 제외'}</span></div>
        {gradingPolicy && <p className="grading-policy-note"><strong>벤치마크 보정 채점:</strong> 영어 37번은 ④·⑤번을 정답으로 인정합니다. ④번 제출 모델과 보정 점수는 *로 표시하고 공식 점수를 함께 공개합니다. <a href={`${basePath}/debates/english-q37.html#grading-policy`}>보정 근거·정책 보기 →</a></p>}
        <div className="comparison-sort-controls"><label>정렬 기준<select value={sort.key} onChange={event => changeSort(event.target.value as SortKey)}>{Object.entries(sortLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button type="button" onClick={() => changeSort(sort.key)}>{sort.direction === 'desc' ? '내림차순 ↓' : '오름차순 ↑'}</button><span>헤더 클릭으로 정렬 · 다시 클릭하면 방향 전환</span></div>
        <div className="comparison-table-wrap"><table className="comparison-table"><caption className="sr-only">모델별 실행 상태, 정답률, 기권률, 선택과목 원점수, 시간과 사용량</caption><thead><tr><th scope="col" aria-sort={sortDirection('model')}>{sortButton('model')}</th><th scope="col" aria-sort={sortDirection('state')}>{sortButton('state')}</th><th scope="col" aria-sort={sortDirection('accuracy')}>{sortButton('accuracy')}</th><th scope="col" aria-sort={sortDirection('abstention')}>{sortButton('abstention')}</th><th scope="col" aria-sort={sortDirection('refusals')}>{sortButton('refusals')}</th><th scope="col" aria-sort={sortDirection('timeouts')}>{sortButton('timeouts')}</th><th scope="col" className="track-column" aria-sort={tracks.some(track => track.track === sort.key) ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}><span>원점수 / 100점</span><div className="subject-score-groups track-sort">{scoreSubjects.map(subject => <div className="subject-score-group" key={subject.id}><strong className="score-subject-label">{subject.label}</strong><div className="track-scores" style={{gridTemplateColumns: `repeat(${subject.columns}, 1fr)`}}>{tracks.filter(track => track.subject === subject.id).map(track => <span key={track.track}>{sortButton(track.track as SortKey, track.label)}</span>)}</div></div>)}</div></th><th scope="col" aria-sort={sortDirection('time')}>{sortButton('time')}</th><th scope="col" aria-sort={sortDirection('tokens')}>{sortButton('tokens')}</th><th scope="col" aria-sort={sortDirection('cost')}>{sortButton('cost')} <abbr className="cost-info" title="실측 청구액이 아님" aria-label="실측 청구액이 아님" tabIndex={0}>ⓘ</abbr></th></tr></thead><tbody>{comparisonModels.map(model => {
          const result = data.models.find(item => item.model === model.id);
          const isComplete = complete(model, result);
          const measured = result && result.questions.some(q => q.status !== 'pending') && (model.state === 'complete' || model.state === 'partial');
          const effectiveState = model.state === 'complete' && !isComplete ? 'partial' : model.state;
          return <tr key={model.id} onClick={() => showModelRecords(model.id)} className={`${selected === model.id ? 'selected-row' : ''} ${effectiveState}`}><th scope="row" className="model-cell"><button aria-pressed={selected === model.id} type="button" aria-controls="model-records">{model.label}</button><GradingMark adjusted={result?.summary.adjusted_correct} /><small>{providerLabels[model.provider] || model.provider}</small>{model.reason && <span className="model-reason">{model.reason}</span>}</th><td data-label="평가 상태"><span className={`comparison-state ${effectiveState}`}>{states[effectiveState]}</span></td><td data-label="정답률" className="comparison-accuracy">{measured ? <>{percent(result.summary.accuracy)}<GradingMark adjusted={result.summary.adjusted_correct} /></> : '—'}{measured && !!result.summary.adjusted_correct && result.official_summary && <small>공식 {percent(result.official_summary.accuracy)}</small>}{measured && !isComplete && <small>중간 집계</small>}</td><td data-label="기권률">{measured ? percent(result.summary.abstention_rate) : '—'}</td><td data-label="답변 거부">{result?.execution_stats ? `${result.execution_stats.refusal_count}회` : '—'}</td><td data-label="타임아웃">{result?.execution_stats ? `${result.execution_stats.timeout_count}회` : '—'}</td><td data-label="원점수 / 100점" className="track-column"><div className="subject-score-groups">{scoreSubjects.map(subject => <div className="subject-score-group" key={subject.id}><strong className="score-subject-label">{subject.label}</strong><div className="track-scores" style={{gridTemplateColumns: `repeat(${subject.columns}, 1fr)`}}>{tracks.filter(track => track.subject === subject.id).map(track => {
            const exam = measured ? result.exams.find(item => item.subject === track.subject && (item.track === track.track || track.subject === 'english')) : undefined;
            const scored = exam && exam.summary.total_questions > exam.summary.pending;
            return <span key={track.track}><small>{track.label}</small><b>{scored ? <>{exam.summary.score}<GradingMark adjusted={exam.summary.adjusted_correct} /></> : '—'}</b>{scored && !!exam.summary.adjusted_correct && <small>공식 {exam.official_summary?.score}</small>}</span>;
          })}</div></div>)}</div></td><td data-label="총 실행 시간">{measured ? elapsed(result.summary.wall_time_seconds) : '—'}</td><td data-label="토큰 사용량" className="comparison-tokens">{measured ? <><span>입력 {number(result.summary.usage.input_tokens)}</span><span>캐시 {number(result.summary.usage.cached_input_tokens)}</span><span>출력 {number(result.summary.usage.output_tokens)}</span></> : '—'}</td><td data-label="API 환산 USD">{measured ? `$${result.summary.estimated_cost_usd.toFixed(4)}` : '—'}{measured && result.usage_complete === false && <small>보고된 사용량 기준</small>}</td></tr>;
        })}</tbody></table></div>
        <p className="comparison-note">답변 거부·타임아웃은 재시도를 포함한 요청 횟수입니다. 답변 거부는 기록에 명시된 거부·콘텐츠 검사 차단이며 기권과 구분합니다. 취소와 시간 초과가 함께 기록된 요청은 제한 시간에 도달한 경우만 타임아웃으로 집계합니다. </p>
        <p className="comparison-note">{executionPolicy} 비용은 토큰 사용량을 API 단가로 환산한 추정값이며 실제 청구액이 아닙니다. 토큰 정렬은 입력과 출력의 합계 기준이며 캐시는 입력에 포함됩니다. 화작·언매는 국어, 확통·미적·기하는 수학 선택과목입니다.</p>
      </section>
      <section id="model-records" ref={detailRef} className="model-detail-section" aria-labelledby="model-detail-title"><div className="detail-heading"><div><h2 id="model-detail-title" aria-live="polite">{request?.label} 평가 기록<GradingMark adjusted={current?.summary.adjusted_correct} /></h2><p>공통 문항은 전체 집계에서 한 번만 계산합니다.</p></div><label>평가 모델<select value={selected} onChange={event => selectModel(event.target.value)}>{data.requested_models.map(model => <option key={model.id} value={model.id}>{model.label} · {states[model.state]}</option>)}</select></label></div>
        {current && (request?.state === 'complete' || request?.state === 'partial') ? <BenchmarkDashboard key={selected} data={current} embedded /> : <div className="unrun-model" role="status"><strong>{request?.label}</strong><span>{request ? states[request.state] : '평가 대기'}</span><p>{request?.reason || '이 모델의 실제 평가 결과가 아직 없습니다.'}</p></div>}
      </section>
    </main><footer><a href={data.repository_url} target="_blank" rel="noreferrer">GitHub에서 코드·평가 자료 확인 ↗</a><span>roboco · KSAT AI Benchmark · {data.academic_year}학년도</span></footer>
  </div>;
}
