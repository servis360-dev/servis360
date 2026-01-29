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
    orderBy
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import {
    Users,
    Plus,
    Search,
    UserCog,
    Trash2,
    Phone,
    Mail,
    BadgeCheck,
    Briefcase
} from 'lucide-react';

export default function StaffPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form Verileri
    const [newStaff, setNewStaff] = useState({
        name: '',
        role: 'technician', // varsayılan: tekniker
        phone: '',
        email: ''
    });

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Personel Listesini Dinle
        const q = query(
            collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'staff'),
            orderBy('name')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            setStaff(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => unsub();
    }, []);

    // Personel Ekle
    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'staff'), {
            ...newStaff,
            status: 'active',
            createdAt: serverTimestamp()
        });

        setShowModal(false);
        setNewStaff({ name: '', role: 'technician', phone: '', email: '' });
    };

    // Personel Sil
    const handleDelete = async (id: string) => {
        if (confirm("Bu personeli silmek istediğinize emin misiniz?")) {
            const user = auth.currentUser;
            if (!user) return;
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'staff', id));
        }
    };

    // Rol İsimleri (Türkçe)
    const roleLabels: any = {
        technician: 'Tekniker / Usta',
        sales: 'Satış Görevlisi',
        accounting: 'Muhasebe',
        manager: 'Müdür'
    };

    // Rol Renkleri
    const roleColors: any = {
        technician: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        sales: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        accounting: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        manager: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Personel Yönetimi</h1>
                    <p className="text-slate-500 dark:text-slate-400">Çalışanlarınızı ekleyin ve yönetin.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    <Plus className="w-5 h-5" /> Personel Ekle
                </button>
            </div>

            {/* Personel Listesi */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center text-slate-500 py-10">Yükleniyor...</div>
                ) : staff.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Henüz personel eklenmedi.</p>
                    </div>
                ) : (
                    staff.map((s) => (
                        <div key={s.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xl font-bold text-slate-600 dark:text-slate-300">
                                        {s.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 dark:text-white">{s.name}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${roleColors[s.role] || 'bg-slate-100 text-slate-600'}`}>
                                            {roleLabels[s.role] || s.role}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(s.id)}
                                    className="text-slate-400 hover:text-red-500 transition-colors p-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                                    {s.phone || '-'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                                    {s.email || '-'}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Yeni Personel Ekle</h2>

                        <form onSubmit={handleAddStaff} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ad Soyad</label>
                                <input
                                    required
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                    value={newStaff.name}
                                    onChange={e => setNewStaff({ ...newStaff, name: e.target.value })}
                                    placeholder="Örn: Ahmet Yılmaz"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Görevi / Rolü</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(roleLabels).map(([key, label]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => setNewStaff({ ...newStaff, role: key })}
                                            className={`p-2 text-xs font-bold rounded-lg border transition-all ${newStaff.role === key
                                                    ? 'bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700'
                                                }`}
                                        >
                                            {label as string}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                                    <input
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                        value={newStaff.phone}
                                        onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })}
                                        placeholder="05..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-Posta</label>
                                    <input
                                        type="email"
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                        value={newStaff.email}
                                        onChange={e => setNewStaff({ ...newStaff, email: e.target.value })}
                                        placeholder="@mail.com"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}