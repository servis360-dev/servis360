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
    orderBy,
    getDoc
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Package,
    Plus,
    Minus,
    Search,
    AlertTriangle,
    Trash2,
    Save,
    X,
    Tag,
    Scissors,
    Car,
    Briefcase
} from 'lucide-react';

export default function StockPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [user, setUser] = useState<any>(null);

    // Dinamik Sektör Ayarları (Varsayılan: Teknik Servis)
    const [sectorConfig, setSectorConfig] = useState({
        title: 'Stok & Yedek Parça',
        description: 'Yedek parça ve ürün envanterini yönetin.',
        itemName: 'Parça Adı',
        addButton: 'Parça Ekle',
        icon: Package
    });

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
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // 1. Sektör Bilgisini Çek ve Ayarları Yap
                try {
                    const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                    const profileSnap = await getDoc(profileRef);

                    if (profileSnap.exists()) {
                        const sector = profileSnap.data().sectorType || 'technical_service';
                        determineSectorConfig(sector);
                    }
                } catch (error) {
                    console.error("Profil hatası:", error);
                }

                // 2. Stokları Dinle
                const q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'inventory'),
                    orderBy('name')
                );

                const unsubInventory = onSnapshot(q, (snapshot) => {
                    setProducts(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                    setLoading(false);
                });
                return () => unsubInventory();
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const determineSectorConfig = (sector: string) => {
        switch (sector) {
            case 'beauty_health':
                setSectorConfig({
                    title: 'Hizmet & Ürün Menüsü',
                    description: 'Salon hizmetlerinizi ve satılan ürünleri tanımlayın.',
                    itemName: 'Hizmet / Ürün Adı',
                    addButton: 'Hizmet Ekle',
                    icon: Scissors
                });
                break;
            case 'retail_wholesale':
                setSectorConfig({
                    title: 'Ürün Yönetimi',
                    description: 'Raflarınızdaki ürünleri ve stok durumunu takip edin.',
                    itemName: 'Ürün Adı',
                    addButton: 'Ürün Ekle',
                    icon: Tag
                });
                break;
            case 'auto_rental':
                setSectorConfig({
                    title: 'Parça & Araç Envanteri',
                    description: 'Yedek parçaları ve eldeki araçları listeleyin.',
                    itemName: 'Parça / Araç',
                    addButton: 'Kayıt Ekle',
                    icon: Car
                });
                break;
            case 'other':
                setSectorConfig({
                    title: 'Envanter Yönetimi',
                    description: 'İşletmenize ait tüm varlıkları takip edin.',
                    itemName: 'Varlık Adı',
                    addButton: 'Ekle',
                    icon: Briefcase
                });
                break;
            default: // technical_service
                setSectorConfig({
                    title: 'Stok & Yedek Parça',
                    description: 'Tamirde kullanılan parçaları ve cihazları yönetin.',
                    itemName: 'Parça Adı',
                    addButton: 'Parça Ekle',
                    icon: Package
                });
                break;
        }
    };

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
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

    const updateQuantity = async (id: string, currentQty: number, change: number) => {
        if (!user) return;
        const newQty = currentQty + change;
        if (newQty < 0) return;

        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'inventory', id), {
            quantity: newQty
        });
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bu kaydı silmek istiyor musunuz?')) {
            if (!user) return;
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'inventory', id));
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const Icon = sectorConfig.icon;

    return (
        <div className="space-y-6 pb-20">
            {/* Başlık ve Buton */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Icon className="w-8 h-8 text-blue-600" /> {sectorConfig.title}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">{sectorConfig.description}</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    <Plus className="w-5 h-5" /> {sectorConfig.addButton}
                </button>
            </div>

            {/* Arama Kutusu */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder={`${sectorConfig.itemName} veya kategori ara...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                />
            </div>

            {/* Ürün Listesi */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-10 text-slate-500">Yükleniyor...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Kayıt Yok</h3>
                        <p className="text-slate-500 text-sm">Listeniz şu an boş görünüyor.</p>
                    </div>
                ) : (
                    filteredProducts.map(p => (
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
                                <div className={`p-3 rounded-lg ${p.quantity <= p.criticalLevel ? 'bg-red-50 dark:bg-red-900/20 text-red-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                    <Icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">{p.name}</h3>
                                    <p className="text-sm text-slate-500 mt-1">{p.category || 'Genel'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm">
                                <div>
                                    <span className="block text-slate-400 text-xs mb-0.5">Alış</span>
                                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{p.buyPrice} ₺</span>
                                </div>
                                <div>
                                    <span className="block text-slate-400 text-xs mb-0.5">Satış</span>
                                    <span className="font-mono font-bold text-green-600 dark:text-green-400">{p.sellPrice} ₺</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                                {/* Stok Sayacı */}
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
                                    <button
                                        onClick={() => updateQuantity(p.id, p.quantity, -1)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 rounded-md transition-all shadow-sm text-slate-600 dark:text-slate-300"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="font-bold w-10 text-center text-slate-900 dark:text-white">{p.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(p.id, p.quantity, 1)}
                                        className="w-8 h-8 flex items-center justify-center hover:bg-white dark:hover:bg-slate-800 rounded-md transition-all shadow-sm text-slate-600 dark:text-slate-300"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                <button
                                    onClick={() => handleDelete(p.id)}
                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors p-2"
                                    title="Sil"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Yeni Ekleme Modalı */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" /> {sectorConfig.addButton}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddProduct} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{sectorConfig.itemName}</label>
                                <input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all"
                                    value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder={`Örn: ${sectorConfig.itemName}...`} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kategori / Grup</label>
                                <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all"
                                    value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })} placeholder="Örn: Genel" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Alış Fiyatı (₺)</label>
                                    <input type="number" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all"
                                        value={newItem.buyPrice} onChange={e => setNewItem({ ...newItem, buyPrice: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Satış Fiyatı (₺)</label>
                                    <input type="number" required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all"
                                        value={newItem.sellPrice} onChange={e => setNewItem({ ...newItem, sellPrice: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mevcut Adet</label>
                                    <input type="number" required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all"
                                        value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Kritik Sınır</label>
                                    <input type="number" required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all"
                                        value={newItem.criticalLevel} onChange={e => setNewItem({ ...newItem, criticalLevel: e.target.value })} />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 mt-4 shadow-lg shadow-blue-500/30">
                                <Save className="w-5 h-5" /> Kaydet
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}