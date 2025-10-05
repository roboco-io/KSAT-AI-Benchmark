import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark/' : '',
};

export default nextConfig;
