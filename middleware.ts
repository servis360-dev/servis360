import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // 1. Kullanıcının ülkesini Vercel'den alıyoruz
    const country = request.geo?.country || 'US'; // Bulamazsa varsayılan US

    // 2. Gidilmek istenen yolu al (örn: /dashboard)
    const pathname = request.nextUrl.pathname;

    // Eğer statik dosyalara (resim, icon, api) gidiyorsa karışma
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') // dosya uzantısı varsa (logo.png gibi)
    ) {
        return NextResponse.next();
    }

    // 3. Mevcut dili URL'den kontrol et (zaten /tr, /en, /de var mı?)
    const pathnameIsMissingLocale =
        !pathname.startsWith('/tr') &&
        !pathname.startsWith('/en') &&
        !pathname.startsWith('/de');

    // 4. Eğer dil yoksa, ülkeye göre ekle ve yönlendir
    if (pathnameIsMissingLocale) {
        let locale = 'en'; // Varsayılan (Global)

        if (country === 'TR') {
            locale = 'tr';
        } else if (country === 'DE') {
            locale = 'de';
        }

        // Kullanıcıyı doğru dile yönlendir (örn: servis360.com -> servis360.com/tr/dashboard)
        return NextResponse.redirect(
            new URL(`/${locale}${pathname === '/' ? '' : pathname}`, request.url)
        );
    }

    return NextResponse.next();
}

export const config = {
    // Middleware'in çalışacağı yollar
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|electrick|elektrikci).*)'],
};