/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
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
