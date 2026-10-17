'use client';

import { useMemo } from 'react';
import { renderMathSegments } from '@/lib/math-content.mjs';
import styles from './MathContent.module.css';
import { normalizeLegacyMath } from '@/lib/legacy-math.mjs';

interface MathContentProps {
  text: string;
  autoWrapMath?: boolean;
  className?: string;
  normalizeMath?: boolean;
}

export function MathContent({ text, autoWrapMath = false, className, normalizeMath = false }: MathContentProps) {
  const displayText = useMemo(() => normalizeMath ? normalizeLegacyMath(text) : text, [text, normalizeMath]);
  const segments = useMemo(() => renderMathSegments(displayText, autoWrapMath), [displayText, autoWrapMath]);

  return (
    <div className={`${styles.content}${className ? ` ${className}` : ''}`}>
      {segments.map((segment, index) => segment.type === 'text' ? segment.text : (
        <span
          key={index}
          className={segment.display ? styles.display : styles.inline}
          // Only KaTeX generates this HTML, with trust disabled and MathML enabled.
          dangerouslySetInnerHTML={{ __html: segment.html }}
        />
      ))}
      {displayText !== text && <details className={styles.source}><summary>수식 표기 정리 전 풀이 원문</summary><p>{text}</p></details>}
    </div>
  );
}
