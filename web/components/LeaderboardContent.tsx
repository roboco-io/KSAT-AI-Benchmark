'use client';

import { Container, Title, Text, Stack, Group, Badge, Card, SimpleGrid, Accordion, Table, ScrollArea, Box, Anchor, Tabs } from '@mantine/core';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MathContent } from '@/components/MathContent';

export function LeaderboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [leaderboardBySubject, setLeaderboardBySubject] = useState<any>({});
  const [results, setResults] = useState<any[]>([]);
  const [examsData, setExamsData] = useState<any>({});
  const [stats, setStats] = useState({ totalExams: 0, totalEvaluations: 0 });
  const [loading, setLoading] = useState(true);

  // URL 쿼리 파라미터 상태 관리
  const [activeTab, setActiveTab] = useState<string>('overall');
  const [activeYear, setActiveYear] = useState<string>('2025');
  const [openModel, setOpenModel] = useState<string | null>(null);
  const [openQuestion, setOpenQuestion] = useState<string | null>(null);

  // 데이터 로드
  useEffect(() => {
    async function loadData() {
      try {
        const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
        const response = await fetch(`${basePath}/data/evaluation-data.json`);
        const data = await response.json();
        setLeaderboard(data.leaderboard);
        setLeaderboardBySubject(data.leaderboardBySubject || {});
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

  // URL 쿼리 파라미터 처리
  useEffect(() => {
    if (!loading && results.length > 0) {
      const subject = searchParams.get('subject');
      const model = searchParams.get('model');
      const questionParam = searchParams.get('question');

      // subject 파라미터가 있으면 해당 탭으로 이동
      if (subject && ['overall', 'korean', 'math', 'english'].includes(subject)) {
        setActiveTab(subject);
      }

      // model 파라미터가 있으면 해당 모델 아코디언 열기
      if (model) {
        setOpenModel(model);
      }

      // question 파라미터가 있으면 해당 문제 아코디언 열기
      // question은 question_number이므로 question_id로 변환 필요
      if (questionParam && model) {
        const modelResult = results.find(r => r.model_name === model);
        if (modelResult) {
          const questionNum = parseInt(questionParam);
          const questionData = modelResult.results?.find((q: any) => q.question_number === questionNum);
          if (questionData) {
            setOpenQuestion(questionData.question_id);
          }
        }
      }
    }
  }, [loading, searchParams, results]);

  // URL 업데이트 함수
  const updateURL = (params: { subject?: string; model?: string; question?: string }) => {
    const newParams = new URLSearchParams();

    if (params.subject) newParams.set('subject', params.subject);
    if (params.model) newParams.set('model', params.model);
    if (params.question) newParams.set('question', params.question);

    const queryString = newParams.toString();
    const newURL = queryString ? `?${queryString}` : '/';

    router.push(newURL, { scroll: false });
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Text>로딩 중...</Text>
      </Container>
    );
  }

  const { totalExams, totalEvaluations } = stats;

  // 시험 목록 추출
  const examsList = Object.values(examsData).map((exam: any) => ({
    id: exam.exam_id,
    title: exam.title,
    subject: exam.subject,
    year: exam.year,
  }));

  // 모델 웹사이트 매핑
  const modelWebsites: Record<string, string> = {
    'gpt-5': 'https://openai.com/ko-KR/index/introducing-gpt-5/',
    'gpt-4o': 'https://openai.com/ko-KR/index/gpt-4o/',
    'claude-opus-4-1': 'https://www.anthropic.com/products/claude-opus',
    'claude-sonnet-4-5': 'https://www.anthropic.com/products/claude-sonnet',
    'solar-pro': 'https://upstage.ai/kr/solar/',
    'sonar-pro': 'https://www.perplexity.ai/enterprise/sonar',
  };

  // 모델 목록 추출
  const modelsList = leaderboard.map((entry) => ({
    name: entry.model_name,
    website: modelWebsites[entry.model_name] || '#',
    accuracy: entry.accuracy,
    examsCount: entry.exams_count,
    avgTime: entry.avg_time,
  }));

  // 과목별 리더보드 렌더링 함수
  const renderSubjectLeaderboard = (subject: string, subjectName: string) => {
    const subjectBoard = leaderboardBySubject[subject] || [];
    const subjectResults = results.filter(r => r.subject === subject);

    if (subjectBoard.length === 0) {
      return <Text ta="center" c="dimmed">{subjectName} 평가 결과가 없습니다.</Text>;
    }

    return (
      <Accordion
        variant="contained"
        value={activeTab === subject && openModel ? openModel : null}
        onChange={(value) => {
          setOpenModel(value);
          setOpenQuestion(null);
          if (value) {
            updateURL({ subject, model: value });
          } else {
            updateURL({ subject });
          }
        }}
      >
        {subjectBoard.map((entry: any, index: number) => {
          const modelResults = subjectResults.filter(r => r.model_name === entry.model_name);
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
                        정답률 {entry.accuracy.toFixed(1)}% · {entry.exams_count}개 시험 · 평균 {entry.avg_time?.toFixed(2)}초
                      </Text>
                      {(entry.skipped_count > 0 || entry.parsing_failed_count > 0) && (
                        <Text size="xs" c="orange">
                          스킵 {entry.skipped_count}개 · 파싱실패 {entry.parsing_failed_count}개
                        </Text>
                      )}
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
                              점수: {result.summary.total_score}/{result.summary.max_score}점 ·
                              평균 {(result.results.reduce((sum: number, q: any) => sum + q.time_taken, 0) / result.results.length).toFixed(2)}초
                            </Text>
                          </div>

                          <Accordion
                            variant="separated"
                            value={openQuestion}
                            onChange={(value) => {
                              setOpenQuestion(value);
                              if (value) {
                                const questionNum = result.results.find((q: any) => q.question_id === value)?.question_number;
                                updateURL({ subject, model: entry.model_name, question: questionNum?.toString() });
                              } else {
                                updateURL({ subject, model: entry.model_name });
                              }
                            }}
                          >
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
                                      <div style={{ textAlign: 'right' }}>
                                        <Badge color={q.is_correct ? 'green' : 'red'} size="md">
                                          {q.earned_points}/{q.points}점
                                        </Badge>
                                      </div>
                                    </Group>
                                  </Accordion.Control>

                                  <Accordion.Panel>
                                    <Stack gap="md">
                                      {/* 지문 표시 */}
                                      {questionData?.passage && (
                                        <Card withBorder bg="blue.0">
                                          <Stack gap="xs">
                                            <Text fw={700} size="md" c="blue">
                                              📖 지문
                                            </Text>
                                            <Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                              {questionData.passage}
                                            </Text>
                                          </Stack>
                                        </Card>
                                      )}

                                      {/* 문제 */}
                                      {questionData && (
                                        <Card withBorder bg="gray.0">
                                          <Stack gap="sm">
                                            <Text fw={700} size="md" c="blue">
                                              📝 문제 {q.question_number}번
                                            </Text>
                                            <MathContent text={questionData.question_text} />

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
                                                      <div style={{ flex: 1 }}><MathContent text={choice} /></div>
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
                                            <MathContent text={q.reasoning || '풀이 정보 없음'} />
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
                              정답률: {result.summary.accuracy.toFixed(1)}% ({result.summary.correct_answers}개 정답)
                            </Text>
                            <Text size="sm" c="dimmed">
                              점수: {result.summary.total_score}/{result.summary.max_score}점 · 평균 {(result.results.reduce((sum: number, q: any) => sum + q.time_taken, 0) / result.results.length).toFixed(2)}초
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
    );
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* 헤더 */}
        <div>
          <Title order={1}>KSAT AI Benchmark</Title>
          <Text size="lg" c="dimmed">대한민국 수능 기반 AI 모델 평가 플랫폼</Text>
        </div>

        {/* 공지사항 - 상단으로 이동 */}
        <Card shadow="sm" padding="lg" radius="md" withBorder bg="yellow.0">
          <Stack gap="sm">
            <Text size="lg" fw={700} c="orange">
              ⚠️ 벤치마크 개발 중 - 중요 안내
            </Text>

            <div>
              <Text size="sm" fw={600} c="blue" mb="xs">
                📅 2026학년도 수능 예정
              </Text>
              <Text size="sm" c="dimmed">
                • 2026학년도 대학수학능력시험은 <strong>2025년 11월 13일(목)</strong>에 시행됩니다
              </Text>
              <Text size="sm" c="dimmed">
                • 시험 후 빠른 시일 내에 벤치마크 결과가 업데이트될 예정입니다
              </Text>
            </div>

            <div>
              <Text size="sm" fw={600} c="dark" mb="xs">
                📊 현재 개발 및 테스트 단계입니다
              </Text>
              <Text size="sm" c="dimmed">
                • 정답률/점수보다는 <strong>각 모델의 추론 과정(풀이)</strong>을 중점적으로 참고해 주세요
              </Text>
              <Text size="sm" c="dimmed">
                • 프롬프트 엔지니어링 및 평가 시스템이 지속적으로 개선되고 있습니다
              </Text>
              <Text size="sm" c="dimmed">
                • 결과는 참고용이며, 최종 성능을 대표하지 않을 수 있습니다
              </Text>
            </div>

            <div>
              <Text size="sm" fw={600} c="dark" mb="xs">
                🔢 답변 번호 안내
              </Text>
              <Text size="sm" c="dimmed">
                • <strong>0번 답변</strong>: 의도적 스킵 (예: 영어 듣기 평가 - 오디오 없음)
              </Text>
              <Text size="sm" c="dimmed">
                • <strong>-1번 답변</strong>: 파싱 실패 (빈 응답, JSON 오류, API 오류 등)
              </Text>
              <Text size="sm" c="dimmed">
                • <strong>1-5번 답변</strong>: 모델이 선택한 정상 답변
              </Text>
            </div>

            <div>
              <Text size="sm" fw={600} c="dark" mb="xs">
                💡 벤치마크 활용 가이드
              </Text>
              <Text size="sm" c="dimmed">
                • 각 모델을 클릭하면 문제별 상세 결과와 <strong>답변 이유(reasoning)</strong>를 확인할 수 있습니다
              </Text>
              <Text size="sm" c="dimmed">
                • 같은 문제를 여러 모델이 어떻게 다르게 푸는지 비교해보세요
              </Text>
              <Text size="sm" c="dimmed">
                • 이 벤치마크는 대한민국 수능 문제를 활용하여 AI 모델의 언어 이해 및 추론 능력을 평가합니다
              </Text>
              <Text size="sm" c="dimmed">
                • <strong>URL 공유</strong>: 특정 모델/문제를 열어둔 상태에서 URL을 복사하면 그 상태 그대로 공유할 수 있습니다
              </Text>
            </div>

            <div>
              <Text size="sm" fw={600} c="orange" mb="xs">
                ⚠️ Google Gemini 2.5 Pro 제외 사유
              </Text>
              <Text size="sm" c="dimmed">
                Google의 안전 필터가 한국어 수능 문제 콘텐츠를 유해 콘텐츠로 오인하여 대부분의 문제에서 SAFETY 응답을 반환합니다.
                BLOCK_NONE 설정에도 불구하고 정상적인 평가가 불가능하여 벤치마크에서 제외하였습니다.
              </Text>
            </div>

            <div>
              <Text size="sm" fw={600} c="blue" mb="xs">
                🚀 컨트리뷰터 모집
              </Text>
              <Text size="sm" c="dimmed">
                • 이 프로젝트는 오픈소스 프로젝트입니다. 누구나 기여할 수 있습니다!
              </Text>
              <Text size="sm" c="dimmed">
                • 새로운 모델 추가, 프롬프트 개선, 버그 수정, 문서화 등 다양한 방식으로 참여하실 수 있습니다.
              </Text>
              <Text size="sm" c="dimmed">
                • GitHub 저장소:{' '}
                <Anchor
                  href="https://github.com/roboco-io/KSAT-AI-Benchmark"
                  target="_blank"
                  rel="noopener noreferrer"
                  fw={600}
                  c="blue"
                >
                  roboco-io/KSAT-AI-Benchmark
                </Anchor>
              </Text>
            </div>
          </Stack>
        </Card>

        <div>
          <Title order={2} mb="md">리더보드</Title>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            {/* 연도별 탭 */}
            <Tabs value={activeYear} onChange={(value) => {
              if (value) {
                setActiveYear(value);
                setOpenModel(null);
                setOpenQuestion(null);
              }
            }} mb="md">
              <Tabs.List>
                <Tabs.Tab value="2025">
                  📘 2025학년도
                </Tabs.Tab>
                <Tabs.Tab value="2026" disabled>
                  📗 2026학년도 (2025.11.13 시행 예정)
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="2025" pt="md">
                {/* 과목별 탭 */}
                <Tabs value={activeTab} onChange={(value) => {
                  if (value) {
                    setActiveTab(value);
                    updateURL({ subject: value, model: undefined, question: undefined });
                    setOpenModel(null);
                    setOpenQuestion(null);
                  }
                }}>
                  <Tabs.List>
                    <Tabs.Tab value="overall">
                      📊 종합
                    </Tabs.Tab>
                    <Tabs.Tab value="korean">
                      📚 국어
                    </Tabs.Tab>
                    <Tabs.Tab value="math">
                      🔢 수학
                    </Tabs.Tab>
                    <Tabs.Tab value="english">
                      🌐 영어 (듣기 제외)
                    </Tabs.Tab>
                  </Tabs.List>

              <Tabs.Panel value="overall" pt="md">
                {leaderboard.length > 0 ? (
                  <Accordion
                    variant="contained"
                    value={activeTab === 'overall' && openModel ? openModel : null}
                    onChange={(value) => {
                      setOpenModel(value);
                      setOpenQuestion(null);
                      if (value) {
                        updateURL({ subject: 'overall', model: value });
                      } else {
                        updateURL({ subject: 'overall' });
                      }
                    }}
                  >
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
                                정답률 {entry.accuracy.toFixed(1)}% · {entry.exams_count}개 시험 · 평균 {entry.avg_time?.toFixed(2)}초
                              </Text>
                              {(entry.skipped_count > 0 || entry.parsing_failed_count > 0) && (
                                <Text size="xs" c="orange">
                                  스킵 {entry.skipped_count}개 · 파싱실패 {entry.parsing_failed_count}개
                                </Text>
                              )}
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
                                      점수: {result.summary.total_score}/{result.summary.max_score}점 ·
                                      평균 {(result.results.reduce((sum: number, q: any) => sum + q.time_taken, 0) / result.results.length).toFixed(2)}초
                                    </Text>
                                  </div>

                                  <Accordion
                                    variant="separated"
                                    value={openQuestion}
                                    onChange={(value) => {
                                      setOpenQuestion(value);
                                      if (value) {
                                        const questionNum = result.results.find((q: any) => q.question_id === value)?.question_number;
                                        updateURL({ subject: 'overall', model: entry.model_name, question: questionNum?.toString() });
                                      } else {
                                        updateURL({ subject: 'overall', model: entry.model_name });
                                      }
                                    }}
                                  >
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
                                              <div style={{ textAlign: 'right' }}>
                                                <Badge color={q.is_correct ? 'green' : 'red'} size="md">
                                                  {q.earned_points}/{q.points}점
                                                </Badge>
                                              </div>
                                            </Group>
                                          </Accordion.Control>

                                          <Accordion.Panel>
                                            <Stack gap="md">
                                              {/* 지문 표시 */}
                                              {questionData?.passage && (
                                                <Card withBorder bg="blue.0">
                                                  <Stack gap="xs">
                                                    <Text fw={700} size="md" c="blue">
                                                      📖 지문
                                                    </Text>
                                                    <Text style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                                      {questionData.passage}
                                                    </Text>
                                                  </Stack>
                                                </Card>
                                              )}

                                              {/* 문제 */}
                                              {questionData && (
                                                <Card withBorder bg="gray.0">
                                                  <Stack gap="sm">
                                                    <Text fw={700} size="md" c="blue">
                                                      📝 문제 {q.question_number}번
                                                    </Text>
                                                    <MathContent text={questionData.question_text} />

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
                                                              <div style={{ flex: 1 }}><MathContent text={choice} /></div>
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
                                                    <MathContent text={q.reasoning || '풀이 정보 없음'} />
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
                                      정답률: {result.summary.accuracy.toFixed(1)}% ({result.summary.correct_answers}개 정답)
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                      점수: {result.summary.total_score}/{result.summary.max_score}점 · 평균 {(result.results.reduce((sum: number, q: any) => sum + q.time_taken, 0) / result.results.length).toFixed(2)}초
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
              </Tabs.Panel>

              <Tabs.Panel value="korean" pt="md">
                {renderSubjectLeaderboard('korean', '국어')}
              </Tabs.Panel>

              <Tabs.Panel value="math" pt="md">
                {renderSubjectLeaderboard('math', '수학')}
              </Tabs.Panel>

              <Tabs.Panel value="english" pt="md">
                {renderSubjectLeaderboard('english', '영어')}
              </Tabs.Panel>
                </Tabs>
              </Tabs.Panel>

              <Tabs.Panel value="2026" pt="md">
                <Text ta="center" c="dimmed" py="xl">
                  2026학년도 대학수학능력시험은 2025년 11월 13일(목)에 시행될 예정입니다.
                  <br />
                  시험 후 곧 결과가 업데이트됩니다.
                </Text>
              </Tabs.Panel>
            </Tabs>
          </Card>
        </div>

        {/* 모델 정보 테이블 */}
        <div>
          <Title order={2} mb="md">평가 모델</Title>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <ScrollArea>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>모델명</Table.Th>
                    <Table.Th>평균 정답률</Table.Th>
                    <Table.Th>평균 응답 시간</Table.Th>
                    <Table.Th>평가 시험 수</Table.Th>
                    <Table.Th>웹사이트</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {modelsList.map((model) => (
                    <Table.Tr key={model.name}>
                      <Table.Td>{model.name}</Table.Td>
                      <Table.Td>{model.accuracy.toFixed(1)}%</Table.Td>
                      <Table.Td>{model.avgTime?.toFixed(2)}초</Table.Td>
                      <Table.Td>{model.examsCount}개</Table.Td>
                      <Table.Td>
                        {model.website !== '#' ? (
                          <Anchor href={model.website} target="_blank" rel="noopener noreferrer">
                            공식 사이트
                          </Anchor>
                        ) : (
                          '-'
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </div>

        {/* 시험 목록 */}
        <div>
          <Title order={2} mb="md">평가 시험 목록</Title>
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <ScrollArea>
              <Table striped>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>시험명</Table.Th>
                    <Table.Th>과목</Table.Th>
                    <Table.Th>연도</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {examsList.map((exam) => (
                    <Table.Tr key={exam.id}>
                      <Table.Td>{exam.title}</Table.Td>
                      <Table.Td>
                        <Badge variant="light">
                          {exam.subject === 'korean' && '국어'}
                          {exam.subject === 'math' && '수학'}
                          {exam.subject === 'english' && '영어'}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{exam.year}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </div>

        {/* Footer */}
        <Box ta="center" py="xl">
          <Text size="sm" c="dimmed">
            © 2025 KSAT AI Benchmark · Open Source Project
          </Text>
          <Text size="sm" c="dimmed">
            <Anchor href="https://github.com/roboco-io/KSAT-AI-Benchmark" target="_blank" rel="noopener noreferrer">
              GitHub
            </Anchor>
          </Text>
        </Box>
      </Stack>
    </Container>
  );
}
