'use client';

import { useEffect, useState } from 'react';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    updateDoc,
    doc,
    serverTimestamp,
    orderBy,
    getDoc
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Users,
    Plus,
    Search,
    Phone,
    ArrowUpRight,
    ArrowDownRight,
    MessageCircle,
    X,
    Save,
    Contact,
    BookUser
} from 'lucide-react';

export default function CustomersPage() {
    const [customers, setCustomers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState<any>(null);

    // Kullanıcı Tipi (Bireysel mi, Ticari mi?)
    const [accountType, setAccountType] = useState<string>('business');

    // Modallar için State
    const [showAddModal, setShowAddModal] = useState(false);
    const [transactionModal, setTransactionModal] = useState<{ open: boolean, customer: any | null, type: 'debt' | 'payment' }>({
        open: false,
        customer: null,
        type: 'debt'
    });

    // Form Verileri
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', note: '' });
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // 1. Hesap Türünü Öğren
                try {
                    const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                    const profileSnap = await getDoc(profileRef);
                    if (profileSnap.exists()) {
                        setAccountType(profileSnap.data().accountType || 'business');
                    }
                } catch (error) {
                    console.error("Profil yüklenemedi", error);
                }

                // 2. Müşterileri Dinle
                const q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'customers'),
                    orderBy('name')
                );

                const unsub = onSnapshot(q, (snapshot) => {
                    setCustomers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                    setLoading(false);
                });

                return () => unsub();
            }
        });
        return () => unsubscribe();
    }, []);

    // Müşteri Ekle
    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'customers'), {
            name: newCustomer.name,
            phone: newCustomer.phone,
            note: newCustomer.note,
            balance: 0, // Bireyselde 0 kalır, Ticaride değişir
            createdAt: serverTimestamp()
        });

        setShowAddModal(false);
        setNewCustomer({ name: '', phone: '', note: '' });
    };

    // Para İşlemi (Sadece Ticari Hesaplar İçin)
    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !transactionModal.customer || !amount) return;

        const val = parseFloat(amount);
        const currentBalance = transactionModal.customer.balance || 0;

        // 1. Bakiye Güncelle
        const newBalance = transactionModal.type === 'debt'
            ? currentBalance + val
            : currentBalance - val;

        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'customers', transactionModal.customer.id), {
            balance: newBalance
        });

        // 2. Geçmişe Ekle
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'customers', transactionModal.customer.id, 'history'), {
            type: transactionModal.type,
            amount: val,
            description: description || (transactionModal.type === 'debt' ? 'Veresiye / Borç' : 'Tahsilat'),
            date: new Date().toISOString(),
            createdAt: serverTimestamp()
        });

        // 3. Kasa Entegrasyonu (Sadece Tahsilat ise)
        if (transactionModal.type === 'payment') {
            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'finance'), {
                type: 'income',
                amount: val,
                category: 'Tahsilat',
                description: `${transactionModal.customer.name} - Cari Tahsilat`,
                date: new Date().toISOString().split('T')[0],
                createdAt: serverTimestamp()
            });
        }

        setTransactionModal({ open: false, customer: null, type: 'debt' });
        setAmount('');
        setDescription('');
    };

    // Akıllı WhatsApp Mesajı
    const sendWhatsapp = (phone: string, name: string, balance: number) => {
        let msg = '';

        if (accountType === 'individual') {
            // Bireysel Mesaj
            msg = `Merhaba ${name}, nasılsın?`;
        } else {
            // Ticari Mesaj (Borç varsa hatırlatır)
            if (balance > 0) {
                msg = `Sayın ${name}, işletmemize olan ${balance.toLocaleString()} TL bakiyeniz bulunmaktadır. Bilginize sunarız.`;
            } else {
                msg = `Sayın ${name}, iyi günler dileriz.`;
            }
        }

        // Numara temizleme
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {accountType === 'individual' ? <Contact className="w-8 h-8 text-purple-600" /> : <Users className="w-8 h-8 text-blue-600" />}
                        {accountType === 'individual' ? 'Kişiler & Rehber' : 'Müşteriler & Cari Hesap'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {accountType === 'individual' ? 'Telefon rehberiniz ve kişisel notlarınız.' : 'Borç/Alacak takibi ve müşteri yönetimi.'}
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    <Plus className="w-5 h-5" /> {accountType === 'individual' ? 'Kişi Ekle' : 'Müşteri Ekle'}
                </button>
            </div>

            {/* Arama */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="İsim veya telefon ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
            </div>

            {/* Liste */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? <p className="text-slate-500 text-center col-span-full">Yükleniyor...</p> : filteredCustomers.length === 0 ? (
                    <div className="col-span-full text-center py-10 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <BookUser className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500">Listeniz boş.</p>
                    </div>
                ) : filteredCustomers.map(c => (
                    <div key={c.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all relative group">

                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-lg">
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{c.name}</h3>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Phone className="w-3 h-3" /> {c.phone}
                                    </div>
                                </div>
                            </div>

                            {/* Bakiye Göstergesi (Sadece Ticari) */}
                            {accountType !== 'individual' && (
                                <div className="text-right">
                                    <p className="text-xs text-slate-400 mb-1">Bakiye</p>
                                    <p className={`text-lg font-bold ${c.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {c.balance?.toLocaleString()} ₺
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Not Alanı (Herkes görür) */}
                        {c.note && (
                            <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-2 rounded mb-4 italic line-clamp-2">
                                "{c.note}"
                            </p>
                        )}

                        {/* Aksiyon Butonları (Sadece Ticari) */}
                        {accountType !== 'individual' ? (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <button
                                    onClick={() => setTransactionModal({ open: true, customer: c, type: 'debt' })}
                                    className="flex items-center justify-center gap-2 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                >
                                    <ArrowDownRight className="w-4 h-4" /> Borç Ekle
                                </button>
                                <button
                                    onClick={() => setTransactionModal({ open: true, customer: c, type: 'payment' })}
                                    className="flex items-center justify-center gap-2 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                >
                                    <ArrowUpRight className="w-4 h-4" /> Tahsil Et
                                </button>
                            </div>
                        ) : (
                            // Bireysel İçin Sadece İletişim Butonları
                            <div className="grid grid-cols-1 gap-2 mt-2">
                                <button
                                    onClick={() => sendWhatsapp(c.phone, c.name, 0)}
                                    className="flex items-center justify-center gap-2 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                                >
                                    <MessageCircle className="w-4 h-4" /> WhatsApp Mesajı
                                </button>
                            </div>
                        )}

                        {/* Ticari için Ekstra WhatsApp Butonu (Hover'da Çıkan) */}
                        {accountType !== 'individual' && c.balance > 0 && (
                            <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                                <button
                                    onClick={() => sendWhatsapp(c.phone, c.name, c.balance)}
                                    className="p-1.5 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-lg"
                                    title="WhatsApp'tan Hatırlat"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Müşteri Ekle Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {accountType === 'individual' ? 'Yeni Kişi Ekle' : 'Yeni Müşteri Ekle'}
                            </h2>
                            <button onClick={() => setShowAddModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <form onSubmit={handleAddCustomer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ad Soyad</label>
                                <input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                                <input required type="tel" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Not (Opsiyonel)</label>
                                <textarea className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={newCustomer.note} onChange={e => setNewCustomer({ ...newCustomer, note: e.target.value })} />
                            </div>
                            <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">Kaydet</button>
                        </form>
                    </div>
                </div>
            )}

            {/* İşlem Modalı (Sadece Ticari) */}
            {transactionModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className={`text-xl font-bold ${transactionModal.type === 'debt' ? 'text-red-600' : 'text-green-600'}`}>
                                {transactionModal.type === 'debt' ? 'Borç Ekle' : 'Tahsilat Al'}
                            </h2>
                            <button onClick={() => setTransactionModal({ ...transactionModal, open: false })}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg mb-4 text-center">
                            <p className="text-sm text-slate-500">Müşteri</p>
                            <p className="font-bold text-slate-900 dark:text-white text-lg">{transactionModal.customer?.name}</p>
                            <p className="text-xs text-slate-400">Mevcut Bakiye: {transactionModal.customer?.balance} ₺</p>
                        </div>

                        <form onSubmit={handleTransaction} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tutar (TL)</label>
                                <input
                                    type="number"
                                    required
                                    autoFocus
                                    className="w-full p-4 text-center text-2xl font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Açıklama (Opsiyonel)</label>
                                <input
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                    placeholder={transactionModal.type === 'debt' ? 'Örn: Veresiye ürün satışı' : 'Örn: Nakit ödeme'}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                            <button className={`w-full py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 ${transactionModal.type === 'debt' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                                <Save className="w-5 h-5" /> İşlemi Onayla
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}