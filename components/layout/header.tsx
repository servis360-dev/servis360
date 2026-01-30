'use client';

import { useState } from 'react';
import { Bell, Search, Menu, User, LogOut } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

// 👇 KRİTİK DÜZELTME: Header'ın 'user' verisini kabul etmesini sağlıyoruz.
interface HeaderProps {
    user?: any;
}

export function Header({ user }: HeaderProps) {
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const handleLogout = async () => {
        await signOut(auth);
        window.location.href = '/login';
    };

    return (
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 z-40 sticky top-0">
            {/* SOL TARAF - MOBİL MENÜ VE ARAMA */}
            <div className="flex items-center gap-4">
                <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <Menu className="w-6 h-6" />
                </button>

                {/* Arama Çubuğu */}
                <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2 w-64 md:w-96 transition-all focus-within:w-full focus-within:max-w-md focus-within:ring-2 focus-within:ring-blue-500/20">
                    <Search className="w-4 h-4 text-slate-400 mr-2" />
                    <input
                        type="text"
                        placeholder="Müşteri, iş emri veya stok ara..."
                        className="bg-transparent border-none outline-none text-sm w-full text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                    />
                </div>
            </div>

            {/* SAĞ TARAF - PROFİL VE BİLDİRİM */}
            <div className="flex items-center gap-3 md:gap-6">

                {/* Bildirimler */}
                <button className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                </button>

                {/* Profil Alanı */}
                <div className="relative">
                    <button
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 py-1.5 px-2 rounded-lg transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-bold text-slate-700 dark:text-white leading-none">
                                {user?.fullName || 'Kullanıcı'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-medium uppercase mt-1">
                                {user?.companyName || user?.role || 'Misafir'}
                            </p>
                        </div>
                        <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-blue-400 text-white rounded-lg flex items-center justify-center font-bold shadow-lg shadow-blue-500/20">
                            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                        </div>
                    </button>

                    {/* Profil Dropdown Menü */}
                    {showProfileMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowProfileMenu(false)}
                            ></div>
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200 z-50">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 md:hidden">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.fullName}</p>
                                    <p className="text-xs text-slate-500">{user?.role}</p>
                                </div>

                                <div className="px-2 py-2">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2 rounded-lg transition-colors font-medium"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Çıkış Yap
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}