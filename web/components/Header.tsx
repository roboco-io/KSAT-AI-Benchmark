'use client';

import { Group, Title, Button, Text, Paper } from '@mantine/core';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <Paper
      shadow="sm"
      p="md"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        height: '60px',
      }}
    >
      <Group h="100%" justify="space-between">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Group gap="xs">
            <Text size="xl" fw={700} c="blue">
              📊
            </Text>
            <Title order={3} c="dark">
              KSAT AI Benchmark
            </Title>
          </Group>
        </Link>

        <Group gap="xs">
          <Button
            component={Link}
            href="/"
            variant={isActive('/') ? 'filled' : 'subtle'}
            size="sm"
          >
            리더보드
          </Button>
          <Button
            component={Link}
            href="/exams"
            variant={isActive('/exams') ? 'filled' : 'subtle'}
            size="sm"
          >
            시험 목록
          </Button>
          <Button
            component={Link}
            href="/models"
            variant={isActive('/models') ? 'filled' : 'subtle'}
            size="sm"
          >
            모델 비교
          </Button>
        </Group>
      </Group>
    </Paper>
  );
}

