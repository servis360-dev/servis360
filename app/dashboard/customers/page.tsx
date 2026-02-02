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
    getDoc,
    where
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
    BookUser,
    UserCog,
    Briefcase,
    Trash2,
    Store
} from 'lucide-react';
// 🔥 ŞUBE BAĞLANTISI
import { useBranch } from '../../../components/providers/branch-context';

export default function CustomersPage() {
    const [allContacts, setAllContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState<any>(null);
    const [targetUid, setTargetUid] = useState<string | null>(null);

    // 🔥 Context'ten Şube Bilgisi
    const { selectedBranch, branches } = useBranch();

    // Görünüm Modu: 'customer' (Müşteriler) veya 'personnel' (Personel)
    const [viewMode, setViewMode] = useState<'customer' | 'personnel'>('customer');

    // Kullanıcı Tipi
    const [accountType, setAccountType] = useState<string>('business');

    // Modallar
    const [showAddModal, setShowAddModal] = useState(false);
    const [transactionModal, setTransactionModal] = useState<{ open: boolean, contact: any | null, type: 'debt' | 'payment' }>({
        open: false,
        contact: null,
        type: 'debt'
    });

    // Form Verileri
    const [newContact, setNewContact] = useState({
        name: '',
        phone: '',
        note: '',
        type: 'customer',
        branchId: '' // 🔥 Kayıtlı Olduğu Şube
    });
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        let unsubSnapshot: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                try {
                    // 1. Profil ve Hedef ID Belirleme
                    const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                    const profileSnap = await getDoc(profileRef);

                    let ownerId = currentUser.uid;
                    let accType = 'business';

                    if (profileSnap.exists()) {
                        const data = profileSnap.data();
                        accType = data.accountType || 'business';

                        if (data.ownerId && data.ownerId !== currentUser.uid) {
                            ownerId = data.ownerId;
                        }
                    }

                    setTargetUid(ownerId);
                    setAccountType(accType);

                    // 2. Müşterileri Dinle (Şube Filtresi ile)
                    let q = query(
                        collection(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'customers'),
                        orderBy('name')
                    );

                    // 🔥 EĞER ŞUBE SEÇİLİYSE FİLTRELE
                    if (selectedBranch) {
                        q = query(
                            collection(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'customers'),
                            where('branchId', '==', selectedBranch),
                            orderBy('name')
                        );
                    }

                    unsubSnapshot = onSnapshot(q, (snapshot) => {
                        const data = snapshot.docs.map(d => ({
                            id: d.id,
                            type: 'customer',
                            ...d.data()
                        }));
                        setAllContacts(data);
                        setLoading(false);
                    });

                } catch (error) {
                    console.error("Veri çekme hatası", error);
                    setLoading(false);
                }
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubSnapshot) unsubSnapshot();
        };
    }, [selectedBranch]); // 🔥 Şube değişince yeniden çalış

    // Kayıt Silme
    const handleDelete = async (id: string, name: string) => {
        if (!targetUid) return;
        if (confirm(`${name} isimli kaydı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
            try {
                await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'customers', id));
            } catch (error) {
                console.error("Silme hatası:", error);
                alert("Silme işlemi başarısız oldu.");
            }
        }
    };

    // Yeni Müşteri/Personel Ekleme
    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !targetUid) return;

        // Şube Belirleme
        let finalBranchId = newContact.branchId || selectedBranch;

        // Eğer şubeler var ama seçim yapılmadıysa varsayılan (Merkez)
        if (branches.length > 0 && !finalBranchId) {
            finalBranchId = branches.find(b => b.isHeadquarters)?.id || branches[0]?.id;
        }

        const branchName = branches.find(b => b.id === finalBranchId)?.name || 'Merkez';
        const contactType = newContact.type || viewMode;

        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'customers'), {
            name: newContact.name,
            phone: newContact.phone,
            note: newContact.note,
            type: contactType,
            balance: 0,
            branchId: finalBranchId, // 🔥 Şube ID
            branchName: branchName, // 🔥 Şube Adı
            createdBy: user.uid,
            createdAt: serverTimestamp()
        });

        setShowAddModal(false);
        setNewContact({ name: '', phone: '', note: '', type: 'customer', branchId: '' });
    };

    // Cari İşlem (Borç/Alacak)
    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !targetUid || !transactionModal.contact || !amount) return;

        const val = parseFloat(amount);
        const currentBalance = transactionModal.contact.balance || 0;
        const isPersonnel = transactionModal.contact.type === 'personnel';

        const newBalance = transactionModal.type === 'debt'
            ? currentBalance + val
            : currentBalance - val;

        // 1. Müşteri Bakiyesini Güncelle
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'customers', transactionModal.contact.id), {
            balance: newBalance
        });

        let historyDesc = description;
        if (!description) {
            if (isPersonnel) {
                historyDesc = transactionModal.type === 'debt' ? 'Avans Verildi' : 'Maaş/Ödeme Yapıldı';
            } else {
                historyDesc = transactionModal.type === 'debt' ? 'Borç Eklendi' : 'Tahsilat Alındı';
            }
        }

        // 2. Geçmişe Ekle (Log)
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'customers', transactionModal.contact.id, 'history'), {
            type: transactionModal.type,
            amount: val,
            description: historyDesc,
            processedBy: user.uid,
            date: new Date().toISOString(),
            createdAt: serverTimestamp()
        });

        // 3. Finans Kasasına İşle (Müşterinin Şubesine)
        // Eğer müşteri bir şubeye bağlıysa, o şubenin kasasına işlenir.
        // Bağlı değilse (eski kayıt), o an seçili şubeye veya merkeze işlenir.
        const targetBranchId = transactionModal.contact.branchId || selectedBranch || (branches.find(b => b.isHeadquarters)?.id);
        const targetBranchName = branches.find(b => b.id === targetBranchId)?.name || 'Merkez';

        if (isPersonnel) {
            const expenseType = transactionModal.type === 'debt' ? 'Personel Avans' : 'Personel Maaş/Ödeme';

            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'finance'), {
                type: 'expense',
                amount: val,
                category: 'Personel',
                description: `${transactionModal.contact.name} - ${description || expenseType}`,
                date: new Date().toISOString().split('T')[0],
                branchId: targetBranchId, // 🔥 Şubeye İşle
                branchName: targetBranchName,
                processedBy: user.uid,
                createdAt: serverTimestamp()
            });

        } else {
            if (transactionModal.type === 'payment') {
                await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'finance'), {
                    type: 'income',
                    amount: val,
                    category: 'Tahsilat',
                    description: `${transactionModal.contact.name} - Cari Tahsilat`,
                    date: new Date().toISOString().split('T')[0],
                    branchId: targetBranchId, // 🔥 Şubeye İşle
                    branchName: targetBranchName,
                    processedBy: user.uid,
                    createdAt: serverTimestamp()
                });
            }
        }

        setTransactionModal({ open: false, contact: null, type: 'debt' });
        setAmount('');
        setDescription('');
    };

    const sendWhatsapp = (phone: string, name: string, balance: number, type: string) => {
        let msg = '';
        if (type === 'personnel') {
            msg = `Merhaba ${name},`;
        } else if (accountType === 'individual') {
            msg = `Merhaba ${name}, nasılsın?`;
        } else {
            if (balance > 0) {
                msg = `Sayın ${name}, işletmemize olan ${balance.toLocaleString()} TL bakiyeniz bulunmaktadır.`;
            } else {
                msg = `Sayın ${name}, iyi günler dileriz.`;
            }
        }
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    const filteredContacts = allContacts.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
        const matchesType = (c.type || 'customer') === viewMode;
        return matchesSearch && matchesType;
    });

    const openAddModal = () => {
        setNewContact({ ...newContact, type: viewMode, branchId: selectedBranch || '' });
        setShowAddModal(true);
    }

    return (
        <div className="space-y-6 pb-20">
            {/* ÜST BAŞLIK VE TABLAR */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {viewMode === 'personnel' ? <UserCog className="w-8 h-8 text-orange-600" /> : <Users className="w-8 h-8 text-blue-600" />}
                        {viewMode === 'personnel' ? 'Personel Listesi' : 'Müşteriler & Cari'}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {selectedBranch
                            ? `${branches.find(b => b.id === selectedBranch)?.name} şubesine kayıtlı kişiler listeleniyor.`
                            : 'Tüm şubelerdeki kişiler listeleniyor.'}
                    </p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                        onClick={() => setViewMode('customer')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'customer' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Müşteriler
                    </button>
                    <button
                        onClick={() => setViewMode('personnel')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'personnel' ? 'bg-white dark:bg-slate-700 shadow text-orange-600 dark:text-orange-400' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Personel
                    </button>
                </div>

                <button
                    onClick={openAddModal}
                    className={`flex items-center gap-2 px-4 py-2 text-white rounded-xl font-bold transition-colors shadow-lg ${viewMode === 'personnel' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}
                >
                    <Plus className="w-5 h-5" /> {viewMode === 'personnel' ? 'Personel Ekle' : 'Müşteri Ekle'}
                </button>
            </div>

            {/* Arama */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder={`${viewMode === 'personnel' ? 'Personel' : 'Müşteri'} ara...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
            </div>

            {/* Liste */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? <p className="text-slate-500 text-center col-span-full">Yükleniyor...</p> : filteredContacts.length === 0 ? (
                    <div className="col-span-full text-center py-10 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <BookUser className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500">{viewMode === 'personnel' ? 'Henüz personel eklemediniz.' : 'Müşteri listeniz boş.'}</p>
                    </div>
                ) : filteredContacts.map(c => (
                    <div key={c.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all relative group">

                        {/* SİLME BUTONU (Sağ Üst) */}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name); }}
                            className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors z-10"
                            title="Sil"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Şube Badge */}
                        {branches.length > 0 && (
                            <div className="absolute top-3 right-12 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                                <Store className="w-3 h-3" /> {c.branchName || 'Merkez'}
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-4 mt-2">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${c.type === 'personnel' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                    {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{c.name}</h3>
                                    <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Phone className="w-3 h-3" /> {c.phone}
                                    </div>
                                </div>
                            </div>

                            {/* Bakiye Göstergesi */}
                            {accountType !== 'individual' && (
                                <div className="text-right pt-6 pr-1">
                                    <p className="text-xs text-slate-400 mb-1">
                                        {c.type === 'personnel' ? 'Avans/Bakiye' : 'Bakiye'}
                                    </p>
                                    <p className={`text-lg font-bold ${c.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                        {c.balance?.toLocaleString()} ₺
                                    </p>
                                </div>
                            )}
                        </div>

                        {c.note && (
                            <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-2 rounded mb-4 italic line-clamp-2">
                                "{c.note}"
                            </p>
                        )}

                        {accountType !== 'individual' ? (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <button
                                    onClick={() => setTransactionModal({ open: true, contact: c, type: 'debt' })}
                                    className="flex items-center justify-center gap-2 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                                >
                                    <ArrowDownRight className="w-4 h-4" />
                                    {c.type === 'personnel' ? 'Avans Ver' : 'Borç Ekle'}
                                </button>
                                <button
                                    onClick={() => setTransactionModal({ open: true, contact: c, type: 'payment' })}
                                    className="flex items-center justify-center gap-2 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                                >
                                    <ArrowUpRight className="w-4 h-4" />
                                    {c.type === 'personnel' ? 'Ödeme/Maaş' : 'Tahsil Et'}
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 mt-2">
                                <button
                                    onClick={() => sendWhatsapp(c.phone, c.name, 0, c.type)}
                                    className="flex items-center justify-center gap-2 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                                >
                                    <MessageCircle className="w-4 h-4" /> WhatsApp Mesajı
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* EKLEME MODALI */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                Yeni Kayıt
                            </h2>
                            <button onClick={() => setShowAddModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <form onSubmit={handleAddContact} className="space-y-4">

                            {/* 🔥 ŞUBE SEÇİMİ (Eğer "Tüm Şubeler" modundaysak) */}
                            {branches.length > 0 && !selectedBranch && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <label className="block text-xs font-bold mb-1 text-blue-700 dark:text-blue-300 uppercase">Şube Seçimi</label>
                                    <div className="relative">
                                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            className="w-full pl-9 p-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg outline-none text-sm appearance-none"
                                            value={newContact.branchId}
                                            onChange={e => setNewContact({ ...newContact, branchId: e.target.value })}
                                        >
                                            <option value="">Merkez (Varsayılan)</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={() => setNewContact({ ...newContact, type: 'customer' })}
                                    className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${newContact.type === 'customer' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-500'}`}
                                >
                                    <Users className="w-4 h-4" /> Müşteri
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setNewContact({ ...newContact, type: 'personnel' })}
                                    className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${newContact.type === 'personnel' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-500'}`}
                                >
                                    <UserCog className="w-4 h-4" /> Personel
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ad Soyad</label>
                                <input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Telefon</label>
                                <input required type="tel" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Not</label>
                                <textarea className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={newContact.note} onChange={e => setNewContact({ ...newContact, note: e.target.value })} />
                            </div>
                            <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">Kaydet</button>
                        </form>
                    </div>
                </div>
            )}

            {/* İŞLEM MODALI */}
            {transactionModal.open && transactionModal.contact && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className={`text-xl font-bold ${transactionModal.type === 'debt' ? 'text-red-600' : 'text-green-600'}`}>
                                {transactionModal.contact.type === 'personnel'
                                    ? (transactionModal.type === 'debt' ? 'Avans Ver' : 'Ödeme Yap')
                                    : (transactionModal.type === 'debt' ? 'Borç Ekle' : 'Tahsilat Al')}
                            </h2>
                            <button onClick={() => setTransactionModal({ ...transactionModal, open: false })}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg mb-4 text-center">
                            <p className="text-sm text-slate-500">{transactionModal.contact.type === 'personnel' ? 'Personel' : 'Müşteri'}</p>
                            <p className="font-bold text-slate-900 dark:text-white text-lg">{transactionModal.contact.name}</p>
                            <p className="text-xs text-slate-400">Güncel Bakiye: {transactionModal.contact.balance} ₺</p>
                            <div className="text-[10px] text-slate-400 mt-1 flex justify-center items-center gap-1">
                                <Store className="w-3 h-3" /> {transactionModal.contact.branchName || 'Merkez'}
                            </div>
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
                                    placeholder={
                                        transactionModal.contact.type === 'personnel'
                                            ? (transactionModal.type === 'debt' ? 'Örn: Maaş Avansı' : 'Örn: Haftalık Ödeme')
                                            : (transactionModal.type === 'debt' ? 'Örn: Veresiye ürün' : 'Örn: Nakit tahsilat')
                                    }
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