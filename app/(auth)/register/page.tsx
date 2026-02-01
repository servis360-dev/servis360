''use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    createUserWithEmailAndPassword,
    updateProfile,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { auth, db } from '../../../lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import {
    Mail,
    Lock,
    User,
    Building2,
    Phone,
    Briefcase,
    ArrowRight,
    Loader2,
    LayoutDashboard,
    CheckCircle2,
    AlertCircle,
    Store,
    Building
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
        companyName: '',
        accountType: 'individual', // individual, business, corporate
        sectorType: 'technical_service'
    });

    // --- YARDIMCI: Davet ve IP Kontrolü ---
    const checkInvitationAndGetIP = async (email: string) => {
        let clientIp = '0.0.0.0';
        try {
            const ipRes = await fetch('https://api.ipify.org?format=json');
            const ipData = await ipRes.json();
            clientIp = ipData.ip;
        } catch (e) { console.error("IP alınamadı", e); }

        let isStaff = false;
        let staffData: any = null;

        try {
            // Davetiyeleri kontrol et
            const inviteRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'invitations', email);
            const inviteSnap = await getDoc(inviteRef);
            if (inviteSnap.exists()) {
                isStaff = true;
                staffData = inviteSnap.data();
            }
        } catch (e) { console.error("Davet kontrol hatası", e); }

        return { clientIp, isStaff, staffData };
    };

    // --- SENARYO 1: E-POSTA İLE KAYIT (Manuel) ---
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // 1. Davetiye Kontrolü
            const { clientIp, isStaff, staffData } = await checkInvitationAndGetIP(formData.email);

            // 2. Firebase Auth Oluştur
            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: formData.fullName });

            // 3. Rol ve Şirket Belirleme (Kritik Adım)
            let finalRole = 'owner';
            let finalCompanyId = user.uid; // Patron ise kendi ID'si şirket ID'sidir
            let finalOwnerId = user.uid;   // Varsayılan olarak kendisi (Dashboard veriyi buradan çeker)
            let finalCompanyName = formData.companyName;
            let finalAccountType = formData.accountType;
            let finalSector = formData.sectorType;

            // EĞER DAVETLİ BİR PERSONEL İSE:
            if (isStaff) {
                finalRole = staffData.assignedRole;         // Patronun verdiği rol (tekniker, satis vb.)
                finalCompanyId = staffData.targetCompanyId; // Patronun ID'si
                finalOwnerId = staffData.targetCompanyId;   // Verilerin çekileceği asıl ID (Patronun verisi)
                finalCompanyName = staffData.targetCompanyName;
                finalSector = staffData.targetSector;
                finalAccountType = 'corporate';             // Personel kurumsal statüdedir
            } else if (finalAccountType === 'individual') {
                finalCompanyName = 'Bireysel Hesap';
                finalRole = 'individual'; // 🔥 GÜNCELLEME: Bireysel kullanıcı için rolü 'individual' olarak sabitliyoruz.
            }

            // 4. Firestore Profil Kaydı
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), {
                uid: user.uid,
                email: user.email,
                fullName: formData.fullName,
                phone: formData.phone,

                // Şirket Bağlantıları
                companyId: finalCompanyId,
                ownerId: finalOwnerId, // 🔥 Dashboard bu ID'ye bakarak verileri çekecek
                companyName: finalCompanyName,

                accountType: finalAccountType,
                sectorType: finalSector,
                role: finalRole,
                status: 'active',
                createdAt: serverTimestamp(),
                licenseEndsAt: null // Personelin lisansı patrona bağlıdır (Bireysel/Patron için null başlar, sonra satın alır)
            });

            // 5. Public Directory (Admin Paneli İçin)
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', user.uid), {
                id: user.uid,
                uid: user.uid,
                fullName: formData.fullName,
                email: user.email,
                phone: formData.phone,
                companyName: finalCompanyName,
                accountType: finalAccountType,
                role: finalRole,
                status: 'active',
                ip: clientIp,
                location: 'TR',
                createdAt: serverTimestamp()
            });

            // 6. Personel Listesini Güncelle (Eğer davetliyse, 'invited' -> 'active')
            if (isStaff) {
                try {
                    await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', finalCompanyId, 'staff', formData.email), {
                        status: 'active',
                        uid: user.uid,
                        joinedAt: serverTimestamp()
                    });

                    // Davetiye dosyasını temizle (İsteğe bağlı, güvenlik için kalabilir veya silinebilir)
                    // await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'invitations', formData.email));
                } catch (e) { console.error("Personel güncelleme hatası", e); }
            }

            router.push('/dashboard');

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') setError('Bu e-posta adresi zaten kullanımda.');
            else if (err.code === 'auth/weak-password') setError('Şifre en az 6 karakter olmalıdır.');
            else setError('Kayıt işlemi başarısız. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    // --- SENARYO 2: SOSYAL MEDYA (Google/Apple) ---
    const handleSocialLogin = async (providerName: 'google' | 'apple') => {
        setLoading(true);
        setError('');
        try {
            const provider = providerName === 'google' ? new GoogleAuthProvider() : new OAuthProvider('apple.com');
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Zaten profili var mı?
            const profileSnap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'));

            if (profileSnap.exists()) {
                router.push('/dashboard');
                return;
            }

            // Profil YOK. Davetli mi diye bakalım.
            const { clientIp, isStaff, staffData } = await checkInvitationAndGetIP(user.email || '');

            if (isStaff) {
                // EĞER PERSONEL İSE: Profili otomatik oluştur ve içeri al
                await setDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), {
                    uid: user.uid,
                    email: user.email,
                    fullName: user.displayName || 'İsimsiz Personel',
                    phone: '', // Google'dan gelmez, panelde sorarız

                    // Şirket Bağlantıları
                    companyId: staffData.targetCompanyId,
                    ownerId: staffData.targetCompanyId, // 🔥 Patronun ID'si
                    companyName: staffData.targetCompanyName,

                    accountType: 'corporate',
                    sectorType: staffData.targetSector,
                    role: staffData.assignedRole,
                    status: 'active',
                    createdAt: serverTimestamp()
                });

                // Public Directory kaydı
                await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', user.uid), {
                    id: user.uid,
                    uid: user.uid,
                    fullName: user.displayName,
                    email: user.email,
                    phone: '',
                    companyName: staffData.targetCompanyName,
                    accountType: 'corporate',
                    role: staffData.assignedRole,
                    status: 'active',
                    ip: clientIp,
                    createdAt: serverTimestamp()
                });

                // Davet durumunu güncelle
                await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', staffData.targetCompanyId, 'staff', user.email!), {
                    status: 'active',
                    uid: user.uid,
                    joinedAt: serverTimestamp()
                });

                router.push('/dashboard');
            } else {
                // Davetli DEĞİL ve Yeni Kullanıcı -> Onboarding'e gönder
                router.push('/onboarding');
            }

        } catch (err: any) {
            console.error(err);
            setError(`${providerName === 'google' ? 'Google' : 'Apple'} ile kayıt olunamadı.`);
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-white dark:bg-slate-950 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">

            {/* SOL TARAF (GÖRSEL) */}
            <div className="hidden lg:flex w-[55%] relative bg-slate-900 overflow-hidden flex-col justify-between p-16 text-white">
                <div className="absolute top-0 left-0 w-full h-full z-0">
                    <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse duration-10000"></div>
                    <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] mix-blend-screen"></div>
                </div>

                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/20 border border-white/10 backdrop-blur-sm">
                        <LayoutDashboard className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-white">Servis360</span>
                </div>

                <div className="relative z-10 my-auto">
                    <h1 className="text-6xl font-extrabold leading-[1.1] mb-6 tracking-tight">
                        Şimdi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Kontrol</span> Sizde.
                    </h1>
                    <p className="text-lg text-slate-400 mb-10 max-w-lg leading-relaxed">
                        Binlerce işletme Servis360 ile teknik servis, stok ve finans süreçlerini optimize ediyor. Hemen katılın.
                    </p>

                    <div className="space-y-4 max-w-md">
                        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="p-2 bg-green-500/20 rounded-lg"><CheckCircle2 className="w-5 h-5 text-green-400" /></div>
                            <div><h3 className="font-bold text-white text-sm">Ücretsiz Deneme</h3><p className="text-slate-400 text-xs">Kredi kartı gerekmez.</p></div>
                        </div>
                        <div className="flex items-center gap-4 bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="p-2 bg-blue-500/20 rounded-lg"><CheckCircle2 className="w-5 h-5 text-blue-400" /></div>
                            <div><h3 className="font-bold text-white text-sm">Kolay Kurulum</h3><p className="text-slate-400 text-xs">1 dakikada hesabınız hazır.</p></div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 text-xs text-slate-500 border-t border-white/10 pt-6">
                    <p>© 2024 Servis360 Inc. Tüm hakları saklıdır.</p>
                </div>
            </div>

            {/* SAĞ TARAF (FORM) */}
            <div className="w-full lg:w-[45%] flex flex-col items-center px-8 lg:px-12 bg-white dark:bg-slate-950 relative overflow-y-auto h-screen py-12">

                <div className="max-w-[440px] w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Hesap Oluştur</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Bilgilerinizi girerek hemen başlayın.</p>
                    </div>

                    {/* SOCIAL LOGIN */}
                    <div className="grid grid-cols-2 gap-4">
                        <button onClick={() => handleSocialLogin('google')} disabled={loading} className="flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Google</span>
                        </button>
                        <button onClick={() => handleSocialLogin('apple')} disabled={loading} className="flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                            <svg className="w-5 h-5 text-black dark:text-white fill-current" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.21-.93 3.69-.93.95 0 2.58.55 3.59 1.93-3.21 1.77-2.66 6.32.74 7.72-.51 1.41-1.39 2.82-3.1 3.51zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Apple</span>
                        </button>
                    </div>

                    <div className="relative flex items-center gap-4"><div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div><span className="text-xs font-medium text-slate-400 uppercase">veya formu doldurun</span><div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div></div>

                    {error && (<div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm"><AlertCircle className="w-5 h-5 flex-shrink-0" /><p>{error}</p></div>)}

                    {/* HESAP TÜRÜ SEÇİCİ */}
                    <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                        {[
                            { id: 'individual', label: 'Bireysel', icon: User },
                            { id: 'business', label: 'Esnaf', icon: Store },
                            { id: 'corporate', label: 'Kurumsal', icon: Building }
                        ].map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setFormData({ ...formData, accountType: type.id })}
                                className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-lg text-xs font-bold transition-all ${formData.accountType === type.id ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-white ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                            >
                                <type.icon className="w-4 h-4" />
                                {type.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Ad Soyad</label>
                                <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} type="text" className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white" placeholder="John Doe" /></div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Telefon</label>
                                <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} type="tel" className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white" placeholder="555 123..." /></div>
                            </div>
                        </div>

                        {formData.accountType !== 'individual' && (
                            <div className="space-y-4 animate-in slide-in-from-top-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Firma Adı</label>
                                    <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input required value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} type="text" className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white" placeholder="Şirketinizin Adı" /></div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Sektör</label>
                                    <div className="relative"><Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><select value={formData.sectorType} onChange={(e) => setFormData({ ...formData, sectorType: e.target.value })} className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white appearance-none"><option value="technical_service">Teknik Servis</option><option value="retail_wholesale">Perakende / Toptan</option><option value="beauty_health">Güzellik / Sağlık</option><option value="auto_rental">Oto Galeri / Yıkama</option><option value="other">Diğer</option></select></div>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">E-Posta</label>
                            <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} type="email" className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white" placeholder="info@sirket.com" /></div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">Şifre</label>
                            <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} type="password" className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white" placeholder="••••••••" /></div>
                        </div>

                        <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 text-sm mt-2">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Kayıt Ol <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </form>

                    <div className="text-center pb-8">
                        <p className="text-sm text-slate-500">Zaten hesabınız var mı? <Link href="/login" className="font-bold text-blue-600 hover:text-blue-700 hover:underline">Giriş Yap</Link></p>
                    </div>
                </div>
            </div>
        </div>
    );
}