'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, Timestamp, addDoc, collection, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import {
    CreditCard,
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    Zap,
    History,
    Upload
} from 'lucide-react';

export default function SubscriptionPage() {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Varsayılan fiyatlar, admin ayarlamadıysa bunlar görünür
    const [systemSettings, setSystemSettings] = useState({
        iban: 'TR00 0000 0000 0000 0000 0000 00',
        bankName: 'Tanımsız Banka',
        monthlyPrice: '499',
        sixMonthPrice: '2750', // Yeni
        yearlyPrice: '4990'    // Yeni
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

        // Sistem Ayarları (Admin tarafından girilen)
        const fetchSettings = async () => {
            const snap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config'));
            if (snap.exists()) {
                const data = snap.data() as any;
                // Mevcut ayarları koruyarak sadece gelenleri güncelle
                setSystemSettings(prev => ({
                    ...prev,
                    ...data
                }));
            }
        }
        fetchSettings();

        return () => unsub();
    }, []);

    // Kalan Gün Hesapla
    const getDaysLeft = () => {
        if (!userData?.licenseEndsAt) return 0;
        const end = userData.licenseEndsAt.toDate();
        const now = new Date();
        const diff = end.getTime() - now.getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days > 0 ? days : 0;
    };

    // Dosya Seçimi
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    // Ödeme Yap (Simülasyon)
    const handlePayment = async (planMonths: number, price: number, planName: string) => {
        if (!auth.currentUser) return;

        if (confirm(`${price} TL tutarındaki ${planName} ödemesini onaylıyor musunuz?`)) {
            try {
                // 1. Ödemeyi Kaydet
                await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', auth.currentUser.uid, 'transactions'), {
                    type: 'expense',
                    amount: price,
                    category: 'Abonelik',
                    description: `Servis360 - ${planName}`,
                    date: new Date().toISOString(),
                    createdAt: serverTimestamp()
                });

                // 2. Dekont Bildirimi Gönder (Adminin göreceği bir koleksiyona eklenebilir)
                // Şimdilik simüle ediyoruz
                if (selectedFile) {
                    console.log("Dekont dosyası yüklendi:", selectedFile.name);
                }

                // 3. Lisans Süresini Uzat (Otomatik)
                const currentEnd = userData?.licenseEndsAt ? userData.licenseEndsAt.toDate() : new Date();
                const baseDate = currentEnd < new Date() ? new Date() : currentEnd;
                const newEnd = new Date(baseDate);
                newEnd.setMonth(newEnd.getMonth() + planMonths);

                await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', auth.currentUser.uid, 'users', 'profile'), {
                    licenseEndsAt: Timestamp.fromDate(newEnd),
                    status: 'active'
                });

                await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', auth.currentUser.uid), {
                    licenseEndsAt: Timestamp.fromDate(newEnd),
                    status: 'active'
                });

                alert('Ödeme başarılı! Lisansınız uzatıldı.');
                setSelectedFile(null); // Dosyayı temizle
            } catch (error) {
                console.error(error);
                alert('Ödeme sırasında bir hata oluştu.');
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Yükleniyor...</div>;

    const daysLeft = getDaysLeft();

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* Üst Bilgi Kartı */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="text-blue-600" /> Abonelik Yönetimi
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Mevcut Plan: <span className="font-semibold text-slate-900 dark:text-white">{userData?.role === 'admin' ? 'Yönetici (Sınırsız)' : 'Pro Paket'}</span>
                    </p>
                </div>

                <div className={`px-6 py-3 rounded-xl flex items-center gap-3 border ${daysLeft > 5 ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400'}`}>
                    {daysLeft > 5 ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    <div>
                        <span className="block text-xs font-semibold uppercase opacity-80">Kalan Süre</span>
                        <span className="text-xl font-bold">{daysLeft > 0 ? `${daysLeft} Gün` : 'Süre Doldu'}</span>
                    </div>
                </div>
            </div>

            {/* Paketler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Aylık */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all flex flex-col">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aylık Başlangıç</h3>
                        <p className="text-slate-500 text-sm">Kısa vadeli çözüm.</p>
                    </div>
                    <div className="mb-6">
                        <span className="text-4xl font-bold text-slate-900 dark:text-white">{systemSettings.monthlyPrice} ₺</span>
                        <span className="text-slate-500">/ay</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-green-500" /> Tüm Modüller Aktif</li>
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-green-500" /> 7/24 E-posta Destek</li>
                    </ul>
                    <button onClick={() => handlePayment(1, parseInt(systemSettings.monthlyPrice), 'Aylık Paket')} className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        1 Ay Satın Al
                    </button>
                </div>

                {/* Yıllık (Popüler) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border-2 border-blue-500 shadow-xl relative flex flex-col transform md:-translate-y-4">
                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-lg">EN POPÜLER</div>
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            Yıllık Pro <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        </h3>
                        <p className="text-blue-600 dark:text-blue-400 text-sm font-medium">2 Ay Bedava!</p>
                    </div>
                    <div className="mb-6">
                        <span className="text-5xl font-bold text-slate-900 dark:text-white">{systemSettings.yearlyPrice} ₺</span>
                        <span className="text-slate-500">/yıl</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> <strong>Öncelikli</strong> Destek</li>
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Tüm Özellikler</li>
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Fiyat Garantisi</li>
                    </ul>
                    <button onClick={() => handlePayment(12, parseInt(systemSettings.yearlyPrice), 'Yıllık Paket')} className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30">
                        Yıllık Avantajla Al
                    </button>
                </div>

                {/* 6 Aylık */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all flex flex-col">
                    <div className="mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">6 Aylık Paket</h3>
                        <p className="text-slate-500 text-sm">Dengeli seçim.</p>
                    </div>
                    <div className="mb-6">
                        <span className="text-4xl font-bold text-slate-900 dark:text-white">{systemSettings.sixMonthPrice} ₺</span>
                        <span className="text-slate-500">/6ay</span>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-green-500" /> Tüm Modüller</li>
                        <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"><CheckCircle2 className="w-4 h-4 text-green-500" /> Standart Destek</li>
                    </ul>
                    <button onClick={() => handlePayment(6, parseInt(systemSettings.sixMonthPrice), '6 Aylık Paket')} className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                        6 Ay Satın Al
                    </button>
                </div>
            </div>

            {/* Havale Bilgileri ve Dekont Yükleme */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Havale / EFT ile Ödeme</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-slate-500">Banka</p>
                            <p className="font-medium text-slate-900 dark:text-white">{systemSettings.bankName || 'Banka Tanımlanmadı'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">IBAN</p>
                            <p className="font-mono text-lg font-bold text-slate-900 dark:text-white tracking-wider">{systemSettings.iban || 'IBAN Tanımlanmadı'}</p>
                        </div>
                        <div>
                            <p className="text-sm text-slate-500">Alıcı</p>
                            <p className="font-medium text-slate-900 dark:text-white">Servis360 Teknoloji A.Ş.</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                        <div className="flex items-start gap-3 mb-4">
                            <History className="w-6 h-6 text-blue-500 mt-1" />
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white">Ödeme Bildirimi</h4>
                                <p className="text-sm text-slate-500 mt-1">
                                    Ödemenizi yaptıktan sonra dekontunuzu yükleyin. Müşteri No: <strong>{userData?.uid?.slice(0, 8).toUpperCase()}</strong>
                                </p>
                            </div>
                        </div>

                        {/* Dekont Yükleme Alanı */}
                        <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors relative">
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                            />
                            <div className="flex flex-col items-center gap-2">
                                <Upload className="w-6 h-6 text-slate-400" />
                                <span className="text-sm text-slate-500 font-medium">
                                    {selectedFile ? selectedFile.name : "Dekont Yüklemek İçin Tıklayın"}
                                </span>
                            </div>
                        </div>
                        {selectedFile && (
                            <button className="mt-4 w-full py-2 bg-green-600 text-white font-bold rounded-lg text-sm hover:bg-green-700 transition-colors">
                                Dekontu Gönder
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}