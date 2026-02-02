'use client';

import { useEffect, useState } from 'react';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    orderBy,
    where,
    getDoc,
    writeBatch,
    getDocs
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation'; // 🔥 Router
import {
    Briefcase,
    Plus,
    Search,
    CheckCircle2,
    MessageCircle,
    Undo2,
    CreditCard,
    Trash2,
    X,
    Wallet,
    Banknote,
    Building2,
    Smartphone,
    Store,
    ChevronDown // Select ikonu için
} from 'lucide-react';
// 🔥 ŞUBE BAĞLANTISI
import { useBranch } from '../../../components/providers/branch-context';

const statusConfig: any = {
    pending: { label: 'Bekliyor', color: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800' },
    in_progress: { label: 'İşlemde', color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' },
    waiting_parts: { label: 'Parça Bekliyor', color: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800' },
    completed: { label: 'Tamamlandı', color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' },
    delivered: { label: 'Teslim Edildi', color: 'text-slate-600 bg-slate-50 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
    cancelled: { label: 'İptal', color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800' }
};

export default function JobsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const { selectedBranch, branches } = useBranch();
    const router = useRouter();

    const [user, setUser] = useState<any>(null);
    const [targetUid, setTargetUid] = useState<string | null>(null);

    const [showModal, setShowModal] = useState(false);
    const [newJob, setNewJob] = useState({
        customerName: '',
        phone: '',
        device: '',
        problem: '',
        price: '',
        note: '',
        branchId: ''
    });

    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedJobForPayment, setSelectedJobForPayment] = useState<any>(null);
    const [whatsappTemplate, setWhatsappTemplate] = useState('Sayın müşterimiz, cihazınızın işlemleri tamamlanmıştır. Ücret: {tutar}');

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                const profileSnap = await getDoc(profileRef);

                let ownerId = currentUser.uid;
                if (profileSnap.exists()) {
                    const data = profileSnap.data();
                    if (data.ownerId && data.ownerId !== currentUser.uid) {
                        ownerId = data.ownerId;
                    }
                    if (data.whatsappTemplates?.deviceCompleted) {
                        setWhatsappTemplate(data.whatsappTemplates.deviceCompleted);
                    }
                }
                setTargetUid(ownerId);

                let q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'jobs'),
                    orderBy('createdAt', 'desc')
                );

                if (selectedBranch) {
                    q = query(
                        collection(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'jobs'),
                        where('branchId', '==', selectedBranch),
                        orderBy('createdAt', 'desc')
                    );
                }

                const unsub = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    setJobs(data);
                    setLoading(false);
                });

                return () => unsub();
            }
        });
        return () => unsubscribeAuth();
    }, [selectedBranch]);

    const handleAddJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !targetUid) return;

        let finalBranchId = newJob.branchId || selectedBranch;
        if (branches.length > 0 && !finalBranchId) {
            finalBranchId = branches.find(b => b.isHeadquarters)?.id || branches[0]?.id;
        }
        const branchName = branches.find(b => b.id === finalBranchId)?.name || 'Merkez';

        try {
            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'jobs'), {
                ...newJob,
                branchId: finalBranchId,
                branchName: branchName,
                status: 'pending',
                paymentStatus: 'pending',
                createdBy: user.uid,
                createdAt: serverTimestamp()
            });
            setShowModal(false);
            setNewJob({ customerName: '', phone: '', device: '', problem: '', price: '', note: '', branchId: '' });
        } catch (error) {
            console.error("Hata:", error);
            alert("Hata oluştu.");
        }
    };

    const handleStatusChange = async (job: any, newStatus: string) => {
        if (!targetUid) return;
        if (newStatus === 'completed') {
            if (job.status === 'completed' && job.paymentStatus === 'paid') return;
            setSelectedJobForPayment(job);
            setIsPaymentModalOpen(true);
            return;
        }
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'jobs', job.id), { status: newStatus });
    };

    const handleDelete = async (jobId: string) => {
        if (!targetUid) return;
        if (confirm("Silmek istediğinize emin misiniz?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'jobs', jobId));
        }
    };

    const handlePaymentReceived = async (method: string) => {
        if (!selectedJobForPayment || !user || !targetUid) return;
        const batch = writeBatch(db);
        const jobRef = doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'jobs', selectedJobForPayment.id);
        batch.update(jobRef, { status: 'completed', paymentStatus: 'paid', paymentMethod: method, completedAt: serverTimestamp(), completedBy: user.uid });
        const financeRef = doc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'finance'));
        batch.set(financeRef, {
            type: 'income', category: 'service', amount: Number(selectedJobForPayment.price || 0),
            description: `${selectedJobForPayment.customerName} - Servis`, date: serverTimestamp(),
            relatedJobId: selectedJobForPayment.id, paymentMethod: method, branchId: selectedJobForPayment.branchId, processedBy: user.uid
        });
        await batch.commit();
        setIsPaymentModalOpen(false);
        setSelectedJobForPayment(null);
    };

    const handlePaymentPending = async () => {
        if (!selectedJobForPayment || !user || !targetUid) return;
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'jobs', selectedJobForPayment.id), {
            status: 'completed', paymentStatus: 'pending', completedAt: serverTimestamp()
        });
        setIsPaymentModalOpen(false);
        setSelectedJobForPayment(null);
    };

    const handleUndoPayment = async (job: any) => {
        if (!user || !targetUid || !confirm("Ödeme iptal edilsin mi?")) return;
        const q = query(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'finance'), where('relatedJobId', '==', job.id));
        const snaps = await getDocs(q);
        const batch = writeBatch(db);
        snaps.forEach(d => batch.delete(d.ref));
        batch.update(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'jobs', job.id), { paymentStatus: 'pending', paymentMethod: null });
        await batch.commit();
    };

    const sendWhatsAppMessage = (job: any) => {
        if (!job.phone) { alert("Telefon yok!"); return; }
        let message = whatsappTemplate.replace('{tutar}', `${job.price || 0} TL`).replace('{musteri}', job.customerName || 'Müşteri');
        let phone = job.phone.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = phone.substring(1);
        if (!phone.startsWith('90')) phone = '90' + phone;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const filteredJobs = jobs.filter(job => {
        const matchesSearch =
            job.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.device?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const openNewJobModal = () => {
        setNewJob(prev => ({ ...prev, branchId: selectedBranch || '' }));
        setShowModal(true);
    }

    return (
        <div className="space-y-6 pb-20">
            {/* --- ÜST BAŞLIK ALANI --- */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-blue-600" /> İş Takibi
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {selectedBranch ? `${branches.find(b => b.id === selectedBranch)?.name} şubesi.` : 'Tüm işler.'}
                    </p>
                </div>
                <button onClick={openNewJobModal} className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                    <Plus className="w-5 h-5" /> Yeni İş Ekle
                </button>
            </div>

            {/* --- ARAMA VE FİLTRELEME --- */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 text-sm dark:text-white placeholder:text-slate-400"
                        placeholder="Müşteri, Cihaz veya Takip No ara..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {['all', 'pending', 'in_progress', 'completed', 'delivered'].map(st => (
                        <button key={st} onClick={() => setStatusFilter(st)} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${statusFilter === st ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                            {st === 'all' ? 'Tümü' : statusConfig[st]?.label || st}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- LİSTE (YENİLENMİŞ KART TASARIMI - MOBİL İÇİN OPTİMİZE EDİLDİ) --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3"> {/* Gap küçültüldü */}
                {loading ? <p className="col-span-full text-center py-10 text-slate-500">Yükleniyor...</p> :
                    filteredJobs.length === 0 ? (
                        <div className="col-span-full text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-bold text-slate-900 dark:text-white">Kayıt Bulunamadı</h3>
                        </div>
                    ) : filteredJobs.map(job => (
                        <div
                            key={job.id}
                            onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative cursor-pointer overflow-hidden"
                        >
                            {/* SOL KENAR ÇİZGİSİ (Duruma Göre Renk) */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${statusConfig[job.status]?.color.replace('text-', 'bg-').split(' ')[0]}`}></div>

                            <div className="p-4 pl-5"> {/* Sol padding artırıldı çünkü çizgi var */}
                                {/* ÜST: İSİM, TARİH, ŞUBE */}
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{job.customerName}</h3>
                                        <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">#{job.id.slice(0, 6).toUpperCase()}</span>
                                    </div>
                                    {branches.length > 0 && (
                                        <div className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded flex items-center gap-1">
                                            <Store className="w-3 h-3" /> {job.branchName || 'Merkez'}
                                        </div>
                                    )}
                                </div>

                                {/* ORTA: CİHAZ VE SORUN (Kutuyu kaldırdık, temiz metin yaptık) */}
                                <div className="mb-4">
                                    <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 font-bold mb-1">
                                        <Smartphone className="w-4 h-4" />
                                        {job.device}
                                    </div>
                                    {/* Sorun açıklaması artık temiz, kutu yok */}
                                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                                        {job.problem}
                                    </p>
                                </div>

                                {/* ALT: FİYAT, BUTONLAR VE DURUM */}
                                <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-col gap-3">

                                    {/* Durum Seçici (Daha İnce ve Kibar) */}
                                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                                        <select
                                            value={job.status}
                                            onChange={e => handleStatusChange(job, e.target.value)}
                                            className={`w-full pl-3 pr-8 py-2 rounded-lg text-xs font-bold border appearance-none outline-none transition-colors cursor-pointer ${statusConfig[job.status]?.color}`}
                                        >
                                            <option value="pending">Bekliyor</option>
                                            <option value="in_progress">İşlemde</option>
                                            <option value="waiting_parts">Parça Bekliyor</option>
                                            <option value="completed">Tamamlandı</option>
                                            <option value="cancelled">İptal</option>
                                        </select>
                                        <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50 pointer-events-none`} />
                                    </div>

                                    {/* Alt Satır: Fiyat ve Aksiyonlar */}
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="text-xl font-black text-slate-900 dark:text-white">
                                            {job.price ? `${job.price} ₺` : <span className="text-slate-300 text-sm font-normal">--</span>}
                                        </div>

                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => sendWhatsAppMessage(job)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 transition-colors border border-green-100 dark:border-green-800">
                                                <MessageCircle className="w-4 h-4" />
                                            </button>

                                            {job.status === 'completed' && job.paymentStatus === 'paid' ?
                                                <button onClick={() => handleUndoPayment(job)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:bg-slate-700/50 transition-colors">
                                                    <Undo2 className="w-4 h-4" />
                                                </button> :
                                                <button onClick={() => { setSelectedJobForPayment(job); setIsPaymentModalOpen(true) }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors border border-blue-100 dark:border-blue-800">
                                                    <CreditCard className="w-4 h-4" />
                                                </button>
                                            }

                                            <button onClick={() => handleDelete(job.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 dark:bg-red-900/20 dark:text-red-400 transition-colors border border-red-100 dark:border-red-800">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>

            {/* --- MASAÜSTÜ TABLO GÖRÜNÜMÜ (Aynı Kaldı) --- */}
            <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr><th className="p-4">Müşteri</th><th className="p-4">Durum</th><th className="p-4">Ödeme</th><th className="p-4">Ücret</th><th className="p-4 text-right">İşlemler</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredJobs.map(job => (
                            <tr key={job.id} onClick={() => router.push(`/dashboard/jobs/${job.id}`)} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                                <td className="p-4 font-bold text-slate-900 dark:text-white">{job.customerName}<br /><span className="text-xs font-normal text-slate-500">{job.device}</span></td>
                                <td className="p-4" onClick={e => e.stopPropagation()}>
                                    <select value={job.status} onChange={e => handleStatusChange(job, e.target.value)} className={`px-2 py-1 rounded text-xs font-bold border ${statusConfig[job.status]?.color}`}>
                                        <option value="pending">Bekliyor</option><option value="in_progress">İşlemde</option><option value="completed">Tamamlandı</option>
                                    </select>
                                </td>
                                <td className="p-4" onClick={e => e.stopPropagation()}>
                                    {job.status === 'completed' && job.paymentStatus === 'paid' ? <span className="text-green-600 font-bold flex gap-1"><CheckCircle2 className="w-4 h-4" /> Ödendi</span> : <button onClick={() => { setSelectedJobForPayment(job); setIsPaymentModalOpen(true) }} className="text-blue-600 font-bold hover:underline">Tahsil Et</button>}
                                </td>
                                <td className="p-4 font-bold">{job.price} ₺</td>
                                <td className="p-4 text-right flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                    <button onClick={() => sendWhatsAppMessage(job)} className="p-2 bg-green-50 text-green-600 rounded"><MessageCircle className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(job.id)} className="p-2 bg-red-50 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODALLER (Aynı Kaldı - Kısalttım) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl border dark:border-slate-700">
                        <div className="flex justify-between mb-4"><h2 className="font-bold text-lg dark:text-white">Yeni İş</h2><button onClick={() => setShowModal(false)}><X className="text-slate-400" /></button></div>
                        <form onSubmit={handleAddJob} className="space-y-3">
                            {branches.length > 0 && !selectedBranch && <select className="w-full p-2 border rounded dark:bg-slate-900 dark:border-slate-700 dark:text-white" value={newJob.branchId} onChange={e => setNewJob({ ...newJob, branchId: e.target.value })}><option value="">Merkez</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>}
                            <input required className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="Müşteri Adı" value={newJob.customerName} onChange={e => setNewJob({ ...newJob, customerName: e.target.value })} />
                            <input required className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="Telefon" value={newJob.phone} onChange={e => setNewJob({ ...newJob, phone: e.target.value })} />
                            <input required className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="Cihaz / Model" value={newJob.device} onChange={e => setNewJob({ ...newJob, device: e.target.value })} />
                            <textarea required className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="Arıza" value={newJob.problem} onChange={e => setNewJob({ ...newJob, problem: e.target.value })} />
                            <div className="grid grid-cols-2 gap-3"><input type="number" className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="Fiyat" value={newJob.price} onChange={e => setNewJob({ ...newJob, price: e.target.value })} /><input className="w-full p-3 border rounded-xl dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="Not" value={newJob.note} onChange={e => setNewJob({ ...newJob, note: e.target.value })} /></div>
                            <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">Kaydet</button>
                        </form>
                    </div>
                </div>
            )}

            {/* ÖDEME MODALI (Kısalttım) */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-xl border dark:border-slate-700">
                        <h2 className="font-bold text-lg mb-4 dark:text-white">Ödeme Al</h2>
                        <div className="space-y-3">
                            <button onClick={() => handlePaymentReceived('cash')} className="w-full p-3 bg-green-50 text-green-700 rounded-lg font-bold">Nakit</button>
                            <button onClick={() => handlePaymentReceived('credit_card')} className="w-full p-3 bg-blue-50 text-blue-700 rounded-lg font-bold">Kredi Kartı</button>
                            <button onClick={() => handlePaymentReceived('bank_transfer')} className="w-full p-3 bg-purple-50 text-purple-700 rounded-lg font-bold">Havale/EFT</button>
                            <button onClick={handlePaymentPending} className="w-full text-slate-500 text-sm mt-2">Ödeme Alınmadı</button>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="w-full text-red-500 text-sm mt-2">İptal</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}