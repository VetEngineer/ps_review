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
    
    // Ensure extensions are resolved in correct order
    // This is critical for resolving @/lib/utils to src/lib/utils.ts
    config.resolve.extensions = [
      '.tsx',
      '.ts',
      '.jsx',
      '.js',
      '.json',
      ...(config.resolve.extensions || []).filter((ext: string) => 
        !['.tsx', '.ts', '.jsx', '.js', '.json'].includes(ext)
      ),
    ];
    
    // Debug logging for Vercel builds
    if (process.env.VERCEL) {
      const fs = require('fs');
      console.log('[Webpack] Project root:', projectRoot);
      console.log('[Webpack] Source path:', srcPath);
      console.log('[Webpack] Source dir exists:', fs.existsSync(srcPath));
      console.log('[Webpack] Lib dir exists:', fs.existsSync(path.join(srcPath, 'lib')));
      console.log('[Webpack] Lib dir contents:', fs.existsSync(path.join(srcPath, 'lib')) ? fs.readdirSync(path.join(srcPath, 'lib')) : 'N/A');
      console.log('[Webpack] Utils file exists:', fs.existsSync(path.join(srcPath, 'lib', 'utils.ts')));
      console.log('[Webpack] Utils file (no ext) exists:', fs.existsSync(path.join(srcPath, 'lib', 'utils')));
      console.log('[Webpack] Extensions:', config.resolve.extensions);
    }
    
    return config;
  },
};

export default nextConfig;
