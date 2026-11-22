import { Suspense } from 'react';
import { LeaderboardContent } from '@/components/LeaderboardContent';

export default function Archive() {
  return <Suspense fallback={<p>기존 평가 결과를 불러오는 중입니다.</p>}><LeaderboardContent /></Suspense>;
}
