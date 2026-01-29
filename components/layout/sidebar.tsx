'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Wallet,
    Wrench,
    Package,
    Users,
    Settings,
    LogOut,
    ShieldAlert,
    CreditCard,
    ShoppingBag,
    Scissors,
    Car,
    Briefcase,
    FileText,
    Tag,
    UserCog,
    Store,
    MessageSquare,
    LifeBuoy,
    CalendarClock,
    Contact, // <-- EKSİK OLAN BU İKONDUR, EKLENDİ.
    X
} from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

const defaultMenuItems = [
    { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'settings', label: 'Ayarlar', icon: Settings, href: '/dashboard/settings' },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const [menuItems, setMenuItems] = useState(defaultMenuItems);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (window.innerWidth < 1024 && onClose) {
            onClose();
        }
    }, [pathname]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const docRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile');
                    const docSnap = await getDoc(docRef);

                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        const role = data.role || 'patron';
                        const sector = data.sectorType || 'technical_service';
                        const type = data.accountType || 'business';

                        setIsAdmin(role === 'admin');
                        generateMenu(sector, type);
                    }
                } catch (error) {
                    console.error("Menü hatası:", error);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const generateMenu = (sector: string, type: string) => {
        let items = [
            { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard, href: '/dashboard' }
        ];

        if (type === 'individual') {
            items.push(
                { id: 'finance', label: 'Gelir / Gider', icon: Wallet, href: '/dashboard/finance' },
                { id: 'customers', label: 'Kişiler / Rehber', icon: Contact, href: '/dashboard/customers' },
                { id: 'subscription', label: 'Paketim', icon: CreditCard, href: '/dashboard/subscription' },
                { id: 'communication', label: 'Notlarım', icon: MessageSquare, href: '/dashboard/communication' }
            );
        }
        else {
            // Sektöre göre isimlendirme
            let jobsLabel = 'İş Emirleri';
            let jobsIcon = Wrench;

            if (sector === 'retail_wholesale') { jobsLabel = 'Siparişler'; jobsIcon = ShoppingBag; }
            else if (sector === 'beauty_health') { jobsLabel = 'Seanslar'; jobsIcon = Scissors; }
            else if (sector === 'auto_rental') { jobsLabel = 'Araç / Servis'; jobsIcon = Car; }

            items.push(
                { id: 'jobs', label: jobsLabel, icon: jobsIcon, href: '/dashboard/jobs' },
                { id: 'appointments', label: 'Randevular', icon: CalendarClock, href: '/dashboard/appointments' },
                { id: 'proposals', label: 'Teklif Hazırla', icon: FileText, href: '/dashboard/proposals' },
                { id: 'stock', label: 'Stok & Ürün', icon: Package, href: '/dashboard/stock' },
                { id: 'customers', label: 'Müşteriler', icon: Users, href: '/dashboard/customers' },
                { id: 'finance', label: 'Finans & Kasa', icon: Wallet, href: '/dashboard/finance' },
            );
        }

        items.push(
            { id: 'settings', label: 'Ayarlar', icon: Settings, href: '/dashboard/settings' }
        );

        setMenuItems(items);
    };

    return (
        <aside className={`
            fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-white border-r border-slate-800 
            transition-transform duration-300 ease-in-out flex flex-col
            ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
            lg:translate-x-0
        `}>
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
                        <span className="font-bold text-lg">S</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Servis360</h1>
                </div>
                {onClose && (
                    <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                )}
            </div>

            <nav className="flex-1 px-4 space-y-2 py-6 overflow-y-auto">
                {loading ? (
                    <div className="text-center text-slate-600 text-xs py-4">Menü Yükleniyor...</div>
                ) : (
                    menuItems.map((item) => (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group font-medium text-sm ${pathname === item.href
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1"
                                : "text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1"
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${pathname === item.href ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                            <span>{item.label}</span>
                        </Link>
                    ))
                )}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button
                    onClick={() => signOut(auth)}
                    className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors text-sm font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Çıkış Yap</span>
                </button>
            </div>
        </aside>
    );
}