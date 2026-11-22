'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { yearPath, questionsPath, comparePath } from '@/lib/site-routes.mjs';
import { ThemeToggle } from './ThemeToggle';
import styles from './SiteHeader.module.css';

export function SiteHeader({ years, latestYear }: { years: number[]; latestYear: number }) {
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const first = pathname.split('/').filter(Boolean)[0] ?? '';
  const year = /^\d{4}$/.test(first) ? Number(first) : latestYear;
  const close = () => setOpen(false);

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand} onClick={close}>KSAT AI Benchmark</Link>
        <nav className={styles.years} aria-label="학년도">
          {years.map((y) => (
            <Link key={y} href={yearPath(y)} className={styles.year} aria-current={y === year ? 'page' : undefined} onClick={close}>
              {y}
            </Link>
          ))}
        </nav>
        <button
          type="button"
          className={styles.menuButton}
          aria-expanded={open}
          aria-controls="site-links"
          onClick={() => setOpen(!open)}
        >
          메뉴
        </button>
        <div id="site-links" className={`${styles.links} ${open ? styles.linksOpen : ''}`}>
          <Link href={yearPath(year)} className={styles.link} onClick={close}>개요</Link>
          <Link href={questionsPath(year)} className={styles.link} onClick={close}>문항</Link>
          <Link href={comparePath(year, [])} className={styles.link} onClick={close}>비교</Link>
          <Link href="/#research" className={styles.link} onClick={close}>연구</Link>
          <Link href="/archive" className={styles.link} onClick={close}>아카이브</Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
