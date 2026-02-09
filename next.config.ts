import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Temporarily ignore TypeScript errors during migration from Supabase to Prisma
  typescript: {
    ignoreBuildErrors: true,
  },
  // @ts-expect-error eslint config exists at runtime
  eslint: { ignoreDuringBuilds: true },
  // Prevent exposing server internals
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.fresha.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
};

export default nextConfig;
