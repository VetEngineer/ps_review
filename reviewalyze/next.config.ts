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
    
    // Ensure resolve object exists
    if (!config.resolve) {
      config.resolve = {};
    }
    
    // Set up alias - ensure @ points to src directory
    const existingAlias = config.resolve.alias || {};
    config.resolve.alias = {
      ...existingAlias,
      '@': srcPath,
    };
    
    // Ensure proper module resolution order
    if (!Array.isArray(config.resolve.modules)) {
      config.resolve.modules = ['node_modules'];
    }
    // Add src to module resolution if not already present
    if (!config.resolve.modules.includes(srcPath)) {
      config.resolve.modules = [srcPath, ...config.resolve.modules];
    }
    
    // Ensure extensions are resolved
    if (!Array.isArray(config.resolve.extensions)) {
      config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
    }
    
    return config;
  },
};

export default nextConfig;
