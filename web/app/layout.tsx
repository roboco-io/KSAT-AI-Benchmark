import { ColorSchemeScript } from '@mantine/core';
import type { Metadata } from 'next';
import Script from 'next/script';
import { siteData } from '@/lib/site-data';
import { latestYearWithResults } from '@/lib/year-view.mjs';

const GA_MEASUREMENT_ID = 'G-9G1SGM9SZQ';

const siteUrl = 'https://roboco.io/KSAT-AI-Benchmark/';

// 공유 문구의 학년도·모델 수·과목은 데이터에서 읽는다. 썸네일 이미지는 같은 데이터로
// web/scripts/social-card.mjs 가 만든 파일이며, 결과가 바뀌면 다시 만들어 교체한다.
const views = siteData.yearViews();
const latest = siteData.getYear(latestYearWithResults(views));
const modelCount = latest.models.filter((m) => m.score !== null).length;
const hasPeriod4 = latest.subjects.some((s) => s === 'korean_history' || s === 'social' || s === 'science');
const scope = hasPeriod4 ? '1-4교시 전 과목(국어·수학·영어·한국사·탐구)' : '국어·수학·영어';
const socialTitle = `AI가 ${latest.year} 수능을 풀면? — KSAT AI Benchmark`;
const socialImage = {
  url: `${siteUrl}images/ksat-ai-benchmark-social-2027-all.png`,
  width: 2400,
  height: 1260,
  alt: 'AI가 수능을 풀면? 2027학년도 수능 1-4교시 전 과목, 모델별 과목 점수 표 — ROBOCO · KSAT AI Benchmark',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://roboco.io'),
  title: 'KSAT AI Benchmark - 수능 기반 AI 모델 평가',
  description: `${latest.year}학년도 수능 ${scope}에 ${modelCount}개 AI 모델이 응시했습니다. 점수, 과목별 강약, 풀이 시간과 API 환산 비용을 비교하고 문항별 답을 확인할 수 있습니다.`,
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: 'KSAT AI Benchmark',
    title: socialTitle,
    description: `${latest.year}학년도 수능 ${scope} · ${modelCount}개 AI 모델의 점수와 문항별 답을 비교하세요.`,
    images: [socialImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: socialTitle,
    description: `${latest.year}학년도 수능 ${scope} · ${modelCount}개 AI 모델 비교`,
    images: [socialImage.url],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head><ColorSchemeScript defaultColorScheme="auto" /></head>
      <body>
        {children}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}');`}
        </Script>
      </body>
    </html>
  );
}
