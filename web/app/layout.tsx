import '@mantine/core/styles.css';
import './globals.css';
import 'katex/dist/katex.min.css';

import { ColorSchemeScript, MantineProvider } from '@mantine/core';
import type { Metadata } from 'next';
import Script from 'next/script';

const GA_MEASUREMENT_ID = 'G-9G1SGM9SZQ';

const siteUrl = 'https://roboco.io/KSAT-AI-Benchmark/';
const socialImage = {
  url: `${siteUrl}images/ksat-ai-benchmark-social-roboco.png`,
  width: 1672,
  height: 941,
  alt: 'AI가 수능을 풀면? 2026학년도 국어·수학·영어, 11개 모델 비교 — ROBOCO · KSAT AI Benchmark',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://roboco.io'),
  title: 'KSAT AI Benchmark - 수능 기반 AI 모델 평가',
  description: '2026학년도 수능 국어·수학·영어 147문항으로 11개 AI 모델을 비교합니다. 정답률, 기권률, 풀이 시간과 토큰 사용량·API 환산 비용을 공개합니다.',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: siteUrl,
    siteName: 'KSAT AI Benchmark',
    title: 'AI가 수능을 풀면? — KSAT AI Benchmark',
    description: '2026학년도 국어·수학·영어 · 11개 AI 모델의 답안과 평가 기록을 확인하세요.',
    images: [socialImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI가 수능을 풀면? — KSAT AI Benchmark',
    description: '2026학년도 국어·수학·영어 · 11개 AI 모델 비교',
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
        <MantineProvider defaultColorScheme="auto">
          {children}
        </MantineProvider>
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
