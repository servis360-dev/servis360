'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
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
    Printer
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

    const handleDelete = async (id: string) => {
        if (confirm("Bu teklifi silmek istediğinize emin misiniz?")) {
            if (user) {
                await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'proposals', id));
            }
        }
    };

    // Tarih Formatlayıcı (Timestamp veya String destekli)
    const formatDate = (dateVal: any) => {
        if (!dateVal) return '-';
        if (dateVal.toDate) return dateVal.toDate().toLocaleDateString('tr-TR'); // Firestore Timestamp
        return new Date(dateVal).toLocaleDateString('tr-TR'); // Normal Date
    };

    // Durum Rozeti Rengi
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200"><CheckCircle2 className="w-3 h-3" /> Onaylandı</span>;
            case 'rejected':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200"><XCircle className="w-3 h-3" /> Reddedildi</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200"><Clock className="w-3 h-3" /> Bekliyor</span>;
        }
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Başlık */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Teklif Yönetimi</h1>
                    <p className="text-slate-500 dark:text-slate-400">Müşterilerinize sunduğunuz fiyat teklifleri.</p>
                </div>
                <Link href="/dashboard/proposals/new">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                        <Plus className="w-5 h-5" /> Yeni Teklif
                    </button>
                </Link>
            </div>

            {/* Liste */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">Yükleniyor...</div>
                ) : proposals.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">Henüz teklif yok</h3>
                        <p className="text-slate-500 text-sm mt-1 mb-6">Müşterilerinize profesyonel teklifler sunmaya başlayın.</p>
                        <Link href="/dashboard/proposals/new">
                            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">İlk Teklifi Oluştur</button>
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
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                        <td className="p-4">
                                            {getStatusBadge(p.status)}
                                        </td>
                                        <td className="p-4 font-mono font-bold text-blue-600 text-xs">
                                            {p.proposalNo || `#${p.id.substring(0, 6).toUpperCase()}`}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                    <User className="w-3 h-3 text-slate-400" /> {p.customerName}
                                                </span>
                                                {p.customerPhone && <span className="text-xs text-slate-400 ml-5">{p.customerPhone}</span>}
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
                                                {/* Detay / Yazdır Butonu */}
                                                <Link href={`/dashboard/proposals/${p.id}`}>
                                                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2 group/btn" title="Görüntüle & Yazdır">
                                                        <Printer className="w-4 h-4" />
                                                        <span className="text-xs font-bold hidden md:block">Yazdır</span>
                                                    </button>
                                                </Link>

                                                {/* Sil Butonu */}
                                                <button
                                                    onClick={() => handleDelete(p.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Sil"
                                                >
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