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
                // Kullanıcı profilini dinle
                const unsubProfile = onSnapshot(doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile'), (docSnap) => {
                    if (docSnap.exists()) {
                        setProfile(docSnap.data());
                    } else {
                        // Profil hiç yoksa aboneliğe/kuruluma yönlendir
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

    // YÖNLENDİRME VE GÜVENLİK MANTIĞI
    useEffect(() => {
        if (!loading && profile) {
            const now = new Date();
            const licenseDate = profile.licenseEndsAt ? profile.licenseEndsAt.toDate() : null;

            // Personel mi? (Personel ise abonelik ekranı çıkmaz, şirket lisansını kullanır)
            // Not: Veritabanında personel rolleri 'personel', 'technician', 'accounting' vb. olarak tutuluyorsa buraya eklenmeli.
            const isStaff = ['personel', 'technician', 'accounting', 'staff'].includes(profile.role);

            // İşletme Sahibi mi? (Esnaf veya Kurumsal ana hesap)
            const isBusinessOwner = ['admin', 'corporate', 'esnaf', 'business'].includes(profile.role) ||
                ['esnaf', 'corporate', 'business'].includes(profile.accountType);

            // 1. ZORUNLU BİLGİ KONTROLÜ (Google Login Koruması)
            // - Herkes Telefon girmek zorunda.
            // - İşletme sahipleri Firma Adı girmek zorunda.
            // - Personel ise firma adı girmesine gerek yok (zaten bir firmaya bağlı), sadece telefon yeterli.
            const isPhoneMissing = !profile.phone;
            const isCompanyMissing = isBusinessOwner && !isStaff && !profile.companyName;

            const isProfileIncomplete = isPhoneMissing || isCompanyMissing;

            // Eğer bilgi eksikse ve şu an Ayarlar sayfasında değilse -> Ayarlar'a at!
            if (isProfileIncomplete && pathname !== '/dashboard/settings') {
                router.push('/dashboard/settings');
                return;
            }

            // 2. Lisans Kontrolü
            // Eğer profil tamsa, ayarlar sayfasında değilse:
            // - Personel DEĞİLSE ve Admin DEĞİLSE -> Lisans tarihini kontrol et.
            if (!isStaff && profile.role !== 'admin' && profile.role !== 'super_admin') {
                const isLicenseExpired = !licenseDate || licenseDate < now;

                if (isLicenseExpired && pathname !== '/dashboard/subscription' && pathname !== '/dashboard/settings') {
                    router.push('/dashboard/subscription');
                }
            }
        }
    }, [loading, profile, pathname, router]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-10 h-10 text-blue-500 animate-spin" /></div>;
    }

    // --- RENDER MANTIĞI İÇİN DEĞİŞKENLER ---

    const isStaff = ['personel', 'technician', 'accounting', 'staff'].includes(profile?.role);

    // Lisans geçerli mi? 
    // Personel, Admin ve Super Admin için her zaman TRUE.
    // Diğerleri için tarih kontrolü.
    const isLicenseValid = isStaff ||
        profile?.role === 'super_admin' ||
        profile?.role === 'admin' ||
        (profile?.licenseEndsAt && profile.licenseEndsAt.toDate() > new Date());

    // Profil eksik mi?
    const isBusinessOwner = ['admin', 'corporate', 'esnaf', 'business'].includes(profile?.role) ||
        ['esnaf', 'corporate', 'business'].includes(profile?.accountType);

    const isIncomplete = !profile?.phone || (isBusinessOwner && !isStaff && !profile?.companyName);

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Sidebar her zaman gösterilir, içerik kilitli olsa bile ayarlara erişim için gereklidir */}
            {(isLicenseValid || isIncomplete) && (
                <Sidebar
                    userRole={profile?.role}
                    userProfile={profile} // Tüm profili gönderiyoruz ki AccountType'a göre menü değişebilsin
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
                                <p className="text-sm text-yellow-200/80">
                                    Sistemi kullanabilmek için lütfen
                                    <strong> Telefon Numaranızı</strong>
                                    {isBusinessOwner && !isStaff ? ' ve Firma Adınızı' : ''}
                                    girip kaydedin.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* LİSANS UYARISI EKRANI */}
                    {/* Lisans geçersizse, profil tam olsa bile, abonelik sayfası değilse -> Kilitle */}
                    {!isLicenseValid && !isIncomplete && pathname !== '/dashboard/subscription' ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in zoom-in duration-500 min-h-[80vh]">
                            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center border-4 border-red-50 dark:border-red-900/50 mb-4">
                                <LockKeyhole className="w-12 h-12 text-red-600 dark:text-red-500" />
                            </div>
                            <h2 className="text-4xl font-black text-slate-800 dark:text-white">Abonelik Gerekli</h2>
                            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg">
                                Verilerinize erişmek ve sistemi kullanmaya devam etmek için lütfen abonelik paketinizi seçin.
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