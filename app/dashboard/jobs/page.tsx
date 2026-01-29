'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, addDoc, serverTimestamp, writeBatch, getDocs, where, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Plus, Search, Smartphone, CheckCircle2, Trash2, CreditCard, Banknote, Building2, AlertCircle, Undo2, MessageCircle, X
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
        <div className="space-y-6 relative pb-20">
            <div className="flex justify-between items-center">
                <div><h1 className="text-2xl font-bold dark:text-white">İş Emirleri</h1><p className="text-slate-500">Servis durumları</p></div>
                <Link href="/dashboard/jobs/new"><button className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold flex gap-2"><Plus className="w-5 h-5" /> Yeni İş</button></Link>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="relative"><Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" /><input type="text" placeholder="Ara..." className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border rounded-lg outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr><th className="p-4">Müşteri</th><th className="p-4">Durum</th><th className="p-4">Ödeme</th><th className="p-4">Ücret</th><th className="p-4 text-right">İşlemler</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? <tr><td colSpan={5} className="p-8 text-center">Yükleniyor...</td></tr> : filteredJobs.map(job => (
                            <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="p-4">
                                    <div className="font-bold text-slate-900 dark:text-white">{job.customer}</div>
                                    <div className="text-xs text-slate-500">{job.device} - {job.phone}</div>
                                </td>
                                <td className="p-4">
                                    <select value={job.status} onChange={e => handleStatusChange(job, e.target.value)} className={`pl-2 pr-6 py-1 rounded-full text-xs font-bold border appearance-none cursor-pointer ${statusConfig[job.status]?.color}`}>
                                        <option value="pending">Bekliyor</option><option value="in_progress">İşlemde</option><option value="waiting_parts">Parça Bekliyor</option><option value="completed">Tamamlandı</option><option value="cancelled">İptal</option>
                                    </select>
                                </td>
                                <td className="p-4">
                                    {job.status === 'completed' && (job.paymentStatus === 'paid' ?
                                        <div className="flex gap-2"><span className="text-green-700 bg-green-100 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ödendi</span><button onClick={() => handleUndoPayment(job)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Undo2 className="w-3 h-3" /></button></div> :
                                        <div className="flex gap-2"><span className="text-red-700 bg-red-100 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Bekliyor</span><button onClick={() => { setSelectedJobForPayment(job); setIsPaymentModalOpen(true) }} className="text-blue-600 text-xs underline">Tahsil Et</button></div>
                                    )}
                                </td>
                                <td className="p-4 font-bold">{job.price} ₺</td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    {/* WHATSAPP BUTONU - Şablondan Gönderir */}
                                    <button onClick={() => sendWhatsAppMessage(job)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="WhatsApp Mesajı Gönder"><MessageCircle className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(job.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Ödeme Modalı */}
            {isPaymentModalOpen && selectedJobForPayment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl border dark:border-slate-800">
                        <div className="flex justify-between mb-4"><h2 className="text-xl font-bold dark:text-white">Ödeme Al</h2><button onClick={() => setIsPaymentModalOpen(false)}><X /></button></div>
                        <p className="mb-4 text-slate-600 dark:text-slate-400"><b>{selectedJobForPayment.customer}</b> - {selectedJobForPayment.price} ₺</p>
                        <div className="space-y-3">
                            <button onClick={() => handlePaymentReceived('cash')} className="w-full p-4 border rounded-xl hover:border-green-500 hover:bg-green-50 flex gap-3 font-bold text-slate-700"><Banknote /> Nakit Ödeme</button>
                            <button onClick={() => handlePaymentReceived('credit_card')} className="w-full p-4 border rounded-xl hover:border-blue-500 hover:bg-blue-50 flex gap-3 font-bold text-slate-700"><CreditCard /> Kredi Kartı</button>
                            <button onClick={() => handlePaymentReceived('bank_transfer')} className="w-full p-4 border rounded-xl hover:border-purple-500 hover:bg-purple-50 flex gap-3 font-bold text-slate-700"><Building2 /> Havale / EFT</button>
                            <button onClick={handlePaymentPending} className="w-full p-3 text-slate-500 text-sm hover:text-red-500">Ödeme Alınmadı (Borç)</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}