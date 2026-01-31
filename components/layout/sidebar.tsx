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
    Gem,
    PieChart
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

interface SidebarProps {
    userRole?: string;
    isOpen: boolean;
    onClose: () => void;
}

// ---------------------------------------------------------------------------
// 🛠️ ROL NORMALLEŞTİRME (AKILLI KONTROL)
// Veritabanından gelen rol ismi ne olursa olsun, sistemin anladığı dile çevirir.
// ---------------------------------------------------------------------------
const getNormalizedRole = (role?: string): string => {
    if (!role) return 'individual'; // Rol yoksa Bireysel varsay

    const r = role.toLowerCase();

    // 1. SÜPER YÖNETİCİ (SEN)
    if (r === 'super_admin' || r === 'developer') return 'super_admin';

    // 2. PATRON / İŞLETME SAHİBİ (Kurumsal & Esnaf)
    // 👇 BURAYA 'esnaf' KELİMESİNİ DE EKLEDİM.
    // Artık rolü "esnaf" olanlar da dükkan sahibi (admin) yetkilerini alacak.
    if (['admin', 'corporate', 'business', 'tradesman', 'boss', 'owner', 'esnaf'].includes(r)) return 'admin';

    // 3. PERSONEL / ÇALIŞAN
    if (['staff', 'personnel', 'employee', 'worker', 'teknik', 'cirak', 'kalfa'].includes(r)) return 'staff';

    // 4. BİREYSEL KULLANICI
    return 'individual';
};

// ---------------------------------------------------------------------------
// 📋 MENÜ YAPILANDIRMASI
// allowedRoles: Bu menüyü hangi "Normalleştirilmiş Roller" görebilir?
// ---------------------------------------------------------------------------
const MENU_ITEMS = [
    // --- 1. SAAS YÖNETİCİSİ (SADECE SEN) ---
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

    // --- 2. GENEL (HERKES) ---
    {
        title: 'Genel Bakış',
        items: [
            {
                label: 'Özet Paneli',
                href: '/dashboard',
                icon: LayoutDashboard,
                // Herkes kendi özetini görür
                allowedRoles: ['super_admin', 'admin', 'staff', 'individual']
            },
        ]
    },

    // --- 3. BİREYSEL MÜŞTERİ İŞLEMLERİ ---
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

    // --- 4. İŞLETME YÖNETİMİ (PATRON & PERSONEL) ---
    // Esnaf (Admin) burayı görür.
    {
        title: 'İşletme Yönetimi',
        items: [
            {
                label: 'İş Takibi',
                href: '/dashboard/jobs',
                icon: Briefcase,
                // Personel işleri görür, Patron yönetir
                allowedRoles: ['super_admin', 'admin', 'staff']
            },
            {
                label: 'Randevu Takvimi',
                href: '/dashboard/appointments',
                icon: CalendarDays,
                allowedRoles: ['super_admin', 'admin', 'staff']
            },
            {
                label: 'Müşteri Listesi',
                href: '/dashboard/customers',
                icon: Users,
                // Personel müşterileri görebilmeli (iletişim için)
                allowedRoles: ['super_admin', 'admin', 'staff']
            },
            {
                label: 'Personel Yönetimi',
                href: '/dashboard/staff',
                icon: Users,
                // SADECE PATRON (Personel, diğer personelleri yönetemez)
                allowedRoles: ['super_admin', 'admin']
            },
        ]
    },

    // --- 5. FİNANS (PATRON & BİREYSEL) ---
    // Esnaf (Admin) burayı görür. Personel GÖREMEZ.
    {
        title: 'Finansal Durum',
        items: [
            {
                label: 'Gelir / Gider',
                href: '/dashboard/finance',
                icon: Wallet,
                // Bireysel kullanıcı kendi bütçesini, Patron şirket kasasını görür.
                allowedRoles: ['super_admin', 'admin', 'individual']
            },
            {
                label: 'Teklifler',
                href: '/dashboard/proposals',
                icon: FileText,
                // Sadece işletmeler teklif hazırlar
                allowedRoles: ['super_admin', 'admin']
            },
            {
                label: 'Abonelik Paketleri',
                href: '/dashboard/subscription',
                icon: CreditCard,
                // Paket satın alma ekranı
                allowedRoles: ['super_admin', 'admin', 'individual']
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
                allowedRoles: ['super_admin', 'admin', 'staff', 'individual']
            },
        ]
    }
];

export function Sidebar({ userRole, isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    // Rolü standart hale getir (Safe Guard)
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
                        // Rol kontrolü: Bu bölümdeki öğelerden en az biri kullanıcının rolüne uyuyor mu?
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

                    {/* Hata Ayıklama Bilgisi (Kullanıcının Sistemdeki Rolü) */}
                    <div className="mt-3 text-center">
                        <span className={`text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded-full border ${normalizedRole === 'super_admin' ? 'border-red-500 text-red-500 bg-red-500/10' :
                                normalizedRole === 'admin' ? 'border-purple-500 text-purple-500 bg-purple-500/10' :
                                    normalizedRole === 'staff' ? 'border-yellow-500 text-yellow-500 bg-yellow-500/10' :
                                        'border-blue-500 text-blue-500 bg-blue-500/10'
                            }`}>
                            {normalizedRole === 'super_admin' ? 'GELİŞTİRİCİ' :
                                normalizedRole === 'admin' ? 'YÖNETİCİ' :
                                    normalizedRole === 'staff' ? 'PERSONEL' :
                                        'BİREYSEL'}
                        </span>
                        {/* Ham rol verisini de göster ki veritabanında ne yazdığını anla (Geliştirme bitince silersin) */}
                        <div className="text-[9px] text-slate-400 mt-1">
                            (DB Rolü: {userRole || 'Yok'})
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}