'use client';

import { useEffect, useState } from 'react';
import styles from './SiteHeader.module.css';

type Choice = 'auto' | 'light' | 'dark';
const ORDER: Choice[] = ['auto', 'light', 'dark'];
const LABEL: Record<Choice, string> = { auto: '자동', light: '밝게', dark: '어둡게' };
const KEY = 'ksat-theme';

function apply(choice: Choice) {
  const root = document.documentElement;
  if (choice === 'auto') {
    root.removeAttribute('data-theme');
    root.removeAttribute('data-mantine-color-scheme');
  } else {
    root.setAttribute('data-theme', choice);
    root.setAttribute('data-mantine-color-scheme', choice);
  }
}

export function ThemeToggle() {
  const [choice, setChoice] = useState<Choice>('auto');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'light' || saved === 'dark') {
        setChoice(saved);
        apply(saved);
      }
    } catch {
      /* storage unavailable */
    }
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
    setChoice(next);
    apply(next);
    try {
      if (next === 'auto') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {
      /* storage unavailable */
    }
  }

  return (
    <button
      type="button"
      className={`${styles.themeButton} ${styles.themeIconButton}`}
      onClick={cycle}
      title={`화면 테마: ${LABEL[choice]}`}
      aria-label={`화면 테마: ${LABEL[choice]}. 누르면 바뀝니다`}
    >
      <ThemeIcon choice={choice} />
    </button>
  );
}

// 자동은 반만 채운 원, 밝게는 해, 어둡게는 달로 나타낸다.
function ThemeIcon({ choice }: { choice: Choice }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  if (choice === 'light') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" />
      </svg>
    );
  }
  if (choice === 'dark') {
    return (
      <svg {...common}>
        <path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.2 8.2 0 1 0 10.2 10.2z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" />
    </svg>
  );
}
