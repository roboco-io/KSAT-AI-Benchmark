import intros from '@/data/model-intros.json';

type Intro = { summary_ko: string; released: string | null; parameters: string | null; context_window: number | null; max_output_tokens: number | null; inputs: string[] | null; open_weights?: boolean | null; tier: string | null; sources: string[] };
const inputLabels: Record<string, string> = { text: '텍스트', image: '이미지', audio: '오디오', video: '동영상', pdf: 'PDF' };
const tokens = (n: number) => n >= 1000 ? `${Math.round(n / 1000).toLocaleString('ko-KR')}K` : String(n);

// Short official facts about the model, shown when a model row is expanded. Facts come from provider sources only.
export function ModelIntro({ modelId, label }: { modelId: string; label: string }) {
  const intro = (intros as Record<string, Intro>)[modelId];
  if (!intro) return null;
  const facts = [
    intro.tier && ['구분', intro.tier],
    intro.released && ['공개일', intro.released],
    ['파라미터', intro.parameters ?? '비공개'],
    intro.context_window && ['컨텍스트', `${tokens(intro.context_window)} 토큰`],
    intro.max_output_tokens && ['최대 출력', `${tokens(intro.max_output_tokens)} 토큰`],
    intro.inputs && ['입력', intro.inputs.map(input => inputLabels[input] ?? input).join('·')],
    intro.open_weights != null && ['가중치', intro.open_weights ? '공개' : '비공개(API 전용)'],
  ].filter(Boolean) as [string, string][];
  return <section className="model-intro" aria-label={`${label} 소개`}>
    <p className="model-intro-summary"><strong>{label}</strong> {intro.summary_ko}</p>
    <dl className="model-intro-facts">{facts.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
    {intro.sources.length > 0 && <p className="model-intro-sources">출처: {intro.sources.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer">{index + 1}</a>)} · 제공사 공식 자료 기준, 공개하지 않은 값은 비공개로 표시</p>}
  </section>;
}
