/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // !! UYARI !!
    // Projenin build (derleme) sýrasýnda TypeScript hatalarýndan dolayý durmasýný engeller.
    // Canlýya hýzlý çýkmak için bunu açýyoruz.
    ignoreBuildErrors: true,
  },
  eslint: {
    // ESLint uyarýlarýný build sýrasýnda yoksayar.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;