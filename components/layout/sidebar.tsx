'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Users, Wrench, Settings, CreditCard, LogOut, Box, FileText,
    ShieldAlert, UserCircle, Store, Megaphone, X // X ikonu eklendi (Kapatmak için)
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

interface SidebarProps {
    userRole?: string;
    isOpen?: boolean;        // 👈 YENİ: Mobilde açık mı?
    onClose?: () => void;    // 👈 YENİ: Kapatma fonksiyonu
}

export function Sidebar({ userRole = 'user', isOpen = false, onClose }: SidebarProps) {
    const pathname = usePathname();

    const handleLogout = async () => {
        await signOut(auth);
        window.location.href = '/login';
    };

    // --- MENÜLER (Aynen kaldı) ---
    const commonMenus = [
        { name: 'Genel Bakış', href: '/dashboard', icon: LayoutDashboard },
        { name: 'İş Emirleri', href: '/dashboard/jobs', icon: Wrench },
        { name: 'Randevular', href: '/dashboard/appointments', icon: FileText },
    ];

    let roleMenus: any[] = [];
    if (userRole === 'admin') {
        roleMenus = [
            { name: 'Müşteriler', href: '/dashboard/customers', icon: Users },
            { name: 'Finans / Kasa', href: '/dashboard/finance', icon: CreditCard },
            { name: 'Stok Yönetimi', href: '/dashboard/stock', icon: Box },
            { name: 'Personel', href: '/dashboard/staff', icon: UserCircle },
            { name: 'ADMIN PANELİ', href: '/dashboard/admin', icon: ShieldAlert, special: true },
        ];
    } else if (userRole === 'technical' || userRole === 'sales') {
        roleMenus = [
            { name: 'Müşteriler', href: '/dashboard/customers', icon: Users },
            { name: 'Stok Listesi', href: '/dashboard/stock', icon: Box },
        ];
    } else {
        roleMenus = [
            { name: 'Müşterilerim', href: '/dashboard/customers', icon: Users },
            { name: 'Finans', href: '/dashboard/finance', icon: CreditCard },
            { name: 'Personel Yönetimi', href: '/dashboard/staff', icon: Users },
            { name: 'Stok', href: '/dashboard/stock', icon: Box },
        ];
    }

    const bottomMenus = [
        { name: 'Abonelik', href: '/dashboard/subscription', icon: Store },
        { name: 'Destek', href: '/dashboard/support', icon: Megaphone },
        { name: 'Ayarlar', href: '/dashboard/settings', icon: Settings },
    ];

    const allMenus = [...commonMenus, ...roleMenus];

    return (
        <>
            {/* MOBİL BACKDROP (SİYAH PERDE) */}
            {/* isOpen true ise göster, tıklayınca kapat */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* SIDEBAR */}
            {/* Masaüstünde (md) hep translate-0 (görünür), mobilde ise isOpen'a bağlı */}
            <aside className={`
                fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 border-r border-slate-800 text-slate-300 
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* LOGO ALANI */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
                    <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 font-bold text-white">S</div>
                        <span className="font-bold text-lg text-white tracking-tight">Servis360</span>
                    </div>
                    {/* Mobilde Kapatma Butonu */}
                    <button onClick={onClose} className="md:hidden text-slate-500 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* MENÜ LİSTESİ */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                    <p className="px-3 text-[10px] font-bold text-slate-500 uppercase mb-2">MENÜ</p>
                    {allMenus.map((item, index) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={index}
                                href={item.href}
                                onClick={onClose} // Mobilde tıklayınca menüyü kapat
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 
                                ${isActive
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                                        : item.special
                                            ? 'text-red-400 hover:bg-red-900/20 hover:text-red-300'
                                            : 'hover:bg-slate-800 hover:text-white'}`}
                            >
                                <item.icon className={`w-4 h-4 ${isActive ? 'text-white' : item.special ? 'text-red-500' : 'text-slate-400'}`} />
                                {item.name}
                            </Link>
                        );
                    })}

                    <div className="my-4 border-t border-slate-800 mx-2"></div>

                    <p className="px-3 text-[10px] font-bold text-slate-500 uppercase mb-2">HESAP</p>
                    {bottomMenus.map((item, index) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={`bottom-${index}`}
                                href={item.href}
                                onClick={onClose}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'}`}
                            >
                                <item.icon className="w-4 h-4 text-slate-400" />
                                {item.name}
                            </Link>
                        );
                    })}
                </div>

                {/* ÇIKIŞ YAP */}
                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-lg transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Çıkış Yap
                    </button>
                </div>
            </aside>
        </>
    );
}