/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: [
    'googleapis',
    'google-auth-library',
    'mongodb',
    'cloudinary',
    'nodemailer',
    'bcryptjs',
  ],
  experimental: {
    optimizePackageImports: ['lucide-react', '@base-ui/react'],
  },
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
}

export default nextConfig
