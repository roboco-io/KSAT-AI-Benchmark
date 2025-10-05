import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Badge,
  Table,
  Accordion,
  Alert,
} from '@mantine/core';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { loadExam, loadExamResults, getAllExamIds, getAllModelNames } from '@/lib/data';
import { getSubjectName, formatModelName, formatTime } from '@/lib/utils';
import { notFound } from 'next/navigation';

export function generateStaticParams() {
  const examIds = getAllExamIds();
  const modelNames = getAllModelNames();

  const params: { id: string; model: string }[] = [];

  for (const examId of examIds) {
    const results = loadExamResults(examId);
    for (const result of results) {
      params.push({
        id: examId,
        model: result.model_name,
      });
    }
  }

  return params;
}

export default async function ExamModelDetailPage({
  params,
}: {
  params: Promise<{ id: string; model: string }>;
}) {
  const { id, model } = await params;
  const exam = loadExam(id);
  const results = loadExamResults(id);
  const modelResult = results.find((r) => r.model_name === model);

  if (!exam || !modelResult) {
    notFound();
  }

  return (
    <Layout>
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* 헤더 */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Stack gap="md">
              <Group>
                <Link href={`/exams/${id}`} style={{ textDecoration: 'none' }}>
                  <Text c="blue" size="sm">
                    ← 시험으로 돌아가기
                  </Text>
                </Link>
              </Group>

              <div>
                <Group gap="xs" mb="xs">
                  <Badge color="blue" variant="light">
                    {getSubjectName(exam.subject)}
                  </Badge>
                  <Badge color="gray" variant="outline">
                    {exam.year}년
                  </Badge>
                </Group>
                <Title order={2}>{exam.title}</Title>
                <Title order={3} c="dimmed" mt="xs">
                  {formatModelName(modelResult.model_name)}
                </Title>
              </div>

              <Group gap="xl">
                <div>
                  <Text size="sm" c="dimmed">
                    정답률
                  </Text>
                  <Text size="xl" fw={700} c="blue">
                    {modelResult.summary.accuracy.toFixed(1)}%
                  </Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    점수
                  </Text>
                  <Text size="xl" fw={700}>
                    {modelResult.summary.total_score}/{modelResult.summary.max_score}점
                  </Text>
                </div>
                <div>
                  <Text size="sm" c="dimmed">
                    정답 수
                  </Text>
                  <Text size="xl" fw={700}>
                    {modelResult.summary.correct_answers}/{modelResult.summary.total_questions}
                  </Text>
                </div>
              </Group>
            </Stack>
          </Card>

          {/* 문제별 상세 결과 */}
          <div>
            <Title order={3} mb="md">
              문제별 상세 결과
            </Title>

            <Accordion variant="contained">
              {modelResult.results.map((questionResult) => {
                const question = exam.questions?.find(
                  (q) => q.question_id === questionResult.question_id
                );

                const isCorrect = questionResult.is_correct;
                const color = isCorrect ? 'green' : 'red';

                return (
                  <Accordion.Item
                    key={questionResult.question_id}
                    value={questionResult.question_id}
                  >
                    <Accordion.Control>
                      <Group justify="space-between" mr="md">
                        <Group>
                          <Badge color={color} variant="light">
                            {questionResult.question_number}번
                          </Badge>
                          <Text fw={500}>
                            {question?.question_text.slice(0, 50) || '문제 정보 없음'}
                            {(question?.question_text.length || 0) > 50 ? '...' : ''}
                          </Text>
                        </Group>
                        <Group gap="xs">
                          <Badge color={color}>{isCorrect ? '정답' : '오답'}</Badge>
                          <Text size="sm" c="dimmed">
                            {questionResult.earned_points}/{questionResult.points}점
                          </Text>
                        </Group>
                      </Group>
                    </Accordion.Control>

                    <Accordion.Panel>
                      <Stack gap="md">
                        {/* 문제 */}
                        {question && (
                          <Card withBorder>
                            <Stack gap="sm">
                              <Text fw={700} size="lg">
                                문제 {questionResult.question_number}
                              </Text>
                              <Text style={{ whiteSpace: 'pre-wrap' }}>
                                {question.question_text}
                              </Text>

                              {question.choices && question.choices.length > 0 && (
                                <Stack gap="xs" mt="md">
                                  {question.choices.map((choice, index) => {
                                    const choiceNum = index + 1;
                                    const isModelAnswer = choiceNum === questionResult.answer;
                                    const isCorrectAnswer =
                                      choiceNum === questionResult.correct_answer;

                                    let badgeColor = 'gray';
                                    let badgeText = `${choiceNum}`;

                                    if (isCorrectAnswer && isModelAnswer) {
                                      badgeColor = 'green';
                                      badgeText = `${choiceNum} ✓ (정답)`;
                                    } else if (isCorrectAnswer) {
                                      badgeColor = 'blue';
                                      badgeText = `${choiceNum} (정답)`;
                                    } else if (isModelAnswer) {
                                      badgeColor = 'red';
                                      badgeText = `${choiceNum} ✗ (모델 답변)`;
                                    }

                                    return (
                                      <Group key={index} gap="xs">
                                        <Badge color={badgeColor} variant="light">
                                          {badgeText}
                                        </Badge>
                                        <Text>{choice}</Text>
                                      </Group>
                                    );
                                  })}
                                </Stack>
                              )}
                            </Stack>
                          </Card>
                        )}

                        {/* 모델 답변 및 풀이 */}
                        <Card withBorder bg={isCorrect ? 'green.0' : 'red.0'}>
                          <Stack gap="sm">
                            <Group justify="space-between">
                              <Text fw={700}>모델 답변 및 풀이</Text>
                              <Group gap="xs">
                                <Badge color="gray" variant="outline">
                                  {formatTime(questionResult.time_taken)}
                                </Badge>
                                <Badge color={color}>{isCorrect ? '정답' : '오답'}</Badge>
                              </Group>
                            </Group>

                            <div>
                              <Text size="sm" c="dimmed" mb="xs">
                                답변:
                              </Text>
                              <Text fw={700} size="lg">
                                {questionResult.answer}번
                                {isCorrect ? ' ✓' : ' ✗'}
                              </Text>
                            </div>

                            <div>
                              <Text size="sm" c="dimmed" mb="xs">
                                풀이 과정:
                              </Text>
                              <Text style={{ whiteSpace: 'pre-wrap' }}>
                                {questionResult.reasoning || '풀이 정보 없음'}
                              </Text>
                            </div>

                            {questionResult.error && (
                              <Alert color="red" title="오류 발생">
                                {questionResult.error}
                              </Alert>
                            )}
                          </Stack>
                        </Card>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                );
              })}
            </Accordion>
          </div>
        </Stack>
      </Container>
    </Layout>
  );
}

