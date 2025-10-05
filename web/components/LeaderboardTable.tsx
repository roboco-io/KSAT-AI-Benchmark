'use client';

import { Table, Badge, Text, Group, Card, Progress } from '@mantine/core';
import Link from 'next/link';
import { LeaderboardEntry } from '@/types';
import { formatModelName, getAccuracyColor, formatTime } from '@/lib/utils';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  const rows = entries.map((entry, index) => {
    const accuracyColor = getAccuracyColor(entry.accuracy);

    return (
      <Table.Tr key={entry.model_name}>
        <Table.Td>
          <Text fw={700} size="lg">
            {index + 1}
          </Text>
        </Table.Td>
        <Table.Td>
          <Link
            href={`/models/${entry.model_name}`}
            style={{ textDecoration: 'none' }}
          >
            <Text c="blue" fw={500}>
              {formatModelName(entry.model_name)}
            </Text>
          </Link>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            <Progress.Root size="xl" w={120}>
              <Progress.Section value={entry.accuracy} color={accuracyColor}>
                <Progress.Label>{entry.accuracy.toFixed(1)}%</Progress.Label>
              </Progress.Section>
            </Progress.Root>
            <Text size="sm" c="dimmed">
              {entry.correct_answers}/{entry.total_questions}
            </Text>
          </Group>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            <Text fw={500}>
              {entry.total_score}/{entry.max_score}점
            </Text>
            <Badge color={accuracyColor} variant="light" size="sm">
              {entry.score_rate.toFixed(1)}%
            </Badge>
          </Group>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{formatTime(entry.avg_time)}</Text>
        </Table.Td>
        <Table.Td>
          <Badge variant="outline" color="gray">
            {entry.exams_count}개
          </Badge>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ width: '60px' }}>순위</Table.Th>
            <Table.Th>모델명</Table.Th>
            <Table.Th>정답률</Table.Th>
            <Table.Th>점수</Table.Th>
            <Table.Th>평균 응답 시간</Table.Th>
            <Table.Th>평가 시험 수</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Card>
  );
}

