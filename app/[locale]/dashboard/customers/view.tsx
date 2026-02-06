'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatMoney, getCurrencySettings } from '../../../../lib/format';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    getDoc,
    where
} from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
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
    UserCog,
    BookUser,
    Trash2,
    Store,
    Loader2 // Loader ikonu eklendi
} from 'lucide-react';
import { useBranch } from '../../../../components/providers/branch-context';

export default function CustomersView({ dict }: { dict: any }) {
    const [allContacts, setAllContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState<any>(null);
    const [targetUid, setTargetUid] = useState<string | null>(null);

    // Para birimi ayarları
    const params = useParams();
    const currentLocale = params?.locale as string || 'en';
    const currency = getCurrencySettings(currentLocale);

    const { selectedBranch, branches } = useBranch();
    const [viewMode, setViewMode] = useState<'customer' | 'personnel'>('customer');
    const [accountType, setAccountType] = useState<string>('business');

    const [showAddModal, setShowAddModal] = useState(false);
    const [transactionModal, setTransactionModal] = useState<{ open: boolean, contact: any | null, type: 'debt' | 'payment' }>({
        open: false,
        contact: null,
        type: 'debt'
    });

    const [newContact, setNewContact] = useState({
        name: '', phone: '', note: '', type: 'customer', branchId: ''
    });
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        let unsubSnapshot: () => void;
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setLoading(true); // Yükleniyor başlat
                try {
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

                    // 🔥 KRİTİK DÜZELTME: orderBy('name') kaldırıldı.
                    // Firebase'de 'where' ve 'orderBy' aynı anda kullanılırsa Composite Index gerekir.
                    // Sıralamayı aşağıda JavaScript ile yapacağız.

                    let q;
                    const customersRef = collection(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'customers');

                    if (selectedBranch) {
                        q = query(customersRef, where('branchId', '==', selectedBranch));
                    } else {
                        q = query(customersRef);
                    }

                    unsubSnapshot = onSnapshot(q, (snapshot) => {
                        const data = snapshot.docs.map(d => ({
                            id: d.id,
                            type: 'customer',
                            ...d.data()
                        }));

                        // ⚡ Client-Side Sıralama (Alfabetik)
                        data.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

                        setAllContacts(data);
                        setLoading(false);
                    }, (error) => {
                        console.error("Müşteri verisi hatası:", error);
                        setLoading(false); // Hata olsa bile yükleniyor'u kapat
                    });
                } catch (error) {
                    console.error("Veri çekme hatası", error);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        });
        return () => {
            unsubscribeAuth();
            if (unsubSnapshot) unsubSnapshot();
        };
    }, [selectedBranch]);

    const handleDelete = async (id: string, name: string) => {
        if (!targetUid) return;
        if (confirm(dict.customers.confirm_delete.replace('{name}', name))) {
            try {
                await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'customers', id));
            } catch (error) {
                console.error("Silme hatası:", error);
                alert(dict.common.error);
            }
        }
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !targetUid) return;

        let finalBranchId = newContact.branchId || selectedBranch;
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
            branchId: finalBranchId,
            branchName: branchName,
            createdBy: user.uid,
            createdAt: serverTimestamp()
        });

        setShowAddModal(false);
        setNewContact({ name: '', phone: '', note: '', type: 'customer', branchId: '' });
    };

    const handleTransaction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !targetUid || !transactionModal.contact || !amount) return;

        const val = parseFloat(amount);
        const currentBalance = transactionModal.contact.balance || 0;
        const isPersonnel = transactionModal.contact.type === 'personnel';
        const newBalance = transactionModal.type === 'debt' ? currentBalance + val : currentBalance - val;

        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'customers', transactionModal.contact.id), {
            balance: newBalance
        });

        let historyDesc = description;
        if (!description) {
            if (isPersonnel) {
                historyDesc = transactionModal.type === 'debt' ? dict.customers.modal_trans_title_debt_personnel : dict.customers.modal_trans_title_payment_personnel;
            } else {
                historyDesc = transactionModal.type === 'debt' ? dict.customers.modal_trans_title_debt_customer : dict.customers.modal_trans_title_payment_customer;
            }
        }

        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'customers', transactionModal.contact.id, 'history'), {
            type: transactionModal.type,
            amount: val,
            description: historyDesc,
            processedBy: user.uid,
            date: new Date().toISOString(),
            createdAt: serverTimestamp()
        });

        const targetBranchId = transactionModal.contact.branchId || selectedBranch || (branches.find(b => b.isHeadquarters)?.id);
        const targetBranchName = branches.find(b => b.id === targetBranchId)?.name || 'Merkez';

        if (isPersonnel) {
            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'finance'), {
                type: 'expense',
                amount: val,
                category: 'Personel',
                description: `${transactionModal.contact.name} - ${description || historyDesc}`,
                date: new Date().toISOString().split('T')[0],
                branchId: targetBranchId,
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
                    branchId: targetBranchId,
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
            if (balance > 0) msg = `Sayın ${name}, işletmemize olan ${formatMoney(balance, currentLocale)} bakiyeniz bulunmaktadır.`;
            else msg = `Sayın ${name}, iyi günler dileriz.`;
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

    const getBranchName = () => {
        if (!selectedBranch) return null;
        return branches.find(b => b.id === selectedBranch)?.name;
    }

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {viewMode === 'personnel' ? <UserCog className="w-8 h-8 text-orange-600" /> : <Users className="w-8 h-8 text-blue-600" />}
                        {viewMode === 'personnel' ? dict.customers.title_personnel : dict.customers.title_customers}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {selectedBranch
                            ? dict.customers.subtitle_branch.replace('{branchName}', getBranchName())
                            : dict.customers.subtitle_all}
                    </p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button onClick={() => setViewMode('customer')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'customer' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}>{dict.customers.tab_customers}</button>
                    <button onClick={() => setViewMode('personnel')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'personnel' ? 'bg-white dark:bg-slate-700 shadow text-orange-600 dark:text-orange-400' : 'text-slate-500 hover:text-slate-700'}`}>{dict.customers.tab_personnel}</button>
                </div>

                <button onClick={openAddModal} className={`flex items-center gap-2 px-4 py-2 text-white rounded-xl font-bold transition-colors shadow-lg ${viewMode === 'personnel' ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/30' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'}`}>
                    <Plus className="w-5 h-5" /> {viewMode === 'personnel' ? dict.customers.btn_add_personnel : dict.customers.btn_add_customer}
                </button>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="text" placeholder={viewMode === 'personnel' ? dict.customers.search_placeholder_personnel : dict.customers.search_placeholder_customer} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                        <p>{dict.common.loading}</p>
                    </div>
                ) : filteredContacts.length === 0 ? (
                    <div className="col-span-full text-center py-10 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <BookUser className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500">{viewMode === 'personnel' ? dict.customers.empty_personnel : dict.customers.empty_customers}</p>
                    </div>
                ) : filteredContacts.map(c => (
                    <div key={c.id} className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all relative group">
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name); }} className="absolute top-3 right-3 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors z-10" title={dict.common.delete}><Trash2 className="w-4 h-4" /></button>
                        {branches.length > 0 && !selectedBranch && (
                            <div className="absolute top-3 right-12 text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded flex items-center gap-1"><Store className="w-3 h-3" /> {c.branchName || 'Merkez'}</div>
                        )}
                        <div className="flex justify-between items-start mb-4 mt-2">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${c.type === 'personnel' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{c.name.charAt(0).toUpperCase()}</div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white">{c.name}</h3>
                                    <div className="flex items-center gap-1 text-xs text-slate-500"><Phone className="w-3 h-3" /> {c.phone}</div>
                                </div>
                            </div>
                            {accountType !== 'individual' && (
                                <div className="text-right pt-6 pr-1">
                                    <p className="text-xs text-slate-400 mb-1">{c.type === 'personnel' ? dict.customers.balance_label_personnel : dict.customers.balance_label_customer}</p>
                                    <p className={`text-lg font-bold ${c.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>{formatMoney(c.balance, currentLocale)}</p>
                                </div>
                            )}
                        </div>
                        {c.note && <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-2 rounded mb-4 italic line-clamp-2">"{c.note}"</p>}
                        {accountType !== 'individual' ? (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <button onClick={() => setTransactionModal({ open: true, contact: c, type: 'debt' })} className="flex items-center justify-center gap-2 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                                    <ArrowDownRight className="w-4 h-4" /> {c.type === 'personnel' ? dict.customers.btn_debt_personnel : dict.customers.btn_debt_customer}
                                </button>
                                <button onClick={() => setTransactionModal({ open: true, contact: c, type: 'payment' })} className="flex items-center justify-center gap-2 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                                    <ArrowUpRight className="w-4 h-4" /> {c.type === 'personnel' ? dict.customers.btn_payment_personnel : dict.customers.btn_payment_customer}
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2 mt-2">
                                <button onClick={() => sendWhatsapp(c.phone, c.name, 0, c.type)} className="flex items-center justify-center gap-2 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
                                    <MessageCircle className="w-4 h-4" /> {dict.customers.btn_whatsapp}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{dict.customers.modal_add_title}</h2>
                            <button onClick={() => setShowAddModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <form onSubmit={handleAddContact} className="space-y-4">
                            {branches.length > 0 && !selectedBranch && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <label className="block text-xs font-bold mb-1 text-blue-700 dark:text-blue-300 uppercase">{dict.customers.label_branch_select}</label>
                                    <div className="relative">
                                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select className="w-full pl-9 p-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg outline-none text-sm appearance-none" value={newContact.branchId} onChange={e => setNewContact({ ...newContact, branchId: e.target.value })}>
                                            <option value="">{dict.customers.option_hq}</option>
                                            {branches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <button type="button" onClick={() => setNewContact({ ...newContact, type: 'customer' })} className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${newContact.type === 'customer' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-500'}`}><Users className="w-4 h-4" /> {dict.customers.tab_customers}</button>
                                <button type="button" onClick={() => setNewContact({ ...newContact, type: 'personnel' })} className={`p-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 ${newContact.type === 'personnel' ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-slate-200 text-slate-500'}`}><UserCog className="w-4 h-4" /> {dict.customers.tab_personnel}</button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{dict.customers.label_name}</label>
                                <input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{dict.customers.label_phone}</label>
                                <input required type="tel" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{dict.customers.label_note}</label>
                                <textarea className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={newContact.note} onChange={e => setNewContact({ ...newContact, note: e.target.value })} />
                            </div>
                            <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">{dict.customers.btn_save}</button>
                        </form>
                    </div>
                </div>
            )}

            {transactionModal.open && transactionModal.contact && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className={`text-xl font-bold ${transactionModal.type === 'debt' ? 'text-red-600' : 'text-green-600'}`}>
                                {transactionModal.contact.type === 'personnel'
                                    ? (transactionModal.type === 'debt' ? dict.customers.modal_trans_title_debt_personnel : dict.customers.modal_trans_title_payment_personnel)
                                    : (transactionModal.type === 'debt' ? dict.customers.modal_trans_title_debt_customer : dict.customers.modal_trans_title_payment_customer)}
                            </h2>
                            <button onClick={() => setTransactionModal({ ...transactionModal, open: false })}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg mb-4 text-center">
                            <p className="text-sm text-slate-500">{transactionModal.contact.type === 'personnel' ? dict.customers.tab_personnel : dict.customers.tab_customers}</p>
                            <p className="font-bold text-slate-900 dark:text-white text-lg">{transactionModal.contact.name}</p>
                            <p className="text-xs text-slate-400">Güncel Bakiye: {formatMoney(transactionModal.contact.balance, currentLocale)}</p>
                            <div className="text-[10px] text-slate-400 mt-1 flex justify-center items-center gap-1"><Store className="w-3 h-3" /> {transactionModal.contact.branchName || 'Merkez'}</div>
                        </div>
                        <form onSubmit={handleTransaction} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{dict.customers.label_amount}</label>
                                <input type="number" required autoFocus className="w-full p-4 text-center text-2xl font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{dict.customers.label_desc}</label>
                                <input className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" placeholder={
                                    transactionModal.contact.type === 'personnel'
                                        ? (transactionModal.type === 'debt' ? dict.customers.placeholder_desc_debt_personnel : dict.customers.placeholder_desc_payment_personnel)
                                        : (transactionModal.type === 'debt' ? dict.customers.placeholder_desc_debt_customer : dict.customers.placeholder_desc_payment_customer)
                                } value={description} onChange={e => setDescription(e.target.value)} />
                            </div>
                            <button className={`w-full py-3 text-white font-bold rounded-xl flex items-center justify-center gap-2 ${transactionModal.type === 'debt' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                                <Save className="w-5 h-5" /> {dict.customers.btn_confirm}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}