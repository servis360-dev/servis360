'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch, getDocs, where } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Plus,
    Search,
    Filter,
    Smartphone,
    Clock,
    CheckCircle2,
    Trash2,
    CreditCard,
    Banknote,
    Building2,
    AlertCircle,
    Undo2,
    MessageCircle,
    X
} from 'lucide-react';
import Link from 'next/link';

// Durum Konfigürasyonu
const statusConfig: any = {
    pending: { label: 'Bekliyor', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    in_progress: { label: 'İşlemde', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    waiting_parts: { label: 'Parça Bekliyor', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    completed: { label: 'Tamamlandı', color: 'text-green-600 bg-green-50 border-green-200' },
    cancelled: { label: 'İptal', color: 'text-red-600 bg-red-50 border-red-200' }
};

export default function JobsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState<any>(null);

    // Modal State'leri
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedJobForPayment, setSelectedJobForPayment] = useState<any>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'jobs'),
                    orderBy('createdAt', 'desc')
                );

                const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                    const jobsData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setJobs(jobsData);
                    setLoading(false);
                });

                return () => unsubscribeSnapshot();
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // Durum Değişikliğini Yakala
    const handleStatusChange = async (job: any, newStatus: string) => {
        if (!user) return;

        // Eğer kullanıcı "Tamamlandı" seçerse MODAL AÇ
        if (newStatus === 'completed') {
            // Eğer zaten tamamlandıysa ve ödeme alınmışsa tekrar sorma
            if (job.status === 'completed' && job.paymentStatus === 'paid') return;

            setSelectedJobForPayment(job);
            setIsPaymentModalOpen(true);
            return; // DB güncellemesini modal'a bırak
        }

        // Diğer durumlar için direkt güncelle
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', job.id), {
            status: newStatus
        });
    };

    // ÖDEME ALINDI İŞLEMİ (KASAYA İŞLE)
    const handlePaymentReceived = async (method: 'cash' | 'credit_card' | 'bank_transfer') => {
        if (!selectedJobForPayment || !user) return;

        try {
            const batch = writeBatch(db);

            // 1. İşi Güncelle (Tamamlandı + Ödendi)
            const jobRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', selectedJobForPayment.id);
            batch.update(jobRef, {
                status: 'completed',
                paymentStatus: 'paid', // Ödendi etiketi
                paymentMethod: method,
                completedAt: serverTimestamp()
            });

            // 2. Finans'a Ekle (Gelir Olarak)
            const financeRef = doc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'finance'));
            batch.set(financeRef, {
                type: 'income',
                category: 'service', // Hizmet Geliri
                amount: Number(selectedJobForPayment.price || 0),
                description: `${selectedJobForPayment.customer} - Servis Ücreti (${selectedJobForPayment.device})`,
                date: serverTimestamp(),
                relatedJobId: selectedJobForPayment.id, // İlişki kuruyoruz (İptal ederken lazım olacak)
                paymentMethod: method
            });

            await batch.commit();
            setIsPaymentModalOpen(false);
            setSelectedJobForPayment(null);

        } catch (error) {
            console.error("Ödeme işlenirken hata:", error);
            alert("Bir hata oluştu.");
        }
    };

    // ÖDEME ALINMADI (VERESİYE / BEKLİYOR)
    const handlePaymentPending = async () => {
        if (!selectedJobForPayment || !user) return;

        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', selectedJobForPayment.id), {
            status: 'completed',
            paymentStatus: 'pending', // Ödeme Bekliyor
            completedAt: serverTimestamp()
        });

        setIsPaymentModalOpen(false);
        setSelectedJobForPayment(null);
    };

    // ÖDEME İPTALİ / GERİ ALMA (UNDO)
    const handleUndoPayment = async (job: any) => {
        if (!user || !confirm("Ödeme kaydı Finans'tan silinecek ve durum 'Ödeme Bekliyor'a dönecek. Emin misiniz?")) return;

        try {
            // Finans kaydını bul ve sil
            const financeQuery = query(
                collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'finance'),
                where('relatedJobId', '==', job.id)
            );
            const financeDocs = await getDocs(financeQuery);

            const batch = writeBatch(db);

            // Finans kayıtlarını sil
            financeDocs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            // İşi Güncelle (Ödeme Bekliyor'a çek)
            const jobRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', job.id);
            batch.update(jobRef, {
                paymentStatus: 'pending',
                paymentMethod: null
            });

            await batch.commit();

        } catch (error) {
            console.error("İptal hatası:", error);
        }
    };

    // WhatsApp Mesajı Oluştur
    const sendWhatsAppMessage = (job: any) => {
        const message = `Merhaba Sayın ${job.customer}, ${job.device} cihazınızın işlemleri tamamlanmıştır. Toplam tutar: ${job.price} TL'dir. Teslim alabilirsiniz.`;
        const url = `https://wa.me/${job.phone?.replace(/\s/g, '') || ''}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    // Silme Fonksiyonu
    const handleDelete = async (jobId: string) => {
        if (!user) return;
        if (confirm("Bu kaydı silmek istediğinize emin misiniz?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', jobId));
        }
    }

    const filteredJobs = jobs.filter(job =>
        job.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.device?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 relative">
            {/* Üst Başlık */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">İş Emirleri</h1>
                    <p className="text-slate-500 dark:text-slate-400">Servis durumlarını ve ödemeleri buradan yönetin.</p>
                </div>
                <Link href="/dashboard/jobs/new">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                        <Plus className="w-5 h-5" />
                        Yeni İş Ekle
                    </button>
                </Link>
            </div>

            {/* Arama Barı */}
            <div className="flex gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Müşteri, cihaz veya durum ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* İş Listesi */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white">Müşteri / Cihaz</th>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white">Durum</th>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white">Ödeme</th>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white">Ücret</th>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Yükleniyor...</td></tr>
                            ) : filteredJobs.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Kayıt bulunamadı.</td></tr>
                            ) : (
                                filteredJobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <Smartphone className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{job.customer}</p>
                                                    <p className="text-xs text-slate-500">{job.device} - {job.problem}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <select
                                                value={job.status}
                                                onChange={(e) => handleStatusChange(job, e.target.value)}
                                                className={`
                                                    appearance-none pl-3 pr-8 py-1 rounded-full text-xs font-bold border outline-none cursor-pointer
                                                    ${statusConfig[job.status]?.color || 'bg-slate-100'}
                                                `}
                                            >
                                                <option value="pending">Bekliyor</option>
                                                <option value="in_progress">İşlemde</option>
                                                <option value="waiting_parts">Parça Bekliyor</option>
                                                <option value="completed">Tamamlandı</option>
                                                <option value="cancelled">İptal</option>
                                            </select>
                                        </td>
                                        <td className="p-4">
                                            {/* ÖDEME DURUMU GÖSTERGESİ */}
                                            {job.status === 'completed' && (
                                                job.paymentStatus === 'paid' ? (
                                                    <div className="flex items-center gap-2 group">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            Ödendi
                                                        </span>
                                                        {/* GERİ AL BUTONU */}
                                                        <button
                                                            onClick={() => handleUndoPayment(job)}
                                                            title="Ödemeyi İptal Et (Geri Al)"
                                                            className="opacity-0 group-hover:opacity-100 p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-all"
                                                        >
                                                            <Undo2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200 animate-pulse">
                                                            <AlertCircle className="w-3 h-3" />
                                                            Ödeme Bekliyor
                                                        </span>
                                                        <button
                                                            onClick={() => { setSelectedJobForPayment(job); setIsPaymentModalOpen(true); }}
                                                            className="text-blue-600 text-xs hover:underline"
                                                        >
                                                            Tahsil Et
                                                        </button>
                                                        <button
                                                            onClick={() => sendWhatsAppMessage(job)}
                                                            title="WhatsApp'tan Ödeme Hatırlat"
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                        >
                                                            <MessageCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )
                                            )}
                                        </td>
                                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                                            {job.price ? `${job.price} ₺` : '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleDelete(job.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ÖDEME MODALI */}
            {isPaymentModalOpen && selectedJobForPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-200">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">İş Tamamlandı! 🎉</h2>
                                    <p className="text-slate-500 text-sm mt-1">
                                        <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedJobForPayment.customer}</span> adlı müşteriden ücret alındı mı?
                                    </p>
                                </div>
                                <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-6 flex justify-between items-center border border-slate-100 dark:border-slate-700">
                                <span className="text-slate-600 dark:text-slate-400 text-sm">Tahsil Edilecek Tutar:</span>
                                <span className="text-2xl font-bold text-blue-600">{selectedJobForPayment.price || 0} ₺</span>
                            </div>

                            <div className="space-y-3">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ödeme Yöntemi Seçin ve Kasaya İşleyin</p>

                                <button
                                    onClick={() => handlePaymentReceived('cash')}
                                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-green-500 hover:bg-green-50 dark:border-slate-800 dark:hover:border-green-500/50 dark:hover:bg-green-900/20 group transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                            <Banknote className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-slate-900 dark:text-white">Nakit Ödeme</div>
                                            <div className="text-xs text-slate-500">Kasa hesabına işlenir</div>
                                        </div>
                                    </div>
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-green-500 group-hover:bg-green-500"></div>
                                </button>

                                <button
                                    onClick={() => handlePaymentReceived('credit_card')}
                                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 dark:border-slate-800 dark:hover:border-blue-500/50 dark:hover:bg-blue-900/20 group transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-slate-900 dark:text-white">Kredi Kartı / POS</div>
                                            <div className="text-xs text-slate-500">Banka hesabına işlenir</div>
                                        </div>
                                    </div>
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-blue-500 group-hover:bg-blue-500"></div>
                                </button>

                                <button
                                    onClick={() => handlePaymentReceived('bank_transfer')}
                                    className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 dark:border-slate-800 dark:hover:border-purple-500/50 dark:hover:bg-purple-900/20 group transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-slate-900 dark:text-white">Havale / EFT</div>
                                            <div className="text-xs text-slate-500">Banka hesabına işlenir</div>
                                        </div>
                                    </div>
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 group-hover:border-purple-500 group-hover:bg-purple-500"></div>
                                </button>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    onClick={handlePaymentPending}
                                    className="w-full py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm font-medium transition-colors"
                                >
                                    Henüz Ödeme Alınmadı (Borç Olarak Kaydet)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}