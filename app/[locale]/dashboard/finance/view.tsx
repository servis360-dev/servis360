'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatMoney, getCurrencySettings } from '../../../../lib/format';
import {
    collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, getDoc, where
} from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Wallet, TrendingUp, TrendingDown, Plus, Minus, Trash2, History, X, Wrench, Search, Calendar, Store, Loader2
} from 'lucide-react';
import { useBranch } from '../../../../components/providers/branch-context';

export default function FinanceView({ dict }: { dict: any }) {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ income: 0, expense: 0, profit: 0 });
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'income' | 'expense'>('expense');

    const { selectedBranch, branches } = useBranch();
    const [user, setUser] = useState<any>(null);
    const [targetUid, setTargetUid] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Dil ve Para Birimi
    const params = useParams();
    const currentLocale = params?.locale as string || 'en';
    const currency = getCurrencySettings(currentLocale);

    const [formData, setFormData] = useState({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        branchId: ''
    });

    // 1. ADIM: KULLANICI VE HEDEF ID'Yİ BUL (Sadece 1 kere çalışır)
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                    const profileSnap = await getDoc(profileRef);
                    let ownerId = currentUser.uid;
                    if (profileSnap.exists()) {
                        const data = profileSnap.data();
                        if (data.ownerId && data.ownerId !== currentUser.uid) {
                            ownerId = data.ownerId;
                        }
                    }
                    setTargetUid(ownerId);
                } catch (error) {
                    console.error("Profil hatası:", error);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // 2. ADIM: FİNANS VERİSİNİ DİNLE (Şube değişince burası çalışır)
    useEffect(() => {
        if (!targetUid) return;

        setLoading(true);
        console.log("Finans verisi çekiliyor... Hedef:", targetUid, "Şube:", selectedBranch || "TÜMÜ");

        // 🔥 KRİTİK DÜZELTME: orderBy('date') veritabanı sorgusundan kaldırıldı.
        // İndeks hatasını önlemek için sıralamayı aşağıda JavaScript ile yapacağız.

        let q;
        const financeRef = collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'finance');

        if (selectedBranch) {
            q = query(financeRef, where('branchId', '==', selectedBranch));
        } else {
            q = query(financeRef);
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // ⚡ Client-Side Sıralama (En yeniden en eskiye)
            data.sort((a: any, b: any) => {
                const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                return dateB - dateA;
            });

            setTransactions(data);

            // İstatistik Hesaplama
            let inc = 0, exp = 0;
            data.forEach((t: any) => {
                const val = parseFloat(t.amount) || 0;
                if (t.type === 'income') inc += val; else exp += val;
            });
            setStats({ income: inc, expense: exp, profit: inc - exp });

            setLoading(false);
        }, (error) => {
            console.error("Finans verisi hatası:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [targetUid, selectedBranch]); // targetUid veya selectedBranch değişirse tetiklenir

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !targetUid) return;

        let finalBranchId = formData.branchId || selectedBranch;
        if (branches.length > 0 && !finalBranchId) {
            finalBranchId = branches.find(b => b.isHeadquarters)?.id || branches[0]?.id;
        }
        const branchName = branches.find(b => b.id === finalBranchId)?.name || 'Merkez';

        try {
            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'finance'), {
                type: modalType,
                amount: parseFloat(formData.amount),
                category: formData.category,
                description: formData.description,
                date: new Date(formData.date),
                branchId: finalBranchId,
                branchName: branchName,
                processedBy: user.uid,
                createdAt: serverTimestamp()
            });
            setShowModal(false);
            setFormData({ amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0], branchId: '' });
        } catch (error) {
            console.error("Ekleme hatası:", error);
            alert(dict.common.error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!targetUid) return;
        if (confirm(dict.finance.confirm_delete)) {
            try {
                await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'finance', id));
            } catch (error) {
                console.error("Silme hatası:", error);
                alert(dict.common.error);
            }
        }
    };

    const filteredTransactions = transactions.filter((t) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLocaleLowerCase(currentLocale);
        return (
            t.description?.toLocaleLowerCase(currentLocale).includes(term) ||
            t.category?.toLocaleLowerCase(currentLocale).includes(term) ||
            t.amount?.toString().includes(term)
        );
    });

    const getCategories = () => {
        return modalType === 'income' ? Object.values(dict.finance.categories_income) : Object.values(dict.finance.categories_expense);
    };

    const openModal = (type: 'income' | 'expense') => {
        setModalType(type);
        setFormData(prev => ({ ...prev, branchId: selectedBranch || '' }));
        setShowModal(true);
    };

    const getBranchName = () => selectedBranch ? branches.find(b => b.id === selectedBranch)?.name : null;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* BAŞLIK */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-blue-600" /> {dict.finance.title}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {selectedBranch
                            ? dict.finance.subtitle_branch.replace('{branchName}', getBranchName() || '')
                            : dict.finance.subtitle_all}
                    </p>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                    <button onClick={() => openModal('income')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-500/30 active:scale-95 transition-transform"><Plus className="w-5 h-5" /> {dict.finance.btn_add_income}</button>
                    <button onClick={() => openModal('expense')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-500/30 active:scale-95 transition-transform"><Minus className="w-5 h-5" /> {dict.finance.btn_add_expense}</button>
                </div>
            </div>

            {/* ÖZET KARTLARI - PARA BİRİMİ DİNAMİK */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-24 h-24 text-green-600" /></div>
                    <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">{dict.finance.total_income}</p>
                    <h3 className="text-3xl font-black text-green-600 mt-2 tracking-tight">{formatMoney(stats.income, currentLocale)}</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingDown className="w-24 h-24 text-red-600" /></div>
                    <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">{dict.finance.total_expense}</p>
                    <h3 className="text-3xl font-black text-red-600 mt-2 tracking-tight">{formatMoney(stats.expense, currentLocale)}</h3>
                </div>
                <div className={`p-6 rounded-2xl border shadow-sm relative overflow-hidden text-white ${stats.profit >= 0 ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-500' : 'bg-gradient-to-br from-red-600 to-orange-700 border-red-500'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet className="w-24 h-24 text-white" /></div>
                    <p className="text-blue-100 font-medium text-xs uppercase tracking-wider">{dict.finance.net_balance}</p>
                    <h3 className="text-3xl font-black mt-2 tracking-tight">{formatMoney(stats.profit, currentLocale)}</h3>
                </div>
            </div>

            {/* LİSTE */}
            <div className="space-y-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-500" />
                        <h3 className="font-bold text-slate-900 dark:text-white">{dict.finance.title_history}</h3>
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full text-slate-500 font-bold">{filteredTransactions.length}</span>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder={dict.finance.search_placeholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        {searchTerm && (<button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>)}
                    </div>
                </div>

                {/* MOBİL */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                    {loading ? (
                        <div className="text-center py-10 text-slate-500 flex flex-col items-center">
                            <Loader2 className="w-8 h-8 animate-spin mb-2 text-blue-600" />
                            <p>{dict.common.loading}</p>
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-400">{dict.finance.empty_list}</p>
                        </div>
                    ) : filteredTransactions.map((t) => {
                        const dateObj = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                        return (
                            <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{t.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}</div>
                                        <div>
                                            <span className={`block text-xs font-bold uppercase tracking-wider ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.category}</span>
                                            <span className="text-xs text-slate-400">{dateObj.toLocaleDateString(currentLocale)}</span>
                                        </div>
                                    </div>
                                    <div className={`text-lg font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'} {formatMoney(Number(t.amount), currentLocale)}</div>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg mb-3">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{t.relatedJobId && <Wrench className="w-3 h-3 inline-block mr-1 text-blue-500" />}{t.description || '-'}</p>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                                    {t.branchName ? <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded flex items-center gap-1"><Store className="w-3 h-3" /> {t.branchName}</span> : <span></span>}
                                    <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-500 p-1 transition-colors"><Trash2 className="w-5 h-5" /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* MASAÜSTÜ */}
                <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr><th className="p-4">{dict.finance.table_date}</th><th className="p-4">{dict.finance.table_category}</th><th className="p-4">{dict.finance.table_desc}</th><th className="p-4 text-right">{dict.finance.table_amount}</th><th className="p-4 text-right">{dict.common.delete}</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? <tr><td colSpan={5} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />{dict.common.loading}</td></tr> : filteredTransactions.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">{searchTerm ? dict.finance.no_results : dict.finance.empty_list}</td></tr>
                                ) : filteredTransactions.map((t) => {
                                    const dateObj = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="p-4 font-medium text-slate-900 dark:text-white">
                                                {dateObj.toLocaleDateString(currentLocale)}
                                                {branches.length > 0 && <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Store className="w-3 h-3" /> {t.branchName || 'Merkez'}</div>}
                                            </td>
                                            <td className="p-4"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${t.type === 'income' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{t.relatedJobId && <Wrench className="w-3 h-3" />}{t.category}</span></td>
                                            <td className="p-4">{t.description}</td>
                                            <td className={`p-4 text-right font-bold font-mono text-base ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'} {formatMoney(Number(t.amount), currentLocale)}</td>
                                            <td className="p-4 text-right"><button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6"><h2 className={`text-xl font-bold flex items-center gap-2 ${modalType === 'income' ? 'text-green-600' : 'text-red-600'}`}>{modalType === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />} {modalType === 'income' ? dict.finance.modal_title_income : dict.finance.modal_title_expense}</h2><button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button></div>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            {branches.length > 0 && !selectedBranch && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <label className="block text-xs font-bold mb-1 text-blue-700 dark:text-blue-300 uppercase">{dict.finance.label_branch}</label>
                                    <div className="relative">
                                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select className="w-full pl-9 p-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg outline-none text-sm appearance-none" value={formData.branchId} onChange={e => setFormData({ ...formData, branchId: e.target.value })}><option value="">{dict.finance.option_hq}</option>{branches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}</select>
                                    </div>
                                </div>
                            )}
                            <div><label className="block text-sm font-medium mb-1">{dict.finance.label_amount} ({currency.symbol})</label><input type="number" required autoFocus className="w-full p-4 text-center text-2xl font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl outline-none" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium mb-1">{dict.finance.label_category}</label><select className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required><option value="">{dict.common.all}</option>{(getCategories() as string[]).map((c: string) => <option key={c} value={c}>{c}</option>)}</select></div>
                                <div><label className="block text-sm font-medium mb-1">{dict.finance.label_date}</label><input type="date" required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl outline-none" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">{dict.finance.label_desc}</label><input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl outline-none" placeholder={dict.finance.placeholder_desc} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                            <button className={`w-full py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 mt-4 ${modalType === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>{modalType === 'income' ? <Plus className="w-5 h-5" /> : <Minus className="w-5 h-5" />} {dict.common.save}</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}