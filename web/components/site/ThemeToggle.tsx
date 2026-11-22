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
    <button type="button" className={styles.themeButton} onClick={cycle} aria-label={`화면 테마: ${LABEL[choice]}. 누르면 바뀝니다`}>
      테마 · {LABEL[choice]}
    </button>
  );
}
