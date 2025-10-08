'use client';

import { useEffect, useRef } from 'react';
import renderMathInElement from 'katex/contrib/auto-render';

interface MathContentProps {
  text: string;
}

export function MathContent({ text }: MathContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      // 먼저 텍스트 설정
      containerRef.current.textContent = text;

      // 그 다음 KaTeX 렌더링
      renderMathInElement(containerRef.current, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
          { left: '$', right: '$', display: false },
        ],
        throwOnError: false,
      });
    }
  }, [text]);

  return (
    <div
      ref={containerRef}
      style={{ whiteSpace: 'pre-wrap' }}
    />
  );
}
