import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  SimpleGrid,
  Table,
  Progress,
} from '@mantine/core';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import {
  loadModelResults,
  generateModelSubjectStats,
  getAllModelNames,
} from '@/lib/data';
import { formatModelName, getSubjectName, getAccuracyColor, formatTime } from '@/lib/utils';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  const modelNames = getAllModelNames();
  return modelNames.map((name) => ({ name }));
}

export default async function ModelDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const modelResults = loadModelResults(name);

  if (modelResults.length === 0) {
    notFound();
  }

  // 전체 통계
  const totalQuestions = modelResults.reduce(
    (sum, r) => sum + r.summary.total_questions,
    0
  );
  const correctAnswers = modelResults.reduce(
    (sum, r) => sum + r.summary.correct_answers,
    0
  );
  const totalScore = modelResults.reduce((sum, r) => sum + r.summary.total_score, 0);
  const maxScore = modelResults.reduce((sum, r) => sum + r.summary.max_score, 0);
  const totalTime = modelResults.reduce(
    (sum, r) => sum + r.results.reduce((t, q) => t + q.time_taken, 0),
    0
  );

  const accuracy = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;
  const scoreRate = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  const avgTime = totalQuestions > 0 ? totalTime / totalQuestions : 0;

  // 과목별 통계
  const subjectStats = generateModelSubjectStats(name);

  const accuracyColor = getAccuracyColor(accuracy);

  return (
    <Layout>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* 모델 정보 */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <div>
                <Group gap="xs" mb="xs">
                  <Link href="/models" style={{ textDecoration: 'none' }}>
                    <Text c="blue" size="sm">
                      ← 모델 목록
                    </Text>
                  </Link>
                </Group>
                <Title order={2}>{formatModelName(name)}</Title>
                <Text c="dimmed" size="sm" mt="xs">
                  {name}
                </Text>
              </div>

              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
                <div>
                  <Text size="sm" c="dimmed" mb="xs">
                    전체 정답률
                  </Text>
                  <Text size="xl" fw={700} c={accuracyColor}>
                    {accuracy.toFixed(1)}%
                  </Text>
                  <Text size="sm" c="dimmed">
                    {correctAnswers}/{totalQuestions}
                  </Text>
                </div>

                <div>
                  <Text size="sm" c="dimmed" mb="xs">
                    총 점수
                  </Text>
                  <Text size="xl" fw={700}>
                    {totalScore}점
                  </Text>
                  <Text size="sm" c="dimmed">
                    {maxScore}점 중
                  </Text>
                </div>

                <div>
                  <Text size="sm" c="dimmed" mb="xs">
                    득점률
                  </Text>
                  <Text size="xl" fw={700}>
                    {scoreRate.toFixed(1)}%
                  </Text>
                </div>

                <div>
                  <Text size="sm" c="dimmed" mb="xs">
                    평균 응답 시간
                  </Text>
                  <Text size="xl" fw={700}>
                    {formatTime(avgTime)}
                  </Text>
                </div>
              </SimpleGrid>
            </Stack>
          </Card>

          {/* 과목별 통계 */}
          {subjectStats.length > 0 && (
            <div>
              <Title order={3} mb="md">
                과목별 성적
              </Title>

              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
                {subjectStats.map((stat) => {
                  const color = getAccuracyColor(stat.accuracy);
                  return (
                    <Card key={stat.subject} shadow="sm" padding="lg" radius="md" withBorder>
                      <Stack gap="md">
                        <Group justify="space-between">
                          <Badge color="blue" variant="light" size="lg">
                            {getSubjectName(stat.subject)}
                          </Badge>
                          <Badge color={color} size="lg">
                            {stat.accuracy.toFixed(1)}%
                          </Badge>
                        </Group>

                        <Progress.Root size="xl">
                          <Progress.Section value={stat.accuracy} color={color}>
                            <Progress.Label>{stat.accuracy.toFixed(1)}%</Progress.Label>
                          </Progress.Section>
                        </Progress.Root>

                        <Group justify="space-between">
                          <div>
                            <Text size="xs" c="dimmed">
                              정답 수
                            </Text>
                            <Text fw={700}>
                              {stat.correct_count}/{stat.questions_count}
                            </Text>
                          </div>
                          <div>
                            <Text size="xs" c="dimmed">
                              점수
                            </Text>
                            <Text fw={700}>
                              {stat.total_score}/{stat.max_score}
                            </Text>
                          </div>
                        </Group>
                      </Stack>
                    </Card>
                  );
                })}
              </SimpleGrid>
            </div>
          )}

          {/* 시험별 상세 결과 */}
          <div>
            <Title order={3} mb="md">
              시험별 상세 결과
            </Title>

            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>시험</Table.Th>
                    <Table.Th>과목</Table.Th>
                    <Table.Th>정답률</Table.Th>
                    <Table.Th>점수</Table.Th>
                    <Table.Th>상세</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {modelResults.map((result) => {
                    const color = getAccuracyColor(result.summary.accuracy);

                    return (
                      <Table.Tr key={result.exam_id}>
                        <Table.Td>
                          <Link
                            href={`/exams/${result.exam_id}`}
                            style={{ textDecoration: 'none' }}
                          >
                            <Text c="blue" fw={500}>
                              {result.exam_title}
                            </Text>
                          </Link>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="blue" variant="light">
                            {getSubjectName(result.subject)}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Progress.Root size="lg" w={100}>
                              <Progress.Section value={result.summary.accuracy} color={color}>
                                <Progress.Label>
                                  {result.summary.accuracy.toFixed(1)}%
                                </Progress.Label>
                              </Progress.Section>
                            </Progress.Root>
                            <Text size="sm" c="dimmed">
                              {result.summary.correct_answers}/{result.summary.total_questions}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Text>
                            {result.summary.total_score}/{result.summary.max_score}점
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Link
                            href={`/exams/${result.exam_id}/${name}`}
                            style={{ textDecoration: 'none' }}
                          >
                            <Text c="blue" size="sm">
                              문제별 보기 →
                            </Text>
                          </Link>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </Card>
          </div>
        </Stack>
      </Container>
    </Layout>
  );
}

