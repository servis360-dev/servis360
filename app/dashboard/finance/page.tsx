'use client';

import { useEffect, useState } from 'react';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy,
    where
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Plus,
    Minus,
    Search,
    Filter,
    Trash2,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    PieChart,
    X,
    History // <-- İŞTE BU EKLENDİ
} from 'lucide-react';

export default function FinancePage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ income: 0, expense: 0, profit: 0 });
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'income' | 'expense'>('expense');

    // Form
    const [formData, setFormData] = useState({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Son işlemleri getir
        const q = query(
            collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'transactions'),
            orderBy('date', 'desc'),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setTransactions(data);

            // İstatistikleri Hesapla
            let inc = 0;
            let exp = 0;
            data.forEach((t: any) => {
                if (t.type === 'income') inc += parseFloat(t.amount);
                else exp += parseFloat(t.amount);
            });

            setStats({ income: inc, expense: exp, profit: inc - exp });
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'transactions'), {
            type: modalType,
            amount: parseFloat(formData.amount),
            category: formData.category,
            description: formData.description,
            date: formData.date,
            createdAt: serverTimestamp()
        });

        setShowModal(false);
        setFormData({ amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0] });
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bu işlemi silmek istiyor musunuz? Kasa bakiyesi etkilenecektir.')) {
            const user = auth.currentUser;
            if (!user) return;
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'transactions', id));
        }
    };

    const categories = modalType === 'income'
        ? ['Satış', 'Hizmet', 'Ekstra Gelir']
        : ['Kira', 'Fatura', 'Yemek', 'Malzeme', 'Maaş', 'Diğer'];

    return (
        <div className="space-y-6">
            {/* Başlık */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Kasa & Giderler</h1>
                    <p className="text-slate-500 dark:text-slate-400">İşletmenizin finansal durumunu yönetin.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setModalType('income'); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30"
                    >
                        <Plus className="w-5 h-5" /> Gelir Ekle
                    </button>
                    <button
                        onClick={() => { setModalType('expense'); setShowModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30"
                    >
                        <Minus className="w-5 h-5" /> Gider Ekle
                    </button>
                </div>
            </div>

            {/* Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp className="w-24 h-24 text-green-600" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Toplam Gelir</p>
                    <h3 className="text-3xl font-bold text-green-600 dark:text-green-500 mt-2">{stats.income.toLocaleString()} ₺</h3>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingDown className="w-24 h-24 text-red-600" />
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Toplam Gider</p>
                    <h3 className="text-3xl font-bold text-red-600 dark:text-red-500 mt-2">{stats.expense.toLocaleString()} ₺</h3>
                </div>

                <div className={`p-6 rounded-2xl border shadow-sm relative overflow-hidden text-white ${stats.profit >= 0 ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-500' : 'bg-gradient-to-br from-red-600 to-orange-700 border-red-500'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-20">
                        <Wallet className="w-24 h-24 text-white" />
                    </div>
                    <p className="text-blue-100 font-medium">Net Kasa (Kâr/Zarar)</p>
                    <h3 className="text-3xl font-bold mt-2">{stats.profit.toLocaleString()} ₺</h3>
                </div>
            </div>

            {/* İşlem Listesi */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-500" /> Son İşlemler
                    </h3>
                    <div className="text-sm text-slate-500">
                        Son {transactions.length} kayıt gösteriliyor
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-4 font-semibold">Tarih</th>
                                <th className="p-4 font-semibold">Kategori</th>
                                <th className="p-4 font-semibold">Açıklama</th>
                                <th className="p-4 font-semibold text-right">Tutar</th>
                                <th className="p-4 font-semibold text-right">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center">Yükleniyor...</td></tr>
                            ) : transactions.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Henüz bir işlem yok.</td></tr>
                            ) : (
                                transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4 font-medium text-slate-900 dark:text-white">
                                            {new Date(t.date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${t.type === 'income'
                                                    ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800'
                                                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
                                                }`}>
                                                {t.category}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400">{t.description}</td>
                                        <td className={`p-4 text-right font-bold font-mono text-base ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                            {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString()} ₺
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleDelete(t.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Kaydı Sil"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Ekleme Modalı */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className={`text-xl font-bold flex items-center gap-2 ${modalType === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                {modalType === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                                {modalType === 'income' ? 'Gelir Ekle' : 'Gider Ekle'}
                            </h2>
                            <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tutar (TL)</label>
                                <input
                                    type="number"
                                    required
                                    autoFocus
                                    className="w-full p-4 text-center text-2xl font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori</label>
                                    <select
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        required
                                    >
                                        <option value="">Seçiniz</option>
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tarih</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama</label>
                                <input
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    placeholder={modalType === 'income' ? 'Örn: Nakit Satış' : 'Örn: Ocak Ayı Elektrik'}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <button className={`w-full py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 mt-4 ${modalType === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                                <Plus className="w-5 h-5" /> Kaydet
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}