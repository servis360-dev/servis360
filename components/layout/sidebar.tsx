'use client';

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
    CreditCard,
    Store, // Şubeler için
    Package, // Stok için
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

interface SidebarProps {
    userRole?: string;
    userProfile?: any; // Profil detayları (AccountType vb. için)
    isOpen: boolean;
    onClose: () => void;
}

// ---------------------------------------------------------------------------
// 🛠️ ROL NORMALLEŞTİRME (AKILLI KONTROL)
// ---------------------------------------------------------------------------
const getNormalizedRole = (role?: string): string => {
    if (!role) return 'individual'; // Rol yoksa Bireysel

    const r = role.toLowerCase();

    // 1. SÜPER YÖNETİCİ
    if (r === 'super_admin' || r === 'developer') return 'super_admin';

    // 2. KURUMSAL FİRMA SAHİBİ
    if (r === 'corporate') return 'corporate';

    // 3. ESNAF / KOBİ SAHİBİ (Genel Admin)
    if (['esnaf', 'admin', 'business', 'tradesman', 'boss', 'owner'].includes(r)) return 'esnaf';

    // 4. MUHASEBE PERSONELİ
    if (['accounting', 'muhasebe', 'finans', 'on_muhasebe'].includes(r)) return 'accounting';

    // 5. TEKNİSYEN / SAHA PERSONELİ
    if (['technician', 'teknik', 'usta', 'ustam', 'field_agent'].includes(r)) return 'technician';

    // 6. GENEL OFİS PERSONELİ
    if (['staff', 'personnel', 'employee', 'worker', 'sekreter', 'danisma'].includes(r)) return 'staff';

    // 7. BİREYSEL MÜŞTERİ
    return 'individual';
};

// ---------------------------------------------------------------------------
// 📋 MENÜ YAPILANDIRMASI
// ---------------------------------------------------------------------------
const MENU_ITEMS = [
    // --- 1. SAAS YÖNETİCİSİ ---
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

    // --- 2. GENEL BAKIŞ (Ortak) ---
    {
        title: 'Genel Bakış',
        items: [
            {
                label: 'Özet Paneli',
                href: '/dashboard',
                icon: LayoutDashboard,
                // Herkes kendi özet ekranını görür
                allowedRoles: ['super_admin', 'corporate', 'esnaf', 'accounting', 'technician', 'staff', 'individual']
            },
        ]
    },

    // --- 3. BİREYSEL HİZMET ALAN ---
    {
        title: 'Hizmet İşlemleri',
        items: [
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

    // --- 4. İŞLETME YÖNETİMİ (Operasyon) ---
    {
        title: 'Operasyon',
        items: [
            {
                label: 'İş Takibi',
                href: '/dashboard/jobs',
                icon: Briefcase,
                // Muhasebe hariç tüm işletme ekibi
                allowedRoles: ['super_admin', 'corporate', 'esnaf', 'staff', 'technician']
            },
            {
                label: 'Randevu Takvimi',
                href: '/dashboard/appointments',
                icon: CalendarDays,
                // Muhasebe hariç tüm işletme ekibi
                allowedRoles: ['super_admin', 'corporate', 'esnaf', 'staff', 'technician']
            },
            {
                label: 'Müşteri Listesi',
                href: '/dashboard/customers',
                icon: Users,
                // Teknisyen hariç herkes (Teknisyen sadece gittiği işi görür, tüm listeyi görmesine gerek yok - opsiyonel)
                // Ama iletişim için gerekebilir, şimdilik ekliyoruz.
                allowedRoles: ['super_admin', 'corporate', 'esnaf', 'staff', 'accounting', 'technician']
            },
            {
                label: 'Stok Takibi',
                href: '/dashboard/stock',
                icon: Package,
                // Bireysel ve Muhasebe hariç
                allowedRoles: ['super_admin', 'corporate', 'esnaf', 'technician', 'staff']
            },
            {
                label: 'Şubeler',
                href: '/dashboard/branches',
                icon: Store,
                // Sadece Kurumsal Firmalar ve Süper Admin
                allowedRoles: ['super_admin', 'corporate']
            },
            {
                label: 'Personel Yönetimi',
                href: '/dashboard/staff',
                icon: Users,
                // Sadece Patronlar (Esnaf ve Kurumsal)
                allowedRoles: ['super_admin', 'corporate', 'esnaf']
            },
        ]
    },

    // --- 5. FİNANS (Patron & Muhasebe & Bireysel) ---
    {
        title: 'Finansal Durum',
        items: [
            {
                label: 'Gelir / Gider',
                href: '/dashboard/finance',
                icon: Wallet,
                // Teknisyen ve Ofis Personeli Göremez! Sadece Yetkililer.
                allowedRoles: ['super_admin', 'corporate', 'esnaf', 'accounting', 'individual']
            },
            {
                label: 'Teklifler',
                href: '/dashboard/proposals',
                icon: FileText,
                // Teklifleri patron ve muhasebe hazırlar
                allowedRoles: ['super_admin', 'corporate', 'esnaf', 'accounting']
            },
            {
                label: 'Abonelik Paketleri',
                href: '/dashboard/subscription',
                icon: CreditCard,
                // PERSONEL GÖREMEZ. Sadece hesap sahipleri.
                allowedRoles: ['super_admin', 'corporate', 'esnaf', 'individual']
            },
        ]
    },

    // --- 6. AYARLAR ---
    {
        title: 'Sistem',
        items: [
            {
                label: 'Ayarlar',
                href: '/dashboard/settings',
                icon: Settings,
                allowedRoles: ['super_admin', 'corporate', 'esnaf', 'accounting', 'technician', 'staff', 'individual']
            },
        ]
    }
];

export function Sidebar({ userRole, isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    // Rolü standart hale getir
    const normalizedRole = getNormalizedRole(userRole);

    const handleLogout = async () => {
        await signOut(auth);
    };

    return (
        <>
            {/* MOBİL ARKA PLAN (Overlay) */}
            <div
                className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
            />

            {/* SIDEBAR ANA KUTU */}
            <aside
                className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                {/* LOGO */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2 font-bold text-xl text-blue-600 dark:text-blue-400">
                        <Wrench className="w-6 h-6" />
                        <span>Servis360</span>
                    </div>
                    <button onClick={onClose} className="md:hidden text-slate-500 hover:text-slate-800 dark:hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* MENÜ LİSTESİ */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
                    {MENU_ITEMS.map((section, index) => {
                        // Rol kontrolü: Kullanıcının rolü bu item'ın izin verilen rollerinde var mı?
                        const authorizedItems = section.items.filter(item =>
                            item.allowedRoles.includes(normalizedRole)
                        );

                        // Eğer bu bölümde kullanıcının göreceği hiçbir şey yoksa bölümü komple gizle
                        if (authorizedItems.length === 0) return null;

                        return (
                            <div key={index}>
                                <h3 className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
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
                                                onClick={onClose}
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

                {/* ALT KISIM: PROFİL BİLGİSİ VE ÇIKIŞ */}
                <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Çıkış Yap
                    </button>

                    {/* Rol Etiketi */}
                    <div className="mt-3 text-center">
                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full border ${normalizedRole === 'super_admin' ? 'border-red-500 text-red-500 bg-red-500/10' :
                                ['corporate', 'esnaf'].includes(normalizedRole) ? 'border-purple-500 text-purple-500 bg-purple-500/10' :
                                    ['technician', 'staff', 'accounting'].includes(normalizedRole) ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
                                        'border-blue-500 text-blue-500 bg-blue-500/10'
                            }`}>
                            {normalizedRole === 'super_admin' ? 'YAZILIMCI' :
                                normalizedRole === 'corporate' ? 'KURUMSAL' :
                                    normalizedRole === 'esnaf' ? 'İŞLETME' :
                                        normalizedRole === 'accounting' ? 'MUHASEBE' :
                                            normalizedRole === 'technician' ? 'TEKNİSYEN' :
                                                normalizedRole === 'staff' ? 'PERSONEL' :
                                                    'BİREYSEL'}
                        </span>
                    </div>
                </div>
            </aside>
        </>
    );
}