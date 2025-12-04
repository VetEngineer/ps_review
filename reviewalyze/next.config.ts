import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: '**',
      },
    ],
  },
  webpack: (config) => {
    // Ensure @/* aliases resolve to src/* even in monorepo/CI builds
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src'),
    };
    // Ensure extensions are resolved
    config.resolve.extensions = config.resolve.extensions || [];
    if (!config.resolve.extensions.includes('.ts')) {
      config.resolve.extensions.push('.ts', '.tsx', '.js', '.jsx');
    }
    return config;
  },
};

export default nextConfig;
