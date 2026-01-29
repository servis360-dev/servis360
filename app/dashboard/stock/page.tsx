'use client';

import { useEffect, useState } from 'react';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import {
    Package,
    Plus,
    Minus,
    Search,
    AlertTriangle,
    Trash2,
    TrendingUp,
    Save,
    X
} from 'lucide-react';

export default function StockPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);

    // Yeni Ürün Formu
    const [newItem, setNewItem] = useState({
        name: '',
        category: '',
        buyPrice: '',
        sellPrice: '',
        quantity: '',
        criticalLevel: '5'
    });

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // Stokları Dinle
        const q = query(
            collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'inventory'),
            orderBy('name')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => unsub();
    }, []);

    // Yeni Ürün Ekle
    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'inventory'), {
            name: newItem.name,
            category: newItem.category,
            buyPrice: parseFloat(newItem.buyPrice) || 0,
            sellPrice: parseFloat(newItem.sellPrice) || 0,
            quantity: parseInt(newItem.quantity) || 0,
            criticalLevel: parseInt(newItem.criticalLevel) || 5,
            createdAt: serverTimestamp()
        });

        setShowModal(false);
        setNewItem({ name: '', category: '', buyPrice: '', sellPrice: '', quantity: '', criticalLevel: '5' });
    };

    // Stok Miktarını Güncelle (+ / -)
    const updateQuantity = async (id: string, currentQty: number, change: number) => {
        const user = auth.currentUser;
        if (!user) return;

        const newQty = currentQty + change;
        if (newQty < 0) return; // Eksiye düşmesin

        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'inventory', id), {
            quantity: newQty
        });
    };

    // Ürün Sil
    const handleDelete = async (id: string) => {
        if (confirm('Bu ürünü stoktan silmek istiyor musunuz?')) {
            const user = auth.currentUser;
            if (!user) return;
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'inventory', id));
        }
    };

    // Arama
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Başlık ve Buton */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Stok Takibi</h1>
                    <p className="text-slate-500 dark:text-slate-400">Yedek parça ve ürün envanterini yönetin.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    <Plus className="w-5 h-5" /> Ürün Ekle
                </button>
            </div>

            {/* Arama Kutusu */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="Ürün adı veya kategori ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
            </div>

            {/* Ürün Listesi (Kart Görünümü) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? <p className="text-slate-500">Yükleniyor...</p> : filteredProducts.map(p => (
                    <div
                        key={p.id}
                        className={`bg-white dark:bg-slate-800 p-5 rounded-xl border transition-all hover:shadow-md relative group ${p.quantity <= p.criticalLevel
                                ? 'border-red-500 shadow-red-500/10'
                                : 'border-slate-200 dark:border-slate-700'
                            }`}
                    >
                        {/* Kritik Stok Uyarısı */}
                        {p.quantity <= p.criticalLevel && (
                            <div className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-full animate-pulse">
                                <AlertTriangle className="w-3 h-3" /> Kritik
                            </div>
                        )}

                        <div className="flex items-start gap-4 mb-4">
                            <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                <Package className="w-6 h-6 text-slate-600 dark:text-slate-300" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-lg">{p.name}</h3>
                                <p className="text-sm text-slate-500">{p.category || 'Genel'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm">
                            <div>
                                <span className="block text-slate-400 text-xs">Alış Fiyatı</span>
                                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{p.buyPrice} ₺</span>
                            </div>
                            <div>
                                <span className="block text-slate-400 text-xs">Satış Fiyatı</span>
                                <span className="font-mono font-bold text-green-600 dark:text-green-400">{p.sellPrice} ₺</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                            {/* Stok Sayacı */}
                            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                                <button
                                    onClick={() => updateQuantity(p.id, p.quantity, -1)}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-600 dark:text-slate-300"
                                >
                                    <Minus className="w-4 h-4" />
                                </button>
                                <span className="font-bold w-8 text-center text-slate-900 dark:text-white">{p.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(p.id, p.quantity, 1)}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors text-slate-600 dark:text-slate-300"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>

                            <button
                                onClick={() => handleDelete(p.id)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-2"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Yeni Ürün Modalı */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Yeni Ürün Ekle</h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ürün Adı</label>
                                <input required className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500"
                                    value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="Örn: iPhone 11 Batarya" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alış (₺)</label>
                                    <input type="number" required className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500"
                                        value={newItem.buyPrice} onChange={e => setNewItem({ ...newItem, buyPrice: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Satış (₺)</label>
                                    <input type="number" required className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500"
                                        value={newItem.sellPrice} onChange={e => setNewItem({ ...newItem, sellPrice: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Stok Adedi</label>
                                    <input type="number" required className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500"
                                        value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kritik Sınır</label>
                                    <input type="number" required className="w-full p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-blue-500"
                                        value={newItem.criticalLevel} onChange={e => setNewItem({ ...newItem, criticalLevel: e.target.value })} />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 mt-4">
                                <Save className="w-4 h-4" /> Kaydet
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}