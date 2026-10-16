import data from '@/public/data/benchmark-comparison.json';
import { AcademicYearDashboard } from '@/components/AcademicYearDashboard';
import type { BenchmarkComparison } from '@/components/benchmark-types';

export default function Home() {
  return <AcademicYearDashboard data={data as BenchmarkComparison} />;
}
