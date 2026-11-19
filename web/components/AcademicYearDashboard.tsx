'use client';

import {useEffect,useState} from 'react';
import {ComparisonDashboard} from './ComparisonDashboard';
import type {BenchmarkComparison} from './benchmark-types';
import {academicYearFromSearch,academicYearUrl} from '@/lib/academic-year.mjs';

type Year=2025|2026|2027;
export function AcademicYearDashboard({data,year2025Data,year2027Data}:{data:BenchmarkComparison;year2025Data:BenchmarkComparison;year2027Data:BenchmarkComparison}) {
  const [year,setYear]=useState<Year>(2027);
  useEffect(()=>{
    const sync=()=>setYear(academicYearFromSearch(window.location.search));
    sync();window.addEventListener('popstate',sync);
    return ()=>window.removeEventListener('popstate',sync);
  },[]);
  function changeYear(value:number) {
    const url=academicYearUrl(window.location.href,value);
    window.history.pushState(null,'',url);
    setYear(value as Year);
  }
  return <>
    <div className="benchmark-shell academic-year-panel">
      <aside className="upcoming-exam" aria-label="2027학년도 수능 채점 기준 안내"><strong>2027학년도 수능 · 시험 당일 수험</strong><p>시험일 <time dateTime="2026-11-19">2026년 11월 19일(목)</time>에 공개된 문제지로 수험했습니다. 채점은 당일 공개된 정답표 기준이며, 이의신청 심사 후 확정 정답이 바뀌면 다시 채점합니다.</p><a href="https://cdn.kice.re.kr/27dae-suneung/index.html" target="_blank" rel="noreferrer">평가원 문제·정답 공개 페이지 ↗</a></aside>
      <div className="academic-year-picker"><label>평가 학년도<select aria-label="평가 학년도" value={year} onChange={event=>changeYear(Number(event.target.value))}><option value="2027">2027학년도</option><option value="2026">2026학년도</option><option value="2025">2025학년도</option></select></label><p>선택한 학년도의 시험 문제와 모델 결과를 비교합니다.</p></div>
    </div>
    <ComparisonDashboard key={year} data={year===2027?year2027Data:year===2026?data:year2025Data}/>
  </>;
}
