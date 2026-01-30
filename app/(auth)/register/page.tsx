'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { auth, db } from '../../lib/firebase'; // Yolun doğru olduğundan emin ol
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import {
    Mail,
    Lock,
    User,
    Building2,
    Phone,
    Briefcase,
    CheckCircle2,
    ArrowRight,
    Loader2
} from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form Verileri
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        companyName: '', // Sadece kurumsal için
        accountType: 'individual', // individual, business, corporate
        sectorType: 'technical_service' // technical_service, retail_wholesale, beauty_health, auto_rental, other
    });

    // Kayıt İşlemi
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. GERÇEK IP ADRESİNİ BUL 🌍
            let clientIp = '0.0.0.0';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                clientIp = ipData.ip;
            } catch (e) {
                console.error("IP alınamadı", e);
            }

            // 2. Firebase Auth ile Kullanıcı Oluştur
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            // 3. Profil Güncelle (DisplayName)
            await updateProfile(user, {
                displayName: formData.fullName
            });

            // 4. Firestore'a Detaylı Kayıt (Profil)
            // users/{uid}/users/profile
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), {
                uid: user.uid,
                email: user.email,
                fullName: formData.fullName,
                phone: formData.phone,
                companyName: formData.accountType === 'individual' ? '' : formData.companyName,
                accountType: formData.accountType,
                sectorType: formData.sectorType,
                role: 'owner', // İlk kaydolan patrondur
                status: 'active',
                createdAt: serverTimestamp(),
                licenseEndsAt: null // Deneme süresi veya satın alım sonrası dolar
            });

            // 5. Public Directory (Admin Paneli İçin Özet)
            // public/data/user_directory/{uid}
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', user.uid), {
                id: user.uid,
                uid: user.uid,
                fullName: formData.fullName,
                email: user.email,
                phone: formData.phone, // Telefon eklendi
                companyName: formData.accountType === 'individual' ? 'Bireysel' : formData.companyName,
                accountType: formData.accountType,
                role: 'owner',
                status: 'active',
                ip: clientIp, // Gerçek IP eklendi
                location: 'TR',
                createdAt: serverTimestamp()
            });

            // Başarılı
            alert("Kayıt başarılı! Giriş yapabilirsiniz.");
            router.push('/dashboard');

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError('Bu e-posta adresi zaten kullanımda.');
            } else if (err.code === 'auth/weak-password') {
                setError('Şifre en az 6 karakter olmalıdır.');
            } else {
                setError('Kayıt olurken bir hata oluştu. Lütfen tekrar deneyin.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-800">

                {/* Sol Taraf: Görsel & Bilgi */}
                <div className="hidden lg:flex flex-col justify-between p-10 bg-blue-600 text-white relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700 opacity-90"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 font-bold text-xl">S</div>
                            <h1 className="text-2xl font-bold tracking-tight">Servis360</h1>
                        </div>
                        <h2 className="text-4xl font-bold mb-4">İşinizi Yönetmenin <br /> En Akıllı Yolu.</h2>
                        <p className="text-blue-100 text-lg leading-relaxed mb-8">
                            Teknik servis, stok takibi, cari hesap ve müşteri yönetimi tek bir platformda.
                            Hemen ücretsiz başlayın.
                        </p>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                                <span>Sınırsız İş Emri ve Müşteri Kaydı</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                                <span>Gelir/Gider ve Kasa Takibi</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                                <CheckCircle2 className="w-6 h-6 text-green-400" />
                                <span>7/24 Teknik Destek</span>
                            </div>
                        </div>
                    </div>
                    <div className="relative z-10 text-xs text-blue-200 mt-10">
                        © 2024 Servis360 Teknoloji A.Ş.
                    </div>
                </div>

                {/* Sağ Taraf: Form */}
                <div className="p-8 lg:p-12 overflow-y-auto max-h-screen">
                    <div className="mb-8 text-center lg:text-left">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Hesap Oluştur</h2>
                        <p className="text-slate-500">Bilgilerinizi girerek hemen başlayın.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-5">

                        {/* HESAP TÜRÜ SEÇİMİ */}
                        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, accountType: 'individual' })}
                                className={`py-2 text-xs font-bold rounded-lg transition-all ${formData.accountType === 'individual' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-white' : 'text-slate-500'}`}
                            >
                                Bireysel
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, accountType: 'business' })}
                                className={`py-2 text-xs font-bold rounded-lg transition-all ${formData.accountType === 'business' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-white' : 'text-slate-500'}`}
                            >
                                Esnaf
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, accountType: 'corporate' })}
                                className={`py-2 text-xs font-bold rounded-lg transition-all ${formData.accountType === 'corporate' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-white' : 'text-slate-500'}`}
                            >
                                Kurumsal
                            </button>
                        </div>

                        {/* Ad Soyad */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Ad Soyad</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    required
                                    type="text"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    placeholder="Adınız Soyadınız"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Telefon */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Telefon</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    required
                                    type="tel"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    placeholder="0555 123 45 67"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Firma Adı (Sadece Ticari) */}
                        {formData.accountType !== 'individual' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Firma / İşletme Adı</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input
                                        required
                                        type="text"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                        placeholder="İşletmenizin Adı"
                                        value={formData.companyName}
                                        onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Sektör (Sadece Ticari) */}
                        {formData.accountType !== 'individual' && (
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Sektör</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <select
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white appearance-none"
                                        value={formData.sectorType}
                                        onChange={(e) => setFormData({ ...formData, sectorType: e.target.value })}
                                    >
                                        <option value="technical_service">Teknik Servis / Tamir</option>
                                        <option value="retail_wholesale">Market / Mağaza (Perakende)</option>
                                        <option value="beauty_health">Kuaför / Güzellik Merkezi</option>
                                        <option value="auto_rental">Oto Galeri / Kiralama / Yıkama</option>
                                        <option value="other">Diğer</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* E-Posta */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">E-Posta Adresi</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    required
                                    type="email"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    placeholder="ornek@sirket.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Şifre */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Şifre</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    required
                                    type="password"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 dark:text-white"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Kayıt Ol <ArrowRight className="w-5 h-5" /></>}
                        </button>

                        <div className="text-center mt-6">
                            <p className="text-slate-500 text-sm">
                                Zaten hesabınız var mı?{' '}
                                <Link href="/login" className="text-blue-600 font-bold hover:underline">
                                    Giriş Yap
                                </Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}