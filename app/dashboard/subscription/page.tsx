'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, addDoc, collection, serverTimestamp, getDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import {
    ShieldCheck,
    Zap,
    Upload,
    Loader2,
    Store,
    Building2,
    User,
    Crown,
    Check,
    Building,
    MessageCircle, // WhatsApp İkonu
    Users,
    LayoutGrid,
    PlusCircle
} from 'lucide-react';

export default function SubscriptionPage() {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Kullanım İstatistikleri
    const [usage, setUsage] = useState({
        branchCount: 0,
        staffCount: 0
    });

    // Dinamik Fiyatlar
    const [prices, setPrices] = useState({
        monthly: 0,
        sixMonth: 0,
        yearly: 0,
        addonBranch: 2500, // Varsayılan (Admin paneli henüz değer girmediyse)
        addonStaff: 1000   // Varsayılan
    });

    // Banka Bilgileri
    const [bankInfo, setBankInfo] = useState({
        bankName: 'Yükleniyor...',
        accountHolder: 'Yükleniyor...',
        iban: 'TR00...'
    });

    // Destek Hattı (Admin Panelinden Gelen)
    const [supportPhone, setSupportPhone] = useState('905555555555');

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // 1. KULLANICI PROFİLİNİ DİNLE
        const unsubUser = onSnapshot(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                fetchSystemSettings(data.accountType || 'individual');
                fetchUsageStats(user.uid);
            } else {
                setLoading(false);
            }
        });

        return () => unsubUser();
    }, []);

    // 2. KULLANIM İSTATİSTİKLERİNİ ÇEK (Şube ve Personel Sayısı)
    const fetchUsageStats = async (uid: string) => {
        try {
            // Şubeleri Say
            const branchSnap = await getDocs(collection(db, 'artifacts', 'servis-360-live', 'users', uid, 'branches'));
            // Personeli Say
            const staffSnap = await getDocs(collection(db, 'artifacts', 'servis-360-live', 'users', uid, 'staff'));

            setUsage({
                branchCount: branchSnap.size,
                staffCount: staffSnap.size
            });
        } catch (e) {
            console.error("İstatistik hatası:", e);
        } finally {
            setLoading(false);
        }
    };

    // 3. SİSTEM AYARLARINI ÇEK (Fiyatlar, Banka, WhatsApp)
    const fetchSystemSettings = async (rawAccountType: string) => {
        try {
            let pricingKey = 'individual';
            if (['esnaf', 'business', 'tradesman'].includes(rawAccountType)) pricingKey = 'business';
            else if (['corporate', 'company'].includes(rawAccountType)) pricingKey = 'corporate';

            const snap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config'));
            if (snap.exists()) {
                const data = snap.data();

                // Banka Bilgileri
                if (data.bank) setBankInfo(data.bank);

                // 🔥 WhatsApp Numarası (Admin Panelinden)
                if (data.contact?.whatsapp) {
                    setSupportPhone(data.contact.whatsapp);
                }

                // Ana Paket Fiyatları
                let currentPrices = data.pricing?.individual || { monthly: 0, sixMonth: 0, yearly: 0 };
                if (data.pricing && data.pricing[pricingKey]) {
                    currentPrices = data.pricing[pricingKey];
                }

                // 🔥 Ek Paket Fiyatları (Add-ons)
                const addonPrices = data.pricing?.addons || {};

                setPrices({
                    ...currentPrices,
                    addonBranch: Number(addonPrices.branch) || 2500, // DB'de yoksa varsayılan
                    addonStaff: Number(addonPrices.staff) || 1000   // DB'de yoksa varsayılan
                });
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

    // LİMİT HESAPLAMA
    const getLimits = () => {
        if (!userData) return { branchLimit: 1, staffLimit: 5 };

        // Şube Limiti
        let branchLimit = 1;
        if (userData.customBranchLimit) branchLimit = userData.customBranchLimit;
        else if (['corporate', 'company'].includes(userData.accountType) || userData.role === 'corporate') branchLimit = 5;

        // Personel Limiti
        let staffLimit = 999;
        const isEsnaf = ['esnaf', 'business', 'tradesman'].includes(userData.accountType);
        if (userData.customStaffLimit) staffLimit = userData.customStaffLimit;
        else if (isEsnaf) staffLimit = 5;

        return { branchLimit, staffLimit };
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    const handlePaymentRequest = async (amount: number, planName: string, type: 'subscription' | 'addon') => {
        if (!auth.currentUser || !userData) return;

        if (!selectedFile) {
            alert("⚠️ Lütfen ödeme dekontunuzu yükleyin!");
            return;
        }

        const refCode = `REF-${Math.floor(1000 + Math.random() * 9000)}`;

        if (confirm(`${amount} TL tutarındaki "${planName}" satın alımını onaylıyor musunuz?`)) {
            setSubmitting(true);
            try {
                await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests'), {
                    userId: auth.currentUser.uid,
                    userName: userData.fullName || 'İsimsiz',
                    userPhone: userData.phone || 'Tel Yok',
                    companyName: userData.companyName || 'Bireysel',
                    amount: amount,
                    planName: planName,
                    requestType: type,
                    refCode: refCode,
                    status: 'pending',
                    createdAt: serverTimestamp()
                });

                alert(`✅ Talebiniz Alındı!\nReferans Kodunuz: ${refCode}\nYöneticilerimiz kontrol edip hesabınızı güncelleyecektir.`);
                setSelectedFile(null);
            } catch (error) {
                console.error(error);
                alert('Bir hata oluştu.');
            } finally {
                setSubmitting(false);
            }
        }
    };

    // 🔥 Admin Panelinden gelen numarayı açan fonksiyon
    const openWhatsApp = () => {
        const cleanNumber = supportPhone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanNumber}?text=Merhaba, paketler ve limit artırımı hakkında bilgi almak istiyorum.`, '_blank');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
    );

    const daysLeft = getDaysLeft();
    const { branchLimit, staffLimit } = getLimits();

    const branchPercent = Math.min((usage.branchCount / branchLimit) * 100, 100);
    const staffPercent = Math.min((usage.staffCount / staffLimit) * 100, 100);

    const isCorporate = ['corporate', 'company'].includes(userData?.accountType);
    const isBusiness = ['esnaf', 'business', 'tradesman'].includes(userData?.accountType);

    // 🔥 Bireysel Hesap Kontrolü
    const isIndividual = !isCorporate && !isBusiness && userData?.accountType === 'individual';

    let typeLabel = "Bireysel";
    let typeIcon = <User className="w-4 h-4 text-blue-400" />;

    if (isCorporate) {
        typeLabel = "Kurumsal";
        typeIcon = <Building2 className="w-4 h-4 text-purple-400" />;
    } else if (isBusiness) {
        typeLabel = "Esnaf";
        typeIcon = <Store className="w-4 h-4 text-yellow-400" />;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden pb-24">

            {/* ARKA PLAN EFEKTLERİ */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>

            {/* 🔥 DİNAMİK WHATSAPP DESTEK BUTONU */}
            <button onClick={openWhatsApp} className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-full shadow-lg shadow-green-600/30 transition-all hover:scale-105 active:scale-95 group">
                <MessageCircle className="w-6 h-6 fill-current" />
                <span className="font-bold text-sm hidden group-hover:inline-block transition-all duration-300">Canlı Destek</span>
            </button>

            <div className="max-w-6xl mx-auto px-6 pt-12 relative z-10">

                {/* BAŞLIK */}
                <div className="text-center mb-12 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/50 border border-slate-700 backdrop-blur-md text-xs font-medium text-slate-300">
                        {typeIcon} <span>{typeLabel} Planı Aktif</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                        Hesap & Limit Yönetimi
                    </h1>
                    <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-base">
                        İşletmeniz büyüdükçe limitlerinizi artırın veya paketinizi yenileyin.
                    </p>
                </div>

                {/* --- DURUM VE LİMİT KARTLARI --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

                    {/* 1. LİSANS DURUMU */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck className="w-24 h-24" /></div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">KALAN SÜRE</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-white">{daysLeft}</span>
                                <span className="text-sm font-medium text-slate-400">Gün</span>
                            </div>
                        </div>
                        {daysLeft <= 5 && <div className="mt-4 bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1 rounded-full w-fit animate-pulse">Yenileme Vakti!</div>}
                    </div>

                    {/* 2. ŞUBE KULLANIMI */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><LayoutGrid className="w-24 h-24" /></div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">ŞUBE HAKKI</p>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-3xl font-black text-white">{usage.branchCount}</span>
                            <span className="text-sm text-slate-500">/ {branchLimit} Adet</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${branchPercent >= 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${branchPercent}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                            {branchPercent >= 100 ? 'Limit doldu, ek şube satın alın.' : `${branchLimit - usage.branchCount} şube daha ekleyebilirsiniz.`}
                        </p>
                    </div>

                    {/* 3. PERSONEL KULLANIMI */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-24 h-24" /></div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">PERSONEL HAKKI</p>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-3xl font-black text-white">{usage.staffCount}</span>
                            <span className="text-sm text-slate-500">/ {staffLimit > 900 ? '∞' : staffLimit} Kişi</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${staffPercent >= 100 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${staffPercent}%` }}></div>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2">
                            {staffPercent >= 100 ? 'Limit doldu, personel paketi alın.' : `${staffLimit > 900 ? 'Sınırsız' : staffLimit - usage.staffCount} kişi daha ekleyebilirsiniz.`}
                        </p>
                    </div>
                </div>

                {/* --- EK ÖZELLİK SATIN ALMA (ADD-ONS) --- */}
                {/* 🔥 BİREYSEL KULLANICILAR İÇİN BU BÖLÜM GİZLENDİ */}
                {!isIndividual && (
                    <>
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <PlusCircle className="w-5 h-5 text-blue-500" /> Limit Yükseltme & Ek Özellikler
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">

                            {/* EK ŞUBE KARTI */}
                            <div className="bg-slate-900/80 border border-slate-700 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-blue-500/50 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                        <Store className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">Ek Şube Hakkı (+1)</h3>
                                        <p className="text-xs text-slate-400">Mevcut paketinize 1 adet şube hakkı ekler.</p>
                                    </div>
                                </div>
                                <div className="text-center sm:text-right">
                                    {/* 🔥 Dinamik Fiyat */}
                                    <p className="text-2xl font-bold text-white">{prices.addonBranch} ₺</p>
                                    <button
                                        onClick={() => handlePaymentRequest(prices.addonBranch, 'Ek Şube Hakkı (+1)', 'addon')}
                                        disabled={!selectedFile || submitting}
                                        className="mt-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Satın Al
                                    </button>
                                </div>
                            </div>

                            {/* EK PERSONEL KARTI */}
                            <div className="bg-slate-900/80 border border-slate-700 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-orange-500/50 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                                        <Users className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">Ek Personel Paketi (+5)</h3>
                                        <p className="text-xs text-slate-400">Mevcut paketinize 5 adet personel hakkı ekler.</p>
                                    </div>
                                </div>
                                <div className="text-center sm:text-right">
                                    {/* 🔥 Dinamik Fiyat */}
                                    <p className="text-2xl font-bold text-white">{prices.addonStaff} ₺</p>
                                    <button
                                        onClick={() => handlePaymentRequest(prices.addonStaff, 'Ek Personel Paketi (+5)', 'addon')}
                                        disabled={!selectedFile || submitting}
                                        className="mt-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Satın Al
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="h-px bg-slate-800 w-full mb-12"></div>
                    </>
                )}

                {/* --- PAKET YENİLEME ALANI --- */}
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" /> Abonelik Yenileme Paketleri
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-16">
                    {/* 1. AYLIK */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 hover:border-slate-600 transition-all">
                        <h3 className="text-lg font-bold text-slate-200">Aylık Plan</h3>
                        <div className="flex items-baseline gap-1 my-4">
                            <span className="text-3xl font-bold text-white">{prices.monthly}</span>
                            <span className="text-sm text-slate-500">₺/ay</span>
                        </div>
                        <button onClick={() => handlePaymentRequest(prices.monthly, 'Aylık Paket', 'subscription')} disabled={!selectedFile || submitting} className="w-full py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50">Seç</button>
                    </div>

                    {/* 2. YILLIK */}
                    <div className="relative bg-gradient-to-b from-slate-800 to-black border border-blue-500/50 rounded-3xl p-8 transform md:-translate-y-4 shadow-2xl shadow-blue-900/20">
                        <div className="absolute top-4 right-4 bg-blue-600 text-[10px] font-bold px-2 py-1 rounded text-white">ÖNERİLEN</div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-400" /> Yıllık Pro</h3>
                        <div className="flex items-baseline gap-1 my-4">
                            <span className="text-5xl font-black text-white">{prices.yearly}</span>
                            <span className="text-sm text-slate-400">₺/yıl</span>
                        </div>
                        <p className="text-green-400 text-xs font-bold mb-6">2 Ay Ücretsiz!</p>
                        <button onClick={() => handlePaymentRequest(prices.yearly, 'Yıllık Paket', 'subscription')} disabled={!selectedFile || submitting} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50">Yıllık Planı Seç</button>
                    </div>

                    {/* 3. 6 AYLIK */}
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 hover:border-slate-600 transition-all">
                        <h3 className="text-lg font-bold text-slate-200">6 Aylık Plan</h3>
                        <div className="flex items-baseline gap-1 my-4">
                            <span className="text-3xl font-bold text-white">{prices.sixMonth}</span>
                            <span className="text-sm text-slate-500">₺/6ay</span>
                        </div>
                        <button onClick={() => handlePaymentRequest(prices.sixMonth, '6 Aylık Paket', 'subscription')} disabled={!selectedFile || submitting} className="w-full py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50">Seç</button>
                    </div>
                </div>

                {/* --- BANKA & DEKONT (SABİT) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-10">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Building className="w-5 h-5 text-blue-500" /> Banka Bilgileri
                        </h3>
                        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                            <p className="text-xs text-slate-500 font-bold">ALICI</p>
                            <p className="font-bold text-white">{bankInfo.accountHolder}</p>
                            <p className="text-xs text-slate-500 font-bold mt-2">BANKA</p>
                            <p className="font-bold text-white">{bankInfo.bankName}</p>
                        </div>
                        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-xl cursor-pointer hover:bg-blue-900/30 transition-colors" onClick={() => { navigator.clipboard.writeText(bankInfo.iban); alert('IBAN Kopyalandı!'); }}>
                            <p className="text-xs text-blue-400 font-bold">IBAN (Tıkla Kopyala)</p>
                            <p className="font-mono font-bold text-white break-all">{bankInfo.iban}</p>
                        </div>
                    </div>

                    <div className="h-full flex flex-col">
                        <h3 className="text-xl font-bold text-white mb-4">Dekont Yükle</h3>
                        <div className="relative group cursor-pointer flex-1 min-h-[140px]">
                            <input type="file" onChange={handleFileChange} accept="image/*,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                            <div className={`h-full border-2 border-dashed rounded-xl p-6 transition-all flex flex-col items-center justify-center gap-3 ${selectedFile ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 bg-slate-800/50 group-hover:border-blue-500/50 group-hover:bg-blue-500/5'}`}>
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${selectedFile ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                    {selectedFile ? <Check className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                                </div>
                                <div className="text-center">
                                    <p className={`text-sm font-bold ${selectedFile ? 'text-green-400' : 'text-slate-300'}`}>
                                        {selectedFile ? selectedFile.name : "Dekontu Buraya Bırakın"}
                                    </p>
                                    {!selectedFile && <p className="text-[10px] text-slate-500 mt-1">Önce dekontu yükleyin, sonra paketi seçin.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}