'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { Sidebar } from '../../components/layout/sidebar';
import { Header } from '../../components/layout/header';
import { Loader2, LockKeyhole, CreditCard } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // 👇 YENİ: Mobil menü state'i
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/login');
            } else {
                setUser(currentUser);
                const unsubProfile = onSnapshot(doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile'), (docSnap) => {
                    if (docSnap.exists()) {
                        setProfile(docSnap.data());
                    } else {
                        router.push('/subscription');
                    }
                    setLoading(false);
                });
                return () => unsubProfile();
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    // Sayfa değişince mobil menüyü kapat
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!loading && profile) {
            const now = new Date();
            const licenseDate = profile.licenseEndsAt ? profile.licenseEndsAt.toDate() : null;
            const isLicenseExpired = !licenseDate || licenseDate < now;
            if (profile.role !== 'admin' && isLicenseExpired && pathname !== '/subscription') {
                router.push('/subscription');
            }
        }
    }, [loading, profile, pathname, router]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>;
    }

    const isLicenseValid = profile?.role === 'admin' || (profile?.licenseEndsAt && profile.licenseEndsAt.toDate() > new Date());

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* SIDEBAR: State ve Kapatma Fonksiyonu Eklendi */}
            {isLicenseValid && (
                <Sidebar
                    userRole={profile?.role}
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                />
            )}

            <div className={`flex-1 flex flex-col transition-all duration-300 ${isLicenseValid ? 'ml-0 md:ml-64' : 'w-full'}`}>
                {/* HEADER: Açma Fonksiyonu Eklendi */}
                {isLicenseValid && (
                    <Header
                        user={profile}
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                    />
                )}

                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    {!isLicenseValid && pathname !== '/subscription' ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in zoom-in duration-500 min-h-[80vh]">
                            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center border-4 border-red-50 dark:border-red-900/50 mb-4">
                                <LockKeyhole className="w-12 h-12 text-red-600 dark:text-red-500" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 dark:text-white">Deneme Süreniz Sona Erdi</h2>
                            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg">
                                Verilerinize erişmek ve sistemi kullanmaya devam etmek için lütfen abonelik paketinizi yenileyin.
                            </p>
                            <div className="pt-4">
                                <button onClick={() => router.push('/subscription')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-xl shadow-blue-600/30 text-lg flex items-center gap-2 mx-auto">
                                    <CreditCard className="w-5 h-5" />
                                    Paketleri İncele
                                </button>
                            </div>
                        </div>
                    ) : (
                        children
                    )}
                </main>
            </div>
        </div>
    );
}