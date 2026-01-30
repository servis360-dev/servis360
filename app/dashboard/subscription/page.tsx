'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import {
    CreditCard,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    Zap,
    History,
    Upload,
    Clock,
    Banknote
} from 'lucide-react';

export default function SubscriptionPage() {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Sistem Ayarları (Admin Panelinden Gelir)
    const [systemSettings, setSystemSettings] = useState({
        iban: 'TR00 0000 0000 0000 0000 0000 00',
        bankName: 'Tanımsız Banka',
        accountHolder: 'Servis360',
        monthlyPrice: '499',
        sixMonthPrice: '2750',
        yearlyPrice: '4990'
    });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Kullanıcı Verisi
        const unsub = onSnapshot(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), (doc) => {
            setUserData(doc.data());
            setLoading(false);
        });

        // Sistem Ayarları
        const fetchSettings = async () => {
            try {
                const snap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config'));
                if (snap.exists()) {
                    setSystemSettings(prev => ({ ...prev, ...snap.data() }));
                }
            } catch (e) { console.error(e); }
        }
        fetchSettings();

        return () => unsub();
    }, []);

    // Fiyat Hesaplayıcı (%50 İndirim Mantığı)
    const getPrice = (basePrice: string) => {
        const price = parseInt(basePrice) || 0;
        if (userData?.accountType === 'individual') {
            return Math.floor(price * 0.5);
        }
        return price;
    };

    // Kalan Gün
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

    // Ödeme Bildirimi Yap
    const handlePaymentRequest = async (planMonths: number, price: number, planName: string) => {
        if (!auth.currentUser || !userData) return;

        // Dosya seçilmediyse uyar (Telegram için resim şart olsun istiyorsan)
        if (!selectedFile) {
            alert("Lütfen önce dekont resmini yükleyin.");
            return;
        }

        const refCode = `REF-${Math.floor(1000 + Math.random() * 9000)}`;

        if (confirm(`Ödeme bildirimi gönderilecek ve yöneticilere iletilecek. Onaylıyor musunuz?`)) {
            try {
                // 1. Firebase'e Kaydet (Senin Admin Panelinde de gözüksün diye)
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

                // 2. TELEGRAM BİLDİRİMİ GÖNDER 🚀
                const message = `
💰 <b>YENİ ÖDEME BİLDİRİMİ!</b>

👤 <b>Kullanıcı:</b> ${userData.fullName}
🏢 <b>Firma:</b> ${userData.companyName || 'Bireysel'}
📞 <b>Tel:</b> ${userData.phone}
📦 <b>Paket:</b> ${planName}
💵 <b>Tutar:</b> ${price} TL
🔑 <b>Ref Kodu:</b> ${refCode}

<i>Admin panelinden onaylayın.</i>
                `;

                // Fotoğraflı gönder
                await sendTelegramPhoto(selectedFile, message);

                alert(`Bildirim başarıyla gönderildi! \nReferans Kodunuz: ${refCode}`);
                setSelectedFile(null);
            } catch (error) {
                console.error(error);
                alert('Bir hata oluştu. Lütfen tekrar deneyin.');
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;

    const daysLeft = getDaysLeft();
    const isIndividual = userData?.accountType === 'individual';

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Durum Kartı */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="text-blue-600" /> Abonelik & Paketler
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${isIndividual ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                            {isIndividual ? 'Bireysel Hesap' : 'Kurumsal Hesap'}
                        </span>
                        {isIndividual && <span className="text-xs text-green-600 font-bold">🏷️ %50 İndirimli</span>}
                    </div>
                </div>

                <div className={`px-6 py-3 rounded-xl flex items-center gap-3 border ${daysLeft > 5 ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'}`}>
                    {daysLeft > 5 ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    <div>
                        <span className="block text-xs font-semibold uppercase opacity-80">Kalan Lisans</span>
                        <span className="text-xl font-bold">{daysLeft > 0 ? `${daysLeft} Gün` : 'Süre Doldu'}</span>
                    </div>
                </div>
            </div>

            {/* Paketler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Aylık */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all flex flex-col">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aylık Paket</h3>
                        <p className="text-slate-500 text-sm">Deneme amaçlı.</p>
                    </div>
                    <div className="mb-6">
                        <span className="text-4xl font-bold text-slate-900 dark:text-white">{getPrice(systemSettings.monthlyPrice)} ₺</span>
                        <span className="text-slate-500">/ay</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-green-500" /> Tüm Özellikler</li>
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-green-500" /> Standart Destek</li>
                    </ul>
                    <button onClick={() => handlePaymentRequest(1, getPrice(systemSettings.monthlyPrice), 'Aylık Paket')} className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-200 transition-colors">
                        Satın Al
                    </button>
                </div>

                {/* Yıllık */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-blue-500 shadow-xl relative flex flex-col transform md:-translate-y-4">
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg">AVANTAJLI</div>
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            Yıllık Paket <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        </h3>
                        <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">2 Ay Bedava!</p>
                    </div>
                    <div className="mb-6">
                        <span className="text-5xl font-bold text-slate-900 dark:text-white">{getPrice(systemSettings.yearlyPrice)} ₺</span>
                        <span className="text-slate-500">/yıl</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> <strong>VIP</strong> Destek</li>
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Fiyat Garantisi</li>
                    </ul>
                    <button onClick={() => handlePaymentRequest(12, getPrice(systemSettings.yearlyPrice), 'Yıllık Paket')} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
                        Yıllık Al
                    </button>
                </div>

                {/* 6 Aylık */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all flex flex-col">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">6 Aylık Paket</h3>
                        <p className="text-slate-500 text-sm">Dengeli seçim.</p>
                    </div>
                    <div className="mb-6">
                        <span className="text-4xl font-bold text-slate-900 dark:text-white">{getPrice(systemSettings.sixMonthPrice)} ₺</span>
                        <span className="text-slate-500">/6ay</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-green-500" /> Tüm Özellikler</li>
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-green-500" /> Standart Destek</li>
                    </ul>
                    <button onClick={() => handlePaymentRequest(6, getPrice(systemSettings.sixMonthPrice), '6 Aylık Paket')} className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-200 transition-colors">
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
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Banka Adı</p>
                            <p className="font-medium text-slate-900 dark:text-white">{systemSettings.bankName}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">Alıcı Adı (Ünvan)</p>
                            <p className="font-medium text-slate-900 dark:text-white">{systemSettings.accountHolder}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-500 uppercase font-bold mb-1">IBAN Numarası</p>
                            <p className="font-mono text-lg font-bold text-slate-900 dark:text-white tracking-wider break-all">{systemSettings.iban}</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col justify-center">
                        <div className="flex items-start gap-3 mb-4">
                            <Clock className="w-6 h-6 text-blue-600 mt-1" />
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">Ödeme Süreci Nasıl İşler?</h4>
                                <ol className="list-decimal list-inside text-sm text-slate-600 dark:text-slate-300 mt-2 space-y-2">
                                    <li>Yukarıdaki paketlerden birini seçin ve "Satın Al" deyin.</li>
                                    <li>Size özel bir <strong>Referans Kodu</strong> verilecektir.</li>
                                    <li>Banka uygulamanızdan havale yaparken açıklamaya bu kodu yazın.</li>
                                    <li>Ödemeniz kontrol edildikten sonra (mesai saatlerinde ort. 30dk) hesabınız otomatik aktifleşir.</li>
                                </ol>
                            </div>
                        </div>

                        {/* Dekont Yükleme (Opsiyonel Hale Geldi) */}
                        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-slate-500 mb-2 font-bold">DEKONT YÜKLE (Hızlandırmak İçin)</p>
                            <div className="flex gap-2">
                                <label className="flex-1 cursor-pointer bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg p-2 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                                    <Upload className="w-4 h-4 text-slate-400" />
                                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                                        {selectedFile ? selectedFile.name : "Dosya Seç..."}
                                    </span>
                                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                </label>
                                <button
                                    onClick={() => selectedFile ? alert("Dekont gönderildi!") : alert("Lütfen önce dosya seçin")}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700"
                                >
                                    Gönder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}