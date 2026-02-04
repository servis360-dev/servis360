'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { formatMoney, getCurrencySettings } from '../../../../../lib/format';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../../../../lib/firebase';
import {
    Save,
    Plus,
    Trash2,
    User,
    Calendar,
    FileText,
    Calculator,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function NewProposalView({ dict }: { dict: any }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Dil ve Para Birimi
    const params = useParams();
    const currentLocale = params?.locale as string || 'en';
    const currency = getCurrencySettings(currentLocale);

    // --- FORM STATE ---
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [validUntil, setValidUntil] = useState('');
    const [status, setStatus] = useState('pending');

    // Ürün/Hizmet Kalemleri
    const [items, setItems] = useState([
        { description: '', quantity: 1, unitPrice: 0 }
    ]);

    // KDV Ayarı
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
            alert(dict.proposals.alert_validation);
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
                status,
                items,
                taxRate,
                subtotal,
                taxAmount,
                total,
                createdAt: serverTimestamp()
            });

            router.push('/dashboard/proposals');
        } catch (error) {
            console.error('Hata:', error);
            alert(dict.proposals.alert_error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in duration-500">
            {/* Üst Başlık */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/proposals" className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{dict.proposals.new_title}</h1>
                        <p className="text-sm text-slate-500">{dict.proposals.new_subtitle}</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
                >
                    {loading ? dict.proposals.btn_saving : <><Save className="w-5 h-5" /> {dict.proposals.btn_save}</>}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* SOL TARA - Müşteri Bilgileri */}
                <div className="md:col-span-2 space-y-6">

                    {/* 1. Müşteri Kartı */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                            <User className="w-5 h-5 text-blue-500" /> {dict.proposals.section_customer}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{dict.proposals.label_customer}</label>
                                <input
                                    type="text"
                                    placeholder={dict.proposals.placeholder_customer}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-colors"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{dict.proposals.label_phone}</label>
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
                                <FileText className="w-5 h-5 text-blue-500" /> {dict.proposals.section_items}
                            </h3>
                            <button
                                onClick={addItem}
                                className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-4 h-4" /> {dict.proposals.btn_add_item}
                            </button>
                        </div>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="group relative bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                    {/* Silme Butonu */}
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
                                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">{dict.proposals.col_desc}</label>
                                            <input
                                                type="text"
                                                placeholder={dict.proposals.placeholder_desc}
                                                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm"
                                                value={item.description}
                                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                                            />
                                        </div>

                                        {/* Miktar */}
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">{dict.proposals.col_qty}</label>
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
                                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">{dict.proposals.col_price}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                className="w-full p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-sm text-right font-mono"
                                                value={item.unitPrice}
                                                onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                                            />
                                        </div>

                                        {/* Toplam */}
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">{dict.proposals.col_total}</label>
                                            <div className="w-full p-2.5 bg-slate-100 dark:bg-slate-800 border border-transparent rounded-lg text-sm text-right font-bold text-slate-700 dark:text-slate-300">
                                                {formatMoney(item.quantity * item.unitPrice, currentLocale)}
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
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">{dict.proposals.section_settings}</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{dict.proposals.label_valid_until}</label>
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
                                <label className="block text-xs font-bold text-slate-500 mb-1">{dict.proposals.label_status}</label>
                                <select
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                >
                                    <option value="pending">{dict.proposals.status_pending}</option>
                                    <option value="approved">{dict.proposals.status_approved}</option>
                                    <option value="rejected">{dict.proposals.status_rejected}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Fiyat Özeti */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-20">
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                            <Calculator className="w-5 h-5 text-green-500" /> {dict.proposals.section_summary}
                        </h3>

                        <div className="space-y-3">
                            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span>{dict.proposals.label_subtotal}</span>
                                <span>{formatMoney(subtotal, currentLocale)}</span>
                            </div>

                            {/* KDV Seçici */}
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600 dark:text-slate-400">{dict.proposals.label_tax_rate}</span>
                                <select
                                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold py-1 px-2 outline-none"
                                    value={taxRate}
                                    onChange={(e) => setTaxRate(Number(e.target.value))}
                                >
                                    <option value="0">{dict.proposals.opt_no_vat}</option>
                                    <option value="1">%1</option>
                                    <option value="10">%10</option>
                                    <option value="19">%19 (DE)</option>
                                    <option value="20">%20 (TR)</option>
                                </select>
                            </div>

                            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
                                <span>{dict.proposals.label_tax_amount}</span>
                                <span>{formatMoney(taxAmount, currentLocale)}</span>
                            </div>

                            <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-2">
                                <div className="flex justify-between items-end">
                                    <span className="font-bold text-slate-900 dark:text-white">{dict.proposals.label_grand_total}</span>
                                    <span className="text-2xl font-black text-blue-600">{formatMoney(total, currentLocale)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}