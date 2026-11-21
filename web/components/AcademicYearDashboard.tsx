'use client';

import {useEffect,useState} from 'react';
import {ComparisonDashboard} from './ComparisonDashboard';
import type {BenchmarkComparison} from './benchmark-types';
import {academicYearFromSearch,academicYearUrl,examSessionFromSearch,examSessionUrl} from '@/lib/academic-year.mjs';

type Year=2025|2026|2027;
type Session='main'|'period4';
export function AcademicYearDashboard({data,year2025Data,year2027Data,year2027Period4Data}:{data:BenchmarkComparison;year2025Data:BenchmarkComparison;year2027Data:BenchmarkComparison;year2027Period4Data:BenchmarkComparison}) {
  const [year,setYear]=useState<Year>(2027);
  const [session,setSession]=useState<Session>('main');
  useEffect(()=>{
    const sync=()=>{setYear(academicYearFromSearch(window.location.search));setSession(examSessionFromSearch(window.location.search));};
    sync();window.addEventListener('popstate',sync);
    return ()=>window.removeEventListener('popstate',sync);
  },[]);
  function changeYear(value:number) {
    const url=academicYearUrl(window.location.href,value);
    window.history.pushState(null,'',url);
    setYear(value as Year);setSession('main');
  }
  function changeSession(value:Session) {
    window.history.pushState(null,'',examSessionUrl(window.location.href,value));
    setSession(value);
  }
  const period4=year===2027&&session==='period4';
  return <>
    <div className="benchmark-shell academic-year-panel">
      <aside className="upcoming-exam" aria-label="2027학년도 수능 채점 기준 안내"><strong>2027학년도 수능 · 시험 당일 수험</strong><p>시험일 <time dateTime="2026-11-19">2026년 11월 19일(목)</time>에 공개된 문제지로 수험했습니다. 채점은 당일 공개된 정답표 기준이며, 이의신청 심사 후 확정 정답이 바뀌면 다시 채점합니다.</p>{year===2027&&<p className="period4-notice"><span className="new-badge">NEW</span> <strong>4교시 추가:</strong> 한국사·사회탐구·과학탐구 18과목 360문항을 외부 검색 없이 모델 지식만으로 풀었습니다. {session==='period4'?'지금 4교시 성적표를 보고 있습니다.':<button type="button" onClick={()=>changeSession('period4')}>4교시 결과 보기 →</button>}</p>}<p className="cost-correction-notice"><strong>비용 보정 (2026-11-21):</strong> API 환산 비용은 모든 모델에서 추론 토큰을 포함합니다. Gemini 모델은 응답에 추론 토큰이 빠져 있어 실제보다 작게 표시됐기 때문에, Google Cloud 사용량 지표로 다시 계산했습니다.</p><a href="https://cdn.kice.re.kr/27dae-suneung/index.html" target="_blank" rel="noreferrer">평가원 문제·정답 공개 페이지 ↗</a></aside>
      <div className="academic-year-picker"><label>평가 학년도<select aria-label="평가 학년도" value={year} onChange={event=>changeYear(Number(event.target.value))}><option value="2027">2027학년도</option><option value="2026">2026학년도</option><option value="2025">2025학년도</option></select></label><p>선택한 학년도의 시험 문제와 모델 결과를 비교합니다.</p></div>
      {year===2027&&<div className="exam-session-tabs" role="tablist" aria-label="시험 교시">{([['main','1-3교시 · 국어·수학·영어'],['period4','4교시 · 한국사·사회·과학탐구']] as [Session,string][]).map(([id,label])=><button key={id} type="button" role="tab" aria-selected={session===id} className={session===id?'active':''} onClick={()=>changeSession(id)}>{label}{id==='period4'&&<span className="new-badge">NEW</span>}</button>)}</div>}
    </div>
    <ComparisonDashboard key={`${year}-${period4?'period4':'main'}`} data={period4?year2027Period4Data:year===2027?year2027Data:year===2026?data:year2025Data} period4Data={year===2027&&!period4?year2027Period4Data:undefined} onOpenPeriod4={()=>{changeSession('period4');window.scrollTo({top:0,behavior:'smooth'});}}/>
  </>;
}
