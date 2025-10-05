'use client';

import { Container, Title, Text, Stack, Group, Badge, Card, SimpleGrid } from '@mantine/core';
import { Layout } from '@/components/Layout';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { useState, useEffect } from 'react';
import yaml from 'js-yaml';

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalExams: 0, totalEvaluations: 0, totalQuestions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Client-side data loading for static export
    async function loadData() {
      try {
        // Load evaluation data from static JSON
        const response = await fetch('/data/evaluation-data.json');
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
      <Layout>
        <Container size="xl" py="xl">
          <Text>로딩 중...</Text>
        </Container>
      </Layout>
    );
  }

  const { totalExams, totalEvaluations, totalQuestions } = stats;

  return (
    <Layout>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* 헤더 */}
          <div>
            <Title order={1} mb="xs">
              🏆 AI 모델 리더보드
            </Title>
            <Text c="dimmed" size="lg">
              대한민국 수능 문제를 활용한 AI 모델 성능 평가 결과
            </Text>
          </div>

          {/* 전체 통계 카드 */}
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  평가된 시험
                </Text>
                <Badge color="blue" variant="light">
                  시험
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {totalExams}개
              </Text>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  총 평가 횟수
                </Text>
                <Badge color="green" variant="light">
                  평가
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {totalEvaluations}회
              </Text>
            </Card>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between" mb="xs">
                <Text size="sm" c="dimmed">
                  총 문제 수
                </Text>
                <Badge color="orange" variant="light">
                  문제
                </Badge>
              </Group>
              <Text size="xl" fw={700}>
                {totalQuestions}개
              </Text>
            </Card>
          </SimpleGrid>

          {/* 리더보드 테이블 */}
          {leaderboard.length > 0 ? (
            <LeaderboardTable entries={leaderboard} />
          ) : (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Text ta="center" c="dimmed" size="lg">
                아직 평가 결과가 없습니다.
              </Text>
              <Text ta="center" c="dimmed" size="sm" mt="xs">
                평가를 실행하여 결과를 확인하세요.
              </Text>
            </Card>
          )}
        </Stack>
      </Container>
    </Layout>
  );
}
