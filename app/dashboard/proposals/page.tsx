'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Plus,
    Search,
    FileText,
    Printer,
    Trash2,
    Eye,
    Calendar,
    User
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Teklifler</h1>
                    <p className="text-slate-500 dark:text-slate-400">Müşterilerinize sunduğunuz proforma faturalar.</p>
                </div>
                <Link href="/dashboard/proposals/new">
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                        <Plus className="w-5 h-5" /> Yeni Teklif Oluştur
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
                        <p className="text-slate-500 text-sm mt-1 mb-6">İlk profesyonel teklifinizi hemen oluşturun.</p>
                        <Link href="/dashboard/proposals/new">
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Oluştur</button>
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="p-4 font-semibold">Teklif No</th>
                                    <th className="p-4 font-semibold">Müşteri</th>
                                    <th className="p-4 font-semibold">Tarih</th>
                                    <th className="p-4 font-semibold">Toplam Tutar</th>
                                    <th className="p-4 font-semibold text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {proposals.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4 font-mono font-medium text-blue-600">#{p.proposalNo || p.id.substring(0, 6).toUpperCase()}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-slate-400" />
                                                <span className="font-medium text-slate-900 dark:text-white">{p.customerName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(p.date).toLocaleDateString('tr-TR')}
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                                            {p.total.toLocaleString()} ₺
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link href={`/dashboard/proposals/${p.id}`}>
                                                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Görüntüle">
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </Link>
                                                <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Sil">
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