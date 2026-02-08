import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/dashboard/settings', '/dashboard/admin'], // Özel alanları Google'a kapatıyoruz
        },
        sitemap: 'https://www.servis-360.com/sitemap.xml',
    };
}