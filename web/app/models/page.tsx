import { Container, Title, Text, Stack, Card, Group, Badge, SimpleGrid, Progress } from '@mantine/core';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { generateLeaderboard } from '@/lib/data';
import { formatModelName, getAccuracyColor } from '@/lib/utils';

export default function ModelsPage() {
  const leaderboard = generateLeaderboard();

  return (
    <Layout>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <div>
            <Title order={1} mb="xs">
              🤖 모델 비교
            </Title>
            <Text c="dimmed" size="lg">
              등록된 AI 모델의 성능 비교 및 상세 정보
            </Text>
          </div>

          {leaderboard.length > 0 ? (
            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
              {leaderboard.map((entry) => {
                const accuracyColor = getAccuracyColor(entry.accuracy);

                return (
                  <Link
                    key={entry.model_name}
                    href={`/models/${entry.model_name}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <Card
                      shadow="sm"
                      padding="lg"
                      radius="md"
                      withBorder
                      style={{ cursor: 'pointer', height: '100%' }}
                    >
                      <Stack gap="md">
                        <div>
                          <Text fw={700} size="lg">
                            {formatModelName(entry.model_name)}
                          </Text>
                          <Text size="xs" c="dimmed" mt="xs">
                            {entry.model_name}
                          </Text>
                        </div>

                        <div>
                          <Text size="sm" c="dimmed" mb="xs">
                            정답률
                          </Text>
                          <Text size="xl" fw={700} c={accuracyColor}>
                            {entry.accuracy.toFixed(1)}%
                          </Text>
                        </div>

                        <Group gap="xs">
                          <Badge color="blue" variant="light">
                            {entry.correct_answers}/{entry.total_questions} 정답
                          </Badge>
                          <Badge color="gray" variant="outline">
                            {entry.exams_count}개 시험
                          </Badge>
                        </Group>

                        <Group justify="space-between">
                          <div>
                            <Text size="xs" c="dimmed">
                              점수
                            </Text>
                            <Text fw={700}>
                              {entry.total_score}/{entry.max_score}점
                            </Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">
                              득점률
                            </Text>
                            <Text fw={700}>{entry.score_rate.toFixed(1)}%</Text>
                          </div>
                        </Group>
                      </Stack>
                    </Card>
                  </Link>
                );
              })}
            </SimpleGrid>
          ) : (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Text ta="center" c="dimmed" size="lg">
                평가된 모델이 없습니다.
              </Text>
            </Card>
          )}
        </Stack>
      </Container>
    </Layout>
  );
}

