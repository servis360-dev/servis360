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
import {
    Briefcase,
    Plus,
    Search,
    CreditCard,
    Trash2,
    X,
    Wallet,
    Banknote,
    Building2,
    Store,
    Smartphone,
    MessageCircle,
    Undo2,
    CheckCircle2,
    Filter,
    ArrowLeft
} from 'lucide-react';
// 🔥 Context'ten Şube Bilgisi
import { useBranch } from '../../../components/providers/branch-context';

const statusConfig: any = {
    pending: { label: 'Bekliyor', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    in_progress: { label: 'İşlemde', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    waiting_parts: { label: 'Parça Bekliyor', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    completed: { label: 'Tamamlandı', color: 'text-green-600 bg-green-50 border-green-200' },
    delivered: { label: 'Teslim Edildi', color: 'text-slate-600 bg-slate-50 border-slate-200' },
    cancelled: { label: 'İptal', color: 'text-red-600 bg-red-50 border-red-200' }
};

export default function JobsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // 🔥 Context
    const { selectedBranch, branches } = useBranch();

    // Kullanıcı
    const [user, setUser] = useState<any>(null);
    const [targetUid, setTargetUid] = useState<string | null>(null);

    // Modallar
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

    // Ödeme Modalı
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedJobForPayment, setSelectedJobForPayment] = useState<any>(null);
    const [whatsappTemplate, setWhatsappTemplate] = useState('Sayın müşterimiz, cihazınızın işlemleri tamamlanmıştır. Ücret: {tutar}');

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // 1. Hedef UID
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

                // 2. İşleri Çek
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
            console.error("İş ekleme hatası:", error);
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
        batch.update(jobRef, {
            status: 'completed', paymentStatus: 'paid', paymentMethod: method, completedAt: serverTimestamp(), completedBy: user.uid
        });
        const financeRef = doc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'finance'));
        batch.set(financeRef, {
            type: 'income', category: 'service', amount: Number(selectedJobForPayment.price || 0), description: `${selectedJobForPayment.customerName} - Servis`, date: serverTimestamp(), relatedJobId: selectedJobForPayment.id, paymentMethod: method, branchId: selectedJobForPayment.branchId, processedBy: user.uid
        });
        await batch.commit();
        setIsPaymentModalOpen(false);
        setSelectedJobForPayment(null);
    };

    const handlePaymentPending = async () => {
        if (!selectedJobForPayment || !user || !targetUid) return;
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'jobs', selectedJobForPayment.id), { status: 'completed', paymentStatus: 'pending', completedAt: serverTimestamp() });
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
        const matchesSearch = job.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) || job.device?.toLowerCase().includes(searchTerm.toLowerCase()) || job.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const openNewJobModal = () => {
        setNewJob(prev => ({ ...prev, branchId: selectedBranch || '' }));
        setShowModal(true);
    }

    return (
        <div className="space-y-4 pb-24 md:pb-20">
            {/* MOBİL BAŞLIK VE EKLE BUTONU */}
            <div className="flex justify-between items-center sticky top-0 z-20 bg-slate-50 dark:bg-slate-950 py-2 md:static md:py-0">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-blue-600" /> İş Takibi
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm">
                        {selectedBranch ? `${branches.find(b => b.id === selectedBranch)?.name}` : 'Tüm Şubeler'}
                    </p>
                </div>
                <button onClick={openNewJobModal} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95 text-sm">
                    <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Yeni İş</span>
                </button>
            </div>

            {/* ARAMA VE FİLTRE (SCROLLABLE) */}
            <div className="space-y-3">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        className="w-full pl-9 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm shadow-sm"
                        placeholder="Müşteri, cihaz veya no ara..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                {/* Mobilde Yatay Kaydırılabilir Filtre */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
                    {['all', 'pending', 'in_progress', 'waiting_parts', 'completed', 'delivered'].map(st => (
                        <button
                            key={st}
                            onClick={() => setStatusFilter(st)}
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all shadow-sm flex-shrink-0 ${statusFilter === st ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                        >
                            {st === 'all' ? 'Tümü' : statusConfig[st]?.label || st}
                        </button>
                    ))}
                </div>
            </div>

            {/* LİSTE / KART GÖRÜNÜMÜ */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {loading ? <p className="col-span-full text-center py-10 text-slate-500">Yükleniyor...</p> :
                    filteredJobs.length === 0 ? (
                        <div className="col-span-full text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">Kayıt bulunamadı.</p>
                        </div>
                    ) : filteredJobs.map(job => (
                        <div key={job.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group">
                            {/* Kart Başlığı */}
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{job.customerName}</h3>
                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                        <Smartphone className="w-3 h-3" /> {job.device} <span className="text-slate-300">|</span> {job.phone}
                                    </div>
                                </div>
                                {branches.length > 0 && (
                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Store className="w-3 h-3" /> {job.branchName || 'Merkez'}
                                    </span>
                                )}
                            </div>

                            {/* Arıza Açıklaması */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg mb-3 border border-slate-100 dark:border-slate-800">
                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{job.problem}</p>
                            </div>

                            {/* Aksiyonlar Alt Bar */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-2 flex-1">
                                    <select value={job.status} onChange={e => handleStatusChange(job, e.target.value)} className={`w-full max-w-[110px] pl-2 pr-1 py-1.5 rounded-lg text-[10px] font-bold border appearance-none cursor-pointer outline-none truncate ${statusConfig[job.status]?.color}`}>
                                        <option value="pending">Bekliyor</option><option value="in_progress">İşlemde</option><option value="waiting_parts">Parça Bekl.</option><option value="completed">Tamamlandı</option><option value="delivered">Teslim</option><option value="cancelled">İptal</option>
                                    </select>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">{job.price ? `${job.price} ₺` : ''}</span>
                                </div>

                                <div className="flex gap-1.5">
                                    <button onClick={() => sendWhatsAppMessage(job)} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg active:scale-95 transition-transform"><MessageCircle className="w-5 h-5" /></button>
                                    {job.status === 'completed' && job.paymentStatus === 'paid' ?
                                        <button onClick={() => handleUndoPayment(job)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg active:scale-95 transition-transform"><Undo2 className="w-5 h-5" /></button> :
                                        <button onClick={() => { setSelectedJobForPayment(job); setIsPaymentModalOpen(true) }} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg active:scale-95 transition-transform"><CreditCard className="w-5 h-5" /></button>
                                    }
                                    <button onClick={() => handleDelete(job.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg active:scale-95 transition-transform"><Trash2 className="w-5 h-5" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>

            {/* MASAÜSTÜ TABLO (Mobilde Gizli) */}
            <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm mt-6">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr><th className="p-4">Müşteri</th><th className="p-4">Durum</th><th className="p-4">Ödeme</th><th className="p-4">Ücret</th><th className="p-4 text-right">İşlemler</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredJobs.map(job => (
                            <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="p-4">
                                    <div className="font-bold text-slate-900 dark:text-white">{job.customerName}</div>
                                    <div className="text-xs text-slate-500">{job.device} | {job.phone}</div>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${statusConfig[job.status]?.color}`}>{statusConfig[job.status]?.label}</span>
                                </td>
                                <td className="p-4">
                                    {job.paymentStatus === 'paid' ? <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ödendi</span> : <span className="text-slate-400">Bekliyor</span>}
                                </td>
                                <td className="p-4 font-bold">{job.price} ₺</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleDelete(job.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* YENİ İŞ EKLEME MODALI (TAM EKRAN MOBILE) */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-w-lg sm:rounded-2xl p-0 sm:p-0 shadow-2xl flex flex-col sm:block animate-in slide-in-from-bottom-10 sm:zoom-in-95">

                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <button onClick={() => setShowModal(false)} className="sm:hidden mr-2"><ArrowLeft className="w-6 h-6" /></button>
                                Yeni İş Kaydı
                            </h2>
                            <button onClick={() => setShowModal(false)} className="hidden sm:block p-1 hover:bg-slate-100 rounded-full"><X className="text-slate-400" /></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1">
                            <form onSubmit={handleAddJob} className="space-y-4">
                                {branches.length > 0 && !selectedBranch && (
                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                                        <label className="block text-xs font-bold mb-1 text-blue-700 dark:text-blue-300 uppercase">Şube</label>
                                        <select className="w-full p-2 bg-transparent border-b border-blue-200 dark:border-blue-800 outline-none text-sm font-bold" value={newJob.branchId} onChange={e => setNewJob({ ...newJob, branchId: e.target.value })}>
                                            <option value="">Merkez (Varsayılan)</option>
                                            {branches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                                        </select>
                                    </div>
                                )}

                                <div><label className="text-xs font-bold text-slate-500 uppercase">Müşteri</label><input required className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl mt-1 text-sm font-bold" placeholder="Ad Soyad" value={newJob.customerName} onChange={e => setNewJob({ ...newJob, customerName: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase">Telefon</label><input required type="tel" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl mt-1 text-sm font-bold" placeholder="05XX..." value={newJob.phone} onChange={e => setNewJob({ ...newJob, phone: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase">Cihaz</label><input required className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl mt-1 text-sm font-bold" placeholder="iPhone 11, Samsung S20..." value={newJob.device} onChange={e => setNewJob({ ...newJob, device: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-slate-500 uppercase">Arıza / İşlem</label><textarea required rows={2} className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl mt-1 text-sm" placeholder="Ekran değişimi yapılacak..." value={newJob.problem} onChange={e => setNewJob({ ...newJob, problem: e.target.value })} /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-slate-500 uppercase">Fiyat (TL)</label><input type="number" className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl mt-1 text-lg font-bold" placeholder="0.00" value={newJob.price} onChange={e => setNewJob({ ...newJob, price: e.target.value })} /></div>
                                    <div><label className="text-xs font-bold text-slate-500 uppercase">Not</label><input className="w-full p-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl mt-1 text-sm" placeholder="Opsiyonel" value={newJob.note} onChange={e => setNewJob({ ...newJob, note: e.target.value })} /></div>
                                </div>
                                <div className="pt-4 pb-safe-bottom">
                                    <button className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all text-base">KAYDET</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* ÖDEME MODALI (TAM EKRAN MOBILE) */}
            {isPaymentModalOpen && selectedJobForPayment && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full h-full sm:h-auto sm:max-w-md sm:rounded-2xl p-0 sm:p-0 shadow-2xl flex flex-col sm:block animate-in slide-in-from-bottom-10 sm:zoom-in-95">

                        <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <button onClick={() => setIsPaymentModalOpen(false)} className="sm:hidden mr-2"><ArrowLeft className="w-6 h-6" /></button>
                                Ödeme Al
                            </h2>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="hidden sm:block p-1 hover:bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 flex-1 flex flex-col justify-center sm:block">
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl mb-8 text-center border border-slate-100 dark:border-slate-700">
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-1 font-bold uppercase">Toplam Tutar</p>
                                <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{selectedJobForPayment.price} ₺</p>
                                <p className="text-xs text-slate-400 mt-2">{selectedJobForPayment.customerName} • {selectedJobForPayment.device}</p>
                            </div>
                            <div className="space-y-3">
                                <button onClick={() => handlePaymentReceived('cash')} className="w-full p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-xl flex items-center gap-4 font-bold text-green-700 dark:text-green-400 active:scale-95 transition-transform">
                                    <div className="p-2 bg-green-200 dark:bg-green-800 rounded-full"><Banknote className="w-5 h-5" /></div> Nakit Ödeme
                                </button>
                                <button onClick={() => handlePaymentReceived('credit_card')} className="w-full p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-xl flex items-center gap-4 font-bold text-blue-700 dark:text-blue-400 active:scale-95 transition-transform">
                                    <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-full"><CreditCard className="w-5 h-5" /></div> Kredi Kartı
                                </button>
                                <button onClick={() => handlePaymentReceived('bank_transfer')} className="w-full p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30 rounded-xl flex items-center gap-4 font-bold text-purple-700 dark:text-purple-400 active:scale-95 transition-transform">
                                    <div className="p-2 bg-purple-200 dark:bg-purple-800 rounded-full"><Building2 className="w-5 h-5" /></div> Havale / EFT
                                </button>
                                <button onClick={handlePaymentPending} className="w-full py-4 text-slate-400 text-sm font-bold hover:text-slate-600">Ödeme Alınmadı (Veresiye)</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}