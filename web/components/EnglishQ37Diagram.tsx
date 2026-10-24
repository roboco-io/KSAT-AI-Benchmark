import styles from './EnglishQ37Diagram.module.css';

const blocks = {
  C: { title: '철학의 학제 간 역할과 방법', text: '학문 사이를 연결한다. 논리적 사고와 논증을 사용하는 비경험적 접근이다.', cue: 'non-empirical approach' },
  B: { title: '의식 연구에서의 협력', text: '철학은 질문과 새 접근법을 제안한다. 의식을 더 포괄적으로 이해하려면 신경과학과 협력해야 한다.', cue: 'However … close collaboration' },
  A: { title: '경험적 연구로 보완할 필요', text: '철학의 통찰은 가치가 있지만, 더 포괄적인 이해를 위해 경험적 연구 결과와 실험으로 보완해야 한다.', cue: 'This means that …' },
};

const flows = [
  {
    answer: '④', order: ['C', 'A', 'B'] as const, status: '벤치마크 인정 · 정답*',
    links: ['비경험적 방법 → 경험적 보완의 필요', '보완의 필요 → 의식 연구에서의 구체적 협력'],
    reading: '“This means that”이 바로 앞 (C)의 비경험적 접근을 받는다고 읽습니다. (B)의 신경과학 협력은 보완 방법의 구체적 사례로 이어집니다.',
    question: '(A)에서 일반적인 보완 필요성을 말한 뒤, (B)의 “However”로 구체적 협력을 덧붙이는 흐름이 자연스러운가?',
  },
  {
    answer: '⑤', order: ['C', 'B', 'A'] as const, status: '공식 정답 · 벤치마크 인정',
    links: ['학제 간 역할 → 의식 연구에서의 구체적 협력', '신경과학과의 협력 → 경험적 보완의 필요로 종합'],
    reading: '“This means that”이 바로 앞 (B)의 협력 필요성을 받는다고 읽습니다. (A)는 철학과 경험적 연구의 관계를 더 넓은 수준에서 정리합니다.',
    question: '(B)의 신경과학 협력이 (A)의 경험적 연구·실험을 충분히 뒷받침하며, 이 연결이 ④보다 더 적절한가?',
  },
];

export function EnglishQ37Diagram({ passageUrl = '' }: { passageUrl?: string }) {
  return <figure className={styles.diagram}>
    <figcaption><strong>문단 연결 비교</strong><span>벤치마크의 독해 안내 · 연결선은 각 해석의 논리를 요약합니다.</span></figcaption>
    <div className={styles.start}><strong>주어진 글</strong><p>철학은 더 폭넓은 질문을 던지고, 서로 다른 지식 영역의 관계를 보여 준다.</p><span aria-hidden="true">↓</span><small>두 선택지 모두 (C)로 시작</small></div>
    <div className={styles.flows}>{flows.map(flow => <section className={styles.flow} key={flow.answer} aria-label={`${flow.answer}번 문단 연결`}>
      <header><h4>{flow.answer} {flow.order.join(' → ')}</h4><span>{flow.status}</span></header>
      <ol>{flow.order.map((key, index) => <li key={key}>
        <div className={`${styles.node} ${key === 'A' ? styles.target : ''}`}>
          <a href={`${passageUrl}#q37-passage-${key}`} className={styles.letter}>({key})<span className="sr-only"> 원문으로 이동</span></a>
          <div><strong>{blocks[key].title}</strong><p>{blocks[key].text}</p><span lang="en" className={styles.cue}>{blocks[key].cue}</span></div>
        </div>
        {index < flow.links.length && <div className={styles.connector}><span aria-hidden="true">↓</span><small>{flow.links[index]}</small></div>}
      </li>)}</ol>
      <p className={styles.reading}><strong>지시어의 연결</strong>{flow.reading}</p>
      <p className={styles.question}><strong>검토할 질문</strong>{flow.question}</p>
    </section>)}</div>
    <p className={styles.issue}><strong>핵심 쟁점</strong> (A)의 “This means that”이 어떤 내용을 받는가? (B)의 “However”는 어떤 대비를 만드는가? 가능한 연결을 찾는 것과 다른 선택지를 배제할 만큼 가장 적절한 연결을 고르는 것은 별도로 검토해야 합니다.</p>
  </figure>;
}
