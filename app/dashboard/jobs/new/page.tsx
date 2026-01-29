'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase'; // Dikkat: 4 klasör yukarı çıkıyoruz
import { ArrowLeft, Save, Loader2, User, Smartphone, AlertTriangle, Wallet } from 'lucide-react';
import Link from 'next/link';

export default function NewJobPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        customer: '',
        phone: '',
        device: '',
        problem: '',
        price: '',
        priority: 'normal',
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Kullanıcı oturumu yok");

            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs'), {
                ...formData,
                price: parseFloat(formData.price) || 0,
                status: 'pending',
                createdAt: serverTimestamp()
            });

            router.push('/dashboard/jobs');
        } catch (error) {
            console.error("Hata:", error);
            alert("İş kaydedilirken bir sorun oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Başlık ve Geri Butonu */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/jobs" className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Yeni İş Emri Oluştur</h1>
                    <p className="text-slate-500 dark:text-slate-400">Servise gelen cihazı sisteme kaydedin.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-8">

                {/* Bölüm 1: Müşteri Bilgileri */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                        <User className="w-5 h-5 text-blue-600" /> Müşteri Bilgileri
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Ad Soyad</label>
                            <input
                                required
                                placeholder="Örn: Mehmet Demir"
                                value={formData.customer}
                                onChange={e => setFormData({ ...formData, customer: e.target.value })}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Telefon</label>
                            <input
                                required
                                placeholder="0555..."
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Bölüm 2: Cihaz ve Arıza */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                        <Smartphone className="w-5 h-5 text-blue-600" /> Cihaz & Arıza Detayları
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Cihaz Modeli</label>
                            <input
                                required
                                placeholder="Örn: iPhone 11 64GB"
                                value={formData.device}
                                onChange={e => setFormData({ ...formData, device: e.target.value })}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Arıza Tanımı</label>
                            <input
                                required
                                placeholder="Örn: Ekran kırık, şarj almıyor"
                                value={formData.problem}
                                onChange={e => setFormData({ ...formData, problem: e.target.value })}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tekniker Notları (Opsiyonel)</label>
                        <textarea
                            rows={3}
                            placeholder="Cihazda çizikler var..."
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                {/* Bölüm 3: Fiyat ve Öncelik */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-700">
                        <Wallet className="w-5 h-5 text-blue-600" /> Tahmini Ücret & Durum
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Tahmini Tutar (TL)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={formData.price}
                                onChange={e => setFormData({ ...formData, price: e.target.value })}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Aciliyet Durumu</label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, priority: 'normal' })}
                                    className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${formData.priority === 'normal' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    Normal
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, priority: 'high' })}
                                    className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all flex items-center justify-center gap-2 ${formData.priority === 'high' ? 'bg-red-50 border-red-500 text-red-600' : 'bg-white border-slate-200 text-slate-500'}`}
                                >
                                    <AlertTriangle className="w-4 h-4" /> ACİL
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kaydet Butonu */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <><Save className="w-5 h-5" /> İş Emrini Kaydet</>}
                    </button>
                </div>

            </form>
        </div>
    );
}