import { Container, Title, Text, Stack, Card, Group, Badge, Table, Progress } from '@mantine/core';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { loadExam, loadExamResults, getAllExamIds } from '@/lib/data';
import { getSubjectName, formatModelName, getAccuracyColor, formatTime } from '@/lib/utils';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  const examIds = getAllExamIds();
  return examIds.map((id) => ({ id }));
}

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = loadExam(id);
  const results = loadExamResults(id);

  if (!exam) {
    notFound();
  }

  // 정확도 순으로 정렬
  const sortedResults = [...results].sort((a, b) => b.summary.accuracy - a.summary.accuracy);

  return (
    <Layout>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* 시험 정보 */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group>
                <Badge color="blue" variant="light" size="lg">
                  {getSubjectName(exam.subject)}
                </Badge>
                <Badge color="gray" variant="outline" size="lg">
                  {exam.year}년
                </Badge>
              </Group>

              <div>
                <Title order={2}>{exam.title}</Title>
                <Text c="dimmed" size="sm" mt="xs">
                  시험 ID: {exam.exam_id}
                </Text>
              </div>

              <Group gap="xl">
                <div>
                  <Text size="sm" c="dimmed">
                    총 문제 수
                  </Text>
                  <Text size="xl" fw={700}>
                    {exam.questions?.length || 0}개
                  </Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    평가된 모델
                  </Text>
                  <Text size="xl" fw={700}>
                    {results.length}개
                  </Text>
                </div>
                {exam.parsing_info && (
                  <div>
                    <Text size="sm" c="dimmed">
                      파싱 방법
                    </Text>
                    <Text size="lg" fw={500}>
                      {exam.parsing_info.method}
                    </Text>
                  </div>
                )}
              </Group>
            </Stack>
          </Card>

          {/* 모델별 평가 결과 */}
          <div>
            <Title order={3} mb="md">
              모델별 평가 결과
            </Title>

            {sortedResults.length > 0 ? (
              <Card shadow="sm" padding="lg" radius="md" withBorder>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>순위</Table.Th>
                      <Table.Th>모델명</Table.Th>
                      <Table.Th>정답률</Table.Th>
                      <Table.Th>점수</Table.Th>
                      <Table.Th>평균 시간</Table.Th>
                      <Table.Th>상세</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {sortedResults.map((result, index) => {
                      const accuracyColor = getAccuracyColor(result.summary.accuracy);
                      const avgTime =
                        result.results.reduce((sum, r) => sum + r.time_taken, 0) /
                        result.results.length;

                      return (
                        <Table.Tr key={result.model_name}>
                          <Table.Td>
                            <Text fw={700}>{index + 1}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Link
                              href={`/models/${result.model_name}`}
                              style={{ textDecoration: 'none' }}
                            >
                              <Text c="blue" fw={500}>
                                {formatModelName(result.model_name)}
                              </Text>
                            </Link>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Progress.Root size="lg" w={100}>
                                <Progress.Section
                                  value={result.summary.accuracy}
                                  color={accuracyColor}
                                >
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
                            <Text size="sm">{formatTime(avgTime)}</Text>
                          </Table.Td>
                          <Table.Td>
                            <Link
                              href={`/exams/${id}/${result.model_name}`}
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
            ) : (
              <Card shadow="sm" padding="xl" radius="md" withBorder>
                <Text ta="center" c="dimmed">
                  아직 평가 결과가 없습니다.
                </Text>
              </Card>
            )}
          </div>
        </Stack>
      </Container>
    </Layout>
  );
}

