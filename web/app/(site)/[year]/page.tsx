import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { YearOverview } from '@/components/site/YearOverview';
import { siteData } from '@/lib/site-data';

export const dynamicParams = false;

export function generateStaticParams() {
  return siteData.yearViews().map((v) => ({ year: String(v.year) }));
}

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year } = await params;
  return { title: `${year}학년도 수능 · KSAT AI Benchmark` };
}

export default async function YearPage({ params }: { params: Promise<{ year: string }> }) {
  const { year } = await params;
  const view = siteData.yearViews().find((v) => String(v.year) === year);
  if (!view) notFound();
  return <YearOverview view={view} />;
}
