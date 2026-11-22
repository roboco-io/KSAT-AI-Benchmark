'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { legacyRedirect } from '@/lib/site-routes.mjs';

export function LegacyRedirect({ fallbackYear }: { fallbackYear?: number }) {
  const router = useRouter();
  useEffect(() => {
    const to = legacyRedirect(window.location.search, window.location.hash, fallbackYear);
    if (to) router.replace(to);
  }, [router, fallbackYear]);
  return null;
}
