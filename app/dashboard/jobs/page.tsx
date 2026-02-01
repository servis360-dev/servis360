'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, writeBatch, getDocs, where, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Plus,
    Search,
    CheckCircle2,
    Trash2,
    CreditCard,
    Banknote,
    Building2,
    AlertCircle,
    Undo2,
    MessageCircle,
    X,
    Smartphone,
    Clock,
    Wrench,
    MoreVertical,
    Wallet // <-- EKSİK OLAN BU İKON EKLENDİ
} from 'lucide-react';
import Link from 'next/link';

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
    const [whatsappTemplate, setWhatsappTemplate] = useState('Sayın müşterimiz, cihazınızın işlemleri tamamlanmıştır. Ücret: {tutar}');

    // Modal State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedJobForPayment, setSelectedJobForPayment] = useState<any>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // 1. WhatsApp Şablonunu Çek
                try {
                    const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                    const profileSnap = await getDoc(profileRef);
                    if (profileSnap.exists() && profileSnap.data().whatsappTemplates?.deviceCompleted) {
                        setWhatsappTemplate(profileSnap.data().whatsappTemplates.deviceCompleted);
                    }
                } catch (err) { console.error("Şablon çekilemedi", err); }

                // 2. İşleri Çek
                const q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'jobs'),
                    orderBy('createdAt', 'desc')
                );
                const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                    setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoading(false);
                });
                return () => unsubscribeSnapshot();
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // WHATSAPP GÖNDERME FONKSİYONU
    const sendWhatsAppMessage = (job: any) => {
        if (!job.phone) {
            alert("Müşterinin telefon numarası kayıtlı değil!");
            return;
        }

        let message = whatsappTemplate
            .replace('{tutar}', `${job.price || 0} TL`)
            .replace('{musteri}', job.customer || 'Müşteri');

        let phone = job.phone.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = phone.substring(1);
        if (!phone.startsWith('90')) phone = '90' + phone;

        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const handleStatusChange = async (job: any, newStatus: string) => {
        if (!user) return;
        if (newStatus === 'completed') {
            if (job.status === 'completed' && job.paymentStatus === 'paid') return;
            setSelectedJobForPayment(job);
            setIsPaymentModalOpen(true);
            return;
        }
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', job.id), { status: newStatus });
    };

    const handlePaymentReceived = async (method: string) => {
        if (!selectedJobForPayment || !user) return;
        const batch = writeBatch(db);
        const jobRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', selectedJobForPayment.id);

        batch.update(jobRef, { status: 'completed', paymentStatus: 'paid', paymentMethod: method, completedAt: serverTimestamp() });

        const financeRef = doc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'finance'));
        batch.set(financeRef, {
            type: 'income', category: 'service', amount: Number(selectedJobForPayment.price || 0),
            description: `${selectedJobForPayment.customer} - Servis`, date: serverTimestamp(), relatedJobId: selectedJobForPayment.id, paymentMethod: method
        });

        await batch.commit();
        setIsPaymentModalOpen(false);
        setSelectedJobForPayment(null);
    };

    const handlePaymentPending = async () => {
        if (!selectedJobForPayment || !user) return;
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', selectedJobForPayment.id), {
            status: 'completed', paymentStatus: 'pending', completedAt: serverTimestamp()
        });
        setIsPaymentModalOpen(false);
        setSelectedJobForPayment(null);
    };

    const handleUndoPayment = async (job: any) => {
        if (!user || !confirm("Ödeme iptal edilsin mi?")) return;
        const q = query(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'finance'), where('relatedJobId', '==', job.id));
        const snaps = await getDocs(q);
        const batch = writeBatch(db);
        snaps.forEach(d => batch.delete(d.ref));
        batch.update(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', job.id), { paymentStatus: 'pending', paymentMethod: null });
        await batch.commit();
    };

    const handleDelete = async (id: string) => {
        if (confirm("Silmek istediğinize emin misiniz?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', id));
        }
    };

    const filteredJobs = jobs.filter(job =>
        job.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.device?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4 md:space-y-6 relative pb-24 md:pb-20">
            {/* BAŞLIK VE YENİ İŞ BUTONU */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold dark:text-white">İş Emirleri</h1>
                    <p className="text-slate-500 text-sm">Servis durumları</p>
                </div>
                <Link href="/dashboard/jobs/new">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex gap-2 shadow-lg shadow-blue-600/30 transition-all">
                        <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Yeni İş</span>
                    </button>
                </Link>
            </div>

            {/* ARAMA ÇUBUĞU */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Müşteri veya cihaz ara..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* 🔥 MOBİL KART GÖRÜNÜMÜ (MD Altı) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {loading ? <p className="text-center py-10 text-slate-500">Yükleniyor...</p> : filteredJobs.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <p className="text-slate-500">Kayıt bulunamadı.</p>
                    </div>
                ) : filteredJobs.map(job => (
                    <div key={job.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                        {/* Sol Kenar Çizgisi (Duruma Göre Renkli) */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${job.status === 'completed' ? 'bg-green-500' : job.status === 'pending' ? 'bg-yellow-500' : 'bg-blue-500'}`}></div>

                        <div className="flex justify-between items-start mb-3 pl-2">
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{job.customer}</h3>
                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                    <Smartphone className="w-3 h-3" />
                                    <span>{job.device}</span>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-bold text-lg text-slate-900 dark:text-white">{job.price} ₺</span>
                                <span className="text-[10px] text-slate-400">{job.paymentStatus === 'paid' ? 'Ödendi' : 'Ödenmedi'}</span>
                            </div>
                        </div>

                        {/* Durum Seçici (Geniş Buton Gibi) */}
                        <div className="mb-4 pl-2">
                            <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">DURUM</label>
                            <div className="relative">
                                <select
                                    value={job.status}
                                    onChange={e => handleStatusChange(job, e.target.value)}
                                    className={`w-full appearance-none font-bold text-sm py-2 px-3 rounded-lg border ${statusConfig[job.status]?.color}`}
                                >
                                    <option value="pending">Bekliyor</option>
                                    <option value="in_progress">İşlemde</option>
                                    <option value="waiting_parts">Parça Bekliyor</option>
                                    <option value="completed">Tamamlandı</option>
                                    <option value="cancelled">İptal</option>
                                </select>
                                {/* Aşağı ok ikonu */}
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        {/* Alt Aksiyon Butonları */}
                        <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700 pl-2">
                            {/* WhatsApp */}
                            <button
                                onClick={() => sendWhatsAppMessage(job)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-50 text-green-600 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                            >
                                <MessageCircle className="w-4 h-4" /> WhatsApp
                            </button>

                            {/* Ödeme / İptal */}
                            {job.status === 'completed' && job.paymentStatus === 'paid' ? (
                                <button onClick={() => handleUndoPayment(job)} className="p-2 bg-red-50 text-red-500 rounded-lg" title="Ödemeyi İptal Et">
                                    <Undo2 className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => { setSelectedJobForPayment(job); setIsPaymentModalOpen(true) }}
                                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                >
                                    <CreditCard className="w-4 h-4" /> Tahsil Et
                                </button>
                            )}

                            {/* Sil */}
                            <button onClick={() => handleDelete(job.id)} className="p-2 bg-slate-100 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* 🔥 MASAÜSTÜ TABLO GÖRÜNÜMÜ (MD Üzeri) */}
            <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr><th className="p-4">Müşteri</th><th className="p-4">Durum</th><th className="p-4">Ödeme</th><th className="p-4">Ücret</th><th className="p-4 text-right">İşlemler</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? <tr><td colSpan={5} className="p-8 text-center">Yükleniyor...</td></tr> : filteredJobs.map(job => (
                            <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-slate-900 dark:text-white">{job.customer}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                        <Smartphone className="w-3 h-3" /> {job.device} <span className="text-slate-300">|</span> {job.phone}
                                    </div>
                                </td>
                                <td className="p-4">
                                    <div className="relative inline-block">
                                        <select value={job.status} onChange={e => handleStatusChange(job, e.target.value)} className={`pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border appearance-none cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 ${statusConfig[job.status]?.color}`}>
                                            <option value="pending">Bekliyor</option><option value="in_progress">İşlemde</option><option value="waiting_parts">Parça Bekliyor</option><option value="completed">Tamamlandı</option><option value="cancelled">İptal</option>
                                        </select>
                                    </div>
                                </td>
                                <td className="p-4">
                                    {job.status === 'completed' && (job.paymentStatus === 'paid' ?
                                        <div className="flex gap-2 items-center"><span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ödendi</span><button onClick={() => handleUndoPayment(job)} className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors" title="Ödemeyi Geri Al"><Undo2 className="w-4 h-4" /></button></div> :
                                        <div className="flex gap-2 items-center"><span className="text-red-700 bg-red-100 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Bekliyor</span><button onClick={() => { setSelectedJobForPayment(job); setIsPaymentModalOpen(true) }} className="text-blue-600 text-xs font-bold hover:underline px-2">Tahsil Et</button></div>
                                    )}
                                </td>
                                <td className="p-4 font-bold text-base">{job.price} ₺</td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button onClick={() => sendWhatsAppMessage(job)} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors" title="WhatsApp Mesajı Gönder"><MessageCircle className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(job.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Ödeme Modalı */}
            {isPaymentModalOpen && selectedJobForPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border dark:border-slate-800 animate-in zoom-in-95">
                        <div className="flex justify-between mb-6 items-center">
                            <h2 className="text-xl font-bold dark:text-white flex items-center gap-2"><Wallet className="w-6 h-6 text-blue-600" /> Ödeme Al</h2>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-6 text-center">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">Toplam Tutar</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white">{selectedJobForPayment.price} ₺</p>
                            <p className="text-xs text-slate-400 mt-2">{selectedJobForPayment.customer} - {selectedJobForPayment.device}</p>
                        </div>

                        <div className="space-y-3">
                            <button onClick={() => handlePaymentReceived('cash')} className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-3 font-bold text-slate-700 dark:text-slate-200 transition-all group">
                                <div className="p-2 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-200"><Banknote className="w-5 h-5" /></div> Nakit Ödeme
                            </button>
                            <button onClick={() => handlePaymentReceived('credit_card')} className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center gap-3 font-bold text-slate-700 dark:text-slate-200 transition-all group">
                                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-200"><CreditCard className="w-5 h-5" /></div> Kredi Kartı
                            </button>
                            <button onClick={() => handlePaymentReceived('bank_transfer')} className="w-full p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-3 font-bold text-slate-700 dark:text-slate-200 transition-all group">
                                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg group-hover:bg-purple-200"><Building2 className="w-5 h-5" /></div> Havale / EFT
                            </button>
                            <button onClick={handlePaymentPending} className="w-full py-3 text-slate-500 text-sm hover:text-red-500 transition-colors">Ödeme Alınmadı (Veresiye/Borç)</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}