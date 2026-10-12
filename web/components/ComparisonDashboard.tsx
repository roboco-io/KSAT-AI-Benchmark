'use client';

import { useState } from 'react';
import { BenchmarkDashboard } from './BenchmarkDashboard';
import type { BenchmarkComparison, BenchmarkData, RequestedModel } from './benchmark-types';
import { formatKst } from '@/lib/format-date.mjs';

const states = { complete: '평가 완료', partial: '평가 불완전', pending: '평가 대기', blocked: '실행 차단' };
const tracks = [
  { subject: 'korean', track: 'hwajak', label: '화작' },
  { subject: 'korean', track: 'language_media', label: '언매' },
  { subject: 'math', track: 'probability', label: '확통' },
  { subject: 'math', track: 'calculus', label: '미적' },
  { subject: 'math', track: 'geometry', label: '기하' },
  { subject: 'english', track: 'english', label: '영어' },
];
const percent = (value: number) => `${value.toFixed(1)}%`;
const number = (value: number) => value.toLocaleString('ko-KR');
const elapsed = (seconds: number) => `${Math.floor(seconds / 60)}분 ${Math.floor(seconds % 60)}초`;
function complete(model: RequestedModel, result?: BenchmarkData) {
  return model.state === 'complete' && result?.completed === true && result.summary.pending === 0 && result.summary.errors === 0;
}

export function ComparisonDashboard({ data }: { data: BenchmarkComparison }) {
  const [selected, setSelected] = useState(data.models[0]?.model ?? data.requested_models[0]?.id ?? '');
  const current = data.models.find(model => model.model === selected);
  const request = data.requested_models.find(model => model.id === selected);
  const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
  const completed = data.requested_models.filter(model => complete(model, data.models.find(result => result.model === model.id))).length;
  return <div className="benchmark-shell comparison-shell">
    <a className="skip-link" href="#comparison">모델 비교로 이동</a>
    <header className="site-header"><a className="brand" href={`${basePath}/`}>roboco<span>수능 AI 평가</span></a><nav aria-label="주요 메뉴"><a href={data.repository_url} target="_blank" rel="noreferrer" className="repository-link">GitHub 저장소 ↗</a><a href={`${basePath}/archive.html`}>기존 평가</a><a className="download" href={`${basePath}/data/benchmark-comparison.json`} download="benchmark-comparison.json">비교 JSON 다운로드</a></nav></header>
    <main>
      <section className="comparison-heading" aria-labelledby="comparison-title"><div><p className="year-label">{data.academic_year}학년도 대학수학능력시험 · 사전 평가</p><h1 id="comparison-title">모델별 수능 성적표</h1><p className="intro">같은 국어·수학·영어 문제로 비교합니다. 모델을 선택하면 문항별 답과 풀이를 볼 수 있습니다.</p></div><div className="comparison-count"><strong>{completed}<span> / {data.requested_models.length}</span></strong><span>모델 평가 완료</span><small>{formatKst(data.generated_at)} (KST)</small></div></section>
      <section id="comparison" aria-labelledby="comparison-table-title"><div className="section-title"><h2 id="comparison-table-title">모델 비교</h2><span>평가 완료 모델만 비교 · 불완전 실행은 순위에서 제외</span></div>
        <div className="comparison-table-wrap"><table className="comparison-table"><caption className="sr-only">모델별 실행 상태, 정답률, 기권률, 선택과목 원점수, 시간과 사용량</caption><thead><tr><th scope="col">모델</th><th scope="col">평가 상태</th><th scope="col">정답률</th><th scope="col">기권률</th><th scope="col" className="track-column">원점수 / 100점</th><th scope="col">총 실행 시간</th><th scope="col">토큰 사용량</th><th scope="col">API 환산 USD</th></tr></thead><tbody>{data.requested_models.map(model => {
          const result = data.models.find(item => item.model === model.id);
          const isComplete = complete(model, result);
          const measured = result && result.questions.some(q => q.status !== 'pending') && (model.state === 'complete' || model.state === 'partial');
          const effectiveState = model.state === 'complete' && !isComplete ? 'partial' : model.state;
          return <tr key={model.id} className={`${selected === model.id ? 'selected-row' : ''} ${effectiveState}`}><th scope="row" className="model-cell"><button aria-pressed={selected === model.id} onClick={() => setSelected(model.id)}>{model.label}</button><small>{model.provider === 'openai' ? 'OpenAI' : 'Anthropic'}</small>{model.reason && <span className="model-reason">{model.reason}</span>}</th><td data-label="평가 상태"><span className={`comparison-state ${effectiveState}`}>{states[effectiveState]}</span></td><td data-label="정답률" className="comparison-accuracy">{measured ? percent(result.summary.accuracy) : '—'}{measured && !isComplete && <small>중간 집계</small>}</td><td data-label="기권률">{measured ? percent(result.summary.abstention_rate) : '—'}</td><td data-label="원점수 / 100점" className="track-column"><div className="track-scores">{tracks.map(track => {
            const exam = measured ? result.exams.find(item => item.subject === track.subject && (item.track === track.track || track.subject === 'english')) : undefined;
            const scored = exam && exam.summary.total_questions > exam.summary.pending;
            return <span key={track.track}><small>{track.label}</small><b>{scored ? exam.summary.score : '—'}</b></span>;
          })}</div></td><td data-label="총 실행 시간">{measured ? elapsed(result.summary.wall_time_seconds) : '—'}</td><td data-label="토큰 사용량" className="comparison-tokens">{measured ? <><span>입력 {number(result.summary.usage.input_tokens)}</span><span>캐시 {number(result.summary.usage.cached_input_tokens)}</span><span>출력 {number(result.summary.usage.output_tokens)}</span></> : '—'}</td><td data-label="API 환산 USD">{measured ? `$${result.summary.estimated_cost_usd.toFixed(4)}` : '—'}{measured && <small>청구액 아님</small>}</td></tr>;
        })}</tbody></table></div>
        <p className="comparison-note">구독 인증으로 실행합니다. API 키로 전환하지 않습니다. 비용은 토큰 사용량을 API 단가로 환산한 추정값이며 실제 구독 청구액이 아닙니다. 화작·언매는 국어, 확통·미적·기하는 수학 선택과목입니다.</p>
      </section>
      <section className="model-detail-section" aria-labelledby="model-detail-title"><div className="detail-heading"><div><h2 id="model-detail-title">선택한 모델의 평가 기록</h2><p>공통 문항은 전체 집계에서 한 번만 계산합니다.</p></div><label>평가 모델<select value={selected} onChange={event => setSelected(event.target.value)}>{data.requested_models.map(model => <option key={model.id} value={model.id}>{model.label} · {states[model.state]}</option>)}</select></label></div>
        {current && (request?.state === 'complete' || request?.state === 'partial') ? <BenchmarkDashboard key={selected} data={current} embedded /> : <div className="unrun-model" role="status"><strong>{request?.label}</strong><span>{request ? states[request.state] : '평가 대기'}</span><p>{request?.reason || '이 모델의 실제 평가 결과가 아직 없습니다.'}</p></div>}
      </section>
    </main><footer><a href={data.repository_url} target="_blank" rel="noreferrer">GitHub에서 코드·평가 자료 확인 ↗</a><span>roboco · KSAT AI Benchmark · {data.academic_year}학년도</span></footer>
  </div>;
}
