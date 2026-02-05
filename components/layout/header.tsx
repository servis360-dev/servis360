'use client';

import { useState, useEffect } from 'react';
import { Bell, Menu, LogOut, Store, ChevronDown, Check, Trash2 } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { useBranch } from '../providers/branch-context';
import { collection, query, onSnapshot, orderBy, limit, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { tr, enUS, de } from 'date-fns/locale';

interface HeaderProps {
    user: any;
    onMenuClick: () => void;
    locale?: string;
}

export function Header({ user, onMenuClick, locale = 'tr' }: HeaderProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isBranchOpen, setIsBranchOpen] = useState(false);

    // Bildirim State'leri
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const { branches, selectedBranch, setBranch } = useBranch();

    // Seçili şube ismini bul
    const currentBranchName = selectedBranch
        ? branches.find(b => b.id === selectedBranch)?.name
        : 'Tüm Şubeler (Genel)';

    // Yetki Kontrolü
    const isBusinessOwner = ['admin', 'corporate', 'esnaf', 'business'].includes(user?.role) ||
        ['esnaf', 'corporate', 'business'].includes(user?.accountType);

    // 🔥 BİLDİRİMLERİ CANLI DİNLE
    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(data);
            const unread = data.filter((n: any) => !n.isRead).length;
            setUnreadCount(unread);
        });

        return () => unsubscribe();
    }, [user]);

    const handleLogout = async () => {
        await signOut(auth);
    };

    const markAsRead = async (notifId: string) => {
        if (!user?.uid) return;
        try {
            const notifRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'notifications', notifId);
            await updateDoc(notifRef, { isRead: true });
        } catch (error) { console.error(error); }
    };

    const deleteNotification = async (e: any, notifId: string) => {
        e.stopPropagation(); // Tıklama event'i üsttekine gitmesin
        if (!user?.uid) return;
        try {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'notifications', notifId));
        } catch (error) { console.error(error); }
    };

    // Tarih formatı için dil seçimi
    const getDateLocale = () => {
        if (locale === 'en') return enUS;
        if (locale === 'de') return de;
        return tr;
    };

    return (
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 transition-all duration-300">

            {/* SOL: Mobil Menü ve Şube Seçimi */}
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <Menu className="w-6 h-6" />
                </button>

                {/* 🔥 ŞUBE SEÇİCİ */}
                {isBusinessOwner && branches.length > 0 && (
                    <div className="relative">
                        <button
                            onClick={() => setIsBranchOpen(!isBranchOpen)}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            <div className={`p-1.5 rounded-lg ${selectedBranch ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                <Store className="w-4 h-4" />
                            </div>
                            <div className="text-left hidden sm:block">
                                <p className="text-[10px] text-slate-500 font-bold uppercase">AKTİF ŞUBE</p>
                                <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 max-w-[120px]">
                                    {currentBranchName}
                                </p>
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>

                        {isBranchOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsBranchOpen(false)} />
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-2 space-y-1">
                                        <button
                                            onClick={() => { setBranch(null); setIsBranchOpen(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors ${selectedBranch === null ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'}`}
                                        >
                                            <span className="flex items-center gap-2"><Store className="w-4 h-4" /> Tüm Şubeler (Genel)</span>
                                            {selectedBranch === null && <Check className="w-4 h-4" />}
                                        </button>
                                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
                                        {branches.map((branch) => (
                                            <button
                                                key={branch.id}
                                                onClick={() => { setBranch(branch.id); setIsBranchOpen(false); }}
                                                className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors ${selectedBranch === branch.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'}`}
                                            >
                                                <span className="truncate">{branch.name}</span>
                                                {selectedBranch === branch.id && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* SAĞ: Bildirim ve Profil */}
            <div className="flex items-center gap-4">

                {/* 🔔 BİLDİRİM SİSTEMİ */}
                <div className="relative">
                    <button
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse"></span>
                        )}
                    </button>

                    {isNotifOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                            <div className="absolute top-full right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                    <h3 className="font-bold text-slate-900 dark:text-white">Bildirimler</h3>
                                    {unreadCount > 0 && <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full font-bold">{unreadCount} Yeni</span>}
                                </div>
                                <div className="max-h-[400px] overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500">
                                            <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">Henüz bildiriminiz yok.</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {notifications.map((notif) => (
                                                <div
                                                    key={notif.id}
                                                    onClick={() => markAsRead(notif.id)}
                                                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors cursor-pointer flex gap-3 group ${!notif.isRead ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                                                >
                                                    <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notif.isRead ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                                                    <div className="flex-1">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <p className={`text-sm ${!notif.isRead ? 'font-bold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                                {notif.title}
                                                            </p>
                                                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                                {notif.createdAt?.seconds ? formatDistanceToNow(new Date(notif.createdAt.seconds * 1000), { addSuffix: true, locale: getDateLocale() }) : ''}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{notif.message}</p>
                                                    </div>
                                                    <button
                                                        onClick={(e) => deleteNotification(e, notif.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 hover:text-red-600 rounded transition-all self-start"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 👤 PROFİL MENÜSÜ */}
                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    >
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{user?.fullName || 'Kullanıcı'}</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-1">{user?.companyName || user?.role || 'Hesap'}</p>
                        </div>
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-500/20 ring-2 ring-white dark:ring-slate-900">
                            {user?.photoURL ? (
                                <img src={user.photoURL} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <span className="font-bold text-sm">{user?.fullName?.[0]?.toUpperCase() || 'U'}</span>
                            )}
                        </div>
                    </button>

                    {isProfileOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                            <div className="absolute top-full right-0 mt-3 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                                <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                                    <p className="font-bold text-slate-900 dark:text-white">{user?.fullName}</p>
                                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                </div>
                                <div className="p-2">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                        <LogOut className="w-4 h-4" /> Çıkış Yap
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