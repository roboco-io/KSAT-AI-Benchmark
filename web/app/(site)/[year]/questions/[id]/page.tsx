import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { siteData } from '@/lib/site-data';
import { questionDetail, questionMatrix } from '@/lib/question-matrix.mjs';
import { questionPath, questionsPath } from '@/lib/site-routes.mjs';
import type { SubjectKey } from '@/lib/site-types.mjs';
import { QuestionNote } from '@/components/QuestionNote';
import { questionNotes } from '@/lib/question-notes';
import { QuestionAnswers } from '@/components/site/QuestionAnswers';
import { SUBJECT_LABEL } from '@/components/site/primitives';
import main2026 from '@/public/data/benchmark-comparison.json';
import main2025 from '@/public/data/benchmark-comparison-2025.json';
import main2027 from '@/public/data/benchmark-comparison-2027.json';

export const dynamicParams = false;

type Params = { year: string; id: string };

const SOURCES: Record<number, { models: { sources?: { subject: string; url: string }[] }[] }> = {
  2025: main2025 as never,
  2026: main2026 as never,
  2027: main2027 as never,
};

function sourceUrl(year: number, subject: string): string | null {
  for (const m of SOURCES[year]?.models ?? []) {
    const s = m.sources?.find((x) => x.subject === subject);
    if (s?.url && /^https?:\/\//.test(s.url)) return s.url;
  }
  return null;
}

export function generateStaticParams() {
  return siteData.yearViews().flatMap((v) => {
    const ids = new Set<string>();
    for (const m of v.models) for (const q of m.questions) ids.add(q.id);
    return [...ids].map((id) => ({ year: String(v.year), id }));
  });
}

function load(p: Params) {
  const year = Number(p.year);
  const view = siteData.yearViews().find((v) => v.year === year);
  if (!view) notFound();
  const detail = questionDetail(view, p.id);
  if (!detail) notFound();
  return { year, view, detail };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { year, detail } = load(await params);
  return { title: `${SUBJECT_LABEL[detail.subject as SubjectKey] ?? detail.subject} ${detail.number}번 · ${year}학년도` };
}

export default async function QuestionPage({ params }: { params: Promise<Params> }) {
  const { year, view, detail } = load(await params);
  const subject = detail.subject as SubjectKey;
  const label = SUBJECT_LABEL[subject] ?? detail.subject;
  const cols = questionMatrix(view, subject).columns;
  const at = cols.findIndex((c) => c.id === detail.id);
  const prev = at > 0 ? cols[at - 1] : null;
  const next = at >= 0 && at < cols.length - 1 ? cols[at + 1] : null;
  const right = detail.answers.filter((a) => a.status === 'correct').length;
  const src = sourceUrl(year, detail.subject);

  return (
    <main>
      <nav aria-label="경로">
        <Link href={questionsPath(year, subject)}>{year}학년도 문항별 결과</Link> / {label}
      </nav>
      <h1>{label} {detail.section !== 'common' ? `${detail.section} ` : ''}{detail.number}번</h1>
      <dl style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s4)', margin: 0 }}>
        <div><dt>배점</dt><dd style={{ margin: 0 }}>{detail.points}점</dd></div>
        <div><dt>정답</dt><dd style={{ margin: 0 }}>{detail.correctAnswer ?? '없음'}</dd></div>
        <div><dt>원본 PDF 쪽수</dt><dd style={{ margin: 0 }}>{detail.sourcePage ?? '없음'}</dd></div>
        <div><dt>정답 모델</dt><dd style={{ margin: 0 }}>{right} / {detail.answers.length}</dd></div>
      </dl>
      <p style={{ color: 'var(--muted)' }}>
        문항 본문은 이 사이트에 싣지 않는다. 공식 문제지에서 확인할 수 있다.
        {src && <> <a href={src} target="_blank" rel="noreferrer">공식 출처 ↗</a></>}
      </p>
      {questionNotes[detail.id] && <QuestionNote questionId={detail.id} />}
      <p style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--s3)' }}>
        {prev ? <Link href={questionPath(year, prev.id)}>← {prev.number}번</Link> : <span />}
        {next ? <Link href={questionPath(year, next.id)}>{next.number}번 →</Link> : <span />}
      </p>
      <QuestionAnswers year={year} detail={detail} />
    </main>
  );
}
