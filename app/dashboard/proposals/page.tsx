'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Plus,
    FileText,
    Trash2,
    Eye,
    Calendar,
    User,
    CheckCircle2,
    Clock,
    XCircle,
    Printer,
    ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

export default function ProposalsPage() {
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'proposals'),
                    orderBy('createdAt', 'desc')
                );

                const unsubSnap = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setProposals(data);
                    setLoading(false);
                });
                return () => unsubSnap();
            }
        });
        return () => unsubscribe();
    }, []);

    // DURUM DEĞİŞTİRME VE FİNANS ENTEGRASYONU
    const handleStatusChange = async (proposal: any, newStatus: string) => {
        if (!user) return;

        try {
            // 1. Durumu Güncelle
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'proposals', proposal.id), {
                status: newStatus
            });

            // 2. Eğer "ONAYLANDI" seçildiyse Kasaya İşle
            if (newStatus === 'approved') {
                const confirmFinance = confirm("Teklif onaylandı! ✅\n\nBu tutarı (" + proposal.total + " ₺) kasaya 'Gelir' olarak eklemek ister misiniz?");

                if (confirmFinance) {
                    await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'finance'), {
                        type: 'income',
                        category: 'Satış',
                        description: `Teklif Onayı: ${proposal.customerName} (${proposal.proposalNo})`,
                        amount: Number(proposal.total),
                        date: new Date(), // Şu anki tarih
                        createdAt: serverTimestamp(),
                        relatedProposalId: proposal.id
                    });
                    alert("Tutar kasaya işlendi! 💰");
                }
            }

        } catch (error) {
            console.error("Hata:", error);
            alert("İşlem sırasında bir hata oluştu.");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Bu teklifi silmek istediğinize emin misiniz?")) {
            if (user) {
                await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'proposals', id));
            }
        }
    };

    const formatDate = (dateVal: any) => {
        if (!dateVal) return '-';
        if (dateVal.toDate) return dateVal.toDate().toLocaleDateString('tr-TR');
        return new Date(dateVal).toLocaleDateString('tr-TR');
    };

    // Durum Rengi Helper'ı
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-50 text-green-700 border-green-200';
            case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        }
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Teklif Yönetimi</h1>
                    <p className="text-slate-500 dark:text-slate-400">Tekliflerin durumunu buradan yönetin ve kasaya işleyin.</p>
                </div>
                <Link href="/dashboard/proposals/new">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                        <Plus className="w-5 h-5" /> Yeni Teklif
                    </button>
                </Link>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Yükleniyor...</div>
                ) : proposals.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Henüz teklif yok</h3>
                        <Link href="/dashboard/proposals/new" className="mt-4">
                            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">İlk Teklifi Oluştur</button>
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="p-4 font-semibold">Durum</th>
                                    <th className="p-4 font-semibold">Teklif No</th>
                                    <th className="p-4 font-semibold">Müşteri</th>
                                    <th className="p-4 font-semibold">Tarih</th>
                                    <th className="p-4 font-semibold">Tutar</th>
                                    <th className="p-4 font-semibold text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {proposals.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4">
                                            {/* DURUM DEĞİŞTİRME SELECT KUTUSU */}
                                            <select
                                                value={p.status}
                                                onChange={(e) => handleStatusChange(p, e.target.value)}
                                                className={`
                                                    appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border outline-none cursor-pointer transition-colors
                                                    ${getStatusColor(p.status)}
                                                `}
                                            >
                                                <option value="pending">⏳ Bekliyor</option>
                                                <option value="approved">✅ Onaylandı</option>
                                                <option value="rejected">❌ Reddedildi</option>
                                            </select>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-blue-600 text-xs">
                                            {p.proposalNo}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                <User className="w-3 h-3 text-slate-400" /> {p.customerName}
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {formatDate(p.createdAt)}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-slate-900 dark:text-white text-base">
                                                {p.total?.toLocaleString()} ₺
                                            </div>
                                            <div className="text-[10px] text-slate-400">KDV Dahil</div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/dashboard/proposals/${p.id}`}>
                                                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title="Görüntüle / Yazdır">
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                                <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Sil">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}