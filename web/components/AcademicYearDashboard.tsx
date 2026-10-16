'use client';

import {Suspense,useEffect,useState} from 'react';
import {ComparisonDashboard} from './ComparisonDashboard';
import {LeaderboardContent} from './LeaderboardContent';
import type {BenchmarkComparison} from './benchmark-types';
import {academicYearFromSearch,academicYearUrl} from '@/lib/academic-year.mjs';

export function AcademicYearDashboard({data}:{data:BenchmarkComparison}) {
  const [year,setYear]=useState<2025|2026>(2026);
  useEffect(()=>{
    const sync=()=>setYear(academicYearFromSearch(window.location.search));
    sync();window.addEventListener('popstate',sync);
    return ()=>window.removeEventListener('popstate',sync);
  },[]);
  function changeYear(value:number) {
    const url=academicYearUrl(window.location.href,value);
    window.history.pushState(null,'',url);
    setYear(value as 2025|2026);
  }
  return <>
    <div className="benchmark-shell academic-year-panel">
      <aside className="upcoming-exam" aria-label="2027학년도 수능 수험 예정 공지"><strong>2027학년도 수능 · 수험 예정</strong><p>시험일 <time dateTime="2026-11-19">2026년 11월 19일(목)</time> · 공식 문제 공개 후 AI 수험을 진행할 예정입니다.</p><a href="https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=100526&lev=0&m=020402&opType=N&s=moe&statusYN=W" target="_blank" rel="noreferrer">교육부 공식 일정 ↗</a></aside>
      <div className="academic-year-picker"><label>평가 학년도<select aria-label="평가 학년도" value={year} onChange={event=>changeYear(Number(event.target.value))}><option value="2025">2025학년도</option><option value="2026">2026학년도</option><option value="2027" disabled>2027학년도 · 준비 중</option></select></label><p>선택한 학년도의 시험 문제와 모델 결과를 비교합니다.</p></div>
    </div>
    {year===2026?<ComparisonDashboard key="2026" data={data}/>:<><section className="benchmark-shell legacy-year-note" aria-label="2025학년도 기존 평가 안내"><h1>2025학년도 모델 비교</h1><p>기존에 공개한 국어·수학·영어 평가 결과입니다. 2026학년도 평가와 입력 방식·문항 구성이 다르며, 학년도 간 점수를 직접 합산하지 않습니다.</p></section><Suspense fallback={<p>2025학년도 결과를 불러오는 중입니다.</p>}><LeaderboardContent embedded/></Suspense></>}
  </>;
}
