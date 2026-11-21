/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'avatar.iran.liara.run' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
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
