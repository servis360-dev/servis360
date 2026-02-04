'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatMoney, getCurrencySettings } from '../../../../lib/format';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Plus,
    FileText,
    Trash2,
    Calendar,
    User,
    Printer,
    Search
} from 'lucide-react';
import Link from 'next/link';

export default function ProposalsView({ dict }: { dict: any }) {
    const [proposals, setProposals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Dil ve Para Birimi
    const params = useParams();
    const currentLocale = params?.locale as string || 'en';
    const currency = getCurrencySettings(currentLocale);

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

    const handleStatusChange = async (proposal: any, newStatus: string) => {
        if (!user) return;

        try {
            // 1. Durumu Güncelle
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'proposals', proposal.id), {
                status: newStatus
            });

            // 2. Eğer "ONAYLANDI" seçildiyse Kasaya İşle
            if (newStatus === 'approved') {
                const formattedAmount = formatMoney(Number(proposal.total), currentLocale);
                const confirmMsg = dict.proposals.confirm_approve.replace('{amount}', formattedAmount);

                if (confirm(confirmMsg)) {
                    // Finans açıklamasını dille uyumlu yap
                    const desc = dict.proposals.finance_desc
                        .replace('{customer}', proposal.customerName)
                        .replace('{no}', proposal.proposalNo);

                    await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'finance'), {
                        type: 'income',
                        category: dict.proposals.finance_category, // 'Satış' veya 'Sales'
                        description: desc,
                        amount: Number(proposal.total),
                        date: new Date().toISOString().split('T')[0], // Tarih formatı düzeltildi
                        createdAt: serverTimestamp(),
                        relatedProposalId: proposal.id,
                        processedBy: user.uid
                    });
                    alert(dict.proposals.alert_finance_added);
                }
            }
        } catch (error) {
            console.error("Hata:", error);
            alert(dict.common.error);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm(dict.proposals.confirm_delete)) {
            if (user) {
                await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'proposals', id));
            }
        }
    };

    const formatDate = (dateVal: any) => {
        if (!dateVal) return '-';
        const d = dateVal.toDate ? dateVal.toDate() : new Date(dateVal);
        return d.toLocaleDateString(currentLocale);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'bg-green-50 text-green-700 border-green-200';
            case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        }
    };

    const filteredProposals = proposals.filter(p =>
        p.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.proposalNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* BAŞLIK VE BUTON */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{dict.proposals.title}</h1>
                    <p className="text-slate-500 dark:text-slate-400">{dict.proposals.subtitle}</p>
                </div>
                <Link href="/dashboard/proposals/new">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                        <Plus className="w-5 h-5" /> {dict.proposals.btn_new}
                    </button>
                </Link>
            </div>

            {/* ARAMA ÇUBUĞU */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder={dict.proposals.search_placeholder}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* LİSTE */}
            <div className="bg-transparent md:bg-white md:dark:bg-slate-800 md:rounded-xl md:border md:border-slate-200 md:dark:border-slate-700 md:shadow-sm md:overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">{dict.common.loading}</div>
                ) : filteredProposals.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">{dict.proposals.empty_title}</h3>
                        <p className="text-slate-500 text-sm mt-1">{dict.proposals.empty_desc}</p>
                    </div>
                ) : (
                    <>
                        {/* MOBİL KART GÖRÜNÜMÜ */}
                        <div className="grid grid-cols-1 gap-4 md:hidden">
                            {filteredProposals.map((p) => (
                                <div key={p.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${p.status === 'approved' ? 'bg-green-500' : p.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                    <div className="flex justify-between items-start mb-3 pl-2">
                                        <div>
                                            <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{p.proposalNo}</span>
                                            <h3 className="font-bold text-slate-900 dark:text-white text-lg mt-1">{p.customerName}</h3>
                                            <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                                <Calendar className="w-3 h-3" />
                                                {formatDate(p.createdAt)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="block font-black text-xl text-slate-900 dark:text-white">{formatMoney(Number(p.total), currentLocale)}</span>
                                            <span className="text-[10px] text-slate-400">{dict.proposals.label_vat_included}</span>
                                        </div>
                                    </div>
                                    <div className="mb-4 pl-2">
                                        <label className="text-[10px] text-slate-400 font-bold uppercase mb-1 block">{dict.proposals.label_proposal_status}</label>
                                        <div className="relative">
                                            <select value={p.status} onChange={(e) => handleStatusChange(p, e.target.value)} className={`w-full appearance-none font-bold text-sm py-2 px-3 rounded-lg border outline-none ${getStatusColor(p.status)}`}>
                                                <option value="pending">{dict.proposals.status.pending}</option>
                                                <option value="approved">{dict.proposals.status.approved}</option>
                                                <option value="rejected">{dict.proposals.status.rejected}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700 pl-2">
                                        <Link href={`/dashboard/proposals/${p.id}`} className="flex-1">
                                            <button className="w-full flex items-center justify-center gap-2 py-2 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-200 dark:border-slate-600">
                                                <Printer className="w-4 h-4" /> {dict.proposals.btn_view}
                                            </button>
                                        </Link>
                                        <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-lg hover:bg-red-100 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* MASAÜSTÜ TABLO GÖRÜNÜMÜ */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="p-4 font-semibold">{dict.proposals.table_status}</th>
                                        <th className="p-4 font-semibold">{dict.proposals.table_no}</th>
                                        <th className="p-4 font-semibold">{dict.proposals.table_customer}</th>
                                        <th className="p-4 font-semibold">{dict.proposals.table_date}</th>
                                        <th className="p-4 font-semibold">{dict.proposals.table_amount}</th>
                                        <th className="p-4 font-semibold text-right">{dict.proposals.table_actions}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredProposals.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="p-4">
                                                <select value={p.status} onChange={(e) => handleStatusChange(p, e.target.value)} className={`appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border outline-none cursor-pointer transition-colors ${getStatusColor(p.status)}`}>
                                                    <option value="pending">{dict.proposals.status.pending}</option>
                                                    <option value="approved">{dict.proposals.status.approved}</option>
                                                    <option value="rejected">{dict.proposals.status.rejected}</option>
                                                </select>
                                            </td>
                                            <td className="p-4 font-mono font-bold text-blue-600 text-xs">{p.proposalNo}</td>
                                            <td className="p-4"><div className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><User className="w-3 h-3 text-slate-400" /> {p.customerName}</div></td>
                                            <td className="p-4 text-slate-500"><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-slate-400" /> {formatDate(p.createdAt)}</div></td>
                                            <td className="p-4"><div className="font-bold text-slate-900 dark:text-white text-base">{formatMoney(Number(p.total), currentLocale)}</div><div className="text-[10px] text-slate-400">{dict.proposals.label_vat_included}</div></td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link href={`/dashboard/proposals/${p.id}`}><button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg" title={dict.proposals.btn_view}><Printer className="w-4 h-4" /></button></Link>
                                                    <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title={dict.common.delete}><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}