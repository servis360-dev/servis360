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
    Store,
    Plus,
    MapPin,
    Phone,
    Trash2,
    User,
    Building2
} from 'lucide-react';

export default function BranchesPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form Verileri
    const [newBranch, setNewBranch] = useState({
        name: '',
        address: '',
        phone: '',
        manager: ''
    });

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Şubeleri Dinle
        const q = query(
            collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches'),
            orderBy('name')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            setBranches(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const handleAddBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches'), {
            ...newBranch,
            createdAt: serverTimestamp()
        });

        setShowModal(false);
        setNewBranch({ name: '', address: '', phone: '', manager: '' });
    };

    const handleDelete = async (id: string) => {
        if (confirm("Bu şubeyi silmek istediğinize emin misiniz?")) {
            const user = auth.currentUser;
            if (!user) return;
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'branches', id));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Şube Yönetimi</h1>
                    <p className="text-slate-500 dark:text-slate-400">İşletmenizin farklı lokasyonlarını yönetin.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    <Plus className="w-5 h-5" /> Yeni Şube Ekle
                </button>
            </div>

            {/* Şube Listesi */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center text-slate-500 py-10">Yükleniyor...</div>
                ) : branches.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
                        <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Henüz şube eklenmedi. Merkez şubenizi ekleyerek başlayın.</p>
                    </div>
                ) : (
                    branches.map((branch) => (
                        <div key={branch.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-all group">
                            <div className="h-2 bg-blue-600 w-full"></div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <Building2 className="w-6 h-6" />
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{branch.name}</h3>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(branch.id)}
                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-4 h-4 mt-0.5 text-slate-400" />
                                        <span>{branch.address || 'Adres girilmedi'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="w-4 h-4 text-slate-400" />
                                        <span>{branch.phone || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-700 mt-3">
                                        <User className="w-4 h-4 text-slate-400" />
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {branch.manager ? `Sorumlu: ${branch.manager}` : 'Sorumlu Atanmadı'}
                                        </span>
                                    </div>
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
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Yeni Şube Ekle</h2>

                        <form onSubmit={handleAddBranch} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Şube Adı</label>
                                <input
                                    required
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                    value={newBranch.name}
                                    onChange={e => setNewBranch({ ...newBranch, name: e.target.value })}
                                    placeholder="Örn: Kadıköy Merkez"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Adres</label>
                                <textarea
                                    rows={2}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                    value={newBranch.address}
                                    onChange={e => setNewBranch({ ...newBranch, address: e.target.value })}
                                    placeholder="Mahalle, Cadde, No..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                                    <input
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                        value={newBranch.phone}
                                        onChange={e => setNewBranch({ ...newBranch, phone: e.target.value })}
                                        placeholder="0212..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Şube Sorumlusu</label>
                                    <input
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                        value={newBranch.manager}
                                        onChange={e => setNewBranch({ ...newBranch, manager: e.target.value })}
                                        placeholder="Ad Soyad"
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