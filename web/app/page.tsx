import data from '@/public/data/benchmark-v2.json';
import { BenchmarkDashboard } from '@/components/BenchmarkDashboard';
import type { BenchmarkData } from '@/components/benchmark-types';

export default function Home() {
  return <BenchmarkDashboard data={data as BenchmarkData} />;
}
