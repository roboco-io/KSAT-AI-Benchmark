import data from '@/public/data/benchmark-comparison.json';
import year2025Data from '@/public/data/benchmark-comparison-2025.json';
import year2027Data from '@/public/data/benchmark-comparison-2027.json';
import year2027Period4Data from '@/public/data/benchmark-comparison-2027-period4.json';
import { AcademicYearDashboard } from '@/components/AcademicYearDashboard';
import type { BenchmarkComparison } from '@/components/benchmark-types';

export default function Home() {
  return <AcademicYearDashboard data={data as BenchmarkComparison} year2025Data={year2025Data as BenchmarkComparison} year2027Data={year2027Data as BenchmarkComparison} year2027Period4Data={year2027Period4Data as BenchmarkComparison} />;
}
