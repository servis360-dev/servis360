'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth'; // Auth dinleyici eklendi
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
    ScanLine,
    ShieldAlert
} from 'lucide-react';
import Link from 'next/link';

export default function NewJobPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null); // Mevcut kullanıcı
    const [targetUid, setTargetUid] = useState<string | null>(null); // Verinin yazılacağı ID (Patron)
    const [isLicenseValid, setIsLicenseValid] = useState(true); // Patronun lisansı aktif mi?

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

    // 1. KULLANICI VE HEDEF HESAP TESPİTİ
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    // Profil bilgisini çek (Personel mi, Patron mu?)
                    const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                    const profileSnap = await getDoc(profileRef);

                    let ownerId = currentUser.uid; // Varsayılan: Kendisi

                    if (profileSnap.exists()) {
                        const data = profileSnap.data();

                        // Eğer personel ise (ownerId var ve farklı), patronun ID'sini al
                        if (data.ownerId && data.ownerId !== currentUser.uid) {
                            ownerId = data.ownerId;
                        }
                    }

                    setTargetUid(ownerId);

                    // 2. PATRONUN LİSANS KONTROLÜ
                    // İşlemler patronun hesabına yapılacağı için onun lisansı kontrol edilmeli
                    const ownerProfileRef = doc(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'users', 'profile');
                    const ownerSnap = await getDoc(ownerProfileRef);

                    if (ownerSnap.exists()) {
                        const ownerData = ownerSnap.data();
                        // Admin veya Süper Admin ise lisans sonsuzdur
                        if (ownerData.role === 'admin' || ownerData.role === 'super_admin') {
                            setIsLicenseValid(true);
                        } else if (ownerData.licenseEndsAt) {
                            const now = new Date();
                            const endDate = ownerData.licenseEndsAt.toDate();
                            if (endDate < now) {
                                setIsLicenseValid(false); // Süre dolmuş
                            }
                        }
                    }

                } catch (err) {
                    console.error("Kullanıcı doğrulama hatası:", err);
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    const handleCustomerSearch = async (term: string) => {
        setFormData({ ...formData, customerName: term });
        if (term.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        if (!targetUid) return; // Hedef hesap belirlenmediyse arama yapma

        // Müşteriyi PATRONUN listesinden ara
        const q = query(
            collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'customers'),
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

        // 🛑 LİSANS KONTROLÜ
        if (!isLicenseValid) {
            alert("⚠️ İŞLEM BAŞARISIZ!\n\nFirmanızın lisans süresi dolmuştur. Yeni kayıt oluşturamazsınız.\nLütfen yöneticinizle iletişime geçin.");
            return;
        }

        if (!user || !targetUid) return;
        setLoading(true);

        try {
            // 1. İş Emrini Kaydet (PATRONUN ID'sine)
            const jobRef = await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'jobs'), {
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

                status: 'pending',
                paymentStatus: 'pending',

                createdBy: user.uid, // Kaydı oluşturan personel (Log için)
                createdAt: serverTimestamp()
            });

            // 2. Müşteri Kayıtlı Değilse Otomatik Kaydet (Patronun listesine)
            // (Mevcut mantıkta opsiyonel bırakılmıştı, burası aynen kalabilir veya eklenebilir)

            // İşlem Başarılı -> Yönlendir
            router.push(`/dashboard/jobs`); // Listeye dön (Detay sayfası henüz hazır değilse listeye dönmek daha güvenli)

        } catch (error) {
            console.error(error);
            alert("Kayıt oluşturulurken hata oluştu.");
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            {/* LİSANS UYARISI BANNER */}
            {!isLicenseValid && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3 animate-pulse">
                    <ShieldAlert className="w-6 h-6" />
                    <div>
                        <h3 className="font-bold">Hizmet Donduruldu</h3>
                        <p className="text-sm">İşletmenizin lisans süresi dolduğu için yeni kayıt oluşturamazsınız. Lütfen yönetici ile görüşün.</p>
                    </div>
                </div>
            )}

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

            <form onSubmit={handleSubmit} className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${!isLicenseValid ? 'opacity-50 pointer-events-none' : ''}`}>

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
                        disabled={loading || !isLicenseValid}
                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-xl shadow-green-500/30 flex items-center justify-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Kaydediliyor...' : <><Save className="w-5 h-5" /> Kaydı Aç</>}
                    </button>

                </div>
            </form>
        </div>
    );
}