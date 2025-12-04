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
    // Resolve @ alias to src directory
    // This is necessary for Vercel build environment
    const srcPath = path.resolve(__dirname, 'src');
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': srcPath,
    };
    // Ensure modules are resolved correctly
    config.resolve.modules = [
      srcPath,
      ...(config.resolve.modules || []).filter((m: string) => m !== srcPath),
      'node_modules',
    ];
    return config;
  },
};

export default nextConfig;
