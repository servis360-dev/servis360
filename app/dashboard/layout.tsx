'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

import { Sidebar } from '../../components/layout/sidebar';
import { Header } from '../../components/layout/header';
import { Loader2, LockKeyhole, CreditCard, AlertTriangle } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
                        // Profil hiç yoksa aboneliğe yönlendir (Bireysel kayıt için de olabilir)
                        router.push('/dashboard/subscription');
                    }
                    setLoading(false);
                });
                return () => unsubProfile();
            }
        });
        return () => unsubscribeAuth();
    }, [router]);

    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!loading && profile) {
            const now = new Date();
            const licenseDate = profile.licenseEndsAt ? profile.licenseEndsAt.toDate() : null;
            const isLicenseExpired = !licenseDate || licenseDate < now;

            // 👇 1. ZORUNLU BİLGİ KONTROLÜ (Google Login Koruması)
            // Telefon numarası yoksa VEYA (İşletme hesabıysa ve Firma adı yoksa)
            const isProfileIncomplete = !profile.phone ||
                ((['admin', 'corporate', 'esnaf', 'business'].includes(profile.role) || ['esnaf', 'corporate', 'business'].includes(profile.accountType)) && !profile.companyName);

            // Eğer bilgi eksikse ve şu an Ayarlar sayfasında değilse -> Ayarlar'a at!
            if (isProfileIncomplete && pathname !== '/dashboard/settings') {
                router.push('/dashboard/settings');
                return; // Diğer kontrollere gerek yok, önce profil dolmalı.
            }

            // 2. Lisans Kontrolü
            if (profile.role !== 'admin' && profile.role !== 'super_admin' && isLicenseExpired && pathname !== '/dashboard/subscription' && pathname !== '/dashboard/settings') {
                router.push('/dashboard/subscription');
            }
        }
    }, [loading, profile, pathname, router]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>;
    }

    // Lisans geçerli mi kontrolü (Süper admin ve Admin her zaman geçerli, diğerleri tarihe bağlı)
    // NOT: Profil eksikse de (settings sayfasındaysa) layout'u göster ki sidebar/header gelsin.
    const isLicenseValid = profile?.role === 'super_admin' || profile?.role === 'admin' || (profile?.licenseEndsAt && profile.licenseEndsAt.toDate() > new Date());

    // Profil eksik mi? (UI'da uyarı göstermek için)
    const isIncomplete = !profile?.phone || ((['admin', 'corporate', 'esnaf'].includes(profile?.role)) && !profile?.companyName);

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Lisans geçerliyse VEYA profil eksikse (ayarlarda dolanırken) Sidebar'ı göster */}
            {(isLicenseValid || isIncomplete) && (
                <Sidebar
                    userRole={profile?.role}
                    isOpen={isMobileMenuOpen}
                    onClose={() => setIsMobileMenuOpen(false)}
                />
            )}

            <div className={`flex-1 flex flex-col transition-all duration-300 ${(isLicenseValid || isIncomplete) ? 'ml-0 md:ml-64' : 'w-full'}`}>
                {(isLicenseValid || isIncomplete) && (
                    <Header
                        user={profile}
                        onMenuClick={() => setIsMobileMenuOpen(true)}
                    />
                )}

                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    {/* ZORUNLU PROFİL UYARISI */}
                    {isIncomplete && pathname === '/dashboard/settings' && (
                        <div className="bg-yellow-900/20 border border-yellow-600/50 p-4 rounded-lg mb-6 flex items-start gap-3 animate-pulse">
                            <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-bold text-yellow-500">Profil Bilgilerinizi Tamamlayın</h3>
                                <p className="text-sm text-yellow-200/80">Sistemi kullanabilmek için lütfen <strong>Telefon Numaranızı</strong> {profile?.role === 'admin' ? 've Firma Adınızı' : ''} girip kaydedin.</p>
                            </div>
                        </div>
                    )}

                    {/* LİSANS UYARISI EKRANI */}
                    {!isLicenseValid && !isIncomplete && pathname !== '/dashboard/subscription' ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in zoom-in duration-500 min-h-[80vh]">
                            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center border-4 border-red-50 dark:border-red-900/50 mb-4">
                                <LockKeyhole className="w-12 h-12 text-red-600 dark:text-red-500" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 dark:text-white">Deneme Süreniz Sona Erdi</h2>
                            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg">
                                Verilerinize erişmek ve sistemi kullanmaya devam etmek için lütfen abonelik paketinizi yenileyin.
                            </p>
                            <div className="pt-4">
                                <button onClick={() => router.push('/dashboard/subscription')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-xl shadow-blue-600/30 text-lg flex items-center gap-2 mx-auto">
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