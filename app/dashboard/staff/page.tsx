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
    Shield,
    Briefcase,
    CheckCircle2,
    X,
    Copy
} from 'lucide-react';

export default function StaffPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);

    // Yeni Personel Formu
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: 'technical', // technical, sales, accountant
        phone: ''
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // Personel Listesini Çek
                const q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'staff')
                );

                const unsubSnap = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setStaff(data);
                    setLoading(false);
                });
                return () => unsubSnap();
            }
        });
        return () => unsubscribe();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            // Personeli "Davetli" olarak kaydet
            // Gerçek kayıt işlemi personel "Register" olduğunda eşleşecek.
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'staff', formData.email), {
                ...formData,
                status: 'invited', // invited, active
                invitedAt: serverTimestamp()
            });

            // Genel Davet Listesine de ekle (Kayıt olurken kontrol etmek için)
            // Not: Bu kısım güvenlik kuralları gerektirebilir, şimdilik patronun altına ekliyoruz.
            // İdealde bir Cloud Function ile 'public_invites' koleksiyonuna yazılır.

            alert("Personel listeye eklendi! Şimdi bu kişiye sisteme kayıt olmasını söyleyin. E-posta adresi eşleşince yetkileri otomatik tanımlanacak.");

            setShowModal(false);
            setFormData({ fullName: '', email: '', role: 'technical', phone: '' });

        } catch (error) {
            console.error(error);
            alert("Bir hata oluştu.");
        }
    };

    const handleDelete = async (email: string) => {
        if (confirm("Bu personelin yetkilerini kaldırmak istiyor musunuz?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'staff', email));
        }
    };

    const getRoleName = (role: string) => {
        switch (role) {
            case 'technical': return 'Teknik Servis Elemanı';
            case 'sales': return 'Satış / Kasa Görevlisi';
            case 'accountant': return 'Ön Muhasebe';
            default: return 'Personel';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Personel Yönetimi</h1>
                    <p className="text-slate-500 dark:text-slate-400">Çalışanlarınızı ekleyin ve yetkilendirin.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    <UserPlus className="w-5 h-5" /> Personel Ekle
                </button>
            </div>

            {/* Personel Listesi */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                        <tr>
                            <th className="p-4 font-semibold">Ad Soyad</th>
                            <th className="p-4 font-semibold">E-Posta & İletişim</th>
                            <th className="p-4 font-semibold">Rol / Yetki</th>
                            <th className="p-4 font-semibold">Durum</th>
                            <th className="p-4 font-semibold text-right">İşlem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center">Yükleniyor...</td></tr>
                        ) : staff.length === 0 ? (
                            <tr><td colSpan={5} className="p-8 text-center text-slate-500">Henüz personel eklenmemiş.</td></tr>
                        ) : (
                            staff.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="p-4 font-bold text-slate-900 dark:text-white">
                                        {p.fullName}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col">
                                            <span className="flex items-center gap-2"><Mail className="w-3 h-3" /> {p.email}</span>
                                            <span className="text-xs text-slate-400">{p.phone}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                            <Briefcase className="w-3 h-3" />
                                            {getRoleName(p.role)}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {p.status === 'active' ? (
                                            <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Aktif</span>
                                        ) : (
                                            <span className="text-orange-500 font-bold flex items-center gap-1 text-xs bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
                                                ⏳ Davet Edildi
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <UserPlus className="w-6 h-6 text-blue-600" /> Personel Ekle
                            </h2>
                            <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <form onSubmit={handleInvite} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Ad Soyad</label>
                                <input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" placeholder="Örn: Ahmet Yılmaz" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">E-Posta Adresi</label>
                                <input required type="email" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" placeholder="personel@sirket.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                <p className="text-[10px] text-slate-500 mt-1">Personel bu e-posta ile kayıt olmalıdır.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Telefon</label>
                                <input type="tel" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" placeholder="0555..." value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Görevi / Rolü</label>
                                <select
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                >
                                    <option value="technical">🛠️ Teknik Servis (Finans/Ayar Yok)</option>
                                    <option value="sales">💰 Satış / Kasa (Her Şeyi Görür)</option>
                                    <option value="accountant">📉 Ön Muhasebe</option>
                                </select>
                            </div>

                            <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 mt-4">
                                <UserPlus className="w-5 h-5" /> Listeye Ekle
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}