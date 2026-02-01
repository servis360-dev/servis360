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

    // 🔒 YÖNLENDİRME VE GÜVENLİK MANTIĞI
    useEffect(() => {
        if (!loading && profile) {
            const now = new Date();
            const licenseDate = profile.licenseEndsAt ? profile.licenseEndsAt.toDate() : null;

            // 🔥 GÜNCEL PERSONEL LİSTESİ (Tüm olası rolleri ekledik)
            const staffRoles = [
                'staff', 'personnel', 'employee', // Genel
                'technical', 'technician', 'teknik', // Teknik Servis
                'sales', 'satis', // Satış
                'accountant', 'accounting', 'muhasebe' // Muhasebe
            ];
            const isStaff = staffRoles.includes(profile.role);

            // İşletme Sahibi mi?
            const isBusinessOwner = ['admin', 'corporate', 'esnaf', 'business'].includes(profile.role) ||
                ['esnaf', 'corporate', 'business'].includes(profile.accountType);

            // 1. ZORUNLU BİLGİ KONTROLÜ (TELEFON & FİRMA ADI)
            // ----------------------------------------------------
            // Telefon numarası boşsa veya sadece boşluksa eksik kabul et
            const isPhoneMissing = !profile.phone || profile.phone.trim() === '';

            // İşletme sahipleri için Firma Adı da zorunlu (Personel hariç)
            const isCompanyMissing = isBusinessOwner && !isStaff && (!profile.companyName || profile.companyName.trim() === '');

            const isProfileIncomplete = isPhoneMissing || isCompanyMissing;

            // EĞER BİLGİ EKSİKSE -> AYARLAR SAYFASINA KİLİTLE
            if (isProfileIncomplete) {
                if (pathname !== '/dashboard/settings') {
                    router.push('/dashboard/settings');
                }
                return; // Başka kontrol yapma, buradan çık.
            }

            // 2. LİSANS KONTROLÜ
            // ----------------------------------------------------
            // Eğer personel veya admin DEĞİLSE lisans süresini kontrol et
            // Personel (isStaff) ise lisans kontrolünü atla (Patronun lisansına bağlıdır, o kontrolü işlem yaparken yapıyoruz)
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

    const staffRoles = [
        'staff', 'personnel', 'employee',
        'technical', 'technician', 'teknik',
        'sales', 'satis',
        'accountant', 'accounting', 'muhasebe'
    ];
    const isStaff = staffRoles.includes(profile?.role);

    // Lisans geçerli mi? 
    // Personel ise her zaman geçerli say (ekran kilidini açar, işlem kısıtı içeride yapılır)
    const isLicenseValid = isStaff ||
        profile?.role === 'super_admin' ||
        profile?.role === 'admin' ||
        (profile?.licenseEndsAt && profile.licenseEndsAt.toDate() > new Date());

    // Profil eksik mi?
    const isBusinessOwner = ['admin', 'corporate', 'esnaf', 'business'].includes(profile?.role) ||
        ['esnaf', 'corporate', 'business'].includes(profile?.accountType);

    const isPhoneMissing = !profile?.phone || profile?.phone.trim() === '';
    const isCompanyMissing = isBusinessOwner && !isStaff && (!profile?.companyName || profile?.companyName.trim() === '');
    const isIncomplete = isPhoneMissing || isCompanyMissing;

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Sidebar her zaman gösterilir (Çıkış yapabilmesi için) */}
            <Sidebar
                userRole={profile?.role}
                userProfile={profile}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />

            <div className={`flex-1 flex flex-col transition-all duration-300 ml-0 md:ml-64`}>
                <Header
                    user={profile}
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                />

                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    {/* ZORUNLU PROFİL UYARISI (Sadece Settings sayfasında görünür) */}
                    {isIncomplete && pathname === '/dashboard/settings' && (
                        <div className="bg-red-900/10 border border-red-600/50 p-4 rounded-xl mb-6 flex items-start gap-3 animate-pulse">
                            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-500 flex-shrink-0 mt-1" />
                            <div>
                                <h3 className="font-bold text-red-600 dark:text-red-500">Giriş Yapılamıyor!</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                                    Sistemi kullanmaya başlamak için aşağıdaki bilgileri eksiksiz doldurmalısınız:
                                    <ul className="list-disc list-inside mt-2 font-bold text-slate-800 dark:text-white">
                                        {isPhoneMissing && <li>Telefon Numarası</li>}
                                        {isCompanyMissing && <li>Firma Adı</li>}
                                    </ul>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* EKRAN KİLİDİ (LİSANS) */}
                    {!isLicenseValid && !isIncomplete && pathname !== '/dashboard/subscription' ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 animate-in fade-in zoom-in duration-500 min-h-[70vh]">
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
                        // Eğer profil eksikse ve settings sayfasında DEĞİLSE (Redirect çalışana kadar) içeriği gizle
                        (isIncomplete && pathname !== '/dashboard/settings')
                            ? <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>
                            : children
                    )}
                </main>
            </div>
        </div>
    );
}