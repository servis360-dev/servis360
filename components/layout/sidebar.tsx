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
    Store,
    Package,
    ChevronRight
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

interface SidebarProps {
    userRole?: string;
    userProfile?: any;
    isOpen: boolean;
    onClose: () => void;
}

// ---------------------------------------------------------------------------
// 🛠️ ROL NORMALLEŞTİRME (KESİN ÇÖZÜM)
// ---------------------------------------------------------------------------
const getNormalizedRole = (role?: string, accountType?: string): string => {
    // 🛑 KRİTİK KONTROL: Eğer hesap türü BİREYSEL ise, rolü ne olursa olsun (owner vb.) yetkisini 'individual' yap.
    // Bu satır, bireysel kullanıcıların yanlışlıkla esnaf menüsü görmesini engeller.
    if (accountType === 'individual') return 'individual';

    if (!role) return 'individual';

    const r = role.toLowerCase();

    // 1. ÜST YÖNETİM
    if (r === 'super_admin' || r === 'developer') return 'super_admin';
    if (r === 'corporate') return 'corporate';

    // 2. ESNAF / KOBİ
    if (['esnaf', 'admin', 'business', 'tradesman', 'boss', 'owner'].includes(r)) return 'esnaf';

    // 3. PERSONEL ROLLERİ
    if (['accounting', 'muhasebe', 'finans', 'on_muhasebe'].includes(r)) return 'accounting';
    if (['technician', 'teknik', 'usta', 'ustam', 'field_agent'].includes(r)) return 'technician';
    if (['staff', 'personnel', 'employee', 'worker', 'sekreter', 'danisma'].includes(r)) return 'staff';

    // 4. VARSAYILAN
    return 'individual';
};

// ---------------------------------------------------------------------------
// 📋 MENÜ YAPILANDIRMASI
// ---------------------------------------------------------------------------
const MENU_ITEMS = [
    {
        title: 'SaaS Yönetimi',
        items: [
            { label: 'Admin Paneli', href: '/dashboard/admin', icon: ShieldAlert, allowedRoles: ['super_admin'] },
        ]
    },
    {
        title: 'Genel Bakış',
        items: [
            { label: 'Özet Paneli', href: '/dashboard', icon: LayoutDashboard, allowedRoles: ['super_admin', 'corporate', 'esnaf', 'accounting', 'technician', 'staff', 'individual'] },
        ]
    },
    {
        title: 'Hizmet İşlemleri',
        items: [
            // Bireysel Kullanıcı Sadece Burayı ve Ayarları/Finansı Görebilir
            { label: 'Yeni Talep Oluştur', href: '/dashboard/jobs/new', icon: PlusCircle, allowedRoles: ['individual'] },
            { label: 'Servis Geçmişim', href: '/dashboard/jobs', icon: History, allowedRoles: ['individual'] },
        ]
    },
    {
        title: 'Operasyon',
        items: [
            { label: 'İş Takibi', href: '/dashboard/jobs', icon: Briefcase, allowedRoles: ['super_admin', 'corporate', 'esnaf', 'staff', 'technician'] },
            { label: 'Randevu Takvimi', href: '/dashboard/appointments', icon: CalendarDays, allowedRoles: ['super_admin', 'corporate', 'esnaf', 'staff', 'technician'] },
            { label: 'Müşteri Listesi', href: '/dashboard/customers', icon: Users, allowedRoles: ['super_admin', 'corporate', 'esnaf', 'staff', 'accounting', 'technician'] },
            { label: 'Stok Takibi', href: '/dashboard/stock', icon: Package, allowedRoles: ['super_admin', 'corporate', 'esnaf', 'technician', 'staff'] },
            { label: 'Şubeler', href: '/dashboard/branches', icon: Store, allowedRoles: ['super_admin', 'corporate', 'esnaf'] },
            { label: 'Personel Yönetimi', href: '/dashboard/staff', icon: Users, allowedRoles: ['super_admin', 'corporate', 'esnaf'] },
        ]
    },
    {
        title: 'Finansal Durum',
        items: [
            { label: 'Gelir / Gider', href: '/dashboard/finance', icon: Wallet, allowedRoles: ['super_admin', 'corporate', 'esnaf', 'accounting', 'individual'] },
            { label: 'Teklifler', href: '/dashboard/proposals', icon: FileText, allowedRoles: ['super_admin', 'corporate', 'esnaf', 'accounting'] },
            { label: 'Abonelik Paketleri', href: '/dashboard/subscription', icon: CreditCard, allowedRoles: ['super_admin', 'corporate', 'esnaf', 'individual'] },
        ]
    },
    {
        title: 'Sistem',
        items: [
            { label: 'Ayarlar', href: '/dashboard/settings', icon: Settings, allowedRoles: ['super_admin', 'corporate', 'esnaf', 'accounting', 'technician', 'staff', 'individual'] },
        ]
    }
];

export function Sidebar({ userRole, userProfile, isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    // 🔥 DÜZELTME: Sadece role değil, accountType'a da bakarak yetki belirliyoruz.
    // userProfile.accountType undefined gelirse sorun çıkmaması için optional chaining (?) kullanıldı.
    const normalizedRole = getNormalizedRole(userRole, userProfile?.accountType);

    const handleLogout = async () => {
        await signOut(auth);
    };

    return (
        <>
            {/* MOBİL BACKDROP */}
            <div
                className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-md md:hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* SIDEBAR CONTAINER */}
            <aside
                className={`
                    fixed top-0 left-0 z-50 h-full w-[85%] max-w-[320px] md:w-64 
                    bg-[#0B1121]/90 backdrop-blur-3xl 
                    md:bg-white md:dark:bg-slate-900 md:backdrop-blur-none
                    border-r border-white/10 md:border-slate-200 md:dark:border-slate-800
                    shadow-2xl shadow-black/50 md:shadow-none
                    transform transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                    flex flex-col
                    ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                `}
            >
                {/* 1. LOGO ALANI */}
                <div className="h-20 flex-shrink-0 flex items-center justify-between px-6 border-b border-white/5 md:border-slate-200 md:dark:border-slate-800 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-blue-600/20 to-transparent opacity-50 md:hidden pointer-events-none"></div>

                    <div className="flex items-center gap-3 relative z-10">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Wrench className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-lg text-white md:text-slate-900 md:dark:text-white leading-none">Servis360</span>
                            <span className="text-[10px] text-blue-400 font-medium tracking-wider mt-1">PRO SUITE</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="md:hidden w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 2. MENÜ LİSTESİ */}
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-8 scrollbar-hide overscroll-contain">
                    {MENU_ITEMS.map((section, index) => {
                        // Yetki Kontrolü
                        const authorizedItems = section.items.filter(item => item.allowedRoles.includes(normalizedRole));

                        if (authorizedItems.length === 0) return null;

                        return (
                            <div key={index} className="animate-in slide-in-from-left-4 fade-in duration-500" style={{ animationDelay: `${index * 100}ms` }}>
                                <h3 className="px-2 mb-3 text-[10px] font-bold text-slate-500 md:text-slate-400 uppercase tracking-widest opacity-80">
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
                                                className={`
                                                    group flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition-all duration-300
                                                    ${isActive
                                                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)] md:bg-blue-50 md:text-blue-600 md:border-transparent md:shadow-none md:dark:bg-blue-900/20 md:dark:text-blue-400'
                                                        : 'text-slate-400 hover:text-white hover:bg-white/5 md:text-slate-600 md:hover:text-slate-900 md:hover:bg-slate-100 md:dark:text-slate-400 md:dark:hover:text-white md:dark:hover:bg-slate-800'
                                                    }
                                                `}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-blue-400 md:text-blue-600' : 'text-slate-500 md:text-slate-400'}`} />
                                                    <span>{item.label}</span>
                                                </div>
                                                {isActive && <ChevronRight className="w-4 h-4 text-blue-500 opacity-50" />}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* 3. ALT PROFİL ALANI */}
                <div className="flex-shrink-0 p-4 border-t border-white/5 md:border-slate-200 md:dark:border-slate-800 bg-[#0B1121]/50 md:bg-transparent backdrop-blur-xl">
                    <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full px-4 py-3 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20">
                        <LogOut className="w-4 h-4" />
                        Çıkış Yap
                    </button>

                    <div className="mt-4 text-center">
                        <span className={`
                            inline-block text-[10px] uppercase font-black tracking-[0.2em] px-3 py-1 rounded-full border shadow-lg
                            ${normalizedRole === 'super_admin' ? 'border-red-500/30 text-red-400 bg-red-500/10 shadow-red-900/20' :
                                ['corporate', 'esnaf'].includes(normalizedRole) ? 'border-purple-500/30 text-purple-400 bg-purple-500/10 shadow-purple-900/20' :
                                    ['technician', 'staff', 'accounting'].includes(normalizedRole) ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/10 shadow-yellow-900/20' :
                                        'border-blue-500/30 text-blue-400 bg-blue-500/10 shadow-blue-900/20'}
                        `}>
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