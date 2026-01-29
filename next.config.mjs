/** @type {import('next').NextConfig} */
const nextConfig = {
    typescript: {
        // TypeScript hatalarý build'i durdurmasýn
        ignoreBuildErrors: true,
    },
    eslint: {
        // ESLint hatalarý build'i durdurmasýn
        ignoreDuringBuilds: true,
    }
};

export default nextConfig;