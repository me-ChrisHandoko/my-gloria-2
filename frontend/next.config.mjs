import crypto from 'crypto';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize images
  images: {
    domains: ['images.clerk.dev', 'img.clerk.com'],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Experimental features for optimization
  experimental: {
    // Optimize CSS loading
    optimizeCss: true,

    // Optimize package imports for smaller bundles
    optimizePackageImports: [
      '@radix-ui/react-*',
      'lucide-react',
      'recharts',
      '@tanstack/react-table',
      '@tanstack/react-query',
      'react-hook-form',
      '@clerk/nextjs',
      'date-fns'
    ],

    // Enable server components optimization
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Module federation for micro-frontends (if needed in future)
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
    'lodash': {
      transform: 'lodash/{{member}}',
    },
    'date-fns': {
      transform: 'date-fns/{{member}}',
    },
  },

  // Webpack configuration for advanced optimizations
  webpack: (config, { dev, isServer, webpack }) => {
    // Suppress Sentry/OpenTelemetry warnings
    config.ignoreWarnings = [
      {
        module: /@opentelemetry\/instrumentation/,
        message: /Critical dependency/,
      },
      {
        module: /@sentry/,
        message: /Critical dependency/,
      },
    ];
    // Production optimizations
    if (!dev && !isServer) {
      // Enable module concatenation for smaller bundles
      config.optimization.concatenateModules = true;

      // Split chunks configuration for optimal loading
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Framework chunk
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-sync-external-store)[\\/]/,
            priority: 40,
            enforce: true,
          },
          // Library chunk
          lib: {
            test(module) {
              return module.size() > 160000 &&
                /node_modules[\\/]/.test(module.identifier());
            },
            name(module) {
              const hash = crypto
                .createHash('sha1')
                .update(module.identifier())
                .digest('hex');
              return `lib-${hash.substring(0, 8)}`;
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          // Commons chunk
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
          // Shared chunk for components used across pages
          shared: {
            name(module, chunks) {
              return `shared-${chunks
                .map(chunk => chunk.name)
                .join('-')
                .substring(0, 20)}`;
            },
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
          },
        },
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
      };

      // Add webpack plugins
      config.plugins.push(
        new webpack.optimize.MinChunkSizePlugin({
          minChunkSize: 10000, // Minimum chunk size of 10kb
        })
      );

      // Configure module ids for better long-term caching
      config.optimization.moduleIds = 'deterministic';
    }

    // Fallback for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }

    // Bundle analyzer (run with ANALYZE=true npm run build)
    if (process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
          openAnalyzer: true,
        })
      );
    }

    return config;
  },

  // Headers for security and caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Cache static assets
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache images
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache fonts
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects and rewrites for better UX
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },

  // Enable standalone output for containerization
  output: 'standalone',

  // Compiler options
  compiler: {
    // Remove console logs in production
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // PoweredByHeader
  poweredByHeader: false,

  // Generate ETags for better caching
  generateEtags: true,

  // Compress responses
  compress: true,

  // Production source maps (hidden by default for security)
  productionBrowserSourceMaps: false,

  // Environment variables to be exposed to the browser
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version || '1.0.0',
  },
};

export default nextConfig;