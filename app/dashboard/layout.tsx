import { Sidebar } from '../../components/layout/sidebar';
import { Header } from '../../components/layout/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Sol Menü (Sabit Genişlik) */}
            <div className="hidden lg:block w-64 shrink-0">
                <Sidebar />
            </div>

            {/* Ana İçerik Alanı */}
            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                {/* Üst Bar */}
                <Header />

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