'use client';

import { useState } from 'react';
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    signOut
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Mail,
    Lock,
    Loader2,
    ArrowRight,
    LayoutDashboard,
    ShieldCheck,
    Smartphone,
    AlertCircle
} from 'lucide-react';

export default function LoginView({ dict, locale }: { dict: any, locale: string }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const checkInvitationAndCreateProfile = async (user: any) => {
        try {
            let clientIp = '0.0.0.0';
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                clientIp = ipData.ip;
            } catch (e) { console.error("IP alınamadı", e); }

            const inviteRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'invitations', user.email || '');
            const inviteSnap = await getDoc(inviteRef);

            if (inviteSnap.exists()) {
                const staffData = inviteSnap.data();
                await setDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), {
                    uid: user.uid,
                    email: user.email,
                    fullName: user.displayName || 'Personel',
                    phone: '',
                    companyId: staffData.targetCompanyId,
                    ownerId: staffData.targetCompanyId,
                    companyName: staffData.targetCompanyName,
                    accountType: 'corporate',
                    sectorType: staffData.targetSector,
                    role: staffData.assignedRole,
                    status: 'active',
                    createdAt: serverTimestamp(),
                    lastLoginAt: serverTimestamp(),
                    licenseEndsAt: null
                });

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
                    createdAt: serverTimestamp(),
                    lastLoginAt: serverTimestamp()
                });

                await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', staffData.targetCompanyId, 'staff', user.email!), {
                    status: 'active',
                    uid: user.uid,
                    joinedAt: serverTimestamp()
                });

                return true;
            }
        } catch (error) {
            console.error("Personel kontrol hatası:", error);
        }
        return false;
    };

    const checkUserAndRedirect = async (user: any) => {
        try {
            const docRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const userData = docSnap.data();

                if (!userData.accountType) {
                    router.push(`/${locale}/onboarding`);
                    return;
                }

                const exemptRoles = ['admin', 'super_admin', 'developer'];
                const isExempt = exemptRoles.includes(userData.role);

                if (!isExempt && !user.emailVerified) {
                    await signOut(auth);
                    setError(dict.auth.error_verify);
                    setLoading(false);
                    return;
                }

                if (userData.status === 'suspended') {
                    await signOut(auth);
                    setError(dict.auth.error_suspended);
                    setLoading(false);
                    return;
                }

                try {
                    const loginUpdate = { lastLoginAt: serverTimestamp() };
                    await updateDoc(docRef, loginUpdate);
                    const publicDirRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', user.uid);
                    await setDoc(publicDirRef, loginUpdate, { merge: true });
                } catch (updateErr) {
                    console.error("Login tarihi güncellenemedi:", updateErr);
                }

                router.push(`/${locale}/dashboard`);

            } else {
                const isStaffCreated = await checkInvitationAndCreateProfile(user);
                if (isStaffCreated) {
                    router.push(`/${locale}/dashboard`);
                } else {
                    router.push(`/${locale}/onboarding`);
                }
            }
        } catch (err) {
            console.error("Giriş kontrol hatası:", err);
            setError(dict.auth.error_generic);
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await checkUserAndRedirect(userCredential.user);
        } catch (err: any) {
            console.error(err);
            setLoading(false);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError(dict.auth.error_credentials);
            } else {
                setError(dict.auth.error_generic);
            }
        }
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            await checkUserAndRedirect(result.user);
        } catch (err: any) {
            console.error(err);
            setLoading(false);
            if (err.code === 'auth/popup-closed-by-user') {
                setError(dict.auth.error_popup);
            } else {
                setError(dict.auth.error_provider.replace('{provider}', 'Google'));
            }
        }
    };

    const handleAppleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            const provider = new OAuthProvider('apple.com');
            const result = await signInWithPopup(auth, provider);
            await checkUserAndRedirect(result.user);
        } catch (err: any) {
            console.error(err);
            setLoading(false);
            setError(dict.auth.error_provider.replace('{provider}', 'Apple'));
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
                            <div className="p-2 bg-green-500/20 rounded-lg w-fit mb-3">
                                <ShieldCheck className="w-5 h-5 text-green-400" />
                            </div>
                            <h3 className="font-bold text-white text-sm">{dict.auth.feature_secure}</h3>
                            <p className="text-slate-400 text-xs mt-1">{dict.auth.feature_secure_desc}</p>
                        </div>
                        <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-colors">
                            <div className="p-2 bg-blue-500/20 rounded-lg w-fit mb-3">
                                <Smartphone className="w-5 h-5 text-blue-400" />
                            </div>
                            <h3 className="font-bold text-white text-sm">{dict.auth.feature_mobile}</h3>
                            <p className="text-slate-400 text-xs mt-1">{dict.auth.feature_mobile_desc}</p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex justify-between text-xs text-slate-500 border-t border-white/10 pt-6">
                    <p>© 2026 Servis360 Inc.</p>
                    <div className="flex gap-4">
                        <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">Gizlilik</Link>
                        <Link href={`/${locale}/terms`} className="hover:text-white transition-colors">Şartlar</Link>
                        <Link href={`/${locale}/help`} className="hover:text-white transition-colors">Yardım</Link>
                    </div>
                </div>
            </div>

            {/* SAĞ TARAF */}
            <div className="w-full lg:w-[45%] flex flex-col justify-center items-center px-8 lg:px-12 bg-white dark:bg-slate-950 relative overflow-y-auto">
                <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                        <span className="font-bold text-white">S</span>
                    </div>
                    <span className="font-bold text-xl dark:text-white">Servis360</span>
                </div>

                <div className="max-w-[420px] w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 py-12 lg:py-0">

                    <div className="text-center lg:text-left space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">{dict.auth.login_title}</h2>
                        <p className="text-slate-500 dark:text-slate-400">{dict.auth.login_desc}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all group shadow-sm disabled:opacity-50"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">{dict.auth.btn_google}</span>
                        </button>

                        <button
                            onClick={handleAppleLogin}
                            disabled={loading}
                            className="flex items-center justify-center gap-3 py-3 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all group shadow-sm disabled:opacity-50"
                        >
                            <svg className="w-5 h-5 text-black dark:text-white fill-current" viewBox="0 0 24 24">
                                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.21-.93 3.69-.93.95 0 2.58.55 3.59 1.93-3.21 1.77-2.66 6.32.74 7.72-.51 1.41-1.39 2.82-3.1 3.51zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                            </svg>
                            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">{dict.auth.btn_apple}</span>
                        </button>
                    </div>

                    <div className="relative flex items-center gap-4">
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{dict.auth.separator}</span>
                        <div className="h-px bg-slate-200 dark:bg-slate-800 flex-1"></div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-3 text-red-600 dark:text-red-400 text-sm animate-pulse">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1">{dict.auth.label_email}</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                    placeholder="ornek@sirket.com"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex justify-between ml-1">
                                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">{dict.auth.label_password}</label>
                                <Link href={`/${locale}/forgot-password`} className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">{dict.auth.link_forgot}</Link>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors" />
                                </div>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{dict.auth.btn_submit} <ArrowRight className="w-5 h-5" /></>}
                        </button>
                    </form>

                    <div className="text-center space-y-4">
                        <p className="text-sm text-slate-500">
                            {dict.auth.no_account}{' '}
                            <Link href={`/${locale}/register`} className="font-bold text-blue-600 hover:text-blue-700 hover:underline">
                                {dict.auth.link_register}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}