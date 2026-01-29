'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { ArrowLeft, Send, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function NewTicketPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        message: '',
        priority: 'normal'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        try {
            // Kullanıcı adını al
            const profileSnap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'));
            const userName = profileSnap.exists() ? profileSnap.data().fullName : user.email;

            // 1. Bileti Oluştur
            const ticketRef = await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'tickets'), {
                userId: user.uid,
                userName: userName,
                subject: formData.subject,
                priority: formData.priority,
                status: 'open',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastMessage: formData.message.substring(0, 50) + '...'
            });

            // 2. İlk Mesajı Ekle (Sub-collection)
            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'tickets', ticketRef.id, 'messages'), {
                text: formData.message,
                senderId: user.uid,
                senderName: userName,
                isAdmin: false,
                createdAt: serverTimestamp()
            });

            router.push('/dashboard/support');
        } catch (error) {
            console.error(error);
            alert("Hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/dashboard/support" className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-slate-900 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Yeni Destek Talebi</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6">

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Konu</label>
                    <input
                        required
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all"
                        placeholder="Örn: Ödeme Hatası, Stok Sorunu..."
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Öncelik</label>
                    <div className="grid grid-cols-3 gap-3">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, priority: 'low' })}
                            className={`p-3 rounded-xl border text-sm font-bold transition-all ${formData.priority === 'low' ? 'bg-green-50 border-green-500 text-green-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                        >
                            Düşük
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, priority: 'normal' })}
                            className={`p-3 rounded-xl border text-sm font-bold transition-all ${formData.priority === 'normal' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                        >
                            Normal
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, priority: 'high' })}
                            className={`p-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${formData.priority === 'high' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'}`}
                        >
                            <AlertCircle className="w-4 h-4" /> Yüksek
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Mesajınız</label>
                    <textarea
                        required
                        rows={6}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all resize-none"
                        placeholder="Sorununuzu detaylı bir şekilde açıklayın..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><Send className="w-5 h-5" /> Talebi Gönder</>}
                </button>

            </form>
        </div>
    );
}