import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script"; // 🔥 YENİ EKLENDİ
import "../globals.css";

const inter = Inter({ subsets: ["latin"] });

// 🔥 DİNAMİK METADATA (SEO ve Sosyal Medya Paylaşımleri İçin)
export async function generateMetadata({ params }: { params: { locale: string } }): Promise<Metadata> {
    const locale = params.locale;

    // 1. Dile Göre Görsel Seçimi (public klasörüne attığın dosyalar)
    let ogImage = '/og-en.png'; // Varsayılan (Global)
    if (locale === 'tr') ogImage = '/og-tr.png';
    if (locale === 'de') ogImage = '/og-de.png';

    // 2. Dile Göre Başlık ve Açıklama
    let title = 'Servis360 Pro Suite';
    let description = 'Professional Technical Service Management Software.';

    if (locale === 'tr') {
        title = 'Servis360 | Profesyonel Teknik Servis Yönetimi';
        description = 'Teknik servis, stok, cari ve randevu yönetimini tek platformda birleştirin. İşletmenizi dijitalleştirin.';
    } else if (locale === 'de') {
        title = 'Servis360 | Technisches Servicemanagement';
        description = 'Professionelle Software für technisches Servicemanagement. Verwalten Sie Ihren Service, Bestand und Termine in der Cloud.';
    }

    return {
        title: {
            default: title,
            template: '%s | Servis360',
        },
        description: description,
        metadataBase: new URL('https://www.servis-360.com'),
        icons: {
            icon: '/icon.png',
            shortcut: '/icon.png',
            apple: '/apple-icon.png',
        },
        openGraph: {
            title: title,
            description: description,
            url: `https://www.servis-360.com/${locale}`,
            siteName: 'Servis360',
            locale: locale,
            type: 'website',
            images: [
                {
                    url: ogImage,
                    width: 1200,
                    height: 630,
                    alt: 'Servis360 Dashboard',
                },
            ],
        },
    };
}

export default function RootLayout({
    children,
    params: { locale }
}: Readonly<{
    children: React.ReactNode;
    params: { locale: string };
}>) {
    // 🔥 GOOGLE İÇİN YAPISAL VERİ (SCHEMA MARKUP)
    // Bu kod, Google'ın siteni "Uygulama" ve "Şirket" olarak tanımasını sağlar.
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Servis360",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, Cloud",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "TRY"
        },
        "description": "Teknik servis, stok takip ve cari yönetim paneli.",
        "url": "https://www.servis-360.com",
        "publisher": {
            "@type": "Organization",
            "name": "Servis360",
            "logo": "https://www.servis-360.com/icon.png"
        }
    };

    return (
        <html lang={locale}>
            <body className={`${inter.className} bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white`}>
                {/* 🔥 Google'a fısıldayan gizli kimlik kartı */}
                <Script
                    id="json-ld"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
                {children}
            </body>
        </html>
    );
}