/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone only for Docker/Railway; Vercel uses its own output
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' } : {}),
  async rewrites() {
    // Local/dev proxy. On Vercel, browser uses NEXT_PUBLIC_API_URL directly.
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [];
    }
    const api = process.env.API_URL || 'http://127.0.0.1:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${api}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${api}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
