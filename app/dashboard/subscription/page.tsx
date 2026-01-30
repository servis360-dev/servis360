'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
// ❌ ESKİ HATALI IMPORT SİLİNDİ (lib/telegram yok)
import {
    CreditCard,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    Zap,
    Upload,
    Clock,
    Banknote,
    Loader2,
    Store,
    Building2,
    User
} from 'lucide-react';

export default function SubscriptionPage() {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Dinamik Fiyatlar (Varsayılan 0, Admin'den güncellenecek)
    const [prices, setPrices] = useState({
        monthly: 0,
        sixMonth: 0,
        yearly: 0
    });

    // Banka Bilgileri
    const [bankInfo, setBankInfo] = useState({
        bankName: 'Yükleniyor...',
        accountHolder: 'Yükleniyor...',
        iban: 'TR00...'
    });

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // 1. KULLANICI PROFİLİNİ DİNLE
        const unsubUser = onSnapshot(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);

                // Kullanıcı verisi geldikten sonra sistem ayarlarını çekelim
                // Çünkü kullanıcının tipine (bireysel/esnaf) göre fiyat çekeceğiz.
                fetchSystemSettings(data.accountType || 'individual');
            }
            setLoading(false);
        });

        return () => unsubUser();
    }, []);

    // 2. SİSTEM AYARLARINI ÇEK (Fiyatlar ve Banka)
    const fetchSystemSettings = async (accountType: string) => {
        try {
            const snap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config'));
            if (snap.exists()) {
                const data = snap.data();

                // Banka Bilgilerini Al
                if (data.bank) {
                    setBankInfo(data.bank);
                }

                // Fiyatları Kullanıcı Tipine Göre Seç
                // data.pricing.individual, data.pricing.business vb.
                if (data.pricing && data.pricing[accountType]) {
                    setPrices(data.pricing[accountType]);
                } else {
                    // Eğer admin panelinde bu tip için fiyat girilmediyse varsayılanları (individual) al veya 0 yap
                    setPrices(data.pricing?.individual || { monthly: 0, sixMonth: 0, yearly: 0 });
                }
            }
        } catch (e) { console.error("Ayarlar çekilemedi:", e); }
    };

    // Kalan Gün Hesaplama
    const getDaysLeft = () => {
        if (!userData?.licenseEndsAt) return 0;
        const end = userData.licenseEndsAt.toDate();
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days > 0 ? days : 0;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    // Ödeme Bildirimi Gönder (API Kullanarak)
    const handlePaymentRequest = async (planMonths: number, price: number, planName: string) => {
        if (!auth.currentUser || !userData) return;

        if (!selectedFile) {
            alert("Lütfen önce dekont resmini veya PDF'ini yükleyin.");
            return;
        }

        const refCode = `REF-${Math.floor(1000 + Math.random() * 9000)}`;

        if (confirm(`${price} TL tutarındaki ${planName} için bildirim gönderilsin mi?`)) {
            setSubmitting(true);
            try {
                // A. Firestore'a Kaydet (Admin Panelinde Görünmesi İçin)
                await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests'), {
                    userId: auth.currentUser.uid,
                    userName: userData.fullName || 'İsimsiz',
                    userPhone: userData.phone || 'Tel Yok',
                    companyName: userData.companyName || 'Bireysel',
                    amount: price,
                    planName: planName,
                    refCode: refCode,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });

                // B. TELEGRAM BİLDİRİMİ (API ROUTE ÜZERİNDEN) ✅
                const userEmail = auth.currentUser.email || "Mail Yok";
                const message = `
💰 <b>YENİ ÖDEME BİLDİRİMİ!</b>

📧 <b>Email:</b> ${userEmail}
👤 <b>Kullanıcı:</b> ${userData.fullName}
🏢 <b>Tip:</b> ${userData.accountType?.toUpperCase()}
📞 <b>Tel:</b> ${userData.phone}
📦 <b>Paket:</b> ${planName}
💵 <b>Tutar:</b> ${price} TL
🔑 <b>Ref:</b> ${refCode}

<i>Lütfen Admin Panelinden Kontrol Edin.</i>`;

                const formData = new FormData();
                formData.append('photo', selectedFile);
                formData.append('caption', message);

                // Kendi yazdığımız API'ye istek atıyoruz
                const response = await fetch('/api/send-receipt', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error('Telegram servisine ulaşılamadı.');

                alert(`Bildirim başarıyla iletildi! \nReferans Kodunuz: ${refCode}\nEn kısa sürede onaylanacaktır.`);
                setSelectedFile(null);
            } catch (error) {
                console.error(error);
                alert('Bir hata oluştu. Lütfen tekrar deneyin.');
            } finally {
                setSubmitting(false);
            }
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
    );

    const daysLeft = getDaysLeft();

    // UI İkon ve Renk Ayarları
    const accountType = userData?.accountType || 'individual';
    const isCorporate = accountType === 'corporate';
    const isBusiness = accountType === 'business';

    let typeLabel = "Bireysel Hesap";
    let typeIcon = <User className="w-5 h-5 text-blue-600" />;
    let typeColor = "blue";

    if (isCorporate) {
        typeLabel = "Kurumsal Hesap";
        typeIcon = <Building2 className="w-5 h-5 text-purple-600" />;
        typeColor = "purple";
    } else if (isBusiness) {
        typeLabel = "Esnaf Hesabı";
        typeIcon = <Store className="w-5 h-5 text-yellow-600" />;
        typeColor = "yellow";
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 p-4 md:p-0">

            {/* Durum Kartı */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="text-blue-600" /> Abonelik Yönetimi
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-2 bg-${typeColor}-50 text-${typeColor}-700 border-${typeColor}-200`}>
                            {typeIcon} {typeLabel}
                        </span>
                        <span className="text-xs text-slate-500">Size özel fiyatlandırma aktif.</span>
                    </div>
                </div>

                <div className={`px-6 py-4 rounded-xl flex items-center gap-4 border ${daysLeft > 5 ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'}`}>
                    {daysLeft > 5 ? <ShieldCheck className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
                    <div>
                        <span className="block text-[10px] font-bold uppercase opacity-70">KALAN LİSANS SÜRESİ</span>
                        <span className="text-2xl font-black">{daysLeft > 0 ? `${daysLeft} Gün` : 'SÜRE DOLDU'}</span>
                    </div>
                </div>
            </div>

            {/* Fiyatlar Yüklenmediyse Uyarı */}
            {prices.monthly === 0 && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400 text-sm text-center">
                    ⚠️ Fiyat bilgileri yükleniyor veya Admin tarafından henüz tanımlanmadı. Lütfen bekleyin.
                </div>
            )}

            {/* Paketler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Aylık */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition-all flex flex-col group">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aylık Paket</h3>
                        <p className="text-slate-500 text-sm">Esnek başlangıç.</p>
                    </div>
                    <div className="mb-6">
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{prices.monthly} ₺</span>
                        <span className="text-slate-500 font-medium">/ay</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-green-500" /> Tüm Özellikler</li>
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-green-500" /> Standart Destek</li>
                    </ul>
                    <button
                        onClick={() => handlePaymentRequest(1, prices.monthly, 'Aylık Paket')}
                        disabled={submitting || !selectedFile}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        Satın Al
                    </button>
                </div>

                {/* Yıllık (Öne Çıkan) */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-blue-600 shadow-xl relative flex flex-col transform md:-translate-y-4 z-10">
                    <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg">EN POPÜLER</div>
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            Yıllık Paket <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        </h3>
                        <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">2 Ay Bedava!</p>
                    </div>
                    <div className="mb-6">
                        <span className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">{prices.yearly} ₺</span>
                        <span className="text-slate-500 font-medium">/yıl</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> <strong>VIP</strong> Destek</li>
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Fiyat Garantisi</li>
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Öncelikli Sunucu</li>
                    </ul>
                    <button
                        onClick={() => handlePaymentRequest(12, prices.yearly, 'Yıllık Paket')}
                        disabled={submitting || !selectedFile}
                        className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 disabled:opacity-50"
                    >
                        {submitting ? 'Gönderiliyor...' : 'Yıllık Al (Avantajlı)'}
                    </button>
                </div>

                {/* 6 Aylık */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:border-blue-500 transition-all flex flex-col group">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">6 Aylık Paket</h3>
                        <p className="text-slate-500 text-sm">Dengeli seçim.</p>
                    </div>
                    <div className="mb-6">
                        <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{prices.sixMonth} ₺</span>
                        <span className="text-slate-500 font-medium">/6ay</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-green-500" /> Tüm Özellikler</li>
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-green-500" /> Standart Destek</li>
                    </ul>
                    <button
                        onClick={() => handlePaymentRequest(6, prices.sixMonth, '6 Aylık Paket')}
                        disabled={submitting || !selectedFile}
                        className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                    >
                        Satın Al
                    </button>
                </div>
            </div>

            {/* Havale Bilgileri */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Banknote className="w-6 h-6 text-slate-700 dark:text-slate-300" />
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Banka / Havale Bilgileri</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-5">
                        <div className="bg-white dark:bg-black p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Banka Adı</p>
                            <p className="font-medium text-slate-900 dark:text-white">{bankInfo.bankName}</p>
                        </div>
                        <div className="bg-white dark:bg-black p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Alıcı Adı (Ünvan)</p>
                            <p className="font-medium text-slate-900 dark:text-white">{bankInfo.accountHolder}</p>
                        </div>
                        <div className="bg-white dark:bg-black p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors" onClick={() => navigator.clipboard.writeText(bankInfo.iban)}>
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">IBAN Numarası (Kopyalamak için tıkla)</p>
                            <p className="font-mono text-lg font-bold text-slate-900 dark:text-white tracking-wider break-all text-blue-600 dark:text-blue-400">{bankInfo.iban}</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col justify-center">
                        <div className="flex items-start gap-3 mb-4">
                            <Clock className="w-6 h-6 text-blue-600 mt-1" />
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">Ödeme Süreci Nasıl İşler?</h4>
                                <ol className="list-decimal list-inside text-sm text-slate-600 dark:text-slate-300 mt-2 space-y-2">
                                    <li>Önce aşağıdaki alandan dekontunuzu yükleyin.</li>
                                    <li>Ardından yukarıdaki paketlerden "Satın Al" butonuna basın.</li>
                                    <li>Banka uygulamanızdan havale yaparken açıklama kısmını boş bırakabilirsiniz.</li>
                                    <li>Sistem bildirimleri otomatik olarak Admin'e iletir.</li>
                                </ol>
                            </div>
                        </div>

                        {/* Dekont Yükleme Alanı */}
                        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-slate-500 mb-2 font-bold uppercase">Dekont Yükle (Zorunlu)</p>
                            <div className="flex gap-2">
                                <label className={`flex-1 cursor-pointer border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-colors ${selectedFile ? 'bg-green-50 border-green-300' : 'bg-white dark:bg-black border-slate-300 dark:border-slate-700 hover:bg-slate-50'}`}>
                                    <Upload className={`w-5 h-5 ${selectedFile ? 'text-green-600' : 'text-slate-400'}`} />
                                    <span className={`text-xs font-bold truncate max-w-[200px] ${selectedFile ? 'text-green-700' : 'text-slate-500'}`}>
                                        {selectedFile ? selectedFile.name : "Dekont Seçmek İçin Tıkla..."}
                                    </span>
                                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                </label>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 text-center">*Önce dekontu seçip sonra yukarıdan paketi satın almalısınız.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}