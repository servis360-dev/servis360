'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { User, Store, Building2, CheckCircle2, Loader2 } from 'lucide-react';

export default function OnboardingPage() {
    const [loading, setLoading] = useState(false);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Eğer zaten profili varsa dashboard'a at
                const docSnap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile'));
                if (docSnap.exists() && docSnap.data().accountType) {
                    router.push('/dashboard');
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsub();
    }, [router]);

    const handleSave = async () => {
        if (!selectedType || !user) return;
        setLoading(true);

        try {
            // 1. Profil Kaydı Oluştur (accountType ile)
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), {
                email: user.email,
                accountType: selectedType, // 'individual', 'esnaf', 'corporate'
                role: 'owner', // İlk açan patron olur
                createdAt: serverTimestamp(),
                setupCompleted: true
            }, { merge: true });

            // 2. Genel Dizine Kayıt (Admin görsün diye)
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', user.uid), {
                email: user.email,
                accountType: selectedType,
                status: 'active',
                createdAt: serverTimestamp()
            }, { merge: true });

            router.push('/dashboard');
        } catch (error) {
            console.error("Hata:", error);
            alert("Kurulum sırasında bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Servis360'a Hoş Geldiniz! 👋</h1>
                    <p className="text-slate-500 text-lg">Size en uygun deneyimi sunabilmemiz için hesap türünüzü seçin.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {/* BİREYSEL */}
                    <div
                        onClick={() => setSelectedType('individual')}
                        className={`cursor-pointer p-6 rounded-2xl border-2 transition-all hover:scale-105 ${selectedType === 'individual' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-blue-400'}`}
                    >
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                            <User className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Bireysel</h3>
                        <p className="text-sm text-slate-500 mb-4">Kendi gelir/giderini, aboneliklerini ve notlarını takip etmek isteyenler için.</p>
                        <ul className="text-xs text-slate-500 space-y-2">
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Kişisel Finans</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Abonelik Takibi</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Rehber & Notlar</li>
                        </ul>
                    </div>

                    {/* ESNAF */}
                    <div
                        onClick={() => setSelectedType('esnaf')}
                        className={`cursor-pointer p-6 rounded-2xl border-2 transition-all hover:scale-105 ${selectedType === 'esnaf' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-orange-400'}`}
                    >
                        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4">
                            <Store className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Esnaf / KOBİ</h3>
                        <p className="text-sm text-slate-500 mb-4">Tek şubeli dükkanlar, tamirciler ve hizmet verenler için.</p>
                        <ul className="text-xs text-slate-500 space-y-2">
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> İş Emirleri & Randevu</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Teklif Hazırlama</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Stok & Müşteri Takibi</li>
                        </ul>
                    </div>

                    {/* KURUMSAL */}
                    <div
                        onClick={() => setSelectedType('corporate')}
                        className={`cursor-pointer p-6 rounded-2xl border-2 transition-all hover:scale-105 ${selectedType === 'corporate' ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-purple-400'}`}
                    >
                        <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Kurumsal</h3>
                        <p className="text-sm text-slate-500 mb-4">Çok şubeli, personelli ve departmanlı büyük işletmeler için.</p>
                        <ul className="text-xs text-slate-500 space-y-2">
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Her Şey Dahil Panel</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Personel & Yetkilendirme</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> Şube Yönetimi</li>
                        </ul>
                    </div>
                </div>

                <div className="flex justify-center">
                    <button
                        onClick={handleSave}
                        disabled={!selectedType || loading}
                        className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Devam Et ve Paneli Hazırla'}
                    </button>
                </div>
            </div>
        </div>
    );
}