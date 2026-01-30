'use client';

// ---------------------------------------------------------------------------
// ⚠️ NOT: Bu dosya projenin 'components/layout/sidebar.tsx' konumuna aittir.
// ---------------------------------------------------------------------------

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Briefcase,
    Users,
    Wallet,
    Settings,
    CalendarDays,
    LogOut,
    ShieldAlert,
    Wrench,
    FileText,
    History,
    PlusCircle,
    X,
    CreditCard, // Abonelik için ikon
    Gem // Alternatif Premium İkonu
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

interface SidebarProps {
    userRole?: string; // 'super_admin' | 'admin' | 'staff' | 'tradesman' | 'individual'
    isOpen: boolean;
    onClose: () => void;
}

// MENÜ YAPILANDIRMASI
// allowedRoles: Bu menü öğesini kimler görebilir?
const MENU_ITEMS = [
    // --- SAAS YÖNETİCİSİ (SADECE SEN) ---
    {
        title: 'SaaS Yönetimi',
        items: [
            {
                label: 'Admin Paneli',
                href: '/dashboard/admin',
                icon: ShieldAlert,
                allowedRoles: ['super_admin']
            },
        ]
    },

    // --- GENEL MODÜLLER ---
    {
        title: 'Genel',
        items: [
            {
                label: 'Genel Bakış',
                href: '/dashboard',
                icon: LayoutDashboard,
                allowedRoles: ['super_admin', 'admin', 'staff', 'tradesman', 'individual']
            },
            {
                label: 'Yeni Talep Oluştur',
                href: '/dashboard/jobs/new',
                icon: PlusCircle,
                allowedRoles: ['individual']
            },
            {
                label: 'Servis Geçmişim',
                href: '/dashboard/jobs',
                icon: History,
                allowedRoles: ['individual']
            },
        ]
    },

    // --- İŞLETME YÖNETİMİ (KURUMSAL & ESNAF) ---
    {
        title: 'İşletme',
        items: [
            {
                label: 'İş Yönetimi',
                href: '/dashboard/jobs',
                icon: Briefcase,
                allowedRoles: ['super_admin', 'admin', 'staff', 'tradesman']
            },
            {
                label: 'Randevular',
                href: '/dashboard/appointments',
                icon: CalendarDays,
                allowedRoles: ['super_admin', 'admin', 'staff', 'tradesman']
            },
            {
                label: 'Müşteriler',
                href: '/dashboard/customers',
                icon: Users,
                allowedRoles: ['super_admin', 'admin', 'tradesman']
            },
            {
                label: 'Personeller',
                href: '/dashboard/staff',
                icon: Users,
                allowedRoles: ['super_admin', 'admin']
            },
        ]
    },

    // --- FİNANS (GÜNCELLENDİ: BİREYSEL KULLANICIYA AÇILDI) ---
    {
        title: 'Finans',
        items: [
            {
                label: 'Gelir/Gider',
                href: '/dashboard/finance',
                icon: Wallet,
                // 👇 'individual' eklendi: Artık bireysel kullanıcı da bütçesini yönetebilir.
                allowedRoles: ['super_admin', 'admin', 'tradesman', 'individual']
            },
            {
                label: 'Teklifler',
                href: '/dashboard/proposals',
                icon: FileText,
                // Teklif verme işi genelde ticaret erbabınındır, bireyseli buraya almadım.
                allowedRoles: ['super_admin', 'admin', 'tradesman']
            },
            {
                label: 'Abonelik Paketleri',
                href: '/subscription',
                icon: CreditCard,
                // 👇 'individual' eklendi: Bireysel kullanıcı da paket satın alabilsin.
                allowedRoles: ['super_admin', 'admin', 'tradesman', 'individual']
            },
        ]
    },

    // --- AYARLAR ---
    {
        title: 'Diğer',
        items: [
            {
                label: 'Ayarlar',
                href: '/dashboard/settings',
                icon: Settings,
                allowedRoles: ['super_admin', 'admin', 'staff', 'tradesman', 'individual']
            },
        ]
    }
];

export function Sidebar({ userRole = 'individual', isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    const handleLogout = async () => {
        await signOut(auth);
    };

    return (
        <>
            {/* MOBİL İÇİN BACKDROP (Karanlık Arka Plan) */}
            <div
                className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* SIDEBAR CONTAINER */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* LOGO ALANI */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 font-bold text-xl text-blue-600 dark:text-blue-400">
                        <Wrench className="w-6 h-6" />
                        <span>Servis360</span>
                    </div>
                    {/* Mobil Kapatma Butonu */}
                    <button onClick={onClose} className="md:hidden text-slate-500 hover:text-slate-800 dark:hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* MENÜ LİSTESİ */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                    {MENU_ITEMS.map((section, index) => {
                        // Bölüm içindeki yetkili linkleri filtrele
                        const authorizedItems = section.items.filter(item =>
                            item.allowedRoles.includes(userRole)
                        );

                        // Eğer bu bölümde kullanıcının göreceği hiçbir şey yoksa bölümü hiç gösterme
                        if (authorizedItems.length === 0) return null;

                        return (
                            <div key={index}>
                                <h3 className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    {section.title}
                                </h3>
                                <div className="space-y-1">
                                    {authorizedItems.map((item) => {
                                        const isActive = pathname === item.href;
                                        const Icon = item.icon;

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                onClick={onClose} // Mobilde tıklayınca menüyü kapat
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                                    }`}
                                            >
                                                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                                                {item.label}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ALT KISIM (PROFİL / ÇIKIŞ) */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Çıkış Yap
                    </button>
                    <div className="mt-2 text-center">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-full">
                            {userRole === 'super_admin' ? 'YÖNETİCİ' : userRole === 'admin' ? 'KURUMSAL' : userRole === 'staff' ? 'PERSONEL' : 'KULLANICI'}
                        </span>
                    </div>
                </div>
            </aside>
        </>
    );
}