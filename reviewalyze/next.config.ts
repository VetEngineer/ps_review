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
  webpack: (config, { dir, isServer }) => {
    // Resolve @ alias to src directory
    // Use dir parameter which is the project root directory
    const projectRoot = dir || __dirname;
    const srcPath = path.resolve(projectRoot, 'src');
    
    // Ensure resolve object exists
    config.resolve = config.resolve || {};
    
    // Set up alias - ensure @ points to src directory
    // Override any existing alias to ensure correct resolution
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': srcPath,
    };
    
    // Debug logging for Vercel builds
    if (process.env.VERCEL) {
      console.log('[Webpack] Project root:', projectRoot);
      console.log('[Webpack] Source path:', srcPath);
      console.log('[Webpack] Utils file exists:', require('fs').existsSync(path.join(srcPath, 'lib', 'utils.ts')));
    }
    
    return config;
  },
};

export default nextConfig;
