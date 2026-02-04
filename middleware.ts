import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
    // 1. Kullanýcýnýn ülkesini Vercel'den alýyoruz
    const country = request.geo?.country || 'US'; // Bulamazsa varsayýlan US

    // 2. Gidilmek istenen yolu al (örn: /dashboard)
    const pathname = request.nextUrl.pathname;

    // Eðer statik dosyalara (resim, icon, api) gidiyorsa karýþma
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.') // dosya uzantýsý varsa (logo.png gibi)
    ) {
        return NextResponse.next();
    }

    // 3. Mevcut dili URL'den kontrol et (zaten /tr, /en, /de var mý?)
    const pathnameIsMissingLocale =
        !pathname.startsWith('/tr') &&
        !pathname.startsWith('/en') &&
        !pathname.startsWith('/de');

    // 4. Eðer dil yoksa, ülkeye göre ekle ve yönlendir
    if (pathnameIsMissingLocale) {
        let locale = 'en'; // Varsayýlan (Global)

        if (country === 'TR') {
            locale = 'tr';
        } else if (country === 'DE') {
            locale = 'de';
        }

        // Kullanýcýyý doðru dile yönlendir (örn: servis360.com -> servis360.com/tr/dashboard)
        return NextResponse.redirect(
            new URL(`/${locale}${pathname === '/' ? '' : pathname}`, request.url)
        );
    }

    return NextResponse.next();
}

export const config = {
    // Middleware'in çalýþacaðý yollar
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};