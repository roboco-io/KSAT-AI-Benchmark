import summary from '@/public/research/common-errors/summary.json';
import styles from './ResearchSection.module.css';

const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';

export function ResearchSection() {
  return <section id="research" className={styles.section} aria-labelledby="research-title">
    <div className={styles.heading}><h2 id="research-title">연구</h2><span>2025·2026학년도 저장 답안 분석</span></div>
    <article className={styles.study}>
      <div><h3><a href={`${basePath}/research/common-errors.html`}>{summary.title}</a></h3>
        <p>같은 오답에 모이는 모델들, 그리고 투표가 놓친 정답을 살펴봤습니다. 전체 최빈값 투표는 두 해 모두 최고 단일 모델을 넘지 못했습니다.</p>
        <a className={styles.read} href={`${basePath}/research/common-errors.html`}>연구 보고서 읽기</a>
      </div>
      <div className={styles.evidence}><table><caption>공식 정답 기준 · 학년도별 147문항</caption>
        <thead><tr><th scope="col">학년도</th><th scope="col">최고 단일</th><th scope="col">최빈값 투표</th></tr></thead>
        <tbody>{summary.years.map(year => <tr key={year.year}><th scope="row">{year.year}</th><td>{year.bestSingle}/147</td><td>{year.plurality}/147</td></tr>)}</tbody>
      </table><p>완료 이미지 모델 {summary.years.map(year => `${year.year}년 ${year.models}개`).join(', ')}. 채점 정책에 민감한 탐색 연구입니다.</p></div>
    </article>
  </section>;
}
