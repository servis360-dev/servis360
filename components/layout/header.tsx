'use client';

import { useEffect, useState } from 'react';
import { Bell, Search, Menu } from 'lucide-react'; // Menu ikonu eklendi (mobil için)
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export function Header() {
    const [userData, setUserData] = useState<{ fullName: string, companyName: string, role: string } | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Kullanıcı profilini çek
                    const userRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile');
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        setUserData({
                            fullName: data.fullName || user.displayName || 'Değerli Üyemiz',
                            companyName: data.companyName || 'İşletmem',
                            role: data.role || 'user'
                        });
                    } else {
                        // Profil yoksa varsayılan
                        setUserData({
                            fullName: user.displayName || user.email?.split('@')[0] || 'Kullanıcı',
                            companyName: 'Yeni İşletme',
                            role: 'user'
                        });
                    }
                } catch (error) {
                    console.error("Profil yüklenemedi:", error);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    // İsimlerin baş harflerini al (Avatar için)
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    };

    // Günün saatine göre selamlama
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Günaydın';
        if (hour < 18) return 'Tünaydın';
        return 'İyi Akşamlar';
    };

    return (
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40 shadow-sm transition-colors duration-300">
            {/* Mobil Menü Tetikleyici (İleride sidebar kontrolü için kullanılabilir) */}
            <div className="md:hidden mr-4">
                <Menu className="w-6 h-6 text-slate-500" />
            </div>

            {/* Arama Çubuğu */}
            <div className="flex items-center gap-4 flex-1 max-w-md">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Müşteri, ürün veya iş ara..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* Sağ Taraf - Bildirim ve Profil */}
            <div className="flex items-center gap-3 md:gap-6">
                <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white dark:border-slate-900"></span>
                </button>

                <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>

                <div className="flex items-center gap-3 pl-1 cursor-pointer group">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors">
                            {userData ? `${getGreeting()}, ${userData.fullName.split(' ')[0]}` : 'Yükleniyor...'}
                        </p>
                        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide truncate max-w-[150px]">
                            {userData?.companyName}
                        </p>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/20 ring-2 ring-white dark:ring-slate-800">
                        {userData ? getInitials(userData.fullName) : '...'}
                    </div>
                </div>
            </div>
        </header>
    );
}