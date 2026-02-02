'use client';

import { useEffect, useState, useRef } from 'react';
import {
    doc,
    updateDoc,
    onSnapshot,
    getDoc,
    collection,
    query,
    orderBy,
    addDoc,
    deleteDoc,
    serverTimestamp
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
    Lock,
    Link as LinkIcon,
    RefreshCw,
    Store,
    Plus,
    Trash2,
    Edit2,
    MapPin,
    X
} from 'lucide-react';

// Storage servisini güvenli şekilde alalım
const storage = getStorage();

export default function SettingsPage() {
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Yetki Durumu
    const [isStaff, setIsStaff] = useState(false);

    // Şubeler ve Modal Durumu
    const [branches, setBranches] = useState<any[]>([]);
    const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<any>(null);
    const [branchForm, setBranchForm] = useState({ name: '', address: '', phone: '' });
    const [branchLoading, setBranchLoading] = useState(false);

    // Form Verileri (Profil)
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

        // 1. Profil Dinleyicisi
        const unsubUser = onSnapshot(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);

                // Personel Kontrolü
                const staffRoles = ['staff', 'personnel', 'employee', 'technician', 'technical', 'sales', 'accounting'];
                const userIsStaff = staffRoles.includes(data.role);
                setIsStaff(userIsStaff);

                setProfile({
                    fullName: data.fullName || '',
                    phone: data.phone || '',
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

        // 2. Şubeler Dinleyicisi (Sadece Patronlar İçin)
        // Personel kendi şubesini değiştiremez, sadece görür. Ama burada yönetim olduğu için personel göremese de olur veya sadece read-only.
        const qBranches = query(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches'), orderBy('createdAt', 'asc'));
        const unsubBranches = onSnapshot(qBranches, (snapshot) => {
            setBranches(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => {
            unsubUser();
            unsubBranches();
        };
    }, []);

    // --- ŞUBE YÖNETİMİ ---

    // Şube Limitini Hesapla
    const getBranchLimit = () => {
        if (!userData) return 1;
        if (userData.customBranchLimit) return userData.customBranchLimit;
        if (['corporate', 'company'].includes(userData.accountType) || userData.role === 'corporate') return 5;
        // Business/Esnaf varsayılan 1 (Ek paketle artar)
        return 1;
    };

    const handleOpenBranchModal = (branch: any = null) => {
        if (branch) {
            setEditingBranch(branch);
            setBranchForm({ name: branch.name, address: branch.address || '', phone: branch.phone || '' });
        } else {
            setEditingBranch(null);
            setBranchForm({ name: '', address: '', phone: '' });
        }
        setIsBranchModalOpen(true);
    };

    const handleSaveBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        // LİMİT KONTROLÜ (Ekleme Yaparken)
        if (!editingBranch && branches.length >= getBranchLimit()) {
            alert(`⚠️ Şube Limitiniz Dolu (${getBranchLimit()} Adet)!\n\nYeni şube eklemek için Abonelik sayfasından "Ek Şube Hakkı" satın almalısınız.`);
            return;
        }

        setBranchLoading(true);
        try {
            if (editingBranch) {
                // Güncelleme
                await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches', editingBranch.id), {
                    name: branchForm.name,
                    address: branchForm.address,
                    phone: branchForm.phone
                });
            } else {
                // Yeni Ekleme
                await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches'), {
                    name: branchForm.name,
                    address: branchForm.address,
                    phone: branchForm.phone,
                    isHeadquarters: branches.length === 0, // İlk şube ise Merkez'dir
                    createdAt: serverTimestamp(),
                    createdBy: user.uid
                });
            }
            setIsBranchModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Şube kaydedilemedi.");
        } finally {
            setBranchLoading(false);
        }
    };

    const handleDeleteBranch = async (branchId: string, isHeadquarters: boolean) => {
        if (isHeadquarters) {
            alert("🛑 Merkez Şube silinemez! Sadece düzenleyebilirsiniz.");
            return;
        }
        if (!confirm("Bu şubeyi silmek istediğinize emin misiniz? Şubeye ait veriler (stok, işler) korunur ama şube etiketi boşa çıkabilir.")) return;

        const user = auth.currentUser;
        if (!user) return;

        try {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches', branchId));
        } catch (error) {
            console.error(error);
            alert("Silinemedi.");
        }
    };

    // --- PROFİL & LOGO ---

    const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isStaff) return;
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
            console.error("Logo hatası:", error);
            alert("Logo yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const user = auth.currentUser;
        if (!user) return;

        try {
            const updateData: any = {
                fullName: profile.fullName,
                phone: profile.phone,
            };

            if (!isStaff) {
                updateData.companyName = profile.companyName;
                updateData.sector = profile.sector;
                updateData.address = profile.address;
                updateData.appointmentDuration = profile.appointmentDuration;
                updateData.whatsappTemplates = whatsappTemplates;
            }

            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), updateData);

            const directoryUpdate: any = { fullName: profile.fullName, phone: profile.phone };
            if (!isStaff) directoryUpdate.companyName = profile.companyName;

            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', user.uid), directoryUpdate);

            alert('Bilgiler başarıyla güncellendi.');
        } catch (error) {
            console.error(error);
            alert('Hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const checkPendingInvite = async () => {
        const user = auth.currentUser;
        if (!user || !user.email) return;
        setLoading(true);
        try {
            const inviteRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'invitations', user.email);
            const inviteSnap = await getDoc(inviteRef);

            if (inviteSnap.exists()) {
                const data = inviteSnap.data();
                await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), {
                    ownerId: data.targetCompanyId,
                    companyName: data.targetCompanyName,
                    role: data.assignedRole,
                    sector: data.targetSector,
                    accountType: 'corporate'
                });
                await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', user.uid), {
                    companyName: data.targetCompanyName,
                    role: data.assignedRole,
                    accountType: 'corporate'
                });
                alert(`✅ Hesabınız "${data.targetCompanyName}" firmasına bağlandı.`);
                window.location.reload();
            } else {
                alert("Aktif davetiye bulunamadı.");
            }
        } catch (error) { console.error(error); alert("Hata oluştu."); } finally { setLoading(false); }
    };

    const getLicenseDate = () => {
        if (!userData?.licenseEndsAt) return '-';
        return new Date(userData.licenseEndsAt.seconds * 1000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
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

                    {/* 1. Logo ve Marka */}
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
                                    {profile.logoUrl ? <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" /> : <UploadCloud className="w-8 h-8 text-slate-400" />}
                                    {!isStaff && <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"><p className="text-white text-xs font-bold">Değiştir</p></div>}
                                </div>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleLogoSelect} disabled={isStaff} />
                            </div>
                            <div className="flex-1 text-center sm:text-left space-y-2">
                                <h4 className="font-bold text-slate-900 dark:text-white">Firma Logosu</h4>
                                <p className="text-sm text-slate-500">{isStaff ? 'Yönetici tarafından belirlenir.' : 'Tekliflerde ve panelde görünecek logo.'}</p>
                                {!isStaff && <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">Dosya Seç</button>}
                            </div>
                        </div>
                    </div>

                    {/* 🔥 2. ŞUBE YÖNETİMİ (YENİ) */}
                    {!isStaff && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Store className="w-5 h-5 text-orange-600" /> Şube Yönetimi
                                </h3>
                                <button onClick={() => handleOpenBranchModal()} className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 rounded-lg text-xs font-bold transition-colors">
                                    <Plus className="w-4 h-4" /> Yeni Şube
                                </button>
                            </div>

                            <div className="space-y-3">
                                {branches.length === 0 ? (
                                    <p className="text-center text-slate-500 text-sm py-4">Şube kaydı bulunamadı.</p>
                                ) : (
                                    branches.map(branch => (
                                        <div key={branch.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 group hover:border-orange-200 transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-900 dark:text-white">{branch.name}</h4>
                                                    {branch.isHeadquarters && <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded font-bold">MERKEZ</span>}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                                    {branch.phone && <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> {branch.phone}</span>}
                                                    {branch.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {branch.address}</span>}
                                                </div>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenBranchModal(branch)} className="p-2 text-slate-400 hover:text-blue-600 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><Edit2 className="w-4 h-4" /></button>
                                                {!branch.isHeadquarters && (
                                                    <button onClick={() => handleDeleteBranch(branch.id, branch.isHeadquarters)} className="p-2 text-slate-400 hover:text-red-600 bg-white dark:bg-slate-800 rounded-lg shadow-sm"><Trash2 className="w-4 h-4" /></button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-4 text-center">
                                Mevcut Paketinizde: <span className="font-bold text-slate-600 dark:text-slate-300">{branches.length} / {getBranchLimit()}</span> Şube Kullanıyorsunuz.
                            </p>
                        </div>
                    )}

                    {/* 3. WhatsApp Şablonları */}
                    <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm ${isStaff ? 'opacity-70 pointer-events-none' : ''}`}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-green-600" /> WhatsApp Mesaj Şablonları
                            </h3>
                            {isStaff && <Lock className="w-4 h-4 text-slate-400" />}
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">🔧 Cihaz Teslim Mesajı (Tamamlandı)</label>
                                <textarea disabled={isStaff} rows={2} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-green-500 transition-all text-sm" value={whatsappTemplates.deviceCompleted} onChange={e => setWhatsappTemplates({ ...whatsappTemplates, deviceCompleted: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">📅 Randevu Hatırlatma Mesajı</label>
                                <textarea disabled={isStaff} rows={2} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-green-500 transition-all text-sm" value={whatsappTemplates.appointmentReminder} onChange={e => setWhatsappTemplates({ ...whatsappTemplates, appointmentReminder: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    {/* 4. Firma Bilgileri Formu */}
                    <form onSubmit={handleSaveProfile} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Building className="w-5 h-5 text-blue-600" /> İşletme Detayları
                        </h3>

                        <div className="space-y-4">
                            {isStaff && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full"><LinkIcon className="w-5 h-5 text-blue-600 dark:text-blue-300" /></div>
                                        <div><h4 className="font-bold text-slate-900 dark:text-white text-sm">Şirket Bağlantısı</h4><p className="text-xs text-slate-500 dark:text-slate-400">{profile.companyName ? `"${profile.companyName}" firmasına bağlısınız.` : 'Henüz bir firmaya bağlı değilsiniz.'}</p></div>
                                    </div>
                                    <button type="button" onClick={checkPendingInvite} disabled={loading} className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">{loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Bağlantıyı Kontrol Et</button>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Firma Adı</label><input disabled={isStaff} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all disabled:opacity-60" value={profile.companyName} onChange={e => setProfile({ ...profile, companyName: e.target.value })} /></div>
                                <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefon</label><input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} /></div>
                            </div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Randevu Süresi (Dk)</label><select disabled={isStaff} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none disabled:opacity-60" value={profile.appointmentDuration} onChange={e => setProfile({ ...profile, appointmentDuration: e.target.value })}><option value="15">15 Dakika</option><option value="30">30 Dakika</option><option value="60">1 Saat</option><option value="90">1.5 Saat</option></select></div>
                            <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açık Adres</label><textarea disabled={isStaff} rows={3} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all disabled:opacity-60" value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} /></div>
                        </div>
                    </form>

                    <div className="sticky bottom-4 z-10">
                        <button onClick={handleSaveProfile} disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-70 transform active:scale-95">
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6" /> Kaydet</>}
                        </button>
                    </div>
                </div>

                {/* SAĞ KOLON */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-4">Kişisel Bilgiler</h3>
                        <div className="space-y-3">
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500">Ad Soyad</label><input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm" value={profile.fullName} onChange={e => setProfile({ ...profile, fullName: e.target.value })} /></div>
                            <div className="space-y-1"><label className="text-xs font-bold text-slate-500">E-Posta</label><input disabled className="w-full p-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-500" value={userData?.email || ''} /></div>
                        </div>
                    </div>

                    {!isStaff && (
                        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 rounded-2xl border border-indigo-700/50 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck className="w-32 h-32" /></div>
                            <div className="relative z-10"><h3 className="text-xl font-bold mb-1">Servis360 Pro</h3><p className="text-indigo-200 text-xs mb-4">Profesyonel Paket</p><div className="bg-white/10 rounded-lg p-3 mb-4 backdrop-blur-sm"><p className="text-[10px] text-indigo-200 uppercase font-bold">Bitiş Tarihi</p><p className="text-lg font-mono font-bold">{getLicenseDate()}</p></div></div>
                        </div>
                    )}
                </div>
            </div>

            {/* ŞUBE MODALI */}
            {isBranchModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Store className="w-6 h-6 text-orange-600" /> {editingBranch ? 'Şubeyi Düzenle' : 'Yeni Şube Ekle'}
                            </h2>
                            <button onClick={() => setIsBranchModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSaveBranch} className="space-y-4">
                            <div><label className="block text-sm font-medium mb-1">Şube Adı</label><input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-orange-500" placeholder="Örn: Kadıköy Şubesi" value={branchForm.name} onChange={e => setBranchForm({ ...branchForm, name: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium mb-1">Telefon</label><input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-orange-500" placeholder="0212..." value={branchForm.phone} onChange={e => setBranchForm({ ...branchForm, phone: e.target.value })} /></div>
                            <div><label className="block text-sm font-medium mb-1">Adres</label><textarea className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-orange-500" placeholder="Adres detayları..." rows={3} value={branchForm.address} onChange={e => setBranchForm({ ...branchForm, address: e.target.value })} /></div>
                            <button className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors">
                                {branchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Kaydet
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}