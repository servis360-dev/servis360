/** @type {import('next').NextConfig} */
const nextConfig = {
    // Bu ayar Webpack'e "undici kütüphanesini paketleme, olduðu gibi sunucuda býrak" der.
    experimental: {
        serverComponentsExternalPackages: ["undici", "firebase-admin"],
    },
    // Firebase kullanýrken oluþabilecek diðer hatalarý önler
    webpack: (config) => {
        config.resolve.alias.undici = false;
        return config;
    },
};

export default nextConfig;