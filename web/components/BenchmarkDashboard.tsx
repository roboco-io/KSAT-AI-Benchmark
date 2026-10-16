'use client';

import { useMemo, useState } from 'react';
import type { BenchmarkData, QuestionStatus, Usage } from './benchmark-types';
import { formatKst } from '@/lib/format-date.mjs';
import { RobocoBrand } from './RobocoBrand';
import { questionNotes } from '@/lib/question-notes';
import { GradingMark } from './GradingMark';
import { QuestionNote } from './QuestionNote';

const labels: Record<QuestionStatus, string> = { correct: '정답', incorrect: '오답', abstained: '기권', error: '실행 오류', pending: '평가 대기' };
const subjects: Record<string, string> = { korean: '국어', math: '수학', english: '영어' };
const sections: Record<string, string> = { common: '공통', hwajak: '화법과 작문', language_media: '언어와 매체', probability: '확률과 통계', calculus: '미적분', geometry: '기하', english: '영어' };
const abstainReasons: Record<string, string> = { uncertain: '정답 확신 부족', unreadable: '문제 판독 불가', budget_exhausted: '실행 예산 소진', unsupported_input: '지원하지 않는 입력' };
const number = (value: number) => value.toLocaleString('ko-KR');
const percent = (value: number) => `${value.toFixed(1)}%`;
const money = (value: number) => `$${value.toFixed(4)}`;
function duration(seconds: number) {
  if (seconds < 60) return `${seconds.toFixed(1)}초`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours ? `${hours}시간 ` : ''}${minutes}분 ${(seconds % 60).toFixed(0)}초`;
}
function Tokens({ usage }: { usage: Usage }) {
  return <span className="token-line">입력 {number(usage.input_tokens)} · 캐시 {number(usage.cached_input_tokens)} · 출력 {number(usage.output_tokens)}</span>;
}

export function BenchmarkDashboard({ data, embedded = false }: { data: BenchmarkData; embedded?: boolean }) {
  const [exam, setExam] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const hasResults = data.questions.some(q => q.status !== 'pending');
  const summary = data.summary;
  const isComplete = (data.completed ?? hasResults) && summary.errors === 0 && summary.pending === 0;
  const runStatus = isComplete ? '실행 완료' : hasResults || data.completed === false ? '실행 불완전' : '평가 준비 중';
  const selectedExam = data.exams.find(item => item.id === exam);
  const questions = useMemo(() => data.questions.filter(q =>
    (!selectedExam || selectedExam.question_ids.includes(q.id)) &&
    (status === 'all' || q.status === status) &&
    (!search || `${q.number} ${q.id} ${sections[q.section] || q.section} ${q.explanation}`.toLowerCase().includes(search.toLowerCase()))
  ), [data.questions, selectedExam, status, search]);
  const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
  const generatedAt = formatKst(data.generated_at);

  const Content = embedded ? 'div' : 'main';
  return <div className={embedded ? "benchmark-detail" : "benchmark-shell"}>
    {!embedded && <><a className="skip-link" href="#results">평가 결과로 이동</a>
    <header className="site-header"><RobocoBrand /><nav aria-label="주요 메뉴"><a href="#questions">문항별 결과</a><a href={`${basePath}/archive.html`}>기존 평가 기록</a><a className="download" href={`${basePath}/data/benchmark-v2.json`} download="benchmark-v2.json">결과 JSON 다운로드</a></nav></header></>}
    <Content>
      {!embedded && <section className="report-heading" aria-labelledby="title">
        <div><p className="year-label">{data.academic_year}학년도 대학수학능력시험</p><h1 id="title">AI의 수능 성적표</h1><p className="intro">국어·수학·영어를 풀고, 문항별 답과 평가 과정을 공개합니다.</p></div>
        <div className="report-stamp"><span className="phase">{data.phase === 'pre_exam' ? '사전 평가' : data.phase}</span><strong>{runStatus}</strong><span>{generatedAt} {data.generated_at && '(KST)'}</span></div>
      </section>}
      <section className="run-info" aria-label="평가 실행 정보"><div><span>평가 모델</span><strong>{data.model}</strong></div><div><span>실행 방식</span><strong>{data.engine}</strong></div><div><span>실행 ID</span><strong className="run-id">{data.run_id}</strong></div></section>
      {!hasResults && <div className="pending-note" role="status">아직 측정 결과가 없습니다. 평가가 완료되면 이 성적표에 실제 점수와 실행 기록이 표시됩니다.</div>}
      <section id="results" className="results-section" aria-labelledby="results-heading">
        <div className="section-title"><h2 id="results-heading">전체 평가</h2><span>공통 문항은 한 번만 집계</span></div>
        <div className="metrics">
          <div className="metric primary"><span>{data.grading_policy ? '벤치마크 정답률' : '전체 정답률'}</span><strong>{hasResults ? percent(summary.accuracy) : '—'}<GradingMark adjusted={summary.adjusted_correct} /></strong><small>정답 {number(summary.correct)} / 전체 {number(summary.total_questions)}문항</small>{data.official_summary && <small>공식 기준 {percent(data.official_summary.accuracy)} · {data.official_summary.correct}/{data.official_summary.total_questions}문항</small>}</div>
          <div className="metric"><span>기권 횟수</span><strong>{hasResults ? `${number(summary.abstained)}회` : '—'}</strong><small>기권을 확정한 문항 수</small></div>
          <div className="metric"><span>총 실행 시간</span><strong>{hasResults ? duration(summary.wall_time_seconds) : '—'}</strong><small>풀이 그룹 시간 합계 {duration(summary.solver_time_seconds)}</small></div>
          <div className="metric"><span>API 환산 비용</span><strong>{hasResults ? money(summary.estimated_cost_usd) : '—'}</strong><small>{data.usage_complete === false ? '일부 실패 사용량 미보고 · 하한 추정' : 'USD 추정값 · 실제 청구액과 다름'}</small></div>
        </div>
        <div className="summary-strip"><div className="status-counts">{(Object.keys(labels) as QuestionStatus[]).map(key => <span key={key}><i className={`dot ${key}`} />{labels[key]} <b>{number(key === 'error' ? summary.errors : key === 'abstained' ? summary.abstained : summary[key])}</b></span>)}</div><span>응답 문항 정답률 <b>{summary.attempt_accuracy === null ? '—' : percent(summary.attempt_accuracy)}</b></span></div>
        {data.grading_policy && <p className="grading-policy-note">* {data.grading_policy.annotation} ④번 제출은 정답*으로 표시합니다. <a href={`${basePath}/debates/english-q37.html#grading-policy`}>보정 근거·정책 보기 →</a></p>}
        {data.execution_stats && <p className="comparison-note">답변 거부 {data.execution_stats.refusal_count}회 · 타임아웃 {data.execution_stats.timeout_count}회 · 재시도를 포함한 요청 횟수</p>}
        <div className="token-summary"><strong>토큰 사용량</strong><Tokens usage={summary.usage} /><span>캐시 토큰은 입력 토큰에 포함됩니다.</span></div>
      </section>
      <section aria-labelledby="scores-heading" className="scores-section"><div className="section-title"><h2 id="scores-heading">영역·선택과목 성적</h2><span>원점수 기준 · 선택과목별 공통 문항 포함</span></div>
        {data.exams.length ? <div className="exam-grid">{data.exams.map(item => <article className="exam-score" key={item.id}><div className="exam-top"><span>{subjects[item.subject] || item.subject}</span><span>{item.summary.pending ? `${item.summary.pending}문항 대기` : item.summary.errors > 0 ? '실행 오류 있음' : '집계 완료'}</span></div><h3>{item.title}</h3><div className="score"><strong>{item.summary.correct + item.summary.incorrect + item.summary.abstained + item.summary.errors > 0 ? item.summary.score : '—'}<GradingMark adjusted={item.summary.adjusted_correct} /></strong><span>/ {item.max_score}점</span></div>{!!item.summary.adjusted_correct && item.official_summary && <p className="official-score">공식 기준 {item.official_summary.score} / {item.max_score}점</p>}<div className="score-track" role="img" aria-label={`${item.summary.score}점 / ${item.max_score}점`}><span style={{width: `${Math.max(0, Math.min(100, item.summary.score / item.max_score * 100))}%`}} /></div><div className="exam-details"><span>정답 {item.summary.correct}/{item.summary.total_questions}</span><span>기권 {item.summary.abstained}</span><span>{item.summary.total_questions > item.summary.pending ? percent(item.summary.accuracy) : '—'}</span></div><button onClick={() => { setExam(item.id); document.getElementById('questions')?.scrollIntoView({behavior:'smooth'}); }}>문항 결과 보기</button></article>)}</div> : <div className="empty-exams">{['국어', '수학', '영어'].map(subject => <div key={subject}><strong>{subject}</strong><span>평가 결과 대기</span></div>)}</div>}
      </section>
      <section id="questions" className="questions-section" aria-labelledby="questions-heading"><div className="section-title"><h2 id="questions-heading">문항별 풀이 기록</h2><span>{questions.length} / {data.questions.length}문항</span></div>
        <div className="filters"><label>영역·선택과목<select value={exam} onChange={e => setExam(e.target.value)}><option value="all">전체 영역</option>{data.exams.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label>평가 상태<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">전체 상태</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="search">문항 검색<input value={search} onChange={e => setSearch(e.target.value)} placeholder="문항 번호, 선택과목, 풀이 내용" type="search" /></label></div>
        <p className="question-help">문항을 펼치면 모델 답, 정답, 풀이를 확인할 수 있습니다. 문항별 시간·토큰·비용은 그룹 실행 기록을 균등 배분한 추정값입니다.</p>
        <div className="question-list">{questions.length ? questions.map(q => <details className="question" key={q.id}><summary><span className="question-number">{q.number}<small>번</small></span><span className="question-title"><strong>{subjects[q.subject] || q.subject} · {sections[q.section] || q.section}</strong><small>{q.points}점 · {q.kind === 'short_answer' ? '단답형' : '객관식'}{questionNotes[q.id] && <span className="question-note-label">정답 논쟁 기록</span>}</small></span><span className={`status-badge ${q.status}`}>{labels[q.status]}<GradingMark adjusted={q.benchmark_adjusted} /></span><span className="question-time">{duration(q.time_seconds)} 추정</span><span className="expand" aria-hidden="true">+</span></summary><div className="question-body"><div className="answer-line"><div><span>모델 답</span><strong>{q.answer ?? '응답 없음'}</strong></div><div><span>공식 정답</span><strong>{q.correct_answer}</strong></div>{q.accepted_answers && <div><span>벤치마크 인정 답안</span><strong>{q.accepted_answers.join(' · ')}</strong></div>}<div><span>원문 페이지</span><strong>{q.source_page}</strong></div></div>{q.abstain_reason && <p className="abstain-reason">기권 사유: {abstainReasons[q.abstain_reason] || q.abstain_reason}</p>}<h4>모델 풀이</h4><p className="explanation">{q.explanation || (q.status === 'pending' ? '문항 풀이를 기다리고 있습니다.' : '기록된 풀이가 없습니다.')}</p><QuestionNote questionId={q.id} /><div className="question-usage"><Tokens usage={q.usage} /><span>{money(q.estimated_cost_usd)} USD · 시간·사용량·비용 균등 배분 추정</span></div><small className="question-id">{q.id}</small></div></details>) : <p className="empty-state">{data.questions.length ? '선택한 조건에 맞는 문항이 없습니다.' : '실제 평가가 완료되면 문항별 기록이 표시됩니다.'}</p>}</div>
      </section>
      <section className="method-section" aria-labelledby="method-heading"><div><h2 id="method-heading">평가 조건과 해석</h2><p>점수는 이 실행에서 얻은 원점수입니다. 표준점수, 백분위, 수능 등급으로 환산하지 않습니다.</p><p>영어 듣기 문항은 공식 대본을 읽는 텍스트 조건입니다. 원음 청취 성능을 평가한 결과가 아닙니다.</p><ul>{data.limitations.map((item, i) => <li key={i}>{item}</li>)}</ul></div><aside><h3>비용 산정 기준</h3><p>100만 토큰당 입력 ${data.pricing.input_per_million}, 캐시 입력 ${data.pricing.cached_input_per_million}, 출력 ${data.pricing.output_per_million}.</p><p>API 단가로 환산한 추정값입니다. 실제 청구액과 다릅니다. 단가 기준일: {data.pricing.as_of}</p><h3>문제 출처</h3>{data.sources.length ? <ul>{data.sources.map((source, i) => <li key={i}><a href={source.url} target="_blank" rel="noreferrer">{subjects[source.subject] || source.subject} 공식 자료 ↗</a></li>)}</ul> : <p>평가 데이터와 함께 공식 출처가 공개됩니다.</p>}</aside></section>
    </Content>{!embedded && <footer><span>roboco · KSAT AI Benchmark</span><span>{data.academic_year}학년도 평가 기록 · 정적 공개 자료</span></footer>}
  </div>;
}
