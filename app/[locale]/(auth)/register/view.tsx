'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    createUserWithEmailAndPassword,
    updateProfile,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    sendEmailVerification,
    signOut
} from 'firebase/auth';
import { auth, db } from '../../../../lib/firebase';
import { doc, setDoc, serverTimestamp, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
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
    Building,
    MailCheck,
    Smartphone,
    ShieldCheck
} from 'lucide-react';

export default function RegisterView({ dict, locale }: { dict: any, locale: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [verificationSent, setVerificationSent] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        companyName: '',
        accountType: 'individual',
        sectorType: 'technical_service'
    });

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
            const inviteRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'invitations', email);
            const inviteSnap = await getDoc(inviteRef);
            if (inviteSnap.exists()) {
                isStaff = true;
                staffData = inviteSnap.data();
            }
        } catch (e) { console.error("Davet kontrol hatası", e); }

        return { clientIp, isStaff, staffData };
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const { clientIp, isStaff, staffData } = await checkInvitationAndGetIP(formData.email);

            const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: formData.fullName });

            let finalRole = 'owner';
            let finalCompanyId = user.uid;
            let finalOwnerId = user.uid;
            let finalCompanyName = formData.companyName;
            let finalAccountType = formData.accountType;
            let finalSector = formData.sectorType;

            if (isStaff) {
                finalRole = staffData.assignedRole;
                finalCompanyId = staffData.targetCompanyId;
                finalOwnerId = staffData.targetCompanyId;
                finalCompanyName = staffData.targetCompanyName;
                finalSector = staffData.targetSector;
                finalAccountType = 'corporate';
            } else if (finalAccountType === 'individual') {
                finalCompanyName = 'Bireysel Hesap';
                finalRole = 'individual';
            }

            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), {
                uid: user.uid,
                email: user.email,
                fullName: formData.fullName,
                phone: formData.phone,
                companyId: finalCompanyId,
                ownerId: finalOwnerId,
                companyName: finalCompanyName,
                accountType: finalAccountType,
                sectorType: finalSector,
                role: finalRole,
                status: 'active',
                createdAt: serverTimestamp(),
                licenseEndsAt: null
            });

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
                location: locale.toUpperCase(),
                createdAt: serverTimestamp()
            });

            if (!isStaff) {
                try {
                    await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches'), {
                        name: 'Merkez',
                        address: '',
                        phone: formData.phone,
                        isHeadquarters: true,
                        createdAt: serverTimestamp(),
                        createdBy: user.uid
                    });
                } catch (branchError) {
                    console.error("Otomatik şube oluşturma hatası:", branchError);
                }
            }

            if (isStaff) {
                try {
                    await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', finalCompanyId, 'staff', formData.email), {
                        status: 'active',
                        uid: user.uid,
                        joinedAt: serverTimestamp()
                    });
                } catch (e) { console.error("Personel güncelleme hatası", e); }
            }

            await sendEmailVerification(user);
            await signOut(auth);
            setVerificationSent(true);

        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') setError(dict.auth.error_email_in_use);
            else if (err.code === 'auth/weak-password') setError(dict.auth.error_weak_password);
            else setError(dict.auth.error_register_generic);
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (providerName: 'google' | 'apple') => {
        setLoading(true);
        setError('');
        try {
            const provider = providerName === 'google' ? new GoogleAuthProvider() : new OAuthProvider('apple.com');
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            const profileSnap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'));

            if (profileSnap.exists()) {
                router.push(`/${locale}/dashboard`);
                return;
            }

            const { clientIp, isStaff, staffData } = await checkInvitationAndGetIP(user.email || '');

            if (isStaff) {
                // ... Mevcut personel kayıt mantığı
                router.push(`/${locale}/dashboard`);
            } else {
                router.push(`/${locale}/onboarding`);
            }

        } catch (err: any) {
            console.error(err);
            setError(dict.auth.error_provider.replace('{provider}', providerName === 'google' ? 'Google' : 'Apple'));
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full bg-white dark:bg-slate-950 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">

            {/* SOL TARAF */}
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
                        {dict.auth.hero_title.split('{highlight}')[0]}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{dict.auth.hero_highlight}</span>
                        {dict.auth.hero_title.split('{highlight}')[1]}
                    </h1>
                    <p className="text-lg text-slate-400 mb-10 max-w-lg leading-relaxed">
                        {dict.auth.hero_desc}
                    </p>
                    <div className="grid grid-cols-2 gap-4 max-w-md">
                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="p-2 bg-green-500/20 rounded-lg w-fit mb-3"><ShieldCheck className="w-5 h-5 text-green-400" /></div>
                            <h3 className="font-bold text-white text-sm">{dict.auth.feature_secure}</h3>
                            <p className="text-slate-400 text-xs mt-1">{dict.auth.feature_secure_desc}</p>
                        </div>
                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="p-2 bg-blue-500/20 rounded-lg w-fit mb-3"><Smartphone className="w-5 h-5 text-blue-400" /></div>
                            <h3 className="font-bold text-white text-sm">{dict.auth.feature_mobile}</h3>
                            <p className="text-slate-400 text-xs mt-1">{dict.auth.feature_mobile_desc}</p>
                        </div>
                    </div>
                </div>
                <div className="relative z-10 text-xs text-slate-500 border-t border-white/10 pt-6">
                    <p>© 2026 Servis360 Inc.</p>
                </div>
            </div>

            {/* SAĞ TARAF */}
            <div className="w-full lg:w-[45%] flex flex-col items-center px-8 lg:px-12 bg-white dark:bg-slate-950 relative overflow-y-auto h-screen py-12">

                {verificationSent ? (
                    <div className="max-w-[440px] w-full flex flex-col items-center justify-center h-full space-y-6 animate-in fade-in zoom-in duration-500 text-center">
                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-2">
                            <MailCheck className="w-10 h-10 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{dict.auth.verify_title}</h2>
                        <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 w-full">
                            <p className="text-slate-600 dark:text-slate-300 mb-4">
                                <span className="font-bold text-slate-900 dark:text-white">{formData.email}</span> {dict.auth.verify_text.replace('{email}', '')}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                {dict.auth.verify_subtext}
                            </p>
                        </div>
                        <Link href={`/${locale}/login`} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95">
                            {dict.auth.btn_back_login}
                        </Link>
                    </div>
                ) : (
                    <div className="max-w-[440px] w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="text-center lg:text-left">
                            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{dict.auth.register_title}</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2">{dict.auth.register_desc}</p>
                        </div>

                        {/* SOCIAL LOGIN */}
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => handleSocialLogin('google')} disabled={loading} className="flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{dict.auth.btn_google}</span>
                            </button>
                            <button onClick={() => handleSocialLogin('apple')} disabled={loading} className="flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                                <svg className="w-5 h-5 text-black dark:text-white fill-current" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.21-.93 3.69-.93.95 0 2.58.55 3.59 1.93-3.21 1.77-2.66 6.32.74 7.72-.51 1.41-1.39 2.82-3.1 3.51zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" /></svg>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{dict.auth.btn_apple}</span>
                            </button>
                        </div>

                        <div className="relative flex items-center gap-4"><div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div><span className="text-xs font-medium text-slate-400 uppercase">{dict.auth.separator_form}</span><div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div></div>

                        {error && (<div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm"><AlertCircle className="w-5 h-5 flex-shrink-0" /><p>{error}</p></div>)}

                        {/* HESAP TÜRÜ SEÇİCİ */}
                        <div className="grid grid-cols-3 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                            {[
                                { id: 'individual', label: dict.auth.type_individual, icon: User },
                                { id: 'business', label: dict.auth.type_business, icon: Store },
                                { id: 'corporate', label: dict.auth.type_corporate, icon: Building }
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
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">{dict.auth.label_fullname}</label>
                                    <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input required value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} type="text" className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white" placeholder="John Doe" /></div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">{dict.auth.label_phone}</label>
                                    <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} type="tel" className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white" placeholder="555 123..." /></div>
                                </div>
                            </div>

                            {formData.accountType !== 'individual' && (
                                <div className="space-y-4 animate-in slide-in-from-top-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">{dict.auth.label_company}</label>
                                        <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input required value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} type="text" className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white" placeholder="..." /></div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">{dict.auth.label_sector}</label>
                                        <div className="relative"><Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <select value={formData.sectorType} onChange={(e) => setFormData({ ...formData, sectorType: e.target.value })} className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white appearance-none">
                                                <option value="technical_service">{dict.auth.sectors.technical}</option>
                                                <option value="retail_wholesale">{dict.auth.sectors.retail}</option>
                                                <option value="beauty_health">{dict.auth.sectors.beauty}</option>
                                                <option value="auto_rental">{dict.auth.sectors.auto}</option>
                                                <option value="other">{dict.auth.sectors.other}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">{dict.auth.label_email}</label>
                                <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} type="email" className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white" placeholder="info@sirket.com" /></div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 ml-1">{dict.auth.label_password}</label>
                                <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /><input required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} type="password" className="w-full pl-9 pr-3 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/50 outline-none dark:text-white" placeholder="••••••••" /></div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 text-sm mt-2">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{dict.auth.btn_register} <ArrowRight className="w-5 h-5" /></>}
                            </button>
                        </form>

                        <div className="text-center pb-8">
                            <p className="text-sm text-slate-500">{dict.auth.have_account} <Link href={`/${locale}/login`} className="font-bold text-blue-600 hover:text-blue-700 hover:underline">{dict.auth.link_login}</Link></p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}