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
    Clock,
    CheckCircle2,
    AlertTriangle,
    Calendar,
    Phone,
    User,
    MoreVertical,
    MapPin,
    Store,
    Filter,
    ArrowRight,
    Loader2,
    MessageCircle,
    Undo2,
    CreditCard,
    Trash2,
    X,
    Wallet,
    Banknote,
    Building2,
    AlertCircle,
    Smartphone
} from 'lucide-react';
import Link from 'next/link';
// 🔥 ŞUBE BAĞLANTISI EKLENDİ
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

    // 🔥 Context'ten Şube Bilgisini Alıyoruz
    const { selectedBranch, branches } = useBranch();

    // Kullanıcı
    const [user, setUser] = useState<any>(null);
    const [targetUid, setTargetUid] = useState<string | null>(null);

    // Modal
    const [showModal, setShowModal] = useState(false);
    const [newJob, setNewJob] = useState({
        customerName: '',
        phone: '',
        device: '',
        problem: '',
        price: '',
        note: '',
        branchId: '' // İşin Hangi Şubede Olduğu
    });

    // Ödeme Modalı
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [selectedJobForPayment, setSelectedJobForPayment] = useState<any>(null);
    const [whatsappTemplate, setWhatsappTemplate] = useState('Sayın müşterimiz, cihazınızın işlemleri tamamlanmıştır. Ücret: {tutar}');

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // 1. Hedef UID Belirle (Personel ise Patronun ID'si)
                const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                const profileSnap = await getDoc(profileRef);

                let ownerId = currentUser.uid;
                if (profileSnap.exists()) {
                    const data = profileSnap.data();
                    if (data.ownerId && data.ownerId !== currentUser.uid) {
                        ownerId = data.ownerId;
                    }
                    // WhatsApp Şablonunu Çek
                    if (data.whatsappTemplates?.deviceCompleted) {
                        setWhatsappTemplate(data.whatsappTemplates.deviceCompleted);
                    }
                }
                setTargetUid(ownerId);

                // 2. İşleri Dinle (Şube Filtresi ile)
                let q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'jobs'),
                    orderBy('createdAt', 'desc')
                );

                // 🔥 EĞER ŞUBE SEÇİLİYSE SADECE O ŞUBENİN İŞLERİNİ GETİR
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
    }, [selectedBranch]); // 🔥 Şube değişince sorguyu yenile

    const handleAddJob = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !targetUid) return;

        // Şube Zorunluluğu Kontrolü
        // Eğer şubeler varsa ve seçim yapılmadıysa (ve global seçiliyse), kullanıcıyı zorla.
        let finalBranchId = newJob.branchId || selectedBranch;

        if (branches.length > 0 && !finalBranchId) {
            // Eğer hiçbiri seçili değilse ve formda da seçilmediyse, varsayılan olarak Merkez'i veya ilk şubeyi al
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
            alert("İş eklenirken hata oluştu.");
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

        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'jobs', job.id), {
            status: newStatus
        });
    };

    const handleDelete = async (jobId: string) => {
        if (!targetUid) return;
        if (confirm("Bu iş kaydını silmek istediğinize emin misiniz?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'jobs', jobId));
        }
    };

    // Ödeme İşlemleri
    const handlePaymentReceived = async (method: string) => {
        if (!selectedJobForPayment || !user || !targetUid) return;

        const batch = writeBatch(db);

        // 1. İşi Güncelle
        const jobRef = doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'jobs', selectedJobForPayment.id);
        batch.update(jobRef, {
            status: 'completed',
            paymentStatus: 'paid',
            paymentMethod: method,
            completedAt: serverTimestamp(),
            completedBy: user.uid
        });

        // 2. Finans Kaydı Oluştur
        const financeRef = doc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'finance'));
        batch.set(financeRef, {
            type: 'income',
            category: 'service',
            amount: Number(selectedJobForPayment.price || 0),
            description: `${selectedJobForPayment.customerName} - Servis`,
            date: serverTimestamp(),
            relatedJobId: selectedJobForPayment.id,
            paymentMethod: method,
            branchId: selectedJobForPayment.branchId, // 🔥 Şube bilgisini finansa da işle
            processedBy: user.uid
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

    // FİLTRELEME
    const filteredJobs = jobs.filter(job => {
        const matchesSearch =
            job.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.device?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const openNewJobModal = () => {
        // Eğer global bir şube seçiliyse onu ata, yoksa boş bırak (kullanıcı seçecek)
        setNewJob(prev => ({ ...prev, branchId: selectedBranch || '' }));
        setShowModal(true);
    }

    return (
        <div className="space-y-6 pb-20">
            {/* BAŞLIK */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-blue-600" /> İş Takibi
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {selectedBranch
                            ? `${branches.find(b => b.id === selectedBranch)?.name} şubesindeki işler listeleniyor.`
                            : 'Tüm şubelerdeki işler listeleniyor.'}
                    </p>
                </div>
                <button onClick={openNewJobModal} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                    <Plus className="w-5 h-5" /> Yeni İş Ekle
                </button>
            </div>

            {/* FİLTRELER */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500 text-sm"
                        placeholder="Müşteri, Cihaz veya Takip No ara..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
                    {['all', 'pending', 'in_progress', 'completed', 'delivered'].map(st => (
                        <button key={st} onClick={() => setStatusFilter(st)} className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap border transition-all ${statusFilter === st ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'}`}>
                            {st === 'all' ? 'Tümü' : statusConfig[st]?.label || st}
                        </button>
                    ))}
                </div>
            </div>

            {/* LİSTE */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading ? <p className="col-span-full text-center py-10 text-slate-500">Yükleniyor...</p> :
                    filteredJobs.length === 0 ? (
                        <div className="col-span-full text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-bold text-slate-900 dark:text-white">Kayıt Bulunamadı</h3>
                            <p className="text-slate-500 text-sm">Aradığınız kriterlere uygun iş yok.</p>
                        </div>
                    ) : filteredJobs.map(job => (
                        <div key={job.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all group relative">
                            {/* Şube Badge (Eğer çok şube varsa göster) */}
                            {branches.length > 0 && (
                                <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Store className="w-3 h-3" /> {job.branchName || 'Merkez'}
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-3 mt-1">
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{job.customerName}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1"><Smartphone className="w-3 h-3" /> {job.device} | {job.phone}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg mb-3">
                                <p className="text-xs text-slate-500 line-clamp-2">{job.problem}</p>
                            </div>
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <select value={job.status} onChange={e => handleStatusChange(job, e.target.value)} className={`pl-2 pr-6 py-1 rounded text-xs font-bold border appearance-none cursor-pointer outline-none ${statusConfig[job.status]?.color}`}>
                                        <option value="pending">Bekliyor</option><option value="in_progress">İşlemde</option><option value="waiting_parts">Parça Bekliyor</option><option value="completed">Tamamlandı</option><option value="cancelled">İptal</option>
                                    </select>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white">{job.price ? `${job.price} ₺` : ''}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => sendWhatsAppMessage(job)} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg" title="WhatsApp"><MessageCircle className="w-4 h-4" /></button>
                                    {job.status === 'completed' && job.paymentStatus === 'paid' ?
                                        <button onClick={() => handleUndoPayment(job)} className="p-2 text-slate-400 hover:text-red-500 bg-slate-50 rounded-lg" title="Ödemeyi İptal Et"><Undo2 className="w-4 h-4" /></button> :
                                        <button onClick={() => { setSelectedJobForPayment(job); setIsPaymentModalOpen(true) }} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg" title="Tahsil Et"><CreditCard className="w-4 h-4" /></button>
                                    }
                                    <button onClick={() => handleDelete(job.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
            </div>

            {/* MASAÜSTÜ TABLO GÖRÜNÜMÜ */}
            <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr><th className="p-4">Müşteri</th><th className="p-4">Durum</th><th className="p-4">Ödeme</th><th className="p-4">Ücret</th><th className="p-4 text-right">İşlemler</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? <tr><td colSpan={5} className="p-8 text-center">Yükleniyor...</td></tr> : filteredJobs.map(job => (
                            <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="p-4">
                                    <div className="font-bold text-slate-900 dark:text-white">{job.customerName}</div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                        <Smartphone className="w-3 h-3" /> {job.device} <span className="text-slate-300">|</span> {job.phone}
                                    </div>
                                    {branches.length > 0 && <span className="text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 rounded text-slate-500">{job.branchName}</span>}
                                </td>
                                <td className="p-4">
                                    <select value={job.status} onChange={e => handleStatusChange(job, e.target.value)} className={`pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border appearance-none cursor-pointer outline-none ${statusConfig[job.status]?.color}`}>
                                        <option value="pending">Bekliyor</option><option value="in_progress">İşlemde</option><option value="waiting_parts">Parça Bekliyor</option><option value="completed">Tamamlandı</option><option value="cancelled">İptal</option>
                                    </select>
                                </td>
                                <td className="p-4">
                                    {job.status === 'completed' && (job.paymentStatus === 'paid' ?
                                        <div className="flex gap-2 items-center"><span className="text-green-700 bg-green-100 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ödendi</span><button onClick={() => handleUndoPayment(job)} className="text-slate-400 hover:text-red-500 p-1 rounded" title="İptal"><Undo2 className="w-4 h-4" /></button></div> :
                                        <button onClick={() => { setSelectedJobForPayment(job); setIsPaymentModalOpen(true) }} className="text-blue-600 text-xs font-bold hover:underline">Tahsil Et</button>
                                    )}
                                </td>
                                <td className="p-4 font-bold text-base">{job.price} ₺</td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button onClick={() => sendWhatsAppMessage(job)} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg"><MessageCircle className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(job.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* EKLEME MODALI */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white"><Plus className="w-6 h-6 text-blue-600" /> Yeni İş Kaydı</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X className="text-slate-400" /></button>
                        </div>

                        <form onSubmit={handleAddJob} className="space-y-4">
                            {/* 🔥 ŞUBE SEÇİMİ (Eğer "Tüm Şubeler" modundaysak soruyoruz) */}
                            {branches.length > 0 && !selectedBranch && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <label className="block text-xs font-bold mb-1 text-blue-700 dark:text-blue-300 uppercase">Şube Seçimi</label>
                                    <div className="relative">
                                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            className="w-full pl-9 p-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg outline-none text-sm appearance-none"
                                            value={newJob.branchId}
                                            onChange={e => setNewJob({ ...newJob, branchId: e.target.value })}
                                        >
                                            <option value="">Merkez (Varsayılan)</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold mb-1">Müşteri Adı</label><input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm outline-none focus:border-blue-500" value={newJob.customerName} onChange={e => setNewJob({ ...newJob, customerName: e.target.value })} /></div>
                                <div><label className="block text-sm font-bold mb-1">Telefon</label><input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm outline-none focus:border-blue-500" value={newJob.phone} onChange={e => setNewJob({ ...newJob, phone: e.target.value })} /></div>
                            </div>

                            <div><label className="block text-sm font-bold mb-1">Cihaz / Model</label><input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm outline-none focus:border-blue-500" value={newJob.device} onChange={e => setNewJob({ ...newJob, device: e.target.value })} /></div>
                            <div><label className="block text-sm font-bold mb-1">Arıza / İşlem</label><textarea required rows={2} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm outline-none focus:border-blue-500" value={newJob.problem} onChange={e => setNewJob({ ...newJob, problem: e.target.value })} /></div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-bold mb-1">Fiyat</label><input type="number" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm outline-none focus:border-blue-500" value={newJob.price} onChange={e => setNewJob({ ...newJob, price: e.target.value })} placeholder="0.00" /></div>
                                <div><label className="block text-sm font-bold mb-1">Notlar</label><input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border rounded-xl text-sm outline-none focus:border-blue-500" value={newJob.note} onChange={e => setNewJob({ ...newJob, note: e.target.value })} /></div>
                            </div>

                            <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors">Kaydet</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Ödeme Modalı (Aynı kaldı) */}
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
                            <p className="text-xs text-slate-400 mt-2">{selectedJobForPayment.customerName} - {selectedJobForPayment.device}</p>
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