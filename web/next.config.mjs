/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 是原生模块,Next.js 不要去 bundle 它
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;
