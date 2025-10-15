'use client';

import { useEffect, useRef } from 'react';
import renderMathInElement from 'katex/contrib/auto-render';

interface MathContentProps {
  text: string;
  autoWrapMath?: boolean; // LaTeX 명령어를 자동으로 감싸기
}

// 텍스트에 수식 구분자가 있는지 확인
function hasDelimiters(text: string): boolean {
  return text.includes('$$') || text.includes('$') || text.includes('\\(') || text.includes('\\[');
}

// 텍스트에 LaTeX 명령어가 있는지 확인
function hasLatexCommands(text: string): boolean {
  // 일반적인 LaTeX 명령어 패턴 감지
  const latexPatterns = [
    /\\[a-zA-Z]+/,        // \sqrt, \frac, \sin 등
    /\^/,                 // 위첨자
    /_/,                  // 아래첨자
    /\\{/,                // LaTeX 중괄호
    /\\\(/,               // LaTeX 괄호
  ];

  return latexPatterns.some(pattern => pattern.test(text));
}

export function MathContent({ text, autoWrapMath = false }: MathContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      let processedText = text;

      // autoWrapMath가 true이고 구분자가 없으면, LaTeX 명령어가 있을 때 자동으로 $...$로 감싸기
      if (autoWrapMath && !hasDelimiters(text)) {
        if (hasLatexCommands(text)) {
          processedText = `$${text}$`;
        }
      }

      // 먼저 텍스트 설정
      containerRef.current.textContent = processedText;

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
  }, [text, autoWrapMath]);

  return (
    <div
      ref={containerRef}
      style={{ whiteSpace: 'pre-wrap' }}
    />
  );
}
