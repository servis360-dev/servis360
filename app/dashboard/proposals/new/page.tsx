'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import {
    Save,
    Plus,
    Trash2,
    User,
    Calendar,
    FileText,
    Calculator,
    ArrowLeft,
    CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

export default function NewProposalPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // --- FORM STATE ---
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [status, setStatus] = useState('pending'); // pending, approved, rejected

    // Ürün/Hizmet Kalemleri
    const [items, setItems] = useState([
        { description: '', quantity: 1, unitPrice: 0 }
    ]);

    // KDV Ayarı (0, 10, 20 vs.)
    const [taxRate, setTaxRate] = useState(20);

    // --- HESAPLAMALAR ---
    const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;

    // Yeni Satır Ekle
    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
    };

    // Satır Sil
    const removeItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    // Satır Güncelle
    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[index][field] = value;
        setItems(newItems);
    };

    // KAYDETME İŞLEMİ
    const handleSave = async () => {
        if (!customerName || items.length === 0 || items[0].description === '') {
            alert('Lütfen müşteri adı ve en az bir hizmet giriniz.');
            return;
        }

        setLoading(true);
        try {
            const user = auth.currentUser;
            if (!user) return;

            // Teklif Numarası Oluştur (Örn: #T-20243405)
            const proposalNo = `#T-${Math.floor(100000 + Math.random() * 900000)}`;

            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'proposals'), {
                proposalNo,
                customerName,
                customerPhone,
                validUntil: validUntil || null,
                status, // Kullanıcının seçtiği durum (Taslak/Onaylı)
                items,
                taxRate,
                subtotal,
                taxAmount,
                total,
                createdAt: serverTimestamp()
            });

            router.push('/dashboard/proposals'); // Listeye dön
        } catch (error) {
            console.error('Hata:', error);
            alert('Teklif kaydedilemedi.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Üst Başlık */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/proposals" className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Yeni Teklif Oluştur</h1>
                        <p className="text-sm text-slate-500">Müşteriye özel fiyat teklifi hazırla.</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
                >
                    {loading ? 'Kaydediliyor...' : <><Save className="w-5 h-5" /> Kaydet</>}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* SOL TARA - Müşteri Bilgileri */}
                <div className="md:col-span-2 space-y-6">

                    {/* 1. Müşteri Kartı */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                            <User className="w-5 h-5 text-blue-500" /> Müşteri Bilgileri
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Müşteri / Firma Adı</label>
                                <input
                                    type="text"
                                    placeholder="Örn: Ahmet Yılmaz"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Telefon (Opsiyonel)</label>
                                <input
                                    type="tel"
                                    placeholder="0555..."
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 2. Hizmet/Ürün Kalemleri */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-500" /> Hizmet & Ürünler
                            </h3>
                            <button
                                onClick={addItem}
                                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> Satır Ekle
                            </button>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="group relative bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                    {/* Silme Butonu (Sağ Üst) */}
                                    {items.length > 1 && (
                                        <button
                                            onClick={() => removeItem(index)}
                                            className="absolute -top-2 -right-2 bg-white dark:bg-slate-800 text-red-500 p-1.5 rounded-full shadow-sm border border-slate-200 dark:border-slate-700 hover:bg-red-50"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                                        {/* Açıklama */}
                                        <div className="md:col-span-6">
                                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Açıklama</label>
                                            <input
                                                type="text"
                                                placeholder="Hizmet veya ürün adı..."
                                                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm"
                                                value={item.description}
                                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                                            />
                                        </div>

                                        {/* Miktar */}
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Adet</label>
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm text-center"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                                            />
                                        </div>

                                        {/* Birim Fiyat */}
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Birim Fiyat</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm text-right font-mono"
                                                value={item.unitPrice}
                                                onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                                            />
                                        </div>

                                        {/* Toplam (Read Only) */}
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Tutar</label>
                                            <div className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-lg text-sm text-right font-bold text-slate-700 dark:text-slate-300">
                                                {(item.quantity * item.unitPrice).toLocaleString()} ₺
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* SAĞ TARAF - Ayarlar ve Özet */}
                <div className="space-y-6">

                    {/* Teklif Ayarları */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Teklif Ayarları</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Geçerlilik Tarihi</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="date"
                                        className="w-full pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm"
                                        value={validUntil}
                                        onChange={(e) => setValidUntil(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Durum</label>
                                <select
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="pending">⏳ Bekliyor (Taslak)</option>
                                    <option value="approved">✅ Onaylandı (Direkt İşle)</option>
                                    <option value="rejected">❌ Reddedildi</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Fiyat Özeti (Hesap Makinesi) */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-20">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                            <Calculator className="w-5 h-5 text-green-500" /> Hesap Özeti
                        </h3>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span>Ara Toplam</span>
                                <span>{subtotal.toLocaleString()} ₺</span>
                            </div>

                            {/* KDV Seçici */}
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600 dark:text-slate-400">KDV Oranı</span>
                                <select
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold py-1 px-2 outline-none"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(Number(e.target.value))}
                                >
                                    <option value="0">%0 (KDV Yok)</option>
                                    <option value="1">%1</option>
                                    <option value="10">%10</option>
                                    <option value="20">%20</option>
                                </select>
                            </div>

                            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span>KDV Tutarı</span>
                                <span>{taxAmount.toLocaleString()} ₺</span>
                            </div>

                            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
                                <div className="flex justify-between items-end">
                                    <span className="font-bold text-slate-900 dark:text-white">Genel Toplam</span>
                                    <span className="text-2xl font-black text-blue-600">{total.toLocaleString()} ₺</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}