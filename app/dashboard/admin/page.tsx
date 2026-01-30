'use client';

import { useEffect, useState } from 'react';
import {
    collection,
    query,
    onSnapshot,
    orderBy,
    doc,
    updateDoc,
    deleteDoc,
    addDoc,
    Timestamp,
    getDoc,
    serverTimestamp,
    setDoc,
    where,
    getDocs
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import {
    ShieldAlert, Search, Trash2, Users, Save,
    CreditCard, Phone, BellRing, RefreshCw, Wallet,
    BadgeCheck, X, TrendingUp, Building2, Store, User
} from 'lucide-react';
import RoleGuard from '../../../components/auth/role-guard';

export default function AdminPage() {
    // --- STATE YÖNETİMİ ---
    const [users, setUsers] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalRevenue: 0 });
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    // Manuel Satış Modal
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [saleTargetUser, setSaleTargetUser] = useState<any>(null);
    const [saleForm, setSaleForm] = useState({ amount: '', months: '12', description: 'Özel Satış' });

    // Personel Modal
    const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
    const [companyStaff, setCompanyStaff] = useState<any[]>([]);

    // --- GELİŞMİŞ AYARLAR (Fiyatlar & Banka) ---
    const [settings, setSettings] = useState({
        bank: {
            bankName: '',
            iban: '',
            accountHolder: '',
            branchCode: ''
        },
        pricing: {
            individual: { monthly: 0, sixMonth: 0, yearly: 0 }, // Bireysel
            business: { monthly: 0, sixMonth: 0, yearly: 0 },   // Esnaf
            corporate: { monthly: 0, sixMonth: 0, yearly: 0 }   // Kurumsal
        }
    });

    // --- VERİ ÇEKME ---
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        setCurrentUser(user);

        // 1. Ayarları Çek
        const fetchSettings = async () => {
            const docRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config');
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                // Mevcut ayarları al, eksik varsa varsayılanı koru
                const data = docSnap.data();
                setSettings(prev => ({
                    bank: { ...prev.bank, ...data.bank },
                    pricing: {
                        individual: { ...prev.pricing.individual, ...data.pricing?.individual },
                        business: { ...prev.pricing.business, ...data.pricing?.business },
                        corporate: { ...prev.pricing.corporate, ...data.pricing?.corporate },
                    }
                }));
            }
        };
        fetchSettings();

        // 2. Kullanıcılar
        const unsubUsers = onSnapshot(query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory'), orderBy('createdAt', 'desc')), (snapshot) => {
            setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        // 3. Ödemeler
        const unsubRequests = onSnapshot(query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc')), (snapshot) => {
            setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 4. Gelir
        const unsubIncome = onSnapshot(query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'saas_income')), (snapshot) => {
            let total = 0;
            snapshot.docs.forEach(d => total += Number(d.data().amount || 0));
            setStats({ totalRevenue: total });
        });

        return () => { unsubUsers(); unsubRequests(); unsubIncome(); };
    }, []);

    // --- AYARLARI KAYDET ---
    const saveSettings = async () => {
        try {
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config'), settings);
            alert("✅ Tüm ayarlar (Fiyatlar ve Banka) başarıyla güncellendi!");
        } catch (error) {
            console.error(error);
            alert("Ayarlar kaydedilirken hata oluştu.");
        }
    };

    // --- FİNANSAL İŞLEMLER (Aynen Korundu) ---
    const processTransaction = async (userId: string, userName: string, amount: number, months: number, description: string, refCode: string) => {
        const batchDate = serverTimestamp();
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'saas_income'), {
            amount: Number(amount), userId, userName, description, type: 'income', refCode, createdAt: batchDate
        });
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', userId, 'finance'), {
            amount: Number(amount), type: 'expense', category: 'Lisans', title: 'Servis360', description, date: batchDate, createdAt: batchDate
        });

        // Lisans Uzatma
        const userProfileRef = doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile');
        const userProfileSnap = await getDoc(userProfileRef);
        let currentEndDate = new Date();
        if (userProfileSnap.exists() && userProfileSnap.data().licenseEndsAt) {
            const existingDate = userProfileSnap.data().licenseEndsAt.toDate();
            if (existingDate > new Date()) currentEndDate = existingDate;
        }
        const newEndDate = new Date(currentEndDate);
        newEndDate.setMonth(newEndDate.getMonth() + Number(months));

        await updateDoc(userProfileRef, { licenseEndsAt: Timestamp.fromDate(newEndDate), status: 'active' });
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId), { licenseEndsAt: Timestamp.fromDate(newEndDate), status: 'active' });
    };

    const approvePayment = async (req: any) => {
        if (!confirm(`${req.amount} TL onaylanacak?`)) return;
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests', req.id), { status: 'approved' });
        let months = req.planName.includes('Yıllık') ? 12 : req.planName.includes('6 Aylık') ? 6 : 1;
        await processTransaction(req.userId, req.userName, req.amount, months, `Web Ödeme: ${req.planName}`, req.refCode);
        alert("Onaylandı.");
    };

    const handleManualSale = async () => {
        if (!saleForm.amount) return;
        await processTransaction(saleTargetUser.id, saleTargetUser.fullName, Number(saleForm.amount), Number(saleForm.months), saleForm.description, 'MANUEL');
        setShowSaleModal(false);
        alert("Satış eklendi.");
    };

    // --- DELETE & SYNC ---
    const deleteUser = async (userId: string) => {
        if (confirm("Kullanıcı silinsin mi?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId));
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile'));
        }
    };

    // UI Render Helper for Pricing Inputs
    const PricingInput = ({ label, value, onChange }: any) => (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase">{label}</span>
            <div className="flex items-center bg-black border border-slate-700 rounded px-2">
                <span className="text-slate-500 text-xs">₺</span>
                <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="w-full bg-transparent text-white text-xs p-2 outline-none" />
            </div>
        </div>
    );

    const filteredUsers = users.filter(u => u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || u.companyName?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <RoleGuard allowedRoles={['admin']}>
            <div className="space-y-6 bg-slate-950 min-h-screen p-6 text-slate-300 font-mono text-sm relative pb-32">

                {/* HEADER */}
                <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-2"><ShieldAlert className="text-red-600" /> ADMIN_PANEL_V2</h1>
                        <p className="text-xs text-slate-500">TAM YETKİLİ ERİŞİM</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-slate-500">TOPLAM GELİR</span>
                        <p className="text-2xl font-bold text-green-400">{stats.totalRevenue.toLocaleString()} ₺</p>
                    </div>
                </div>

                {/* 1. BANKA VE FİYATLANDIRMA AYARLARI (YENİLENEN KISIM) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* BANKA BİLGİLERİ */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-sm">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-500" /> BANKA BİLGİLERİ</h3>
                        <div className="space-y-3">
                            <input value={settings.bank.bankName} onChange={e => setSettings({ ...settings, bank: { ...settings.bank, bankName: e.target.value } })} placeholder="Banka Adı (Örn: Garanti)" className="w-full bg-black border border-slate-700 p-2 text-white text-xs rounded-sm" />
                            <input value={settings.bank.accountHolder} onChange={e => setSettings({ ...settings, bank: { ...settings.bank, accountHolder: e.target.value } })} placeholder="Alıcı Adı Soyadı" className="w-full bg-black border border-slate-700 p-2 text-white text-xs rounded-sm" />
                            <input value={settings.bank.iban} onChange={e => setSettings({ ...settings, bank: { ...settings.bank, iban: e.target.value } })} placeholder="TRXX 0000..." className="w-full bg-black border border-slate-700 p-2 text-white text-xs rounded-sm font-mono text-yellow-500" />
                        </div>
                    </div>

                    {/* FİYAT MATRİSİ */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-sm">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-green-500" /> FİYATLANDIRMA</h3>

                        <div className="grid grid-cols-3 gap-4">
                            {/* Bireysel */}
                            <div className="space-y-2 border-r border-slate-800 pr-2">
                                <p className="text-xs font-bold text-blue-400 flex items-center gap-1"><User className="w-3 h-3" /> BİREYSEL</p>
                                <PricingInput label="1 Ay" value={settings.pricing.individual.monthly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, individual: { ...s.pricing.individual, monthly: v } } }))} />
                                <PricingInput label="6 Ay" value={settings.pricing.individual.sixMonth} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, individual: { ...s.pricing.individual, sixMonth: v } } }))} />
                                <PricingInput label="1 Yıl" value={settings.pricing.individual.yearly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, individual: { ...s.pricing.individual, yearly: v } } }))} />
                            </div>

                            {/* Esnaf */}
                            <div className="space-y-2 border-r border-slate-800 pr-2">
                                <p className="text-xs font-bold text-yellow-400 flex items-center gap-1"><Store className="w-3 h-3" /> ESNAF</p>
                                <PricingInput label="1 Ay" value={settings.pricing.business.monthly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, business: { ...s.pricing.business, monthly: v } } }))} />
                                <PricingInput label="6 Ay" value={settings.pricing.business.sixMonth} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, business: { ...s.pricing.business, sixMonth: v } } }))} />
                                <PricingInput label="1 Yıl" value={settings.pricing.business.yearly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, business: { ...s.pricing.business, yearly: v } } }))} />
                            </div>

                            {/* Kurumsal */}
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-purple-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> KURUMSAL</p>
                                <PricingInput label="1 Ay" value={settings.pricing.corporate.monthly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, corporate: { ...s.pricing.corporate, monthly: v } } }))} />
                                <PricingInput label="6 Ay" value={settings.pricing.corporate.sixMonth} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, corporate: { ...s.pricing.corporate, sixMonth: v } } }))} />
                                <PricingInput label="1 Yıl" value={settings.pricing.corporate.yearly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, corporate: { ...s.pricing.corporate, yearly: v } } }))} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* KAYDET BUTONU */}
                <button onClick={saveSettings} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-sm flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" /> AYARLARI VE FİYATLARI GÜNCELLE
                </button>

                {/* ÖDEME ONAYLARI */}
                {requests.length > 0 && (
                    <div className="bg-slate-900 border border-yellow-600/50 p-4 rounded-sm">
                        <h3 className="text-yellow-500 font-bold mb-4">🔔 BEKLEYEN ÖDEMELER</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {requests.map(req => (
                                <div key={req.id} className="bg-black border border-slate-700 p-4 rounded-sm">
                                    <div className="flex justify-between mb-2"><span className="font-bold text-white">{req.userName}</span><span className="text-yellow-500 font-bold">{req.amount} ₺</span></div>
                                    <p className="text-xs text-slate-500">{req.planName} | {req.companyName}</p>
                                    <div className="flex gap-2 mt-3">
                                        <button onClick={() => approvePayment(req)} className="flex-1 bg-green-900/20 text-green-500 border border-green-900 p-2 rounded text-xs font-bold">ONAYLA</button>
                                        <button onClick={() => updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests', req.id), { status: 'rejected' })} className="flex-1 bg-red-900/20 text-red-500 border border-red-900 p-2 rounded text-xs font-bold">RED</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* MANUEL SATIŞ MODALI */}
                {showSaleModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                        <div className="bg-slate-900 border border-yellow-600 p-6 rounded w-96">
                            <h3 className="text-white font-bold mb-4">Özel Satış: {saleTargetUser?.fullName}</h3>
                            <input type="number" placeholder="Tutar (TL)" className="w-full bg-black border border-slate-700 p-2 mb-2 text-white" value={saleForm.amount} onChange={e => setSaleForm({ ...saleForm, amount: e.target.value })} />
                            <input type="number" placeholder="Ay" className="w-full bg-black border border-slate-700 p-2 mb-2 text-white" value={saleForm.months} onChange={e => setSaleForm({ ...saleForm, months: e.target.value })} />
                            <button onClick={handleManualSale} className="w-full bg-yellow-600 text-black font-bold p-2 mt-2">SATIŞ YAP</button>
                            <button onClick={() => setShowSaleModal(false)} className="w-full text-slate-500 p-2 mt-2 text-xs">İptal</button>
                        </div>
                    </div>
                )}

                {/* KULLANICI LİSTESİ */}
                <div className="bg-slate-900 border border-slate-800 rounded-sm">
                    <div className="p-4 border-b border-slate-800 flex justify-between">
                        <h3 className="text-white font-bold flex items-center gap-2"><Users className="w-4 h-4" /> MÜŞTERİLER</h3>
                        <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Ara..." className="bg-black border border-slate-700 text-white text-xs p-2 rounded w-48" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-400">
                            <thead className="text-slate-500 bg-slate-950 uppercase border-b border-slate-800"><tr><th className="p-3">Ad / Firma</th><th className="p-3">Tip</th><th className="p-3">Durum</th><th className="p-3 text-right">İşlem</th></tr></thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredUsers.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-800/50">
                                        <td className="p-3"><p className="text-white font-bold">{u.fullName}</p><p className="text-[10px]">{u.companyName}</p></td>
                                        <td className="p-3">
                                            {u.accountType === 'corporate' ? <span className="text-purple-400">Kurumsal</span> :
                                                u.accountType === 'business' ? <span className="text-yellow-400">Esnaf</span> :
                                                    <span className="text-blue-400">Bireysel</span>}
                                        </td>
                                        <td className="p-3">{u.status === 'active' ? <span className="text-green-500">Aktif</span> : <span className="text-red-500">Pasif</span>}</td>
                                        <td className="p-3 text-right">
                                            {u.id !== currentUser?.uid && (
                                                <>
                                                    <button onClick={() => { setSaleTargetUser(u); setShowSaleModal(true); }} className="text-yellow-500 hover:text-white mr-2" title="Satış Yap"><Wallet className="w-4 h-4" /></button>
                                                    <button onClick={() => deleteUser(u.id)} className="text-red-500 hover:text-white"><Trash2 className="w-4 h-4" /></button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </RoleGuard>
    );
}