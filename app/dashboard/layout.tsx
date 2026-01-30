'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Sidebar from '../../components/layout/sidebar'; // Yolunu kontrol et
import Header from '../../components/layout/header';   // Yolunu kontrol et
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
                        // Profil hiç yoksa (Google ile ilk giriş vb.)
                        // Onboarding sayfası yoksa direkt profili oluşturacak bir ara sayfaya yönlendirilmeli
                        // Şimdilik subscription'a atıyoruz.
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

            // 1. ADIM: EKSİK BİLGİ KONTROLÜ (Google ile Gelenler İçin)
            // Eğer telefon yoksa veya hesap türü seçilmemişse -> Ayarlara gitmeye zorla
            // Not: Adminler bu kuraldan muaftır.
            const isInfoMissing = !profile.phone || !profile.accountType;
            if (profile.role !== 'admin' && isInfoMissing && pathname !== '/settings') {
                // Eğer /settings sayfasında değilse oraya at
                // (Kullanıcıya bir uyarı modal'ı göstermek daha şık olur ama şimdilik redirect yapıyoruz)
                 router.push('/settings'); 
                // NOT: Eğer settings sayfan hazır değilse bu satırı yorum satırı yap, yoksa sonsuz döngüye girer.
            }

            // 2. ADIM: LİSANS / ÖDEME KONTROLÜ (Para Yoksa Hizmet Yok)
            // Admin değilse VE (Lisans tarihi yoksa VEYA Lisans tarihi geçmişse)
            const now = new Date();
            const licenseDate = profile.licenseEndsAt ? profile.licenseEndsAt.toDate() : null;
            const isLicenseExpired = !licenseDate || licenseDate < now;

            if (profile.role !== 'admin' && isLicenseExpired) {
                // Eğer kullanıcı şu an '/subscription' sayfasında değilse, oraya zorla at.
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

    // LİSANS YOKSA SADECE ABONELİK SAYFASINI GÖSTER (Sidebar Gizlenebilir veya Kilitli Görünebilir)
    // Aşağıdaki mantık: Lisans yoksa Sidebar'ı render etme veya kısıtlı render et.
    const isLicenseValid = profile?.role === 'admin' || (profile?.licenseEndsAt && profile.licenseEndsAt.toDate() > new Date());

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* LİSANS YOKSA SIDEBAR'I GİZLE Kİ KAÇAMASIN */}
            {isLicenseValid && <Sidebar userRole={profile?.role} />}

            <div className={`flex-1 flex flex-col transition-all duration-300 ${isLicenseValid ? 'ml-0 md:ml-64' : 'w-full'}`}>
                {isLicenseValid && <Header user={profile} />}

                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    {/* LİSANS YOK UYARISI (Eğer Subscription sayfasında değilse) */}
                    {!isLicenseValid && pathname !== '/subscription' ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <LockKeyhole className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Deneme Süreniz Sona Erdi</h2>
                            <p className="text-slate-500 max-w-md">Sistemi kullanmaya devam etmek için lütfen bir paket seçiniz.</p>
                            <button onClick={() => router.push('/subscription')} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold">Paketleri İncele</button>
                        </div>
                    ) : (
                        children
                    )}
                </main>
            </div>
        </div>
    );
}