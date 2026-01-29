import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // <--- İŞTE EKSİK OLAN SİHİRLİ SATIR BU!

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Servis360",
    description: "Profesyonel Teknik Servis Yönetimi",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="tr">
            <body className={`${inter.className} bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white`}>
                {children}
            </body>
        </html>
    );
}