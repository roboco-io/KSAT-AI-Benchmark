import styles from './EnglishQ37Passage.module.css';

const paragraphs = [
  {
    label: '주어진 글',
    english: 'Philosophy allows us to ask much broader questions than many other scientific disciplines. It is capable of looking at the bigger picture and providing important insights into the relationships between different areas of knowledge.',
    korean: '철학은 다른 많은 과학 분야보다 훨씬 더 폭넓은 질문을 던질 수 있게 해 준다. 철학은 더 큰 그림을 살펴보고, 서로 다른 지식 영역 사이의 관계에 관한 중요한 통찰을 제공할 수 있다.',
  },
  {
    label: '(A)',
    english: 'This means that while philosophy can provide valuable insights into theoretical concepts and broader ethical questions, it needs to be supplemented by empirical findings and experiments to reach a more comprehensive understanding.',
    korean: '이는 철학이 이론적 개념과 더 폭넓은 윤리적 질문에 관한 가치 있는 통찰을 제공할 수 있지만, 더 포괄적인 이해에 도달하려면 경험적 연구 결과와 실험으로 보완되어야 한다는 것을 의미한다.',
  },
  {
    label: '(B)',
    english: 'Philosophers tend to ask questions rather than provide definitive answers, and their contributions often consist of challenging established assumptions and proposing new research approaches. However, for a more comprehensive understanding of the nature of consciousness, close collaboration between philosophy and neuroscience is required.',
    korean: '철학자들은 확정적인 답을 제시하기보다는 질문을 던지는 경향이 있으며, 그들의 기여는 흔히 기존의 가정에 의문을 제기하고 새로운 연구 접근법을 제안하는 데 있다. 그러나 의식의 본질을 더 포괄적으로 이해하려면 철학과 신경과학 사이의 긴밀한 협력이 필요하다.',
  },
  {
    label: '(C)',
    english: 'Philosophy is particularly important for the interdisciplinary efforts of cognitive science, where it helps to bridge gaps between different disciplines and pioneer new ways for research. Unlike scientific methods, philosophizing is a non-empirical approach that attempts to validate concepts through logical thinking and argumentation.',
    korean: '철학은 인지과학의 학제 간 연구에서 특히 중요하다. 이때 철학은 서로 다른 학문 분야 사이의 간극을 메우고 새로운 연구 방법을 개척하는 데 도움을 준다. 과학적 방법과 달리, 철학적 사유는 논리적 사고와 논증을 통해 개념의 타당성을 검증하려는 비경험적 접근법이다.',
  },
];

export function EnglishQ37Passage() {
  const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
  return <div className={styles.passage}>
    <p>주어진 글 다음에 이어질 글의 순서로 가장 적절한 것을 고르시오. <span>[3점]</span></p>
    <div className={styles.paragraphs}>{paragraphs.map(paragraph => <section key={paragraph.label} id={`q37-passage-${paragraph.label.replace(/[()]/g, '')}`} className={styles.paragraph}>
      <h4>{paragraph.label}</h4>
      <div className={styles.parallel}>
        <div><span className={styles.label}>영어 원문</span><p lang="en">{paragraph.english}</p></div>
        <div><span className={styles.label}>한국어 번역</span><p lang="ko">{paragraph.korean}</p></div>
      </div>
    </section>)}</div>
    <p className={styles.vocabulary}>* empirical: 경험의</p>
    <ol className={styles.choices} aria-label="선택지">
      {['(A) → (C) → (B)', '(B) → (A) → (C)', '(B) → (C) → (A)', '(C) → (A) → (B)', '(C) → (B) → (A)'].map((choice, index) => <li key={choice}><span>{['①', '②', '③', '④', '⑤'][index]}</span> {choice}</li>)}
    </ol>
    <p className={styles.source}>원문: 한국교육과정평가원 · 2026학년도 영어 홀수형 7쪽, 37번. 한국어는 이해를 돕기 위한 자체 번역입니다. <a href={`${basePath}/images/english-q37-debate-input.webp`} target="_blank" rel="noreferrer">원본 문제지 이미지 대조 ↗</a></p>
  </div>;
}
