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
    Loader2
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

        try {
            // 1. Kendi listene ekle (Yönetim için)
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'staff', formData.email), {
                ...formData,
                status: 'invited',
                invitedAt: serverTimestamp()
            });

            // 2. GENEL DAVET LİSTESİNE EKLE (Register sayfası buradan okuyacak) 🚨
            // Bu kısım çok önemli: Personel kayıt olurken bu veriyi kullanacak.
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'invitations', formData.email), {
                email: formData.email,
                targetCompanyId: user.uid, // Patronun ID'si
                targetCompanyName: userData.companyName || 'Şirket',
                targetSector: userData.sectorType || 'technical_service',
                assignedRole: formData.role, // technical, sales vs.
                invitedBy: userData.fullName,
                createdAt: serverTimestamp()
            });

            alert(`Personel eklendi!\n\n"${formData.email}" adresiyle kayıt olduğunda otomatik olarak personeliniz olacak.`);
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Personel Yönetimi</h1>
                    <p className="text-slate-500 dark:text-slate-400">Çalışanlarınızı davet edin ve yetkilendirin.</p>
                </div>
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30">
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
                        {loading ? <tr><td colSpan={5} className="p-8 text-center">Yükleniyor...</td></tr> : staff.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="p-4 font-bold text-slate-900 dark:text-white">{p.fullName}</td>
                                <td className="p-4 flex flex-col"><span className="flex gap-2"><Mail className="w-3 h-3" /> {p.email}</span><span className="text-xs text-slate-400">{p.phone}</span></td>
                                <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200">{getRoleName(p.role)}</span></td>
                                <td className="p-4">{p.status === 'active' ? <span className="text-green-600 font-bold flex gap-1"><CheckCircle2 className="w-4 h-4" /> Aktif</span> : <span className="text-orange-500 font-bold text-xs bg-orange-50 px-2 py-1 rounded">⏳ Davet Edildi</span>}</td>
                                <td className="p-4 text-right"><button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold">Personel Ekle</h2><button onClick={() => setShowModal(false)}><X className="text-slate-400" /></button></div>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div><label className="block text-sm font-bold mb-1">Ad Soyad</label><input required className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="Ahmet Yılmaz" /></div>
                            <div><label className="block text-sm font-bold mb-1">E-Posta (Giriş Yapacağı)</label><input required type="email" className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="ahmet@gmail.com" /></div>
                            <div><label className="block text-sm font-bold mb-1">Telefon</label><input type="tel" className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="0555..." /></div>
                            <div>
                                <label className="block text-sm font-bold mb-1">Görevi</label>
                                <select className="w-full p-3 bg-slate-50 border rounded-xl" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="technical">🛠️ Tekniker (Sadece İş Emirleri)</option>
                                    <option value="sales">💰 Satış / Kasa (Tam Yetki)</option>
                                    <option value="accountant">📉 Ön Muhasebe</option>
                                </select>
                            </div>
                            <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">Davet Et</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}