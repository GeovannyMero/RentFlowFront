/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    serverActions: true, // 👈 Añade esta línea
    instantInsights: {
      validationLevel: 'manual-warning', // Solo valida rutas con "export const instant = true"
    },
  },
};

module.exports = nextConfig;
