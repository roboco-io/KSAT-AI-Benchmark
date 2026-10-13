import { questionNotes } from '@/lib/question-notes';

export function QuestionNote({ questionId }: { questionId: string }) {
  const note = questionNotes[questionId];
  if (!note) return null;
  return <aside className="question-note" aria-label="문항 정답 논쟁 기록">
    <h4>{note.title}</h4>
    {note.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    <ul>{note.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul>
    <p><a href={`${process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : ''}/debates/english-q37.html`}>Fable × Astra 정답 토론과 발언 원문 보기 →</a></p>
  </aside>;
}
