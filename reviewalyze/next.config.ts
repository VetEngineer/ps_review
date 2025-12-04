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
    // Use __dirname for reliable path resolution in Vercel builds
    const srcPath = path.resolve(__dirname, 'src');
    
    // Initialize resolve if it doesn't exist
    config.resolve = config.resolve || {};
    
    // Set up alias - this is critical for @/ imports
    // Override any existing alias to ensure @ points to src
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': srcPath,
    };
    
    return config;
  },
};

export default nextConfig;
