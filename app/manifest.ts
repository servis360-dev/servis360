import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Servis360 Pro Suite',
        short_name: 'Servis360',
        description: 'Teknik Servis Yönetim Paneli',
        start_url: '/',
        display: 'standalone',
        background_color: '#0f172a', // Koyu mod rengin
        theme_color: '#2563eb', // Mavi tonun
        icons: [
            {
                src: '/icon.png', // app/icon.png dosyanı otomatik kullanır
                sizes: 'any',
                type: 'image/png',
            },
        ],
    };
}