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
    getDoc,
    updateDoc
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
    Lock,
    Crown,
    CheckCircle2
} from 'lucide-react';

export default function BranchesPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    // Modal & Form
    const [showAddModal, setShowAddModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newBranch, setNewBranch] = useState({
        name: '',
        city: '',
        district: '',
        address: '',
        phone: '',
        managerEmail: '',
        isHeadquarters: false
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
                    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    // Merkez şubeyi en başa al
                    data.sort((a: any, b: any) => (b.isHeadquarters === true ? 1 : 0) - (a.isHeadquarters === true ? 1 : 0));
                    setBranches(data);
                    setLoading(false);
                });

                return () => unsub();
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // --- GELİŞMİŞ LİMİT HESAPLAMA (Admin Satışlarıyla Entegre) ---
    const getLimits = () => {
        if (!profile) return { base: 1, extra: 0, total: 1 };

        let baseLimit = 1; // Standart / Esnaf

        // Kurumsal firmaların varsayılan şube hakkı daha yüksek olabilir
        if (['corporate', 'company', 'enterprise'].includes(profile.accountType)) {
            baseLimit = 5;
        }

        // Admin panelinden satılan 'customBranchLimit'
        const extra = profile.customBranchLimit || 0;

        return {
            base: baseLimit,
            extra: extra,
            total: baseLimit + extra
        };
    };

    const limits = getLimits();
    const usage = branches.length;
    const remaining = limits.total - usage;
    const isLimitReached = usage >= limits.total;

    const handleAddBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (isLimitReached) {
            alert(
                `⚠️ ŞUBE LİMİTİ DOLDU!\n\n` +
                `Paketiniz: ${limits.base} Şube\n` +
                `Satın Alınan Ek Hak: +${limits.extra} Şube\n` +
                `Toplam Limit: ${limits.total} Şube\n\n` +
                `Yeni şube açmak için lütfen ek hak satın alın.`
            );
            return;
        }

        setSubmitting(true);
        try {
            // Eğer ilk şube ise veya kullanıcı merkez seçtiyse
            const isFirst = branches.length === 0;
            const finalHeadquarters = isFirst ? true : newBranch.isHeadquarters;

            // Eğer yeni şube merkez olacaksa, diğerlerinin merkezliğini kaldır
            if (finalHeadquarters && !isFirst) {
                const currentHq = branches.find(b => b.isHeadquarters);
                if (currentHq) {
                    await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches', currentHq.id), { isHeadquarters: false });
                }
            }

            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches'), {
                ...newBranch,
                isHeadquarters: finalHeadquarters,
                createdAt: serverTimestamp()
            });

            setShowAddModal(false);
            setNewBranch({ name: '', city: '', district: '', address: '', phone: '', managerEmail: '', isHeadquarters: false });
            alert("✅ Şube başarıyla açıldı.");
        } catch (error) {
            console.error("Şube ekleme hatası:", error);
            alert("Bir hata oluştu.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string, isHq: boolean) => {
        if (isHq && branches.length > 1) {
            alert("🛑 MERKEZ şubeyi silemezsiniz! Önce başka bir şubeyi merkez yapın.");
            return;
        }
        if (confirm("⚠️ Bu şubeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches', id));
        }
    };

    const makeHeadquarters = async (branch: any) => {
        if (branch.isHeadquarters) return;
        if (!confirm(`${branch.name} şubesini MERKEZ şube yapmak istiyor musunuz?`)) return;

        // Eskiyi kaldır
        const currentHq = branches.find(b => b.isHeadquarters);
        if (currentHq) {
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches', currentHq.id), { isHeadquarters: false });
        }
        // Yeniyi ata
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches', branch.id), { isHeadquarters: true });
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-600 w-8 h-8" /></div>;

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            {/* BAŞLIK VE HAK BİLGİSİ */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Store className="text-blue-600 w-7 h-7" /> Şube Yönetimi
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Fiziksel şubelerinizi yönetin ve yetkilendirin.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    {/* HAK BİLGİSİ KARTI (Personel sayfasıyla aynı tasarım) */}
                    {profile && (
                        <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${remaining <= 0 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                            <Crown className="w-5 h-5" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Şube Hakkı</p>
                                <div className="text-sm font-bold flex items-center gap-1">
                                    <span>{usage} / {limits.total}</span>
                                    {limits.extra > 0 && (
                                        <span className="text-[10px] bg-white/50 px-1.5 rounded-full ml-1 border border-current">
                                            +{limits.extra} Ek
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => !isLimitReached && setShowAddModal(true)}
                        disabled={isLimitReached}
                        className={`px-5 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all shadow-lg ${isLimitReached
                            ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none'
                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 active:scale-95'
                            }`}
                    >
                        {isLimitReached ? <Lock className="w-4 h-4" /> : <Plus className="w-5 h-5" />}
                        {isLimitReached ? 'Limit Dolu' : 'Yeni Şube Ekle'}
                    </button>
                </div>
            </div>

            {/* UYARI MESAJI (Limit Dolunca) */}
            {isLimitReached && (
                <div className="bg-gradient-to-r from-red-50 to-white dark:from-red-900/10 dark:to-slate-900 border border-red-200 dark:border-red-900/30 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                    <ShieldAlert className="w-5 h-5 text-red-600 dark:text-red-500 shrink-0 mt-0.5" />
                    <div>
                        <h3 className="text-sm font-bold text-red-700 dark:text-red-400">Şube Limitine Ulaştınız</h3>
                        <p className="text-xs text-red-600 dark:text-red-500/80 mt-1">
                            Mevcut paketiniz ({limits.base}) ve satın aldığınız ek haklar ({limits.extra}) tamamen kullanıldı.
                            Daha fazla şube açmak için yönetici ile iletişime geçerek ek hak satın alabilirsiniz.
                        </p>
                    </div>
                </div>
            )}

            {/* ŞUBE LİSTESİ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {branches.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                        <div className="bg-slate-100 dark:bg-slate-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Store className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Henüz şube eklemediniz.</h3>
                        <p className="text-slate-500 text-sm mt-1 mb-6">İşletmenizi büyütmek için ilk şubenizi ekleyin.</p>
                        <button onClick={() => setShowAddModal(true)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">
                            İlk Şubeyi Ekle
                        </button>
                    </div>
                ) : (
                    branches.map(branch => (
                        <div key={branch.id} className={`bg-white dark:bg-slate-800 rounded-2xl border p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative ${branch.isHeadquarters ? 'border-blue-500 ring-1 ring-blue-500/20' : 'border-slate-200 dark:border-slate-700'}`}>

                            {/* Merkez Rozeti */}
                            {branch.isHeadquarters && (
                                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-bl-2xl rounded-tr-xl flex items-center gap-1 shadow-lg shadow-blue-600/20">
                                    <Crown className="w-3 h-3" /> MERKEZ
                                </div>
                            )}

                            {/* Silme Butonu */}
                            <button
                                onClick={() => handleDelete(branch.id, branch.isHeadquarters)}
                                className="absolute bottom-4 right-4 p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100"
                                title="Şubeyi Sil"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-4 mb-5 mt-2">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${branch.isHeadquarters ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-900'}`}>
                                    <Building2 className="w-7 h-7" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{branch.name}</h3>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wide mt-1">{branch.district}, {branch.city}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl min-h-[60px] border border-slate-100 dark:border-slate-800">
                                    <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 font-medium">{branch.address}</p>
                                </div>

                                <div className="grid grid-cols-1 gap-2">
                                    <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{branch.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={branch.managerEmail}>
                                            {branch.managerEmail || 'Yönetici Atanmadı'}
                                        </span>
                                    </div>
                                </div>

                                {!branch.isHeadquarters && (
                                    <button
                                        onClick={() => makeHeadquarters(branch)}
                                        className="w-full mt-2 py-2.5 text-xs font-bold text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0"
                                    >
                                        <Crown className="w-3.5 h-3.5" /> Merkez Yap
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* EKLEME MODALI */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl p-0 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" /> Yeni Şube Ekle
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="p-6">
                            <form onSubmit={handleAddBranch} className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Şube Adı</label>
                                    <input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all font-medium" placeholder="Örn: Kadıköy Şube" value={newBranch.name} onChange={e => setNewBranch({ ...newBranch, name: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Şehir</label>
                                        <input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all font-medium" placeholder="İstanbul" value={newBranch.city} onChange={e => setNewBranch({ ...newBranch, city: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">İlçe</label>
                                        <input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all font-medium" placeholder="Kadıköy" value={newBranch.district} onChange={e => setNewBranch({ ...newBranch, district: e.target.value })} />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Açık Adres</label>
                                    <textarea required rows={2} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all font-medium" value={newBranch.address} onChange={e => setNewBranch({ ...newBranch, address: e.target.value })} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Telefon</label>
                                        <input required type="tel" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all font-medium" placeholder="0212..." value={newBranch.phone} onChange={e => setNewBranch({ ...newBranch, phone: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Yetkili E-Posta</label>
                                        <input type="email" required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all font-medium" placeholder="yonetici@sirket.com" value={newBranch.managerEmail} onChange={e => setNewBranch({ ...newBranch, managerEmail: e.target.value })} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors" onClick={() => setNewBranch(p => ({ ...p, isHeadquarters: !p.isHeadquarters }))}>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${newBranch.isHeadquarters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300'}`}>
                                        {newBranch.isHeadquarters && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 select-none">Bu şubeyi MERKEZ olarak ayarla</span>
                                </div>

                                <button disabled={submitting} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 mt-2">
                                    {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Şubeyi Kaydet'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}