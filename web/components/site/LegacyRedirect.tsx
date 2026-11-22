'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { legacyRedirect } from '@/lib/site-routes.mjs';

export function LegacyRedirect() {
  const router = useRouter();
  useEffect(() => {
    const to = legacyRedirect(window.location.search, window.location.hash);
    if (to) router.replace(to);
  }, [router]);
  return null;
}
