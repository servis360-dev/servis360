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
    Crown
} from 'lucide-react';

export default function StaffPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null); // Patronun bilgileri
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: 'technical',
        phone: ''
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // Patronun Profilini Çek (Sektör ve Şirket Adı lazım)
                const profileSnap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile'));
                if (profileSnap.exists()) {
                    setUserData(profileSnap.data());
                }

                // Personel Listesi
                const q = query(collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'staff'));
                const unsubSnap = onSnapshot(q, (snapshot) => {
                    setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoading(false);
                });
                return () => unsubSnap();
            }
        });
        return () => unsubscribe();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userData) return;

        // 🛑 LİMİT KONTROLÜ (ESNAF: 5 KİŞİ)
        const isEsnaf = ['esnaf', 'business', 'tradesman'].includes(userData.accountType) || ['esnaf', 'business'].includes(userData.role);

        // Eğer admin özel bir limit tanımladıysa onu kullan, yoksa Esnaf için 5, Kurumsal için sınırsız (999)
        const defaultLimit = isEsnaf ? 5 : 999;
        const currentLimit = userData.customStaffLimit || defaultLimit;

        if (staff.length >= currentLimit) {
            alert(
                `⚠️ PERSONEL LİMİTİ DOLDU!\n\n` +
                `Paketiniz en fazla ${currentLimit} personel eklemenize izin veriyor.\n` +
                `Yeni personel eklemek için Yönetici ile iletişime geçerek "Ek Personel Hakkı" (800 TL) satın almalısınız.`
            );
            return;
        }

        try {
            // 1. Kendi listene ekle (Yönetim için)
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'staff', formData.email), {
                ...formData,
                status: 'invited',
                invitedAt: serverTimestamp()
            });

            // 2. GENEL DAVET LİSTESİNE EKLE (Register sayfası buradan okuyacak) 🚨
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'invitations', formData.email), {
                email: formData.email,
                targetCompanyId: user.uid, // Patronun ID'si
                targetCompanyName: userData.companyName || 'Şirket',
                targetSector: userData.sectorType || 'technical_service',
                assignedRole: formData.role, // technical, sales vs.
                invitedBy: userData.fullName,
                createdAt: serverTimestamp()
            });

            alert(`✅ Personel eklendi!\n\n"${formData.email}" adresiyle kayıt olduğunda otomatik olarak personeliniz olacak.`);
            setShowModal(false);
            setFormData({ fullName: '', email: '', role: 'technical', phone: '' });

        } catch (error) {
            console.error(error);
            alert("Bir hata oluştu.");
        }
    };

    const handleDelete = async (email: string) => {
        if (confirm("Bu personeli silmek istediğinize emin misiniz?")) {
            // Hem listeden hem davetlerden sil
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

    // Limit Bilgisi Gösterimi
    const isEsnaf = userData && (['esnaf', 'business'].includes(userData.accountType));
    const limit = userData?.customStaffLimit || (isEsnaf ? 5 : 999);
    const used = staff.length;
    const remaining = limit - used;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Personel Yönetimi</h1>
                    <p className="text-slate-500 dark:text-slate-400">Çalışanlarınızı davet edin ve yetkilendirin.</p>
                </div>

                {/* Limit Göstergesi */}
                {userData && (
                    <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${remaining <= 1 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                        <Users className="w-5 h-5" />
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider">Kalan Hak</p>
                            <p className="text-sm font-bold">{remaining} / {limit} Kişi</p>
                        </div>
                        {remaining <= 0 && <ShieldAlert className="w-5 h-5 animate-pulse" />}
                    </div>
                )}

                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                    <UserPlus className="w-5 h-5" /> Personel Ekle
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="p-4 font-semibold">Ad Soyad</th>
                            <th className="p-4 font-semibold">İletişim</th>
                            <th className="p-4 font-semibold">Yetki</th>
                            <th className="p-4 font-semibold">Durum</th>
                            <th className="p-4 text-right">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? <tr><td colSpan={5} className="p-8 text-center">Yükleniyor...</td></tr> : staff.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Henüz personel eklenmedi.</td></tr>
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
                                <td className="p-4">{p.status === 'active' ? <span className="text-green-600 font-bold flex gap-1 items-center bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded w-fit"><CheckCircle2 className="w-3 h-3" /> Aktif</span> : <span className="text-orange-500 font-bold text-xs bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded border border-orange-200 dark:border-orange-800 w-fit">⏳ Davet Edildi</span>}</td>
                                <td className="p-4 text-right"><button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
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