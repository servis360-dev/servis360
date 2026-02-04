'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Users,
    UserPlus,
    Mail,
    Trash2,
    Briefcase,
    CheckCircle2,
    X,
    Loader2,
    ShieldAlert,
    Crown,
    Store,
    Phone
} from 'lucide-react';

export default function StaffPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: 'technical',
        phone: '',
        branchId: ''
    });

    useEffect(() => {
        let unsubSnap: () => void;
        let unsubBranches: () => void;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                const profileSnap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile'));
                if (profileSnap.exists()) {
                    setUserData(profileSnap.data());
                }

                const q = query(collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'staff'));
                unsubSnap = onSnapshot(q, (snapshot) => {
                    setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoading(false);
                });

                const qBranches = query(collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'branches'));
                unsubBranches = onSnapshot(qBranches, (snapshot) => {
                    setBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                });
            }
        });

        return () => {
            unsubscribe();
            if (unsubSnap) unsubSnap();
            if (unsubBranches) unsubBranches();
        };
    }, []);

    // 🔥 YENİ LİMİT HESAPLAMA MANTIĞI (Subscription Sayfası ile Eşitlendi)
    const getStaffLimit = () => {
        if (!userData) return 1;

        let baseLimit = 1; // Bireysel Varsayılan

        if (['corporate', 'company', 'enterprise'].includes(userData.accountType)) {
            baseLimit = 50; // Kurumsal: 50 Personel
        } else if (['esnaf', 'business', 'tradesman'].includes(userData.accountType)) {
            baseLimit = 5; // Esnaf: 5 Personel
        }

        // Veritabanındaki 'customStaffLimit' artık sadece "EKSTRA" alınanları temsil ediyor.
        const extra = userData.customStaffLimit || 0;

        return baseLimit + extra;
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userData) return;

        if (branches.length > 0 && !formData.branchId) {
            alert("Lütfen personelin çalışacağı şubeyi seçiniz.");
            return;
        }

        const currentLimit = getStaffLimit();

        if (staff.length >= currentLimit) {
            alert(
                `⚠️ PERSONEL LİMİTİ DOLDU!\n\n` +
                `Paketiniz en fazla ${currentLimit} personel eklemenize izin veriyor.\n` +
                `Yeni personel eklemek için Abonelik sayfasından "Ek Personel Hakkı" satın alabilirsiniz.`
            );
            return;
        }

        try {
            const selectedBranchName = branches.find(b => b.id === formData.branchId)?.name || 'Merkez';

            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'staff', formData.email), {
                ...formData,
                branchName: selectedBranchName,
                status: 'invited',
                invitedAt: serverTimestamp()
            });

            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'invitations', formData.email), {
                email: formData.email,
                targetCompanyId: user.uid,
                targetCompanyName: userData.companyName || 'Şirket',
                targetSector: userData.sectorType || 'technical_service',
                assignedRole: formData.role,
                assignedBranchId: formData.branchId,
                invitedBy: userData.fullName,
                createdAt: serverTimestamp()
            });

            alert(`✅ Personel eklendi!\n\n"${formData.email}" adresiyle kayıt olduğunda otomatik olarak "${selectedBranchName}" şubesine atanacak.`);
            setShowModal(false);
            setFormData({ fullName: '', email: '', role: 'technical', phone: '', branchId: '' });

        } catch (error) {
            console.error(error);
            alert("Bir hata oluştu.");
        }
    };

    const handleDelete = async (email: string) => {
        if (confirm("Bu personeli silmek istediğinize emin misiniz?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'staff', email));
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'invitations', email));
        }
    };

    const getRoleName = (role: string) => {
        switch (role) {
            case 'technical': return 'Teknik Servis';
            case 'sales': return 'Satış / Kasa';
            case 'accountant': return 'Ön Muhasebe';
            default: return role;
        }
    };

    const limit = getStaffLimit();
    const remaining = limit - staff.length;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Personel Yönetimi</h1>
                    <p className="text-slate-500 dark:text-slate-400">Çalışanlarınızı davet edin ve şubelere atayın.</p>
                </div>

                {userData && (
                    <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 w-full md:w-auto ${remaining <= 1 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                        <Users className="w-5 h-5" />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider">Kalan Hak</p>
                            <p className="text-sm font-bold">{remaining} / {limit} Kişi</p>
                        </div>
                    </div>
                )}

                <button onClick={() => setShowModal(true)} className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                    <UserPlus className="w-5 h-5" /> Personel Ekle
                </button>
            </div>

            {/* MOBİL KART GÖRÜNÜMÜ (Sadece Mobilde Görünür) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {loading ? <p className="text-center py-10 text-slate-500">Yükleniyor...</p> :
                    staff.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                            <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-400">Henüz personel eklenmedi.</p>
                        </div>
                    ) : staff.map(p => (
                        <div key={p.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                                        <Briefcase className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{p.fullName}</h3>
                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                                            {getRoleName(p.role)}
                                        </span>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" />
                                    <span className="truncate">{p.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span>{p.phone || '-'}</span>
                                </div>
                                {p.branchName && (
                                    <div className="flex items-center gap-2">
                                        <Store className="w-4 h-4 text-slate-400" />
                                        <span>{p.branchName}</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                {p.status === 'active' ?
                                    <span className="text-green-600 font-bold flex gap-1 items-center bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded text-xs">
                                        <CheckCircle2 className="w-3 h-3" /> Aktif
                                    </span> :
                                    <span className="text-orange-500 font-bold text-xs bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded border border-orange-200 dark:border-orange-800 flex items-center gap-1">
                                        ⏳ Davet Edildi
                                    </span>
                                }
                            </div>
                        </div>
                    ))}
            </div>

            {/* MASAÜSTÜ TABLO GÖRÜNÜMÜ (Mobilde Gizli) */}
            <div className="hidden md:block bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="p-4 font-semibold">Ad Soyad</th>
                            <th className="p-4 font-semibold">İletişim</th>
                            <th className="p-4 font-semibold">Yetki</th>
                            <th className="p-4 font-semibold">Şube</th>
                            <th className="p-4 font-semibold">Durum</th>
                            <th className="p-4 text-right">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? <tr><td colSpan={6} className="p-8 text-center">Yükleniyor...</td></tr> : staff.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Henüz personel eklenmedi.</td></tr>
                        ) : staff.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="p-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                                        <Briefcase className="w-4 h-4" />
                                    </div>
                                    {p.fullName}
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-col">
                                        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200"><Mail className="w-3 h-3" /> {p.email}</span>
                                        <span className="text-xs text-slate-400 pl-4">{p.phone || '-'}</span>
                                    </div>
                                </td>
                                <td className="p-4"><span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-bold border border-blue-200 dark:border-blue-800">{getRoleName(p.role)}</span></td>
                                <td className="p-4">
                                    {p.branchName ? (
                                        <span className="flex items-center gap-1 text-xs font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded border border-purple-200 dark:border-purple-800 w-fit">
                                            <Store className="w-3 h-3" /> {p.branchName}
                                        </span>
                                    ) : <span className="text-slate-400 text-xs">-</span>}
                                </td>
                                <td className="p-4">{p.status === 'active' ? <span className="text-green-600 font-bold flex gap-1 items-center bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded w-fit"><CheckCircle2 className="w-3 h-3" /> Aktif</span> : <span className="text-orange-500 font-bold text-xs bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded border border-orange-200 dark:border-orange-800 w-fit">⏳ Davet Edildi</span>}</td>
                                <td className="p-4 text-right"><button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white"><UserPlus className="w-6 h-6 text-blue-600" /> Personel Ekle</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><X className="text-slate-400" /></button>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-xl mb-4 text-xs text-blue-700 dark:text-blue-300 flex gap-2">
                            <Crown className="w-4 h-4 flex-shrink-0" />
                            <span>Mevcut paketinize göre <strong>{limit - staff.length}</strong> kişi daha ekleyebilirsiniz.</span>
                        </div>

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div><label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">Ad Soyad</label><input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="Ahmet Yılmaz" /></div>
                            <div><label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">E-Posta (Giriş Yapacağı)</label><input required type="email" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="ahmet@gmail.com" /></div>
                            <div><label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">Telefon</label><input type="tel" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="0555..." /></div>

                            {branches.length > 0 && (
                                <div>
                                    <label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">Çalışacağı Şube</label>
                                    <div className="relative">
                                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            required
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 appearance-none"
                                            value={formData.branchId}
                                            onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                        >
                                            <option value="">Şube Seçiniz...</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name} {b.isHeadquarters ? '(Merkez)' : ''}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold mb-1 text-slate-700 dark:text-slate-300">Görevi</label>
                                <select className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="technical">🛠️ Tekniker (Sadece İş Emirleri)</option>
                                    <option value="sales">💰 Satış / Kasa (Tam Yetki)</option>
                                    <option value="accountant">📉 Ön Muhasebe</option>
                                </select>
                            </div>
                            <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/30">Davet Gönder</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}