'use client';

import { useState, useEffect } from 'react';
import { Bell, Menu, Search, User as UserIcon, LogOut, Store, ChevronDown, Check } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { useBranch } from '../providers/branch-context'; // 🔥 Şube Bağlamı

interface HeaderProps {
    user: any;
    onMenuClick: () => void;
}

export function Header({ user, onMenuClick }: HeaderProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isBranchOpen, setIsBranchOpen] = useState(false);

    // Şube Context'inden verileri alıyoruz
    const { branches, selectedBranch, setBranch, loading: branchLoading } = useBranch();

    // Seçili şubenin ismini bulalım
    const currentBranchName = selectedBranch
        ? branches.find(b => b.id === selectedBranch)?.name
        : 'Tüm Şubeler (Genel)';

    // Yetki Kontrolü: Sadece Patronlar şube değiştirebilir
    // Personel ise şube değiştiremez (Menüyü gizleyeceğiz)
    const isBusinessOwner = ['admin', 'corporate', 'esnaf', 'business'].includes(user?.role) ||
        ['esnaf', 'corporate', 'business'].includes(user?.accountType);

    const handleLogout = async () => {
        await signOut(auth);
    };

    return (
        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 transition-all duration-300">

            {/* SOL: Mobil Menü ve Başlık */}
            <div className="flex items-center gap-4">
                <button onClick={onMenuClick} className="md:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                    <Menu className="w-6 h-6" />
                </button>

                {/* 🔥 ŞUBE SEÇİCİ (Sadece İşletme Sahipleri Görür) */}
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

                        {/* Şube Dropdown */}
                        {isBranchOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsBranchOpen(false)} />
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="p-2 space-y-1">
                                        {/* Tüm Şubeler Seçeneği */}
                                        <button
                                            onClick={() => { setBranch(null); setIsBranchOpen(false); }}
                                            className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-colors ${selectedBranch === null ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-300'}`}
                                        >
                                            <span className="flex items-center gap-2">
                                                <Store className="w-4 h-4" /> Tüm Şubeler (Genel)
                                            </span>
                                            {selectedBranch === null && <Check className="w-4 h-4" />}
                                        </button>

                                        <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>

                                        {/* Şube Listesi */}
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

            {/* SAĞ: Profil ve Bildirim */}
            <div className="flex items-center gap-4">
                <button className="relative p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                </button>

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
                            {user?.logoUrl ? (
                                <img src={user.logoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                            ) : (
                                <span className="font-bold text-sm">{user?.fullName?.[0]?.toUpperCase() || 'U'}</span>
                            )}
                        </div>
                    </button>

                    {/* Profil Dropdown */}
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