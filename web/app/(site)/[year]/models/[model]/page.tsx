import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ModelProfile } from '@/components/site/ModelProfile';
import type { RecordItem } from '@/components/site/RecordList';
import { siteData } from '@/lib/site-data';
import { modelTraits } from '@/lib/model-traits.mjs';
import { slimModel } from '@/lib/year-view.mjs';

export const dynamicParams = false;

type Params = { year: string; model: string };

export function generateStaticParams(): Params[] {
  return siteData.yearViews().flatMap((v) => v.models.map((m) => ({ year: String(v.year), model: m.id })));
}

function lookup(yearParam: string, modelParam: string) {
  const view = siteData.yearViews().find((v) => String(v.year) === yearParam);
  if (!view) return null;
  const id = decodeURIComponent(modelParam);
  const model = view.models.find((m) => m.id === id);
  return model ? { view, model } : null;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const p = await params;
  const found = lookup(p.year, p.model);
  if (!found) return {};
  return { title: `${found.model.id} · ${found.view.year}학년도 · KSAT AI Benchmark` };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const p = await params;
  const found = lookup(p.year, p.model);
  if (!found) notFound();
  const { view, model } = found;
  const records: RecordItem[] = model.questions.map((q) => ({
    id: q.id, number: q.number, subject: q.subject, section: q.section, kind: q.kind,
    points: q.points, correct_answer: q.correct_answer, status: q.status, answer: q.answer,
    explanation: q.explanation, time_seconds: q.time_seconds,
  }));
  return (
    <ModelProfile
      year={view.year}
      model={slimModel(model)}
      traits={modelTraits(model, view.models)}
      subjects={view.subjects}
      limitations={model.limitations}
      records={records}
    />
  );
}
