'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import {
    ShieldCheck,
    AlertTriangle,
    Zap,
    Upload,
    Loader2,
    Store,
    Building2,
    User,
    Crown,
    Check,
    ArrowRight,
    Copy,
    Building,
    MessageCircle // WhatsApp İkonu
} from 'lucide-react';

export default function SubscriptionPage() {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Dinamik Fiyatlar
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

    // Destek Hattı (Varsayılan: Sizin Numaranız)
    const [supportPhone, setSupportPhone] = useState('905449228721');

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // 1. KULLANICI PROFİLİNİ DİNLE
        const unsubUser = onSnapshot(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                fetchSystemSettings(data.accountType || 'individual');
            }
            setLoading(false);
        });

        return () => unsubUser();
    }, []);

    // 2. SİSTEM AYARLARINI ÇEK
    const fetchSystemSettings = async (accountType: string) => {
        try {
            const snap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config'));
            if (snap.exists()) {
                const data = snap.data();

                // Banka Bilgileri
                if (data.bank) setBankInfo(data.bank);

                // Fiyatlar
                if (data.pricing && data.pricing[accountType]) {
                    setPrices(data.pricing[accountType]);
                } else {
                    setPrices(data.pricing?.individual || { monthly: 0, sixMonth: 0, yearly: 0 });
                }

                // WhatsApp Destek Numarası (Admin Panelden Ayarlanabilir)
                if (data.contact && data.contact.whatsapp) {
                    setSupportPhone(data.contact.whatsapp);
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

    const handlePaymentRequest = async (planMonths: number, price: number, planName: string) => {
        if (!auth.currentUser || !userData) return;

        if (!selectedFile) {
            alert("⚠️ Lütfen ödeme dekontunuzu yükleyin!");
            return;
        }

        const refCode = `REF-${Math.floor(1000 + Math.random() * 9000)}`;

        if (confirm(`${price} TL tutarındaki ${planName} satın alımını onaylıyor musunuz?`)) {
            setSubmitting(true);
            try {
                // A. Firestore Kaydı
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

                // B. Telegram API (Burayı kendi API endpointinize göre ayarlayın)
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

<i>Admin Panelinden onay bekleniyor...</i>`;

                const formData = new FormData();
                formData.append('photo', selectedFile);
                formData.append('caption', message);

                // API Route'unuza istek atın
                // const response = await fetch('/api/send-receipt', { method: 'POST', body: formData });

                // Şimdilik sadece alert ile simüle edelim (API yoksa hata vermemesi için)
                alert(`✅ Talebiniz Alındı!\nReferans Kodunuz: ${refCode}\nEn kısa sürede onaylanacaktır.`);

                setSelectedFile(null);
            } catch (error) {
                console.error(error);
                alert('Bir hata oluştu. Lütfen tekrar deneyin.');
            } finally {
                setSubmitting(false);
            }
        }
    };

    // WhatsApp Yönlendirme
    const openWhatsApp = () => {
        const cleanNumber = supportPhone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanNumber}?text=Merhaba, abonelik paketleri hakkında bilgi almak istiyorum.`, '_blank');
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
    );

    const daysLeft = getDaysLeft();

    // UI İkon ve Renk Ayarları
    const accountType = userData?.accountType || 'individual';
    const isCorporate = accountType === 'corporate';
    const isBusiness = accountType === 'business';

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

            {/* AMBIENT BACKGROUND (Arka Plan Işıkları) */}
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>

            {/* WHATSAPP DESTEK BUTONU (SOL ALT KÖŞE) */}
            <button
                onClick={openWhatsApp}
                className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-full shadow-lg shadow-green-600/30 transition-all hover:scale-105 active:scale-95 group"
            >
                <MessageCircle className="w-6 h-6 fill-current" />
                <span className="font-bold text-sm hidden group-hover:inline-block transition-all duration-300">Canlı Destek</span>
            </button>

            <div className="max-w-6xl mx-auto px-6 pt-12 relative z-10">

                {/* HEADER */}
                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/50 border border-slate-700 backdrop-blur-md text-xs font-medium text-slate-300">
                        {typeIcon} <span>{typeLabel} Planı Aktif</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                        Sınırları Kaldırın.
                    </h1>
                    <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-base leading-relaxed">
                        İşletmenizi büyütmek için ihtiyacınız olan tüm araçlar, tek bir güçlü platformda.
                        <br />Süre dolmadan yenileyin, kesintisiz devam edin.
                    </p>
                </div>

                {/* STATUS BAR (Cam Efektli) */}
                <div className="mb-12 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${daysLeft > 5 ? 'from-green-500/20 to-emerald-500/20 text-green-400' : 'from-red-500/20 to-orange-500/20 text-red-400'}`}>
                            {daysLeft > 5 ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Kalan Lisans Süresi</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-white">{daysLeft} Gün</span>
                                {daysLeft <= 5 && <span className="text-xs text-red-400 animate-pulse font-bold">Yenileme Vakti!</span>}
                            </div>
                        </div>
                    </div>

                    {/* HIZLI IBAN KOPYALAMA */}
                    <div className="flex items-center gap-4 bg-black/20 p-3 rounded-xl border border-white/5 cursor-pointer hover:bg-black/40 transition-colors group" onClick={() => { navigator.clipboard.writeText(bankInfo.iban); alert('IBAN Kopyalandı!'); }}>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-bold">Hızlı Kopyala</p>
                            <p className="text-sm font-mono text-slate-300 group-hover:text-white transition-colors">{bankInfo.iban.substring(0, 10)}...</p>
                        </div>
                        <Copy className="w-4 h-4 text-slate-500 group-hover:text-white" />
                    </div>
                </div>

                {/* PRICING GRID */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-16">

                    {/* 1. AYLIK PAKET (Glass Card) */}
                    <div className="group relative bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 hover:bg-slate-800/50 hover:border-slate-700 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none"></div>

                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-200">Başlangıç</h3>
                            <p className="text-slate-500 text-xs mt-1">Aylık ödeme planı.</p>
                        </div>
                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-4xl font-bold text-white">{prices.monthly}</span>
                            <span className="text-sm text-slate-500 font-medium">₺/ay</span>
                        </div>

                        <ul className="space-y-4 mb-8">
                            <FeatureItem text="Tüm Temel Özellikler" />
                            <FeatureItem text="Standart Destek" />
                            <FeatureItem text="Bulut Yedekleme" />
                        </ul>

                        <button
                            onClick={() => handlePaymentRequest(1, prices.monthly, 'Aylık Paket')}
                            disabled={submitting || !selectedFile}
                            className="w-full py-4 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Satın Al
                        </button>
                    </div>

                    {/* 2. YILLIK PAKET (HERO CARD - COINGLASS STYLE) */}
                    <div className="relative bg-gradient-to-b from-slate-900 to-black border border-blue-500/30 rounded-[32px] p-8 md:p-10 shadow-2xl shadow-blue-900/20 transform md:-translate-y-6 z-10 overflow-hidden group">

                        {/* Parlama Efekti */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
                        <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-blue-600/10 rotate-45 blur-[100px] pointer-events-none"></div>

                        <div className="absolute top-6 right-6">
                            <span className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg shadow-blue-600/40 animate-pulse">
                                EN POPÜLER
                            </span>
                        </div>

                        <div className="mb-6 relative">
                            <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4 text-blue-400">
                                <Crown className="w-6 h-6" />
                            </div>
                            <h3 className="text-2xl font-bold text-white">Yıllık Pro</h3>
                            <p className="text-blue-200/60 text-sm mt-1">Profesyonellerin tercihi.</p>
                        </div>

                        <div className="flex items-baseline gap-1 mb-2 relative">
                            <span className="text-6xl font-black text-white tracking-tighter">{prices.yearly}</span>
                            <span className="text-lg text-slate-400 font-medium">₺/yıl</span>
                        </div>
                        <p className="text-green-400 text-xs font-bold mb-8 flex items-center gap-1">
                            <Zap className="w-3 h-3 fill-current" /> 2 Ay Bedava Geliyor!
                        </p>

                        <div className="space-y-4 mb-10 relative">
                            <FeatureItem text="VIP Öncelikli Destek" highlight />
                            <FeatureItem text="Sınırsız Şube Yönetimi" highlight />
                            <FeatureItem text="Gelişmiş Raporlama" highlight />
                            <FeatureItem text="Yapay Zeka Asistanı" highlight />
                            <FeatureItem text="Özel Domain Desteği" highlight />
                        </div>

                        <button
                            onClick={() => handlePaymentRequest(12, prices.yearly, 'Yıllık Paket')}
                            disabled={submitting || !selectedFile}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group-hover:shadow-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'İşleniyor...' : <>Yıllık Planı Seç <ArrowRight className="w-5 h-5" /></>}
                        </button>
                        <p className="text-[10px] text-center text-slate-500 mt-4">365 gün kesintisiz erişim.</p>
                    </div>

                    {/* 3. 6 AYLIK PAKET (Glass Card) */}
                    <div className="group relative bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl p-8 hover:bg-slate-800/50 hover:border-slate-700 transition-all duration-300">
                        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none"></div>

                        <div className="mb-6">
                            <h3 className="text-lg font-bold text-slate-200">Standart</h3>
                            <p className="text-slate-500 text-xs mt-1">Dengeli büyüme.</p>
                        </div>
                        <div className="flex items-baseline gap-1 mb-8">
                            <span className="text-4xl font-bold text-white">{prices.sixMonth}</span>
                            <span className="text-sm text-slate-500 font-medium">₺/6ay</span>
                        </div>

                        <ul className="space-y-4 mb-8">
                            <FeatureItem text="Tüm Temel Özellikler" />
                            <FeatureItem text="Standart Destek" />
                            <FeatureItem text="Mobil Erişim" />
                        </ul>

                        <button
                            onClick={() => handlePaymentRequest(6, prices.sixMonth, '6 Aylık Paket')}
                            disabled={submitting || !selectedFile}
                            className="w-full py-3 rounded-xl border border-slate-700 text-slate-300 font-bold text-sm hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Satın Al
                        </button>
                    </div>

                </div>

                {/* --- YENİ BANKA BİLGİLERİ BÖLÜMÜ (NET & OKUNAKLI) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-20">

                    {/* SOL: BANKA KARTLARI */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                            <Building className="w-5 h-5 text-blue-500" /> Havale Bilgileri
                        </h3>

                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between group hover:border-blue-500/30 transition-colors">
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">BANKA ADI</p>
                                <p className="text-lg font-bold text-white">{bankInfo.bankName}</p>
                            </div>
                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-500">
                                <Building2 className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between group hover:border-blue-500/30 transition-colors">
                            <div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">ALICI ADI (ÜNVAN)</p>
                                <p className="text-lg font-bold text-white">{bankInfo.accountHolder}</p>
                            </div>
                            <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-500">
                                <User className="w-5 h-5" />
                            </div>
                        </div>

                        <div
                            className="bg-blue-600/10 border border-blue-500/20 p-5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-blue-600/20 transition-all group"
                            onClick={() => { navigator.clipboard.writeText(bankInfo.iban); alert('IBAN Kopyalandı!'); }}
                        >
                            <div className="overflow-hidden">
                                <p className="text-[10px] text-blue-400 font-bold uppercase mb-1">IBAN NUMARASI (Kopyala)</p>
                                <p className="text-lg font-mono font-bold text-white break-all">{bankInfo.iban}</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 group-hover:text-white transition-colors shrink-0 ml-4">
                                <Copy className="w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* SAĞ: DEKONT YÜKLEME */}
                    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 h-full flex flex-col justify-center">
                        <h3 className="text-xl font-bold text-white mb-2">Dekont Yükle</h3>
                        <p className="text-sm text-slate-400 mb-6">Ödemeyi yaptıktan sonra dekontu buradan yükleyip, yukarıdan paketinizi seçin.</p>

                        <div className="relative group cursor-pointer flex-1 min-h-[160px]">
                            <input type="file" onChange={handleFileChange} accept="image/*,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                            <div className={`h-full border-2 border-dashed rounded-xl p-6 transition-all flex flex-col items-center justify-center gap-3 ${selectedFile ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 bg-slate-800/50 group-hover:border-blue-500/50 group-hover:bg-blue-500/5'}`}>
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${selectedFile ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                                    {selectedFile ? <Check className="w-7 h-7" /> : <Upload className="w-7 h-7" />}
                                </div>
                                <div className="text-center">
                                    <p className={`text-base font-bold ${selectedFile ? 'text-green-400' : 'text-slate-300'}`}>
                                        {selectedFile ? "Dosya Seçildi: " + selectedFile.name : "Dekontu Sürükle veya Seç"}
                                    </p>
                                    {!selectedFile && <p className="text-xs text-slate-500 mt-1">PDF, JPG veya PNG (Max 5MB)</p>}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

// YARDIMCI BİLEŞEN: Feature List Item
function FeatureItem({ text, highlight = false }: { text: string, highlight?: boolean }) {
    return (
        <li className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${highlight ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
                <Check className="w-3 h-3" />
            </div>
            <span className={`text-sm ${highlight ? 'text-white font-medium' : 'text-slate-400'}`}>{text}</span>
        </li>
    );
}