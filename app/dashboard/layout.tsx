'use client';

import { useState } from 'react';
import { Sidebar } from '../../components/layout/sidebar';
import { Header } from '../../components/layout/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* MOBİL İÇİN KARARTMA KATMANI (Overlay) */}
            {isSidebarOpen && (
                <div
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden transition-opacity"
                />
            )}

            {/* Yan Menü (Sidebar) - Props gönderiyoruz */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Ana İçerik Alanı */}
            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 lg:pl-64">
                {/* Üst Bar - Menü açma fonksiyonunu gönderiyoruz */}
                <Header onMenuClick={() => setIsSidebarOpen(true)} />

                {/* Değişen Sayfa İçeriği */}
                <div className="flex-1 p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}