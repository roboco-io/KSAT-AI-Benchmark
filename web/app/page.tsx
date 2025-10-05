'use client';

import { Container, Title, Text, Stack, Group, Badge, Card, SimpleGrid, Accordion, Table } from '@mantine/core';
import { useState, useEffect } from 'react';

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [examsData, setExamsData] = useState<any>({});
  const [stats, setStats] = useState({ totalExams: 0, totalEvaluations: 0, totalQuestions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
        const response = await fetch(`${basePath}/data/evaluation-data.json`);
        const data = await response.json();
        setLeaderboard(data.leaderboard);
        setResults(data.results || []);
        setExamsData(data.exams || {});
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
              <Accordion variant="contained">
                {leaderboard.map((entry, index) => {
                  const modelResults = results.filter(r => r.model_name === entry.model_name);
                  const accuracyColor = entry.accuracy >= 70 ? 'blue' : entry.accuracy >= 50 ? 'teal' : entry.accuracy >= 30 ? 'yellow' : 'red';

                  return (
                    <Accordion.Item key={entry.model_name} value={entry.model_name}>
                      <Accordion.Control>
                        <Group justify="space-between" mr="md">
                          <Group>
                            <Text fw={700} size="xl">#{index + 1}</Text>
                            <div>
                              <Text fw={600} size="lg">{entry.model_name}</Text>
                              <Text size="sm" c="dimmed">
                                {entry.correct_answers}/{entry.total_questions} 정답 · {entry.exams_count}개 시험
                              </Text>
                            </div>
                          </Group>
                          <div style={{ textAlign: 'right' }}>
                            <Text size="xl" fw={700} c={accuracyColor}>
                              {entry.accuracy.toFixed(1)}%
                            </Text>
                            <Text size="sm" c="dimmed">
                              {entry.total_score}/{entry.max_score}점
                            </Text>
                          </div>
                        </Group>
                      </Accordion.Control>

                      <Accordion.Panel>
                        <Stack gap="md">
                          {modelResults.map((result) => {
                            const examInfo = examsData[result.exam_id];
                            
                            return (
                              <Card key={result.exam_id} withBorder>
                                <Stack gap="md">
                                  <div>
                                    <Text fw={600} size="lg">{result.exam_title}</Text>
                                    <Text size="sm" c="dimmed">
                                      정답률: {result.summary.accuracy.toFixed(1)}% · 
                                      점수: {result.summary.total_score}/{result.summary.max_score}점
                                    </Text>
                                  </div>

                                  <Accordion variant="separated">
                                    {result.results.map((q: any) => {
                                      const questionData = examInfo?.questions?.find(
                                        (eq: any) => eq.question_id === q.question_id || eq.question_number === q.question_number
                                      );

                                      return (
                                        <Accordion.Item key={q.question_id} value={q.question_id}>
                                          <Accordion.Control>
                                            <Group justify="space-between" mr="md">
                                              <Group>
                                                <Badge color={q.is_correct ? 'green' : 'red'} size="lg">
                                                  {q.question_number}번
                                                </Badge>
                                                <Text fw={500}>
                                                  {q.is_correct ? '✓ 정답' : '✗ 오답'} · {q.points}점
                                                </Text>
                                              </Group>
                                              <Group gap="xs">
                                                <Text size="sm" fw={600}>
                                                  답변: {q.answer}번
                                                </Text>
                                                {!q.is_correct && (
                                                  <Text size="sm" c="dimmed">
                                                    (정답: {q.correct_answer}번)
                                                  </Text>
                                                )}
                                                <Text size="xs" c="dimmed">
                                                  {q.time_taken.toFixed(2)}초
                                                </Text>
                                              </Group>
                                            </Group>
                                          </Accordion.Control>

                                          <Accordion.Panel>
                                            <Stack gap="md">
                                              {/* 문제 */}
                                              {questionData && (
                                                <>
                                                  {/* 지문 */}
                                                  {questionData.passage && (
                                                    <Card withBorder bg="blue.0">
                                                      <Stack gap="sm">
                                                        <Text fw={700} size="md" c="blue">
                                                          📖 지문
                                                        </Text>
                                                        <Text size="sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
                                                          {questionData.passage}
                                                        </Text>
                                                      </Stack>
                                                    </Card>
                                                  )}

                                                  {/* 문제 */}
                                                  <Card withBorder bg="gray.0">
                                                    <Stack gap="sm">
                                                      <Text fw={700} size="md" c="blue">
                                                        📝 문제 {q.question_number}번
                                                      </Text>
                                                      <Text style={{ whiteSpace: 'pre-wrap' }}>
                                                        {questionData.question_text}
                                                      </Text>

                                                    {questionData.choices && questionData.choices.length > 0 && (
                                                      <Stack gap="xs" mt="sm">
                                                        <Text fw={600} size="sm">선택지:</Text>
                                                        {questionData.choices.map((choice: string, idx: number) => {
                                                          const choiceNum = idx + 1;
                                                          const isModelAnswer = choiceNum === q.answer;
                                                          const isCorrectAnswer = choiceNum === q.correct_answer;

                                                          let badgeColor = 'gray';
                                                          if (isCorrectAnswer && isModelAnswer) {
                                                            badgeColor = 'green';
                                                          } else if (isCorrectAnswer) {
                                                            badgeColor = 'blue';
                                                          } else if (isModelAnswer) {
                                                            badgeColor = 'red';
                                                          }

                                                          return (
                                                            <Group key={idx} gap="xs" align="flex-start">
                                                              <Badge color={badgeColor} variant="light" size="lg" mt={4}>
                                                                {choiceNum}
                                                              </Badge>
                                                              <Text style={{ flex: 1 }}>{choice}</Text>
                                                              {isCorrectAnswer && <Text c="blue" fw={600}>✓ 정답</Text>}
                                                              {isModelAnswer && !isCorrectAnswer && <Text c="red" fw={600}>✗ 선택</Text>}
                                                              {isModelAnswer && isCorrectAnswer && <Text c="green" fw={600}>✓ 선택</Text>}
                                                            </Group>
                                                          );
                                                        })}
                                                      </Stack>
                                                    )}
                                                    </Stack>
                                                  </Card>
                                                </>
                                              )}

                                              {/* 모델 답변 */}
                                              <Card withBorder bg={q.is_correct ? 'green.0' : 'red.0'}>
                                                <Stack gap="sm">
                                                  <Group justify="space-between">
                                                    <Text fw={700} size="md">
                                                      🤖 모델의 답변 및 풀이
                                                    </Text>
                                                    <Badge color={q.is_correct ? 'green' : 'red'} size="lg">
                                                      {q.is_correct ? '정답' : '오답'} · {q.earned_points}/{q.points}점
                                                    </Badge>
                                                  </Group>

                                                  <div>
                                                    <Text size="sm" fw={600} mb="xs">선택한 답:</Text>
                                                    <Text size="lg" fw={700}>
                                                      {q.answer}번 {q.is_correct ? '✓' : '✗'}
                                                    </Text>
                                                  </div>

                                                  <div>
                                                    <Text size="sm" fw={600} mb="xs">풀이 과정:</Text>
                                                    <Text style={{ whiteSpace: 'pre-wrap' }}>
                                                      {q.reasoning || '풀이 정보 없음'}
                                                    </Text>
                                                  </div>

                                                  <Text size="xs" c="dimmed">
                                                    소요 시간: {q.time_taken.toFixed(2)}초
                                                  </Text>
                                                </Stack>
                                              </Card>
                                            </Stack>
                                          </Accordion.Panel>
                                        </Accordion.Item>
                                      );
                                    })}
                                  </Accordion>

                                  <Group justify="space-between" mt="md">
                                    <Text size="sm" fw={600}>
                                      총 {result.summary.correct_answers}개 정답 / {result.summary.total_questions}개 문제
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                      평균 응답 시간: {(result.results.reduce((sum: number, r: any) => sum + r.time_taken, 0) / result.results.length).toFixed(2)}초
                                    </Text>
                                  </Group>
                                </Stack>
                              </Card>
                            );
                          })}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  );
                })}
              </Accordion>
            ) : (
              <Text ta="center" c="dimmed">평가 결과가 없습니다.</Text>
            )}
          </Card>
        </div>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text size="sm" c="dimmed">
            📊 이 벤치마크는 대한민국 수능 문제를 활용하여 AI 모델의 언어 이해 및 추론 능력을 평가합니다.
          </Text>
          <Text size="sm" c="dimmed" mt="xs">
            💡 각 모델을 클릭하면 문제별 상세 결과와 답변 이유를 확인할 수 있습니다.
          </Text>
        </Card>
      </Stack>
    </Container>
  );
}
