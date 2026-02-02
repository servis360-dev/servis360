'use client';

import { useEffect, useState } from 'react';
import {
    collection, query, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, orderBy, getDoc, where
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Wallet, TrendingUp, TrendingDown, Plus, Minus, Trash2, History, X, Wrench, Search, Calendar, Store, AlertTriangle, ArrowRight
} from 'lucide-react';
// 🔥 ŞUBE BAĞLANTISI
import { useBranch } from '../../../components/providers/branch-context';

export default function FinancePage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ income: 0, expense: 0, profit: 0 });
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'income' | 'expense'>('expense');

    // 🔥 Context'ten Şube Bilgisini Alıyoruz
    const { selectedBranch, branches } = useBranch();

    // Kullanıcı ve Hedef ID
    const [user, setUser] = useState<any>(null);
    const [targetUid, setTargetUid] = useState<string | null>(null);

    // Arama durumu
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        amount: '',
        category: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        branchId: '' // 🔥 İşlemin Hangi Şubede Olduğu
    });

    useEffect(() => {
        let unsubSnapshot: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                try {
                    // 1. Profil ve Hedef ID Belirleme
                    const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                    const profileSnap = await getDoc(profileRef);

                    let ownerId = currentUser.uid; // Varsayılan: Kendisi

                    if (profileSnap.exists()) {
                        const data = profileSnap.data();
                        if (data.ownerId && data.ownerId !== currentUser.uid) {
                            ownerId = data.ownerId;
                        }
                    }

                    setTargetUid(ownerId);

                    // 2. Finans Verilerini Dinle (Şube Filtresi ile)
                    let q = query(
                        collection(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'finance'),
                        orderBy('date', 'desc')
                    );

                    // 🔥 EĞER ŞUBE SEÇİLİYSE SADECE O ŞUBENİN KASASINI GETİR
                    if (selectedBranch) {
                        q = query(
                            collection(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'finance'),
                            where('branchId', '==', selectedBranch),
                            orderBy('date', 'desc')
                        );
                    }

                    unsubSnapshot = onSnapshot(q, (snapshot) => {
                        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                        // JS tarafında Tarih Sıralamasını Garantiye Al
                        data.sort((a: any, b: any) => {
                            const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                            const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                            return dateB - dateA; // En yeni en üstte
                        });

                        setTransactions(data);

                        // İstatistikleri Hesapla (Gelen veri zaten filtrelenmiş olduğu için direkt toplayabiliriz)
                        let inc = 0, exp = 0;
                        data.forEach((t: any) => {
                            const val = parseFloat(t.amount) || 0;
                            if (t.type === 'income') inc += val; else exp += val;
                        });

                        setStats({ income: inc, expense: exp, profit: inc - exp });
                        setLoading(false);
                    });

                } catch (error) {
                    console.error("Veri çekme hatası", error);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubSnapshot) unsubSnapshot();
        };
    }, [selectedBranch]); // 🔥 Şube değişince yeniden çalış

    const handleAddTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !targetUid) return;

        // Şube Belirleme
        let finalBranchId = formData.branchId || selectedBranch;

        // Eğer hiçbiri seçili değilse ve formda da seçilmediyse, varsayılan olarak Merkez'i al
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
                branchId: finalBranchId, // 🔥 Şube ID
                branchName: branchName, // 🔥 Şube Adı
                processedBy: user.uid,
                createdAt: serverTimestamp()
            });

            setShowModal(false);
            setFormData({ amount: '', category: '', description: '', date: new Date().toISOString().split('T')[0], branchId: '' });
        } catch (error) {
            console.error("Ekleme hatası:", error);
            alert("İşlem kaydedilemedi.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!targetUid) return;
        if (confirm('Bu işlemi silmek istiyor musunuz? Kasa bakiyesi etkilenecektir.')) {
            try {
                await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'finance', id));
            } catch (error) {
                console.error("Silme hatası:", error);
                alert("Silinemedi.");
            }
        }
    };

    // ARAMA FİLTRESİ
    const filteredTransactions = transactions.filter((t) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLocaleLowerCase('tr-TR');
        return (
            t.description?.toLocaleLowerCase('tr-TR').includes(term) ||
            t.category?.toLocaleLowerCase('tr-TR').includes(term) ||
            t.amount?.toString().includes(term)
        );
    });

    const categories = modalType === 'income' ? ['Satış', 'Hizmet', 'Ekstra Gelir', 'Tahsilat'] : ['Kira', 'Fatura', 'Yemek', 'Malzeme', 'Maaş', 'Akaryakıt', 'Diğer'];

    const openModal = (type: 'income' | 'expense') => {
        setModalType(type);
        setFormData(prev => ({ ...prev, branchId: selectedBranch || '' }));
        setShowModal(true);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* BAŞLIK VE BUTONLAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-blue-600" /> Kasa & Giderler
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {selectedBranch
                            ? `${branches.find(b => b.id === selectedBranch)?.name} kasası görüntüleniyor.`
                            : 'Tüm şubelerin toplam kasası görüntüleniyor.'}
                    </p>
                </div>
                <div className="flex w-full md:w-auto gap-2">
                    <button onClick={() => openModal('income')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-500/30 active:scale-95 transition-transform"><Plus className="w-5 h-5" /> Gelir Ekle</button>
                    <button onClick={() => openModal('expense')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-500/30 active:scale-95 transition-transform"><Minus className="w-5 h-5" /> Gider Ekle</button>
                </div>
            </div>

            {/* ÖZET KARTLARI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-24 h-24 text-green-600" /></div>
                    <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Toplam Gelir</p>
                    <h3 className="text-3xl font-black text-green-600 mt-2 tracking-tight">{stats.income.toLocaleString()} ₺</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingDown className="w-24 h-24 text-red-600" /></div>
                    <p className="text-slate-500 font-medium text-xs uppercase tracking-wider">Toplam Gider</p>
                    <h3 className="text-3xl font-black text-red-600 mt-2 tracking-tight">{stats.expense.toLocaleString()} ₺</h3>
                </div>
                <div className={`p-6 rounded-2xl border shadow-sm relative overflow-hidden text-white ${stats.profit >= 0 ? 'bg-gradient-to-br from-blue-600 to-indigo-700 border-blue-500' : 'bg-gradient-to-br from-red-600 to-orange-700 border-red-500'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-20"><Wallet className="w-24 h-24 text-white" /></div>
                    <p className="text-blue-100 font-medium text-xs uppercase tracking-wider">Net Kasa</p>
                    <h3 className="text-3xl font-black mt-2 tracking-tight">{stats.profit.toLocaleString()} ₺</h3>
                </div>
            </div>

            {/* LİSTE */}
            <div className="space-y-4">
                {/* Header ve Arama */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-slate-500" />
                        <h3 className="font-bold text-slate-900 dark:text-white">Hesap Hareketleri</h3>
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full text-slate-500 font-bold">{filteredTransactions.length}</span>
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Ara: Mazot, Kadir, vb..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                        )}
                    </div>
                </div>

                {/* MOBİL İÇİN KART GÖRÜNÜMÜ (md:hidden) */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                    {loading ? (
                        <p className="text-center py-10 text-slate-500">Yükleniyor...</p>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-400">İşlem bulunamadı.</p>
                        </div>
                    ) : filteredTransactions.map((t) => {
                        const dateObj = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                        return (
                            <div key={t.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${t.type === 'income' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {t.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <span className={`block text-xs font-bold uppercase tracking-wider ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.category}</span>
                                            <span className="text-xs text-slate-400">{dateObj.toLocaleDateString('tr-TR')}</span>
                                        </div>
                                    </div>
                                    <div className={`text-lg font-black ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                        {t.type === 'income' ? '+' : '-'} {t.amount} ₺
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg mb-3">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                        {t.relatedJobId && <Wrench className="w-3 h-3 inline-block mr-1 text-blue-500" />}
                                        {t.description || 'Açıklama yok'}
                                    </p>
                                </div>

                                <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-700">
                                    {t.branchName ? (
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-1 rounded flex items-center gap-1">
                                            <Store className="w-3 h-3" /> {t.branchName}
                                        </span>
                                    ) : <span></span>}
                                    <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* MASAÜSTÜ İÇİN TABLO GÖRÜNÜMÜ (hidden md:block) */}
                <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                                <tr><th className="p-4">Tarih</th><th className="p-4">Kategori</th><th className="p-4">Açıklama</th><th className="p-4 text-right">Tutar</th><th className="p-4 text-right">Sil</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center">Yükleniyor...</td></tr>
                                ) : filteredTransactions.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">{searchTerm ? 'Kayıt bulunamadı.' : 'İşlem yok.'}</td></tr>
                                ) : filteredTransactions.map((t) => {
                                    const dateObj = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                                    return (
                                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                            <td className="p-4 font-medium text-slate-900 dark:text-white">
                                                {dateObj.toLocaleDateString('tr-TR')}
                                                {branches.length > 0 && <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"><Store className="w-3 h-3" /> {t.branchName || 'Merkez'}</div>}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${t.type === 'income' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                    {t.relatedJobId && <Wrench className="w-3 h-3" />}
                                                    {t.category}
                                                </span>
                                            </td>
                                            <td className="p-4">{t.description}</td>
                                            <td className={`p-4 text-right font-bold font-mono text-base ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'} {t.amount} ₺</td>
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
                        <div className="flex justify-between items-center mb-6"><h2 className={`text-xl font-bold flex items-center gap-2 ${modalType === 'income' ? 'text-green-600' : 'text-red-600'}`}>{modalType === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />} {modalType === 'income' ? 'Gelir Ekle' : 'Gider Ekle'}</h2><button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button></div>
                        <form onSubmit={handleAddTransaction} className="space-y-4">

                            {/* 🔥 ŞUBE SEÇİMİ (Eğer "Tüm Şubeler" modundaysak soruyoruz) */}
                            {branches.length > 0 && !selectedBranch && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <label className="block text-xs font-bold mb-1 text-blue-700 dark:text-blue-300 uppercase">Kasa / Şube Seçimi</label>
                                    <div className="relative">
                                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            className="w-full pl-9 p-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg outline-none text-sm appearance-none"
                                            value={formData.branchId}
                                            onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                        >
                                            <option value="">Merkez (Varsayılan)</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div><label className="block text-sm font-medium mb-1">Tutar (TL)</label><input type="number" required autoFocus className="w-full p-4 text-center text-2xl font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl outline-none" placeholder="0.00" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium mb-1">Kategori</label><select className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl outline-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required><option value="">Seçiniz</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                <div><label className="block text-sm font-medium mb-1">Tarih</label><input type="date" required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl outline-none" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} /></div>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">Açıklama</label><input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl outline-none" placeholder="Örn: Mazot, Kadir Maaş Avansı..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} /></div>
                            <button className={`w-full py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 mt-4 ${modalType === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}><Plus className="w-5 h-5" /> Kaydet</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}