import Link from 'next/link';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { siteData } from '@/lib/site-data';
import { questionMatrix } from '@/lib/question-matrix.mjs';
import { yearPath } from '@/lib/site-routes.mjs';
import type { Matrix, SubjectKey } from '@/lib/site-types.mjs';
import { QuestionGrid } from '@/components/site/QuestionGrid';

export const dynamicParams = false;

export function generateStaticParams() {
  return siteData.yearViews().map((v) => ({ year: String(v.year) }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year } = await params;
  return { title: `문항별 결과 · ${year}학년도` };
}

export default async function QuestionsPage({ params }: { params: Promise<{ year: string }> }) {
  const { year: y } = await params;
  const year = Number(y);
  const view = siteData.yearViews().find((v) => v.year === year);
  if (!view) notFound();
  if (view.models.length === 0) {
    return (
      <main>
        <h1>문항별 결과 · {year}학년도</h1>
        <p>아직 결과가 없다.</p>
        <p><Link href={yearPath(year)}>{year}학년도 개요로 가기</Link></p>
      </main>
    );
  }
  const matrices = {} as Record<SubjectKey, Matrix>;
  for (const s of view.subjects) matrices[s] = questionMatrix(view, s);
  return (
    <main>
      <h1>문항별 결과 · {year}학년도</h1>
      <Suspense fallback={null}>
        <QuestionGrid year={year} subjects={view.subjects} matrices={matrices} />
      </Suspense>
    </main>
  );
}
