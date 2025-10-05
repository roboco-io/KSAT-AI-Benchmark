import { Container, Title, Text, Stack, Card, Group, Badge, SimpleGrid } from '@mantine/core';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { loadExams, loadExamResults } from '@/lib/data';
import { getSubjectName } from '@/lib/utils';

export default function ExamsPage() {
  const exams = loadExams();

  return (
    <Layout>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <div>
            <Title order={1} mb="xs">
              📚 시험 목록
            </Title>
            <Text c="dimmed" size="lg">
              등록된 수능 시험 문제와 평가 결과
            </Text>
          </div>

          {exams.length > 0 ? (
            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="md">
              {exams.map((exam) => {
                const results = loadExamResults(exam.exam_id);
                const avgAccuracy = results.length > 0
                  ? results.reduce((sum, r) => sum + r.summary.accuracy, 0) / results.length
                  : 0;

                return (
                  <Link
                    key={exam.exam_id}
                    href={`/exams/${exam.exam_id}`}
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
                        <Group justify="space-between">
                          <Badge color="blue" variant="light">
                            {getSubjectName(exam.subject)}
                          </Badge>
                          <Badge color="gray" variant="outline">
                            {exam.year}년
                          </Badge>
                        </Group>

                        <div>
                          <Text fw={700} size="lg" lineClamp={2}>
                            {exam.title}
                          </Text>
                          <Text size="sm" c="dimmed" mt="xs">
                            문제 수: {exam.questions?.length || 0}개
                          </Text>
                        </div>

                        {results.length > 0 && (
                          <Group gap="xs">
                            <Badge color="green" variant="light">
                              {results.length}개 모델 평가됨
                            </Badge>
                            <Text size="sm" c="dimmed">
                              평균 {avgAccuracy.toFixed(1)}%
                            </Text>
                          </Group>
                        )}
                      </Stack>
                    </Card>
                  </Link>
                );
              })}
            </SimpleGrid>
          ) : (
            <Card shadow="sm" padding="xl" radius="md" withBorder>
              <Text ta="center" c="dimmed" size="lg">
                등록된 시험이 없습니다.
              </Text>
            </Card>
          )}
        </Stack>
      </Container>
    </Layout>
  );
}

