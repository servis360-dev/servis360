'use client';

import { useState, useEffect } from 'react';
import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    sendEmailVerification,
    User
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, Timestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Loader2, Mail, Lock, User as UserIcon, Phone,
    Briefcase, ArrowRight, LayoutDashboard,
    CheckCircle2, Globe, Building2, Store, Users
} from 'lucide-react';

export default function RegisterPage() {
    // Form Verileri
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        companyName: '' // Firma Adı
    });

    // Seçimler
    const [accountType, setAccountType] = useState<'individual' | 'business'>('business');
    const [sectorType, setSectorType] = useState('technical_service');
    const [countryCode, setCountryCode] = useState('+90');

    // Captcha
    const [captcha, setCaptcha] = useState({ num1: 0, num2: 0, answer: '' });

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);
    const router = useRouter();

    useEffect(() => { generateCaptcha(); }, []);

    const generateCaptcha = () => {
        setCaptcha({ num1: Math.floor(Math.random() * 10), num2: Math.floor(Math.random() * 10), answer: '' });
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, phone: e.target.value.replace(/[^0-9]/g, '') });
    };

    const createProfile = async (user: User, isSocialLogin = false) => {
        const userRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile');
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) return;

        const licenseEndsAt = new Date();
        licenseEndsAt.setDate(licenseEndsAt.getDate() + 14);
        const fullPhone = isSocialLogin ? '' : `${countryCode}${formData.phone}`;

        // PROFİL VERİSİ (Sektör ve Tip burada saklanıyor)
        const profileData = {
            uid: user.uid,
            email: user.email || formData.email,
            fullName: user.displayName || formData.fullName,
            phone: fullPhone,
            companyName: formData.companyName || (accountType === 'individual' ? 'Bireysel Hesap' : 'İsimsiz Firma'),

            // KRİTİK AYARLAR:
            accountType: accountType, // individual (Bireysel) - business (Esnaf)
            sectorType: sectorType,   // technical, retail, beauty, auto
            role: 'patron',

            status: 'active', // Pending payment yapılabilir
            licenseEndsAt: Timestamp.fromDate(licenseEndsAt),
            createdAt: serverTimestamp(),
            emailVerified: user.emailVerified
        };

        await setDoc(userRef, profileData);

        // Admin Rehberi İçin
        await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', user.uid), {
            uid: user.uid,
            fullName: profileData.fullName,
            companyName: profileData.companyName,
            email: profileData.email,
            sectorType: sectorType, // Admin sektörleri görsün
            status: 'active',
            role: 'patron',
            licenseEndsAt: Timestamp.fromDate(licenseEndsAt),
            createdAt: serverTimestamp()
        });
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError('');

        if (parseInt(captcha.answer) !== captcha.num1 + captcha.num2) {
            setError('Güvenlik sorusu yanlış.'); generateCaptcha(); setLoading(false); return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            await sendEmailVerification(userCredential.user);
            await createProfile(userCredential.user);
            setVerificationSent(true);
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') setError('E-posta kullanımda.');
            else if (err.code === 'auth/weak-password') setError('Şifre zayıf.');
            else setError('Kayıt hatası.');
        } finally {
            setLoading(false);
        }
    };

    const handleSocialRegister = async (providerName: 'google' | 'apple') => {
        setLoading(true); setError('');
        try {
            const provider = providerName === 'google' ? new GoogleAuthProvider() : new OAuthProvider('apple.com');
            const result = await signInWithPopup(auth, provider);
            await createProfile(result.user, true);
            router.push('/dashboard');
        } catch (err: any) {
            setError(`${providerName} kayıt hatası.`); setLoading(false);
        }
    };

    if (verificationSent) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md text-center border border-slate-200 dark:border-slate-700">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Doğrulama Linki Gönderildi!</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6 text-sm">
                        <strong>{formData.email}</strong> adresine gelen linke tıklayarak hesabınızı aktif edin.
                    </p>
                    <Link href="/login" className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                        Giriş Ekranına Dön
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full bg-white dark:bg-slate-950 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">

            {/* SOL TARAF: Tanıtım (Desktop) */}
            <div className="hidden lg:flex w-[40%] bg-slate-900 relative flex-col justify-between p-12 text-white overflow-hidden fixed h-full">
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
                </div>
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><LayoutDashboard className="w-6 h-6 text-white" /></div>
                    <span className="text-xl font-bold tracking-tight">Servis360</span>
                </div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold leading-tight mb-4">Sektörün <span className="text-blue-400">Ne Olursa Olsun.</span></h1>
                    <p className="text-slate-400 mb-6">Teknik servis, toptancı, berber veya freelancer... İşini cebinden yönet.</p>
                    <ul className="space-y-3 text-slate-300 text-sm">
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Sektöre Özel Ekranlar</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Stok ve Kasa Takibi</li>
                        <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Proforma Fatura Oluşturma</li>
                    </ul>
                </div>
                <div className="relative z-10 text-xs text-slate-500">© 2024 Servis360 Teknoloji A.Ş.</div>
            </div>

            {/* SAĞ TARAF: Form */}
            <div className="w-full lg:w-[60%] lg:ml-[40%] flex flex-col justify-center items-center px-4 lg:px-20 py-10 bg-white dark:bg-slate-950 min-h-screen">
                <div className="max-w-md w-full">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Hesap Oluştur</h2>
                        <p className="text-slate-500 text-sm">14 Gün Ücretsiz Deneme</p>
                    </div>

                    {/* Hesap Tipi Seçimi */}
                    <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                        <button
                            onClick={() => setAccountType('individual')}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${accountType === 'individual' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <UserIcon className="w-4 h-4" /> Bireysel
                        </button>
                        <button
                            onClick={() => setAccountType('business')}
                            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${accountType === 'business' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Store className="w-4 h-4" /> Kurumsal / Esnaf
                        </button>
                    </div>

                    {/* Sosyal Giriş */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button onClick={() => handleSocialRegister('google')} className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <span className="text-sm font-medium text-slate-700 dark:text-white">Google</span>
                        </button>
                        <button onClick={() => handleSocialRegister('apple')} className="flex items-center justify-center gap-2 py-2.5 px-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                            <span className="text-sm font-medium text-slate-700 dark:text-white">Apple</span>
                        </button>
                    </div>

                    <div className="relative flex items-center gap-4 mb-6">
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">veya form doldur</span>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                    </div>

                    {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">{error}</div>}

                    <form onSubmit={handleRegister} className="space-y-4">

                        {/* Dinamik Sektör Seçimi (Sadece Kurumsal ise görünür) */}
                        {accountType === 'business' && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 ml-1">İŞLETME TÜRÜ</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                    <select
                                        className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none appearance-none"
                                        value={sectorType}
                                        onChange={(e) => setSectorType(e.target.value)}
                                    >
                                        <option value="technical_service">🛠️ Teknik Servis / Tamir</option>
                                        <option value="retail_wholesale">📦 Perakende / Toptan / Büfe</option>
                                        <option value="beauty_health">💇‍♀️ Güzellik / Kuaför / Sağlık</option>
                                        <option value="auto_rental">🚗 Oto Tamir / Galeri / Kiralama</option>
                                        <option value="other">✨ Diğer İşletmeler</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Ad Soyad & Firma Adı */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 ml-1">AD SOYAD</label>
                                <input required type="text" placeholder="Adınız" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none" />
                            </div>
                            {accountType === 'business' && (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 ml-1">FİRMA ADI</label>
                                    <input required type="text" placeholder="Firma Adı" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none" />
                                </div>
                            )}
                        </div>

                        {/* Telefon */}
                        <div>
                            <label className="text-xs font-bold text-slate-500 ml-1">TELEFON</label>
                            <div className="flex">
                                <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="w-24 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-l-lg text-sm outline-none">
                                    <option value="+90">🇹🇷 +90</option>
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+49">🇩🇪 +49</option>
                                    <option value="+994">🇦🇿 +994</option>
                                </select>
                                <input required type="tel" placeholder="555 123 4567" value={formData.phone} onChange={handlePhoneChange} className="flex-1 p-2.5 bg-slate-50 dark:bg-slate-900 border-y border-r border-slate-200 dark:border-slate-800 rounded-r-lg text-sm outline-none" />
                            </div>
                        </div>

                        {/* E-Posta & Şifre */}
                        <div className="space-y-4">
                            <input required type="email" placeholder="E-posta Adresi" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none" />
                            <input required type="password" placeholder="Şifre (En az 6 karakter)" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm outline-none" />
                        </div>

                        {/* Captcha */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-500">ROBOT KONTROLÜ: {captcha.num1} + {captcha.num2} = ?</span>
                            <input required type="number" placeholder="Sonuç" value={captcha.answer} onChange={(e) => setCaptcha({ ...captcha, answer: e.target.value })} className="w-20 p-1 text-center text-sm font-bold bg-white dark:bg-slate-800 border rounded outline-none" />
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-70">
                            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <>Üyeliği Başlat <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-slate-500">Zaten üye misin? <Link href="/login" className="text-blue-600 font-bold hover:underline">Giriş Yap</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}