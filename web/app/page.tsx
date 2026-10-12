import data from '@/public/data/benchmark-comparison.json';
import { ComparisonDashboard } from '@/components/ComparisonDashboard';
import type { BenchmarkComparison } from '@/components/benchmark-types';

export default function Home() {
  return <ComparisonDashboard data={data as BenchmarkComparison} />;
}
