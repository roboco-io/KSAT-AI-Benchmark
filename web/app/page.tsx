'use client';

import { Container, Title, Text, Stack, Group, Badge, Card, SimpleGrid, Accordion, Table } from '@mantine/core';
import { useState, useEffect } from 'react';

export default function Home() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
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
        setStats(data.stats);
        
        // 시험 정보 추출
        const examMap = new Map();
        data.results?.forEach((result: any) => {
          if (!examMap.has(result.exam_id)) {
            examMap.set(result.exam_id, {
              exam_id: result.exam_id,
              exam_title: result.exam_title,
              subject: result.subject,
            });
          }
        });
        setExams(Array.from(examMap.values()));
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
                          {modelResults.map((result) => (
                            <Card key={result.exam_id} withBorder>
                              <Stack gap="md">
                                <div>
                                  <Text fw={600} size="lg">{result.exam_title}</Text>
                                  <Text size="sm" c="dimmed">
                                    정답률: {result.summary.accuracy.toFixed(1)}% · 
                                    점수: {result.summary.total_score}/{result.summary.max_score}점
                                  </Text>
                                </div>

                                <Table striped>
                                  <Table.Thead>
                                    <Table.Tr>
                                      <Table.Th style={{ width: '60px' }}>문제</Table.Th>
                                      <Table.Th style={{ width: '80px' }}>결과</Table.Th>
                                      <Table.Th style={{ width: '80px' }}>답변</Table.Th>
                                      <Table.Th>선택 이유</Table.Th>
                                      <Table.Th style={{ width: '80px' }}>시간</Table.Th>
                                    </Table.Tr>
                                  </Table.Thead>
                                  <Table.Tbody>
                                    {result.results.map((q: any) => (
                                      <Table.Tr key={q.question_id}>
                                        <Table.Td>
                                          <Text fw={600}>{q.question_number}번</Text>
                                          <Text size="xs" c="dimmed">{q.points}점</Text>
                                        </Table.Td>
                                        <Table.Td>
                                          <Badge color={q.is_correct ? 'green' : 'red'} size="sm">
                                            {q.is_correct ? '정답' : '오답'}
                                          </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                          <div>
                                            <Text size="sm" fw={600}>
                                              {q.answer}번 {q.is_correct ? '✓' : '✗'}
                                            </Text>
                                            {!q.is_correct && (
                                              <Text size="xs" c="dimmed">
                                                (정답: {q.correct_answer}번)
                                              </Text>
                                            )}
                                          </div>
                                        </Table.Td>
                                        <Table.Td>
                                          <Text size="sm" lineClamp={2} style={{ maxWidth: '400px' }}>
                                            {q.reasoning || '풀이 정보 없음'}
                                          </Text>
                                        </Table.Td>
                                        <Table.Td>
                                          <Text size="xs" c="dimmed">
                                            {q.time_taken.toFixed(2)}초
                                          </Text>
                                        </Table.Td>
                                      </Table.Tr>
                                    ))}
                                  </Table.Tbody>
                                </Table>

                                <Group justify="space-between">
                                  <Text size="sm" fw={600}>
                                    총 {result.summary.correct_answers}개 정답 / {result.summary.total_questions}개 문제
                                  </Text>
                                  <Text size="sm" c="dimmed">
                                    평균 응답 시간: {(result.results.reduce((sum: number, r: any) => sum + r.time_taken, 0) / result.results.length).toFixed(2)}초
                                  </Text>
                                </Group>
                              </Stack>
                            </Card>
                          ))}
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
