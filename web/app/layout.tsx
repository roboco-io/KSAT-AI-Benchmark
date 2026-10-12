import '@mantine/core/styles.css';
import './globals.css';
import 'katex/dist/katex.min.css';

import { MantineProvider } from '@mantine/core';

export const metadata = {
  title: 'KSAT AI Benchmark - 수능 기반 AI 모델 평가',
  description: '대한민국 수능 문제를 활용한 AI 모델 성능 평가 플랫폼',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" data-mantine-color-scheme="light">
      <body>
        <MantineProvider forceColorScheme="light">
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
