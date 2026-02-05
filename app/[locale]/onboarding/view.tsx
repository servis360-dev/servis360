'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { User, Store, Building2, CheckCircle2, Loader2 } from 'lucide-react';

export default function OnboardingView({ dict, locale }: { dict: any, locale: string }) {
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
                    router.push(`/${locale}/dashboard`);
                }
            } else {
                router.push(`/${locale}/login`);
            }
        });
        return () => unsub();
    }, [router, locale]);

    const handleSave = async () => {
        if (!selectedType || !user) return;
        setLoading(true);

        try {
            // 1. Profil Kaydı Oluştur (accountType ile)
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), {
                uid: user.uid, // UID garantilemek için
                email: user.email,
                accountType: selectedType, // 'individual', 'esnaf', 'corporate'
                role: 'owner', // İlk açan patron olur
                createdAt: serverTimestamp(),
                setupCompleted: true
            }, { merge: true });

            // 2. Genel Dizine Kayıt (Admin görsün diye)
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', user.uid), {
                id: user.uid,
                uid: user.uid,
                email: user.email,
                accountType: selectedType,
                status: 'active',
                createdAt: serverTimestamp()
            }, { merge: true });

            router.push(`/${locale}/dashboard`);
        } catch (error) {
            console.error("Hata:", error);
            alert(dict.onboarding.alert_error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-sans">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{dict.onboarding.title}</h1>
                    <p className="text-slate-500 text-lg">{dict.onboarding.subtitle}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {/* BİREYSEL */}
                    <div
                        onClick={() => setSelectedType('individual')}
                        className={`cursor-pointer p-6 rounded-2xl border-2 transition-all hover:scale-105 animate-in fade-in zoom-in duration-500 delay-100 ${selectedType === 'individual' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-xl' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-blue-400'}`}
                    >
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-4">
                            <User className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{dict.onboarding.individual_title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 h-10">{dict.onboarding.individual_desc}</p>
                        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> {dict.onboarding.individual_f1}</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> {dict.onboarding.individual_f2}</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> {dict.onboarding.individual_f3}</li>
                        </ul>
                    </div>

                    {/* ESNAF */}
                    <div
                        onClick={() => setSelectedType('esnaf')}
                        className={`cursor-pointer p-6 rounded-2xl border-2 transition-all hover:scale-105 animate-in fade-in zoom-in duration-500 delay-200 ${selectedType === 'esnaf' ? 'border-orange-600 bg-orange-50 dark:bg-orange-900/20 shadow-xl' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-orange-400'}`}
                    >
                        <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center mb-4">
                            <Store className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{dict.onboarding.business_title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 h-10">{dict.onboarding.business_desc}</p>
                        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> {dict.onboarding.business_f1}</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> {dict.onboarding.business_f2}</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> {dict.onboarding.business_f3}</li>
                        </ul>
                    </div>

                    {/* KURUMSAL */}
                    <div
                        onClick={() => setSelectedType('corporate')}
                        className={`cursor-pointer p-6 rounded-2xl border-2 transition-all hover:scale-105 animate-in fade-in zoom-in duration-500 delay-300 ${selectedType === 'corporate' ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 shadow-xl' : 'border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-purple-400'}`}
                    >
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-4">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{dict.onboarding.corporate_title}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 h-10">{dict.onboarding.corporate_desc}</p>
                        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-2">
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> {dict.onboarding.corporate_f1}</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> {dict.onboarding.corporate_f2}</li>
                            <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500" /> {dict.onboarding.corporate_f3}</li>
                        </ul>
                    </div>
                </div>

                <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                    <button
                        onClick={handleSave}
                        disabled={!selectedType || loading}
                        className="px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                    >
                        {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : dict.onboarding.btn_continue}
                    </button>
                </div>
            </div>
        </div>
    );
}