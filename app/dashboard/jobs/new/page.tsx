'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import {
    Save,
    User,
    Smartphone,
    Wrench,
    FileText,
    Search,
    Plus,
    CheckCircle2,
    ArrowLeft,
    ScanLine
} from 'lucide-react';
import Link from 'next/link';

export default function NewJobPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form Verileri
    const [formData, setFormData] = useState({
        customerName: '',
        phone: '',
        device: '', // iPhone 11
        brand: '', // Apple
        serialNo: '',
        password: '', // Cihaz şifresi/desen
        problem: '', // Şikayet
        accessories: [] as string[], // Şarj aleti, kılıf vs.
        priority: 'normal',
        estimatedPrice: ''
    });

    // Müşteri Arama
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    // Aksesuar Seçenekleri
    const accessoryOptions = ['Şarj Aleti', 'Kılıf', 'Sim Kart', 'Hafıza Kartı', 'Kutu'];

    const handleCustomerSearch = async (term: string) => {
        setFormData({ ...formData, customerName: term });
        if (term.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        const user = auth.currentUser;
        if (!user) return;

        // Basit bir arama (Firestore'da 'name' ile başlayanlar)
        // Not: Gerçek projede Algolia veya ElasticSearch daha iyi olur ama bu iş görür.
        const q = query(
            collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'customers'),
            orderBy('name'),
            where('name', '>=', term),
            where('name', '<=', term + '\uf8ff'),
            limit(5)
        );

        const snap = await getDocs(q);
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSearchResults(results);
        setShowResults(true);
    };

    const selectCustomer = (customer: any) => {
        setFormData(prev => ({
            ...prev,
            customerName: customer.name,
            phone: customer.phone
        }));
        setShowResults(false);
    };

    const toggleAccessory = (acc: string) => {
        setFormData(prev => {
            if (prev.accessories.includes(acc)) {
                return { ...prev, accessories: prev.accessories.filter(a => a !== acc) };
            } else {
                return { ...prev, accessories: [...prev.accessories, acc] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        try {
            // 1. İş Emrini Kaydet
            const jobRef = await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs'), {
                customer: formData.customerName,
                phone: formData.phone,
                device: formData.device,
                brand: formData.brand,
                serialNo: formData.serialNo,
                password: formData.password,
                problem: formData.problem,
                accessories: formData.accessories,
                priority: formData.priority,
                price: formData.estimatedPrice,

                status: 'pending', // pending, in_progress, waiting_parts, completed
                paymentStatus: 'pending', // pending, paid

                createdAt: serverTimestamp()
            });

            // 2. Müşteri Kayıtlı Değilse Otomatik Kaydet (Opsiyonel ama yararlı)
            // Burada basitlik adına geçiyorum, kullanıcı "Müşteriler" sayfasından ekleyebilir.

            // İşlem Başarılı
            // Detay sayfasına yönlendir (Fiş Yazdırmak için)
            router.push(`/dashboard/jobs/${jobRef.id}`);

        } catch (error) {
            console.error(error);
            alert("Kayıt oluşturulurken hata oluştu.");
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* Başlık */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard/jobs" className="p-2 bg-white dark:bg-slate-800 rounded-lg border hover:bg-slate-50 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Yeni Servis Kaydı</h1>
                    <p className="text-sm text-slate-500">Cihaz kabul formu.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* SOL: Müşteri & Cihaz */}
                <div className="md:col-span-2 space-y-6">

                    {/* Müşteri Bilgileri */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" /> Müşteri Bilgileri
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Müşteri Adı</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        required
                                        type="text"
                                        className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all"
                                        placeholder="İsim ara veya yaz..."
                                        value={formData.customerName}
                                        onChange={(e) => handleCustomerSearch(e.target.value)}
                                        onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                    />
                                </div>
                                {/* Arama Sonuçları */}
                                {showResults && searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl mt-1 z-10 overflow-hidden">
                                        {searchResults.map(customer => (
                                            <div
                                                key={customer.id}
                                                onClick={() => selectCustomer(customer)}
                                                className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b last:border-0 border-slate-100 dark:border-slate-700"
                                            >
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{customer.name}</p>
                                                <p className="text-xs text-slate-500">{customer.phone}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Telefon</label>
                                <input
                                    required
                                    type="tel"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all"
                                    placeholder="0555..."
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cihaz Bilgileri */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-purple-600" /> Cihaz Detayları
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Cihaz Modeli</label>
                                <input
                                    required
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 transition-all"
                                    placeholder="Örn: iPhone 13"
                                    value={formData.device}
                                    onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Marka</label>
                                <input
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 transition-all"
                                    placeholder="Örn: Apple"
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Seri No / IMEI</label>
                                <div className="relative">
                                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 transition-all font-mono text-sm"
                                        placeholder="Opsiyonel"
                                        value={formData.serialNo}
                                        onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Ekran Kilidi / Şifre</label>
                                <input
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 transition-all"
                                    placeholder="Örn: 1234 veya Z desen"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Arıza / Şikayet</label>
                            <textarea
                                required
                                rows={3}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 transition-all"
                                placeholder="Müşteri şikayeti..."
                                value={formData.problem}
                                onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* SAĞ: Durum & Kaydet */}
                <div className="space-y-6">

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-orange-500" /> Servis Detayları
                        </h3>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-2">Teslim Alınanlar</label>
                            <div className="flex flex-wrap gap-2">
                                {accessoryOptions.map(acc => (
                                    <button
                                        key={acc}
                                        type="button"
                                        onClick={() => toggleAccessory(acc)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${formData.accessories.includes(acc)
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
                                            }`}
                                    >
                                        {acc}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-2">Aciliyet</label>
                            <select
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="normal">Normal</option>
                                <option value="high">Yüksek (Acil)</option>
                                <option value="low">Düşük</option>
                            </select>
                        </div>

                        <div className="mb-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Tahmini Ücret (Opsiyonel)</label>
                            <input
                                type="number"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                placeholder="0.00"
                                value={formData.estimatedPrice}
                                onChange={(e) => setFormData({ ...formData, estimatedPrice: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-xl shadow-green-500/30 flex items-center justify-center gap-2 transform active:scale-95 transition-all"
                    >
                        {loading ? 'Kaydediliyor...' : <><Save className="w-5 h-5" /> Kaydı Aç</>}
                    </button>

                </div>
            </form>
        </div>
    );
}