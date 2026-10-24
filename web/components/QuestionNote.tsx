import { questionNotes } from '@/lib/question-notes';
import { EnglishQ37Passage } from './EnglishQ37Passage';
import { EnglishQ37Diagram } from './EnglishQ37Diagram';

export function QuestionNote({ questionId }: { questionId: string }) {
  const note = questionNotes[questionId];
  if (!note) return null;
  return <aside className="question-note" aria-label="문항 정답 논쟁 기록">
    <h4>{note.title}</h4>
    {questionId === '2026-english-english-q37' && <details><summary>문제 원문·한국어 번역·문단 연결도 보기</summary><EnglishQ37Passage /><EnglishQ37Diagram passageUrl={`${process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : ''}/debates/english-q37.html`} /></details>}
    {note.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    <ul>{note.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul>
    <p><a href={`${process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : ''}/debates/english-q37.html`}>Fable × Astra 정답 토론과 발언 원문 보기 →</a></p>
  </aside>;
}
