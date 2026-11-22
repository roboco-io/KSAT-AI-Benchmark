import { Suspense } from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { siteData } from '@/lib/site-data';
import { compareData } from '@/lib/question-matrix.mjs';
import { modelTraits } from '@/lib/model-traits.mjs';
import { yearPath } from '@/lib/site-routes.mjs';
import type { Trait } from '@/lib/site-types.mjs';
import { CompareView } from '@/components/site/CompareView';

export const dynamicParams = false;

export function generateStaticParams() {
  return siteData.yearViews().map((v) => ({ year: String(v.year) }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year } = await params;
  return { title: `모델 비교 · ${year}학년도` };
}

export default async function ComparePage({ params }: { params: Promise<{ year: string }> }) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  const view = siteData.getYear(year);
  if (view.models.length === 0) {
    return (
      <main>
        <p>아직 결과가 없다.</p>
        <Link href={yearPath(year)}>{year}학년도 개요로 돌아가기</Link>
      </main>
    );
  }
  const traits: Record<string, Trait[]> = {};
  for (const m of view.models) traits[m.id] = modelTraits(m, view.models);
  return (
    <main>
      <Suspense fallback={null}>
        <CompareView year={year} subjects={view.subjects} data={compareData(view)} traits={traits} />
      </Suspense>
    </main>
  );
}
