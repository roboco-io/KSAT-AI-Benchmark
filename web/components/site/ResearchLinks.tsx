import commonErrors from '@/public/research/common-errors/summary.json';
import contamination from '@/public/research/contamination/summary.json';
import abstention from '@/public/research/metacognitive-abstention/summary.json';
import penaltyAbstention from '@/public/research/penalty-abstention/summary.json';
import styles from './ResearchLinks.module.css';

// 기존 페이지는 운영 빌드에서 .html 파일 주소로 연결한다(research/*/publication.test.mjs가 이 형식을 검사한다).
const legacyHref = (path: string) => (process.env.NODE_ENV === 'production' ? `/KSAT-AI-Benchmark${path}.html` : path);

const STUDIES = [
  {
    href: '/research/common-errors',
    title: commonErrors.title,
    summary: '같은 오답에 모이는 모델들과 투표가 놓친 정답을 살펴봤고, 전체 최빈값 투표는 두 해 모두 최고 단일 모델을 넘지 못했다.',
  },
  {
    href: '/research/contamination',
    title: contamination.title,
    summary: '같은 모델이 공개된 2025·2026학년도 수능과 시험 당일에 푼 2027학년도 수능에서 받은 점수를 비교했고, 공개된 시험에서 점수가 더 높다는 증거는 나오지 않았다.',
  },
  {
    href: '/research/metacognitive-abstention',
    title: abstention.title,
    summary: '4교시 기권 전수를 분석해 모델이 자신이 틀릴 문항을 기권으로 얼마나 포착하는지 영역별로 비교했다.',
  },
  {
    href: '/research/penalty-abstention',
    title: penaltyAbstention.title,
    summary: '「LLM은 "자신이 모르는 것"을 아는가?」의 후속 인과 실험. 기권 0점 · 오답 -1점/-3점 감점제를 2027 4교시 80문항에 적용해 무기권 모델의 잠재 메타인지 각성과 선택적 오답 회피 효과를 검증했다.',
  },
];

export function ResearchLinks() {
  return (
    <div>
      <h2>연구</h2>
      <ul className={styles.list}>
        {STUDIES.map((s) => (
          <li key={s.href} className={styles.item}>
            <h3><a href={legacyHref(s.href)}>{s.title}</a></h3>
            <p>{s.summary}</p>
          </li>
        ))}
      </ul>
      <ul className={styles.more}>
        <li><a href={legacyHref('/archive')}>이전 리더보드</a></li>
        <li><a href={legacyHref('/debates/english-q37')}>영어 37번 정답 토론</a></li>
      </ul>
    </div>
  );
}
