'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            await sendPasswordResetEmail(auth, email);
            setStatus('success');
        } catch (err: any) {
            console.error(err);
            setStatus('error');
            setErrorMsg('E-posta gönderilemedi. Lütfen adresi kontrol edin.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8">

                <Link href="/login" className="inline-flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Girişe Dön
                </Link>

                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Şifremi Unuttum</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
                    E-posta adresinizi girin, size şifrenizi sıfırlamanız için bir bağlantı gönderelim.
                </p>

                {status === 'success' ? (
                    <div className="text-center py-8">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">E-posta Gönderildi!</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
                            Lütfen gelen kutunuzu (ve spam klasörünü) kontrol edin.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {status === 'error' && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                                {errorMsg}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-Posta</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors"
                                    placeholder="ornek@sirket.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            disabled={status === 'loading'}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center"
                        >
                            {status === 'loading' ? <Loader2 className="animate-spin w-5 h-5" /> : 'Sıfırlama Linki Gönder'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}