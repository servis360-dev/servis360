'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// 👇 DÜZELTME BURADA: "default" import yerine "named" import ({}) kullanıyoruz.
// Eğer yine hata alırsan, bileşen dosyalarında "export default" olup olmadığını kontrol et.
import { Sidebar } from '../../components/layout/sidebar';
import { Header } from '../../components/layout/header';

import { Loader2, LockKeyhole } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (!currentUser) {
                router.push('/login');
            } else {
                setUser(currentUser);
                // Kullanıcı giriş yaptıysa profilini dinlemeye başla
                const unsubProfile = onSnapshot(doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile'), (docSnap) => {
                    if (docSnap.exists()) {
                        setProfile(docSnap.data());
                    } else {
                        // Profil yoksa (Google ile ilk giriş vb.)
                        router.push('/subscription');
                    }
                    setLoading(false);
                });
                return () => unsubProfile();
            }
        });

        return () => unsubscribeAuth();
    }, [router]);

    // --- GÜMRÜK KAPISI (IRON GATE) ---
    useEffect(() => {
        if (!loading && profile) {

            // 1. ADIM: EKSİK BİLGİ KONTROLÜ
            const isInfoMissing = !profile.phone || !profile.accountType;
            // Adminler ve Settings sayfası hariç
            if (profile.role !== 'admin' && isInfoMissing && pathname !== '/settings') {
                // router.push('/settings'); // Ayarlar sayfası hazırsa aç
            }

            // 2. ADIM: LİSANS / ÖDEME KONTROLÜ
            const now = new Date();
            const licenseDate = profile.licenseEndsAt ? profile.licenseEndsAt.toDate() : null;
            const isLicenseExpired = !licenseDate || licenseDate < now;

            // Admin değilse ve lisansı bitmişse -> ABONELİK sayfasına hapis
            if (profile.role !== 'admin' && isLicenseExpired) {
                if (pathname !== '/subscription') {
                    router.push('/subscription');
                }
            }
        }
    }, [loading, profile, pathname, router]);


    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-950">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    // LİSANS GEÇERLİLİĞİ KONTROLÜ
    const isLicenseValid = profile?.role === 'admin' || (profile?.licenseEndsAt && profile.licenseEndsAt.toDate() > new Date());

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* LİSANS YOKSA SIDEBAR GİZLENİR */}
            {isLicenseValid && <Sidebar userRole={profile?.role} />}

            <div className={`flex-1 flex flex-col transition-all duration-300 ${isLicenseValid ? 'ml-0 md:ml-64' : 'w-full'}`}>
                {/* LİSANS YOKSA HEADER GİZLENİR */}
                {isLicenseValid && <Header user={profile} />}

                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    {/* LİSANS YOKSA VE ABONELİK SAYFASINDA DEĞİLSE UYARI GÖSTER (Zaten yönlendirilecek ama görsel güvenlik) */}
                    {!isLicenseValid && pathname !== '/subscription' ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center border-4 border-red-50 dark:border-red-900/50">
                                <LockKeyhole className="w-10 h-10 text-red-600 dark:text-red-500" />
                            </div>
                            <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Deneme Süreniz Sona Erdi</h2>
                            <p className="text-slate-500 dark:text-slate-400 max-w-md">Sistemi kullanmaya devam etmek ve verilerinize erişmek için lütfen bir paket seçiniz.</p>
                            <button onClick={() => router.push('/subscription')} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-600/30">Paketleri İncele</button>
                        </div>
                    ) : (
                        children
                    )}
                </main>
            </div>
        </div>
    );
}