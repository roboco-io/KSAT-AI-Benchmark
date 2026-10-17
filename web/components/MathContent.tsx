'use client';

import { useMemo } from 'react';
import { renderMathSegments } from '@/lib/math-content.mjs';
import styles from './MathContent.module.css';

interface MathContentProps {
  text: string;
  autoWrapMath?: boolean;
  className?: string;
}

export function MathContent({ text, autoWrapMath = false, className }: MathContentProps) {
  const segments = useMemo(() => renderMathSegments(text, autoWrapMath), [text, autoWrapMath]);

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
    </div>
  );
}
