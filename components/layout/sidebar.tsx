'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Wallet, Wrench, Package, Users, Settings, LogOut,
    ShieldAlert, CreditCard, ShoppingBag, Scissors, Car, Contact, Briefcase,
    FileText, Tag, UserCog, Store, MessageSquare, LifeBuoy, X // X ikonu eklendi
} from 'lucide-react';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

const defaultMenuItems = [
    { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard, href: '/dashboard' },
    { id: 'settings', label: 'Ayarlar', icon: Settings, href: '/dashboard/settings' },
];

// Props tanımı
interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const [menuItems, setMenuItems] = useState(defaultMenuItems);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mobilde bir linke tıklayınca menüyü kapat
        if (window.innerWidth < 1024) {
            onClose();
        }
    }, [pathname]); // Path değişince çalışır

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
                    console.error("Menü yükleme hatası:", error);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const generateMenu = (sector: string, type: string) => {
        // ... (Menü oluşturma mantığı aynı, burayı kısaltmıyorum aynen kalsın)
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
            let jobsLabel = 'İş Emirleri';
            let jobsIcon = Wrench;
            let stockLabel = 'Stok Takibi';
            let stockIcon = Package;
            let customerLabel = 'Müşteriler';
            let customerIcon = Users;

            if (sector === 'retail_wholesale') {
                jobsLabel = 'Siparişler';
                jobsIcon = ShoppingBag;
                stockLabel = 'Ürünler';
                stockIcon = Tag;
            } else if (sector === 'beauty_health') {
                jobsLabel = 'Randevular';
                jobsIcon = Scissors;
                stockLabel = 'Hizmet & Ürün';
                stockIcon = Package;
                customerLabel = 'Danışanlar';
            } else if (sector === 'auto_rental') {
                jobsLabel = 'Araç / Servis';
                jobsIcon = Car;
            } else if (sector === 'other') {
                jobsLabel = 'İşlemler';
                jobsIcon = Briefcase;
            }

            items.push(
                { id: 'jobs', label: jobsLabel, icon: jobsIcon, href: '/dashboard/jobs' },
                { id: 'proposals', label: 'Teklif Hazırla', icon: FileText, href: '/dashboard/proposals' },
                { id: 'stock', label: stockLabel, icon: stockIcon, href: '/dashboard/stock' },
                { id: 'staff', label: 'Personel', icon: UserCog, href: '/dashboard/staff' },
                { id: 'branches', label: 'Şubeler', icon: Store, href: '/dashboard/branches' },
                { id: 'finance', label: 'Finans & Kasa', icon: Wallet, href: '/dashboard/finance' },
                { id: 'customers', label: customerLabel, icon: customerIcon, href: '/dashboard/customers' },
                { id: 'communication', label: 'Haberleşme', icon: MessageSquare, href: '/dashboard/communication' },
                { id: 'subscription', label: 'Abonelik & Paket', icon: CreditCard, href: '/dashboard/subscription' }
            );
        }

        items.push(
            { id: 'support', label: 'Destek & Yardım', icon: LifeBuoy, href: '/dashboard/support' },
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
            {/* Header Kısmı */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
                        <span className="font-bold text-lg">S</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Servis360</h1>
                </div>
                {/* Mobilde Kapatma Butonu */}
                <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
                    <X className="w-6 h-6" />
                </button>
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

                {isAdmin && (
                    <Link
                        href="/dashboard/admin"
                        className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group font-medium text-sm ${pathname === '/dashboard/admin'
                            ? "bg-red-600 text-white shadow-lg shadow-red-900/40 translate-x-1"
                            : "text-red-400 hover:bg-red-900/20 hover:text-red-300 hover:translate-x-1"
                            }`}
                    >
                        <ShieldAlert className="w-5 h-5" />
                        <span>Admin Paneli</span>
                    </Link>
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