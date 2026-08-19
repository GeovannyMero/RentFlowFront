/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    serverActions: true, // 👈 Añade esta línea
  },
};

module.exports = nextConfig;
