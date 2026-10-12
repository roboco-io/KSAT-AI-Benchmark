'use client';

import { useEffect, useState } from 'react';
import { useMantineColorScheme, type MantineColorScheme } from '@mantine/core';

export function ThemeControl() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <label className="theme-control">테마<select aria-label="화면 테마" value={mounted ? colorScheme : 'auto'} onChange={event => setColorScheme(event.target.value as MantineColorScheme)}><option value="auto">자동</option><option value="light">라이트</option><option value="dark">다크</option></select></label>;
}
