'use client';

import { useEffect, useState, useRef } from 'react';
import {
    doc,
    updateDoc,
    onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { auth, db } from '../../../lib/firebase';
import {
    Building,
    Save,
    Loader2,
    ShieldCheck,
    Smartphone,
    UploadCloud,
    MessageCircle,
    CalendarClock,
    Image as ImageIcon,
    Lock
} from 'lucide-react';

// Storage servisini güvenli şekilde alalım
const storage = getStorage();

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Yetki Durumu
    const [isStaff, setIsStaff] = useState(false);

    // Form Verileri
    const [profile, setProfile] = useState({
        fullName: '',
        phone: '',
        companyName: '',
        sector: '',
        address: '',
        logoUrl: '',
        appointmentDuration: '60',
    });

    // WhatsApp Şablonları
    const [whatsappTemplates, setWhatsappTemplates] = useState({
        deviceReceived: 'Sayın müşterimiz, cihazınız servis kaydı oluşturulmuştur. Durumunu web sitemizden takip edebilirsiniz.',
        deviceCompleted: 'Sayın müşterimiz, cihazınızın işlemleri tamamlanmıştır. Servisimizden teslim alabilirsiniz. Ödenecek Tutar: {tutar}',
        appointmentReminder: 'Sayın müşterimiz, yarın saat {saat} için randevunuz bulunmaktadır. Lütfen zamanında geliniz.',
    });

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Kullanıcı Profilini Canlı Dinle
        const unsub = onSnapshot(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setUserData(data);

                // Personel Kontrolü
                // Eğer rol 'staff', 'technician' veya 'accounting' ise personeldir.
                const userIsStaff = ['staff', 'technician', 'accounting'].includes(data.role);
                setIsStaff(userIsStaff);

                setProfile({
                    fullName: data.fullName || '',
                    phone: data.phone || '', // Personel kendi telefonunu buraya yazar
                    companyName: data.companyName || '',
                    sector: data.sector || '',
                    address: data.address || '',
                    logoUrl: data.logoUrl || '',
                    appointmentDuration: data.appointmentDuration || '60',
                });

                if (data.whatsappTemplates) {
                    setWhatsappTemplates(data.whatsappTemplates);
                }
            }
        });

        return () => unsub();
    }, []);

    // Logo Seçme İşlemi (Sadece Yönetici)
    const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isStaff) return; // Personel logo değiştiremez

        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("Dosya boyutu 2MB'dan küçük olmalıdır.");
            return;
        }

        try {
            setLoading(true);
            const user = auth.currentUser;
            if (!user) return;

            const storageRef = ref(storage, `users/${user.uid}/public/logo-${Date.now()}.png`);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);

            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), {
                logoUrl: downloadUrl
            });

            setProfile(prev => ({ ...prev, logoUrl: downloadUrl }));
            alert("Logo başarıyla yüklendi!");

        } catch (error) {
            console.error("Logo yükleme hatası:", error);
            alert("Logo yüklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        try {
            // Kaydedilecek veriyi hazırla
            const updateData: any = {
                fullName: profile.fullName,
                phone: profile.phone, // Herkes telefonunu güncelleyebilir
            };

            // Eğer YÖNETİCİ ise şirket bilgilerini de güncelle
            if (!isStaff) {
                updateData.companyName = profile.companyName;
                updateData.sector = profile.sector;
                updateData.address = profile.address;
                updateData.appointmentDuration = profile.appointmentDuration;
                updateData.whatsappTemplates = whatsappTemplates;
            }

            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), updateData);

            // Genel dizindeki kaydı da güncelle
            // (Personel ise sadece adı güncellensin, şirket adı değişmesin)
            // 🔥 DÜZELTME: Telefon numarası artık buraya da yazılıyor.
            const directoryUpdate: any = {
                fullName: profile.fullName,
                phone: profile.phone
            };

            if (!isStaff) {
                directoryUpdate.companyName = profile.companyName;
                // Logo zaten ayrı yükleniyor
            }

            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', user.uid), directoryUpdate);

            alert('Bilgiler başarıyla güncellendi.');
        } catch (error) {
            console.error(error);
            alert('Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const getLicenseDate = () => {
        if (!userData?.licenseEndsAt) return '-';
        return new Date(userData.licenseEndsAt.seconds * 1000).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-10">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Firma Ayarları & Profil</h1>
                <p className="text-slate-500 dark:text-slate-400">
                    {isStaff ? 'Kişisel bilgilerinizi yönetin.' : 'Marka kimliğinizi ve işletme ayarlarınızı yönetin.'}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* SOL KOLON: Formlar */}
                <div className="lg:col-span-2 space-y-8">

                    {/* 1. Logo ve Marka Kartı */}
                    <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${isStaff ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-purple-600" /> Logo & Marka
                            </h3>
                            {isStaff && <Lock className="w-4 h-4 text-slate-400" />}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden relative">
                                    {profile.logoUrl ? (
                                        <img src={profile.logoUrl} alt="Firma Logosu" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <UploadCloud className="w-8 h-8 text-slate-400" />
                                    )}
                                    {/* Yöneticiyse Değiştirme Overlay'i */}
                                    {!isStaff && (
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        >
                                            <p className="text-white text-xs font-bold">Değiştir</p>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/png, image/jpeg"
                                    onChange={handleLogoSelect}
                                    disabled={isStaff}
                                />
                            </div>

                            <div className="flex-1 text-center sm:text-left space-y-2">
                                <h4 className="font-bold text-slate-900 dark:text-white">Firma Logosu</h4>
                                <p className="text-sm text-slate-500">
                                    {isStaff
                                        ? 'Logo şirket yöneticisi tarafından belirlenir.'
                                        : 'Tekliflerde ve panelde görünecek logo. (Önerilen: 500x500px PNG)'}
                                </p>
                                {!isStaff && (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        Dosya Seç
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. WhatsApp ve İletişim Şablonları */}
                    <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${isStaff ? 'opacity-70 pointer-events-none' : ''}`}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-green-600" /> WhatsApp Mesaj Şablonları
                            </h3>
                            {isStaff && <Lock className="w-4 h-4 text-slate-400" />}
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    🔧 Cihaz Teslim Mesajı (Tamamlandı)
                                </label>
                                <textarea
                                    disabled={isStaff}
                                    rows={2}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-green-500 transition-all text-sm disabled:cursor-not-allowed"
                                    value={whatsappTemplates.deviceCompleted}
                                    onChange={e => setWhatsappTemplates({ ...whatsappTemplates, deviceCompleted: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    📅 Randevu Hatırlatma Mesajı
                                </label>
                                <textarea
                                    disabled={isStaff}
                                    rows={2}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-green-500 transition-all text-sm disabled:cursor-not-allowed"
                                    value={whatsappTemplates.appointmentReminder}
                                    onChange={e => setWhatsappTemplates({ ...whatsappTemplates, appointmentReminder: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. Firma Bilgileri Formu */}
                    <form onSubmit={handleSave} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Building className="w-5 h-5 text-blue-600" /> İşletme Detayları
                        </h3>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Firma Adı {isStaff && <span className="text-xs text-red-400">(Değiştirilemez)</span>}
                                    </label>
                                    <input
                                        disabled={isStaff}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                                        value={profile.companyName}
                                        onChange={e => setProfile({ ...profile, companyName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                                        <Smartphone className="w-4 h-4" /> İletişim Telefonu
                                    </label>
                                    <input
                                        // Telefonu herkes değiştirebilir (Personel kendi telefonunu günceller)
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all"
                                        value={profile.phone}
                                        onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                        placeholder="05xxxxxxxxx"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Sisteme giriş yaparken doğrulama için kullanılır.</p>
                                </div>
                            </div>

                            {/* Randevu Süresi Ayarı */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                                    <CalendarClock className="w-4 h-4 text-orange-500" /> Varsayılan Randevu Süresi (Dakika)
                                </label>
                                <select
                                    disabled={isStaff}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none disabled:opacity-60"
                                    value={profile.appointmentDuration}
                                    onChange={e => setProfile({ ...profile, appointmentDuration: e.target.value })}
                                >
                                    <option value="15">15 Dakika</option>
                                    <option value="30">30 Dakika</option>
                                    <option value="45">45 Dakika</option>
                                    <option value="60">1 Saat</option>
                                    <option value="90">1.5 Saat</option>
                                    <option value="120">2 Saat</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Açık Adres {isStaff && <span className="text-xs text-red-400">(Şirket Merkezi)</span>}
                                </label>
                                <textarea
                                    disabled={isStaff}
                                    rows={3}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all disabled:opacity-60"
                                    value={profile.address}
                                    onChange={e => setProfile({ ...profile, address: e.target.value })}
                                />
                            </div>
                        </div>
                    </form>

                    {/* KAYDET BUTONU */}
                    <div className="sticky bottom-4 z-10">
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-70 transform active:scale-95"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6" /> Kaydet</>}
                        </button>
                    </div>
                </div>

                {/* SAĞ KOLON: Abonelik & Kişisel Bilgi */}
                <div className="space-y-6">
                    {/* Kişisel Bilgiler */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Kişisel Bilgiler</h3>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">Ad Soyad</label>
                                <input
                                    placeholder="Ad Soyad"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                                    value={profile.fullName}
                                    onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500">E-Posta</label>
                                <input
                                    disabled
                                    className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500"
                                    value={userData?.email || ''}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Abonelik Kartı - SADECE YÖNETİCİ GÖRÜR */}
                    {!isStaff && (
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl border border-indigo-700/50 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                <ShieldCheck className="w-32 h-32" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold mb-1">Servis360 Pro</h3>
                                <p className="text-indigo-200 text-xs mb-4">Profesyonel Paket</p>
                                <div className="bg-white/10 rounded-lg p-3 mb-4 backdrop-blur-sm">
                                    <p className="text-[10px] text-indigo-200 uppercase font-bold">Bitiş Tarihi</p>
                                    <p className="text-lg font-mono font-bold">{getLicenseDate()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}