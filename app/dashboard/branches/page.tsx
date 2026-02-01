'use client';

import { useEffect, useState } from 'react';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Store,
    Plus,
    MapPin,
    Phone,
    Mail,
    Trash2,
    ShieldAlert,
    Building2,
    X,
    Loader2,
    Lock
} from 'lucide-react';

export default function BranchesPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    // Modal & Form
    const [showAddModal, setShowAddModal] = useState(false);
    const [newBranch, setNewBranch] = useState({
        name: '',
        city: '',
        district: '',
        address: '',
        phone: '',
        managerEmail: '' // Şube Yöneticisi
    });

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // 1. Profil Bilgisini Çek (Limitleri öğrenmek için)
                const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                const profileSnap = await getDoc(profileRef);
                if (profileSnap.exists()) {
                    setProfile(profileSnap.data());
                }

                // 2. Şubeleri Listele
                const q = query(collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'branches'));
                const unsub = onSnapshot(q, (snapshot) => {
                    setBranches(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                    setLoading(false);
                });

                return () => unsub();
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // --- LİMİT HESAPLAMA MANTIĞI ---
    const getBranchLimit = () => {
        if (!profile) return 0;

        // Eğer Admin panelden özel bir limit tanımlanmışsa onu kullan
        if (profile.customBranchLimit && profile.customBranchLimit > 0) {
            return profile.customBranchLimit;
        }

        // Yoksa Hesap Tipine göre varsayılan limitler
        if (['corporate', 'company'].includes(profile.accountType) || profile.role === 'corporate') {
            return 5; // Kurumsal: 5 Şube
        }

        // Esnaf ve Bireysel: 1 Şube
        return 1;
    };

    const limit = getBranchLimit();
    const usage = branches.length;
    const remaining = limit - usage;
    const isLimitReached = usage >= limit;

    const handleAddBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (isLimitReached) {
            alert("Şube limitiniz doldu! Ek şube için lütfen yönetici ile iletişime geçin.");
            return;
        }

        try {
            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches'), {
                ...newBranch,
                createdAt: serverTimestamp()
            });
            setShowAddModal(false);
            setNewBranch({ name: '', city: '', district: '', address: '', phone: '', managerEmail: '' });
            alert("Şube başarıyla açıldı.");
        } catch (error) {
            console.error("Şube ekleme hatası:", error);
            alert("Bir hata oluştu.");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Bu şubeyi silmek istediğinize emin misiniz?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches', id));
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="space-y-6 pb-20">
            {/* BAŞLIK */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Store className="text-blue-600" /> Şube Yönetimi
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Fiziksel şubelerinizi ve yöneticilerini buradan tanımlayın.
                    </p>
                </div>

                {/* LİMİT DURUMU */}
                <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 pl-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">KULLANIM</p>
                        <p className={`font-bold ${isLimitReached ? 'text-red-500' : 'text-blue-600'}`}>
                            {usage} / {limit} Şube
                        </p>
                    </div>
                    <button
                        onClick={() => !isLimitReached && setShowAddModal(true)}
                        disabled={isLimitReached}
                        className={`px-4 py-2 rounded-lg font-bold text-white flex items-center gap-2 transition-all ${isLimitReached
                                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30'
                            }`}
                    >
                        {isLimitReached ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {isLimitReached ? 'Limit Dolu' : 'Şube Ekle'}
                    </button>
                </div>
            </div>

            {/* UYARI MESAJI (Limit Dolunca) */}
            {isLimitReached && (
                <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-700 p-4 rounded-xl flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-bold text-yellow-700 dark:text-yellow-400">Şube Limitine Ulaştınız</h3>
                        <p className="text-xs text-yellow-600 dark:text-yellow-500/80 mt-1">
                            Paketinizin izin verdiği maksimum şube sayısına ({limit} adet) ulaştınız.
                            Daha fazla şube eklemek için ek paket satın alabilir (Adet: 800₺) veya mevcut şubelerden birini silebilirsiniz.
                        </p>
                    </div>
                </div>
            )}

            {/* ŞUBE LİSTESİ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <div className="bg-slate-100 dark:bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Store className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Henüz şube eklemediniz.</h3>
                        <p className="text-slate-500 text-sm mt-1">İlk şubenizi ekleyerek başlayın.</p>
                    </div>
                ) : (
                    branches.map(branch => (
                        <div key={branch.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-all group relative">

                            {/* Silme Butonu */}
                            <button
                                onClick={() => handleDelete(branch.id)}
                                className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">{branch.name}</h3>
                                    <p className="text-xs text-slate-500 uppercase font-bold">{branch.district}, {branch.city}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{branch.address}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg">
                                        <Phone className="w-3 h-3 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{branch.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-lg overflow-hidden">
                                        <Mail className="w-3 h-3 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={branch.managerEmail}>
                                            {branch.managerEmail || 'Atanmadı'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* EKLEME MODALI */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Yeni Şube Ekle</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
                        </div>

                        <form onSubmit={handleAddBranch} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Şube Adı</label>
                                <input
                                    required
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    placeholder="Örn: Merkez Şube"
                                    value={newBranch.name}
                                    onChange={e => setNewBranch({ ...newBranch, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Şehir</label>
                                    <input
                                        required
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                        placeholder="İstanbul"
                                        value={newBranch.city}
                                        onChange={e => setNewBranch({ ...newBranch, city: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">İlçe</label>
                                    <input
                                        required
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                        placeholder="Kadıköy"
                                        value={newBranch.district}
                                        onChange={e => setNewBranch({ ...newBranch, district: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Açık Adres</label>
                                <textarea
                                    required
                                    rows={2}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    value={newBranch.address}
                                    onChange={e => setNewBranch({ ...newBranch, address: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                                    <input
                                        required
                                        type="tel"
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                        placeholder="0212..."
                                        value={newBranch.phone}
                                        onChange={e => setNewBranch({ ...newBranch, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Yetkili E-Posta</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                        placeholder="yonetici@sirket.com"
                                        value={newBranch.managerEmail}
                                        onChange={e => setNewBranch({ ...newBranch, managerEmail: e.target.value })}
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">Bildirimler bu adrese gider.</p>
                                </div>
                            </div>

                            <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all">
                                Kaydet
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}