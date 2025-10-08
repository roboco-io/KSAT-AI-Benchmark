import { Suspense } from 'react';
import { Container, Text } from '@mantine/core';
import { LeaderboardContent } from '@/components/LeaderboardContent';

export default function Home() {
  return (
    <Suspense fallback={
      <Container size="xl" py="xl">
        <Text>로딩 중...</Text>
      </Container>
    }>
      <LeaderboardContent />
    </Suspense>
  );
}
