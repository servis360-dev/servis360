'use client';

import { useEffect, useState } from 'react';
import {
    doc,
    updateDoc,
    onSnapshot
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import {
    User,
    Building,
    Save,
    Loader2,
    CreditCard,
    ShieldCheck,
    Bell,
    Smartphone
} from 'lucide-react';

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<any>(null);

    // Form Verileri
    const [profile, setProfile] = useState({
        fullName: '',
        phone: '',
        companyName: '',
        sector: '',
        address: ''
    });

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Kullanıcı Profilini Canlı Dinle
        const unsub = onSnapshot(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setUserData(data);
                setProfile({
                    fullName: data.fullName || '',
                    phone: data.phone || '',
                    companyName: data.companyName || '',
                    sector: data.sector || '',
                    address: data.address || ''
                });
            }
        });

        return () => unsub();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        try {
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), {
                fullName: profile.fullName,
                phone: profile.phone,
                companyName: profile.companyName,
                sector: profile.sector,
                address: profile.address
            });

            // Ayrıca genel dizindeki kaydı da güncelle (Admin görsün diye)
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', user.uid), {
                fullName: profile.fullName,
                companyName: profile.companyName
            });

            alert('Bilgiler başarıyla güncellendi.');
        } catch (error) {
            console.error(error);
            alert('Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // Lisans Bitiş Tarihini Formatla
    const getLicenseDate = () => {
        if (!userData?.licenseEndsAt) return '-';
        return new Date(userData.licenseEndsAt.seconds * 1000).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Firma Ayarları</h1>
                <p className="text-slate-500 dark:text-slate-400">Profil bilgilerinizi ve abonelik durumunuzu yönetin.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* SOL KOLON: Formlar */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Kişisel Bilgiler Kartı */}
                    <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" /> Kişisel Bilgiler
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ad Soyad</label>
                                <input
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={profile.fullName}
                                    onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                                <input
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={profile.phone}
                                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-Posta (Değiştirilemez)</label>
                                <input
                                    disabled
                                    className="w-full p-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 cursor-not-allowed"
                                    value={userData?.email || ''}
                                />
                            </div>
                        </div>
                    </form>

                    {/* Firma Bilgileri Kartı */}
                    <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Building className="w-5 h-5 text-blue-600" /> İşletme Detayları
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Firma Adı</label>
                                    <input
                                        placeholder="Örn: Yıldız Teknik Servis"
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={profile.companyName}
                                        onChange={e => setProfile({ ...profile, companyName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Sektör</label>
                                    <input
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                        value={profile.sector}
                                        onChange={e => setProfile({ ...profile, sector: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açık Adres</label>
                                <textarea
                                    rows={3}
                                    placeholder="Fatura ve iletişim için adresiniz..."
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    value={profile.address}
                                    onChange={e => setProfile({ ...profile, address: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <button
                                    disabled={loading}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-all disabled:opacity-70"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Değişiklikleri Kaydet</>}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                {/* SAĞ KOLON: Abonelik & Durum */}
                <div className="space-y-6">

                    {/* Abonelik Kartı */}
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl border border-indigo-700/50 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <ShieldCheck className="w-32 h-32" />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="px-2 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded text-xs font-bold uppercase tracking-wider text-indigo-200">
                                    {userData?.role === 'admin' ? 'YÖNETİCİ' : 'STANDART PAKET'}
                                </span>
                            </div>
                            <h3 className="text-2xl font-bold mb-1">Servis360 Pro</h3>
                            <p className="text-indigo-200 text-sm mb-6">Tüm özelliklere erişiminiz var.</p>

                            <div className="bg-white/10 rounded-xl p-4 mb-6 backdrop-blur-sm border border-white/5">
                                <p className="text-xs text-indigo-200 uppercase tracking-wide font-bold mb-1">Lisans Bitiş Tarihi</p>
                                <p className="text-xl font-mono font-bold">{getLicenseDate()}</p>
                            </div>

                            <button className="w-full py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                                <CreditCard className="w-4 h-4" /> Aboneliği Yönet
                            </button>
                        </div>
                    </div>

                    {/* Hızlı Ayarlar */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Bildirim Tercihleri</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Yeni İş Bildirimi</span>
                                </div>
                                <div className="w-10 h-6 bg-blue-600 rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600">
                                        <Smartphone className="w-4 h-4" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">SMS Entegrasyonu</span>
                                </div>
                                <div className="w-10 h-6 bg-slate-200 dark:bg-slate-700 rounded-full relative cursor-pointer">
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}