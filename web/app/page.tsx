'use client';

import { Container, Title, Text, Stack, Group, Badge, Card, SimpleGrid } from '@mantine/core';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalExams: 0, totalEvaluations: 0, totalQuestions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
        const response = await fetch(`${basePath}/data/evaluation-data.json`);
        const data = await response.json();
        setLeaderboard(data.leaderboard);
        setStats(data.stats);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Text>로딩 중...</Text>
      </Container>
    );
  }

  const { totalExams, totalEvaluations, totalQuestions } = stats;

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">
            🏆 KSAT AI Benchmark
          </Title>
          <Text c="dimmed" size="lg">
            대한민국 수능 문제를 활용한 AI 모델 성능 평가
          </Text>
        </div>

        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text size="sm" c="dimmed" mb="xs">평가된 시험</Text>
            <Text size="xl" fw={700}>{totalExams}개</Text>
          </Card>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text size="sm" c="dimmed" mb="xs">총 평가 횟수</Text>
            <Text size="xl" fw={700}>{totalEvaluations}회</Text>
          </Card>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Text size="sm" c="dimmed" mb="xs">총 문제 수</Text>
            <Text size="xl" fw={700}>{totalQuestions}개</Text>
          </Card>
        </SimpleGrid>

        <div>
          <Title order={2} mb="md">리더보드</Title>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            {leaderboard.length > 0 ? (
              <Stack gap="md">
                {leaderboard.map((entry, index) => (
                  <Card key={entry.model_name} withBorder p="md">
                    <Group justify="space-between">
                      <div>
                        <Group gap="xs">
                          <Text fw={700} size="xl">#{index + 1}</Text>
                          <Text fw={600} size="lg">{entry.model_name}</Text>
                        </Group>
                        <Text size="sm" c="dimmed" mt="xs">
                          {entry.correct_answers}/{entry.total_questions} 정답 · {entry.exams_count}개 시험
                        </Text>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text size="xl" fw={700} c="blue">
                          {entry.accuracy.toFixed(1)}%
                        </Text>
                        <Text size="sm" c="dimmed">
                          {entry.total_score}/{entry.max_score}점
                        </Text>
                      </div>
                    </Group>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text ta="center" c="dimmed">평가 결과가 없습니다.</Text>
            )}
          </Card>
        </div>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text size="sm" c="dimmed">
            📊 이 벤치마크는 대한민국 수능 문제를 활용하여 AI 모델의 언어 이해 및 추론 능력을 평가합니다.
          </Text>
        </Card>
      </Stack>
    </Container>
  );
}
