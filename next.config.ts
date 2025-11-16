import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    // This allows the development server to accept requests from the
    // Cloud Workstation's forwarded port.
    allowedDevOrigins: [
        'https://6000-firebase-studio-1762641485790.cluster-czg6tuqjtffiaszlkqfihyc3dq.cloudworkstations.dev'
    ],
  },
};

export default nextConfig;
