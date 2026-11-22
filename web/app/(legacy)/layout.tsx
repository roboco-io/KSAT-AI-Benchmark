import '@mantine/core/styles.css';
import '../globals.css';
import 'katex/dist/katex.min.css';

import { MantineProvider } from '@mantine/core';

export default function LegacyLayout({ children }: { children: React.ReactNode }) {
  return <MantineProvider defaultColorScheme="auto">{children}</MantineProvider>;
}
