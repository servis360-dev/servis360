'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import {
    ArrowLeft,
    Save,
    Plus,
    Trash2,
    Calculator,
    User,
    Calendar,
    FileText
} from 'lucide-react';
import Link from 'next/link';

export default function NewProposalPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);

    // Form Verileri
    const [proposalData, setProposalData] = useState({
        customerName: '',
        date: new Date().toISOString().split('T')[0],
        validUntil: '',
        notes: 'Bu teklif 15 gün süreyle geçerlidir.',
        items: [{ id: 1, description: '', quantity: 1, unitPrice: 0, total: 0 }]
    });

    // Müşterileri Getir (Otomatik Tamamlama İçin)
    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            getDocs(query(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'customers'), orderBy('name')))
                .then(snap => setCustomers(snap.docs.map(d => d.data())));
        }
    }, []);

    // Satır Ekle
    const addItem = () => {
        setProposalData(prev => ({
            ...prev,
            items: [...prev.items, { id: Date.now(), description: '', quantity: 1, unitPrice: 0, total: 0 }]
        }));
    };

    // Satır Sil
    const removeItem = (id: number) => {
        if (proposalData.items.length === 1) return;
        setProposalData(prev => ({
            ...prev,
            items: prev.items.filter(item => item.id !== id)
        }));
    };

    // Satır Güncelle
    const updateItem = (id: number, field: string, value: any) => {
        setProposalData(prev => ({
            ...prev,
            items: prev.items.map(item => {
                if (item.id === id) {
                    const newItem = { ...item, [field]: value };
                    // Otomatik Toplam Hesapla
                    if (field === 'quantity' || field === 'unitPrice') {
                        newItem.total = newItem.quantity * newItem.unitPrice;
                    }
                    return newItem;
                }
                return item;
            })
        }));
    };

    // Genel Toplam Hesapla
    const calculateTotals = () => {
        const subtotal = proposalData.items.reduce((acc, item) => acc + item.total, 0);
        const vat = subtotal * 0.20; // %20 KDV
        const total = subtotal + vat;
        return { subtotal, vat, total };
    };

    const { subtotal, vat, total } = calculateTotals();

    // Kaydet
    const handleSave = async () => {
        if (!proposalData.customerName) return alert("Lütfen müşteri seçin.");
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        try {
            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'proposals'), {
                ...proposalData,
                subtotal,
                vat,
                total,
                proposalNo: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
                status: 'draft',
                createdAt: serverTimestamp()
            });
            router.push('/dashboard/proposals');
        } catch (error) {
            console.error(error);
            alert("Hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Üst Kısım */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/proposals" className="p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 hover:text-slate-900 transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Yeni Teklif Oluştur</h1>
                    <p className="text-slate-500 dark:text-slate-400">Profesyonel bir fiyat teklifi hazırlayın.</p>
                </div>
            </div>

            {/* Teklif Formu */}
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-8">

                {/* 1. Müşteri ve Tarih */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <User className="w-4 h-4" /> Müşteri / Firma
                        </label>
                        <input
                            list="customerList"
                            placeholder="Müşteri Adı Yazın..."
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                            value={proposalData.customerName}
                            onChange={(e) => setProposalData({ ...proposalData, customerName: e.target.value })}
                        />
                        <datalist id="customerList">
                            {customers.map((c, i) => <option key={i} value={c.name} />)}
                        </datalist>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Teklif Tarihi
                        </label>
                        <input
                            type="date"
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                            value={proposalData.date}
                            onChange={(e) => setProposalData({ ...proposalData, date: e.target.value })}
                        />
                    </div>
                </div>

                {/* 2. Ürün / Hizmet Listesi */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Hizmet Kalemleri</label>
                    </div>

                    <div className="space-y-3">
                        {proposalData.items.map((item, index) => (
                            <div key={item.id} className="flex gap-2 items-start group">
                                <div className="flex-1">
                                    <input
                                        placeholder="Hizmet veya Ürün Açıklaması"
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm"
                                        value={item.description}
                                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                    />
                                </div>
                                <div className="w-20">
                                    <input
                                        type="number"
                                        placeholder="Adet"
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-center text-sm"
                                        value={item.quantity}
                                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="w-28">
                                    <input
                                        type="number"
                                        placeholder="Birim Fiyat"
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-right text-sm"
                                        value={item.unitPrice}
                                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                                    />
                                </div>
                                <div className="w-28 p-3 text-right font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700/50 rounded-xl text-sm">
                                    {item.total.toLocaleString()} ₺
                                </div>
                                <button
                                    onClick={() => removeItem(item.id)}
                                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addItem}
                        className="mt-4 flex items-center gap-2 text-blue-600 font-bold text-sm hover:underline"
                    >
                        <Plus className="w-4 h-4" /> Yeni Satır Ekle
                    </button>
                </div>

                {/* 3. Toplamlar ve Notlar */}
                <div className="flex flex-col md:flex-row gap-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex-1">
                        <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">Teklif Notları</label>
                        <textarea
                            rows={3}
                            className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 text-sm"
                            value={proposalData.notes}
                            onChange={(e) => setProposalData({ ...proposalData, notes: e.target.value })}
                        />
                    </div>
                    <div className="w-full md:w-80 space-y-3">
                        <div className="flex justify-between text-slate-500 text-sm">
                            <span>Ara Toplam</span>
                            <span>{subtotal.toLocaleString()} ₺</span>
                        </div>
                        <div className="flex justify-between text-slate-500 text-sm">
                            <span>KDV (%20)</span>
                            <span>{vat.toLocaleString()} ₺</span>
                        </div>
                        <div className="flex justify-between text-xl font-black text-slate-900 dark:text-white pt-3 border-t border-slate-200 dark:border-slate-700">
                            <span>GENEL TOPLAM</span>
                            <span>{total.toLocaleString()} ₺</span>
                        </div>
                    </div>
                </div>

                {/* Kaydet Butonu */}
                <div className="pt-6">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5"
                    >
                        {loading ? 'Kaydediliyor...' : <><FileText className="w-5 h-5" /> Teklifi Oluştur</>}
                    </button>
                </div>

            </div>
        </div>
    );
}