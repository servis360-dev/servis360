'use client';

// ---------------------------------------------------------------------------
// ⚠️ NOT: Bu dosya projenin 'app/dashboard/admin/page.tsx' konumuna aittir.
// Gerekli kütüphanelerin yüklü olduğundan emin ol: lucide-react, firebase
// ---------------------------------------------------------------------------

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
// -------------------------------------------------------------
// 👇 PROJE İÇİ IMPORTLAR (Hata alırsan yolları kontrol et)
import { auth, db } from '../../../lib/firebase';
import RoleGuard from '../../../components/auth/role-guard';
// -------------------------------------------------------------

import {
    ShieldAlert, Search, Trash2, Users, Save,
    CreditCard, Phone, BellRing, RefreshCw, Wallet,
    BadgeCheck, X, TrendingUp, Building2, Store, User,
    Mail, Calendar, Eye, Copy, CheckCircle2, ChevronRight, ChevronDown, UserPlus
} from 'lucide-react';

export default function AdminPage() {
    // --- STATE YÖNETİMİ ---
    const [users, setUsers] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalRevenue: 0, activeUsers: 0, expiredUsers: 0 });
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Personel Görüntüleme (Hiyerarşi)
    const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
    const [companyStaff, setCompanyStaff] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);

    // Modallar
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [saleTargetUser, setSaleTargetUser] = useState<any>(null);
    const [saleForm, setSaleForm] = useState({ amount: '', months: '12', description: 'Özel Satış' });

    const [viewUser, setViewUser] = useState<any>(null); // Detay Modalı için

    // --- GELİŞMİŞ AYARLAR (Fiyatlar & Banka) ---
    const [settings, setSettings] = useState({
        bank: {
            bankName: '',
            iban: '',
            accountHolder: '',
            branchCode: ''
        },
        pricing: {
            individual: { monthly: 0, sixMonth: 0, yearly: 0 },
            business: { monthly: 0, sixMonth: 0, yearly: 0 },
            corporate: { monthly: 0, sixMonth: 0, yearly: 0 }
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
            const userList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsers(userList);

            // Basit istatistikler
            const active = userList.filter((u: any) => u.status === 'active').length;
            setStats(prev => ({ ...prev, activeUsers: active, expiredUsers: userList.length - active }));
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
            setStats(prev => ({ ...prev, totalRevenue: total }));
        });

        return () => { unsubUsers(); unsubRequests(); unsubIncome(); };
    }, []);

    // --- FİRMA PERSONELLERİNİ GETİR ---
    const toggleCompanyStaff = async (companyId: string) => {
        if (expandedCompanyId === companyId) {
            setExpandedCompanyId(null);
            setCompanyStaff([]);
            return;
        }

        setExpandedCompanyId(companyId);
        setLoadingStaff(true);
        setCompanyStaff([]);

        try {
            // Firmanın 'staff' alt koleksiyonunu çek
            // Not: Personeller 'users/{companyId}/staff' altında tutuluyorsa:
            const staffRef = collection(db, 'artifacts', 'servis-360-live', 'users', companyId, 'staff');
            const staffSnap = await getDocs(staffRef);

            const staffList = staffSnap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCompanyStaff(staffList);
        } catch (error) {
            console.error("Personel çekme hatası:", error);
            alert("Personelleri getirirken hata oluştu veya yetki yok.");
        } finally {
            setLoadingStaff(false);
        }
    };

    // --- HELPER: Kopyalama ---
    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        alert(`Kopyalandı: ${text}`);
    };

    // --- HELPER: Tarih Formatla ---
    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        return new Date(timestamp.seconds * 1000).toLocaleDateString('tr-TR');
    };

    // --- AYARLARI KAYDET ---
    const saveSettings = async () => {
        try {
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config'), settings);
            alert("✅ Ayarlar güncellendi!");
        } catch (error) {
            console.error(error);
            alert("Hata oluştu.");
        }
    };

    // --- FİNANSAL İŞLEMLER ---
    const processTransaction = async (userId: string, userName: string, amount: number, months: number, description: string, refCode: string) => {
        const batchDate = serverTimestamp();
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'saas_income'), {
            amount: Number(amount), userId, userName, description, type: 'income', refCode, createdAt: batchDate
        });
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', userId, 'finance'), {
            amount: Number(amount), type: 'expense', category: 'Lisans', title: 'Servis360', description, date: batchDate, createdAt: batchDate
        });

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
    };

    const handleManualSale = async () => {
        if (!saleForm.amount) return;
        await processTransaction(saleTargetUser.id, saleTargetUser.fullName, Number(saleForm.amount), Number(saleForm.months), saleForm.description, 'MANUEL');
        setShowSaleModal(false);
        alert("Satış eklendi.");
    };

    const deleteUser = async (userId: string) => {
        if (confirm("Kullanıcı silinsin mi? Bu işlem geri alınamaz!")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId));
            // Dikkat: Kullanıcının alt koleksiyonlarını (users/{uid}/...) silmek için Cloud Functions gerekir, 
            // burada sadece dizinden ve profilden siliyoruz.
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile'));
            alert("Kullanıcı silindi.");
        }
    };

    const PricingInput = ({ label, value, onChange }: any) => (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase">{label}</span>
            <div className="flex items-center bg-black border border-slate-700 rounded px-2">
                <span className="text-slate-500 text-xs">₺</span>
                <input type="number" value={value} onChange={e => onChange(Number(e.target.value))} className="w-full bg-transparent text-white text-xs p-2 outline-none" />
            </div>
        </div>
    );

    const filteredUsers = users.filter(u =>
        u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        // 👇 DÜZELTİLEN KISIM: Artık 'super_admin' olanlar girebilir
        <RoleGuard allowedRoles={['super_admin']}>
            <div className="space-y-6 bg-slate-950 min-h-screen p-6 text-slate-300 font-mono text-sm relative pb-32">

                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-800 pb-4 gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-2"><ShieldAlert className="text-red-600" /> ADMIN_PANEL_V2</h1>
                        <p className="text-xs text-slate-500">SİSTEM YÖNETİCİSİ</p>
                    </div>
                    <div className="flex gap-6 text-right">
                        <div>
                            <span className="text-xs text-slate-500">AKTİF/PASİF</span>
                            <p className="text-xl font-bold text-white">
                                <span className="text-green-500">{stats.activeUsers}</span> / <span className="text-red-500">{stats.expiredUsers}</span>
                            </p>
                        </div>
                        <div>
                            <span className="text-xs text-slate-500">TOPLAM GELİR</span>
                            <p className="text-2xl font-bold text-green-400">{stats.totalRevenue.toLocaleString()} ₺</p>
                        </div>
                    </div>
                </div>

                {/* 1. BANKA VE FİYATLANDIRMA */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* BANKA BİLGİLERİ (Sol 4 birim) */}
                    <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-4 rounded-sm">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-500" /> BANKA BİLGİLERİ</h3>
                        <div className="space-y-3">
                            <input value={settings.bank.bankName} onChange={e => setSettings({ ...settings, bank: { ...settings.bank, bankName: e.target.value } })} placeholder="Banka Adı (Örn: Garanti)" className="w-full bg-black border border-slate-700 p-2 text-white text-xs rounded-sm" />
                            <input value={settings.bank.accountHolder} onChange={e => setSettings({ ...settings, bank: { ...settings.bank, accountHolder: e.target.value } })} placeholder="Alıcı Adı Soyadı" className="w-full bg-black border border-slate-700 p-2 text-white text-xs rounded-sm" />
                            <input value={settings.bank.iban} onChange={e => setSettings({ ...settings, bank: { ...settings.bank, iban: e.target.value } })} placeholder="TRXX 0000..." className="w-full bg-black border border-slate-700 p-2 text-white text-xs rounded-sm font-mono text-yellow-500" />
                        </div>
                    </div>

                    {/* FİYAT MATRİSİ (Sağ 8 birim) */}
                    <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-4 rounded-sm">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-green-500" /> ABONELİK FİYATLARI</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2 border-r border-slate-800 pr-2">
                                <p className="text-xs font-bold text-blue-400 flex items-center gap-1"><User className="w-3 h-3" /> BİREYSEL</p>
                                <PricingInput label="1 Ay" value={settings.pricing.individual.monthly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, individual: { ...s.pricing.individual, monthly: v } } }))} />
                                <PricingInput label="6 Ay" value={settings.pricing.individual.sixMonth} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, individual: { ...s.pricing.individual, sixMonth: v } } }))} />
                                <PricingInput label="1 Yıl" value={settings.pricing.individual.yearly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, individual: { ...s.pricing.individual, yearly: v } } }))} />
                            </div>
                            <div className="space-y-2 border-r border-slate-800 pr-2">
                                <p className="text-xs font-bold text-yellow-400 flex items-center gap-1"><Store className="w-3 h-3" /> ESNAF</p>
                                <PricingInput label="1 Ay" value={settings.pricing.business.monthly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, business: { ...s.pricing.business, monthly: v } } }))} />
                                <PricingInput label="6 Ay" value={settings.pricing.business.sixMonth} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, business: { ...s.pricing.business, sixMonth: v } } }))} />
                                <PricingInput label="1 Yıl" value={settings.pricing.business.yearly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, business: { ...s.pricing.business, yearly: v } } }))} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-bold text-purple-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> KURUMSAL</p>
                                <PricingInput label="1 Ay" value={settings.pricing.corporate.monthly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, corporate: { ...s.pricing.corporate, monthly: v } } }))} />
                                <PricingInput label="6 Ay" value={settings.pricing.corporate.sixMonth} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, corporate: { ...s.pricing.corporate, sixMonth: v } } }))} />
                                <PricingInput label="1 Yıl" value={settings.pricing.corporate.yearly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, corporate: { ...s.pricing.corporate, yearly: v } } }))} />
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={saveSettings} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-sm flex items-center justify-center gap-2">
                    <Save className="w-5 h-5" /> SİSTEM AYARLARINI GÜNCELLE
                </button>

                {/* ÖDEME ONAYLARI */}
                {requests.length > 0 && (
                    <div className="bg-slate-900 border border-yellow-600/50 p-4 rounded-sm animate-pulse">
                        <h3 className="text-yellow-500 font-bold mb-4 flex items-center gap-2"><BellRing className="w-4 h-4" /> BEKLEYEN ÖDEME ONAYLARI</h3>
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

                {/* KULLANICI LİSTESİ */}
                <div className="bg-slate-900 border border-slate-800 rounded-sm">
                    <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between gap-4">
                        <h3 className="text-white font-bold flex items-center gap-2"><Users className="w-4 h-4" /> KULLANICI DİZİNİ</h3>
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="İsim, Firma, Mail ara..." className="bg-black border border-slate-700 text-white text-xs p-2 pl-9 rounded w-full md:w-64" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-400">
                            <thead className="text-slate-500 bg-slate-950 uppercase border-b border-slate-800">
                                <tr>
                                    <th className="p-3 w-8"></th>
                                    <th className="p-3">Kullanıcı / Firma</th>
                                    <th className="p-3">İletişim</th>
                                    <th className="p-3">Abonelik Türü</th>
                                    <th className="p-3">Lisans Bitiş</th>
                                    <th className="p-3">Durum</th>
                                    <th className="p-3 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredUsers.map(u => (
                                    <>
                                        <tr key={u.id} className={`hover:bg-slate-800/50 transition-colors ${expandedCompanyId === u.id ? 'bg-slate-800/30' : ''}`}>
                                            <td className="p-3">
                                                {(u.accountType === 'corporate' || u.accountType === 'business') && (
                                                    <button
                                                        onClick={() => toggleCompanyStaff(u.id)}
                                                        className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-all"
                                                    >
                                                        {expandedCompanyId === u.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <p className="text-white font-bold">{u.fullName}</p>
                                                <p className="text-[10px] text-slate-500">{u.companyName || '-'}</p>
                                            </td>
                                            <td className="p-3 space-y-1">
                                                <div className="flex items-center gap-1 group cursor-pointer" onClick={() => copyToClipboard(u.email)}>
                                                    <Mail className="w-3 h-3 text-slate-600 group-hover:text-blue-400" />
                                                    <span className="group-hover:text-blue-400">{u.email}</span>
                                                </div>
                                                <div className="flex items-center gap-1 group cursor-pointer" onClick={() => copyToClipboard(u.phone)}>
                                                    <Phone className="w-3 h-3 text-slate-600 group-hover:text-green-400" />
                                                    <span className="group-hover:text-green-400">{u.phone || '-'}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {u.accountType === 'corporate' ? <span className="text-purple-400 font-bold bg-purple-900/20 px-2 py-1 rounded">Kurumsal</span> :
                                                    u.accountType === 'business' ? <span className="text-yellow-400 font-bold bg-yellow-900/20 px-2 py-1 rounded">Esnaf</span> :
                                                        <span className="text-blue-400 font-bold bg-blue-900/20 px-2 py-1 rounded">Bireysel</span>}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {u.licenseEndsAt ? formatDate(u.licenseEndsAt) : <span className="text-red-500">Yok</span>}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {u.status === 'active' ?
                                                    <span className="text-green-500 flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> Aktif</span> :
                                                    <span className="text-red-500 flex items-center gap-1"><X className="w-3 h-3" /> Pasif</span>}
                                            </td>
                                            <td className="p-3 text-right">
                                                {u.id !== currentUser?.uid && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => setViewUser(u)} className="p-1.5 hover:bg-slate-700 rounded text-blue-400" title="Detayları Gör"><Eye className="w-4 h-4" /></button>
                                                        <button onClick={() => { setSaleTargetUser(u); setShowSaleModal(true); }} className="p-1.5 hover:bg-slate-700 rounded text-yellow-500" title="Manuel Satış Ekle"><Wallet className="w-4 h-4" /></button>
                                                        <button onClick={() => deleteUser(u.id)} className="p-1.5 hover:bg-slate-700 rounded text-red-500" title="Sil"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>

                                        {/* PERSONEL ALT TABLOSU (AÇILIR KAPANIR) */}
                                        {expandedCompanyId === u.id && (
                                            <tr className="bg-slate-900/50">
                                                <td colSpan={7} className="p-4 pl-12 border-b border-slate-800 shadow-inner">
                                                    <div className="flex items-center gap-2 mb-3 text-slate-400">
                                                        <Users className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">{u.companyName || u.fullName} - PERSONEL LİSTESİ</span>
                                                    </div>

                                                    {loadingStaff ? (
                                                        <div className="text-xs text-slate-500 animate-pulse">Personeller yükleniyor...</div>
                                                    ) : companyStaff.length > 0 ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                            {companyStaff.map((staff) => (
                                                                <div key={staff.id} className="flex items-center justify-between bg-black border border-slate-700 p-3 rounded-md">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <User className="w-3 h-3 text-blue-500" />
                                                                            <span className="text-white font-bold text-xs">{staff.fullName}</span>
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500 mt-1">{staff.email}</div>
                                                                        <div className="text-[10px] text-slate-500">{staff.role || 'Personel'}</div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full ${staff.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-500 bg-slate-800/50 p-3 rounded border border-dashed border-slate-700">
                                                            Bu firmaya ait kayıtlı personel bulunamadı.
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* MODAL: MANUEL SATIŞ */}
                {showSaleModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-yellow-600 p-6 rounded w-full max-w-sm">
                            <h3 className="text-white font-bold mb-4">Özel Satış Ekle</h3>
                            <p className="text-slate-400 mb-4 text-xs">Müşteri: <span className="text-white font-bold">{saleTargetUser?.fullName}</span></p>

                            <label className="text-xs text-slate-500">Tutar (TL)</label>
                            <input type="number" className="w-full bg-black border border-slate-700 p-2 mb-2 text-white" value={saleForm.amount} onChange={e => setSaleForm({ ...saleForm, amount: e.target.value })} />

                            <label className="text-xs text-slate-500">Süre (Ay)</label>
                            <input type="number" className="w-full bg-black border border-slate-700 p-2 mb-2 text-white" value={saleForm.months} onChange={e => setSaleForm({ ...saleForm, months: e.target.value })} />

                            <label className="text-xs text-slate-500">Açıklama</label>
                            <input type="text" className="w-full bg-black border border-slate-700 p-2 mb-4 text-white" value={saleForm.description} onChange={e => setSaleForm({ ...saleForm, description: e.target.value })} />

                            <div className="flex gap-2">
                                <button onClick={handleManualSale} className="flex-1 bg-yellow-600 text-black font-bold p-2 rounded">KAYDET</button>
                                <button onClick={() => setShowSaleModal(false)} className="flex-1 bg-slate-800 text-white p-2 rounded">İptal</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: KULLANICI DETAY (YENİ) */}
                {viewUser && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setViewUser(null)}>
                        <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <User className="w-5 h-5 text-blue-500" />
                                    {viewUser.fullName}
                                </h3>
                                <button onClick={() => setViewUser(null)} className="text-slate-500 hover:text-white"><X className="w-6 h-6" /></button>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sol Kolon */}
                                <div className="space-y-4">
                                    <div className="bg-black/50 p-3 rounded border border-slate-800">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Hesap Bilgileri</p>
                                        <p className="text-sm text-white mb-1">ID: <span className="font-mono text-xs text-slate-500">{viewUser.id}</span></p>
                                        <p className="text-sm text-white mb-1">Rol: <span className="text-blue-400">{viewUser.role || 'Standart'}</span></p>
                                        <p className="text-sm text-white">Hesap Tipi: {viewUser.accountType}</p>
                                    </div>
                                    <div className="bg-black/50 p-3 rounded border border-slate-800">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">İletişim</p>
                                        <p className="text-sm text-white mb-1 flex items-center justify-between group">
                                            <span>{viewUser.email}</span>
                                            <Copy className="w-3 h-3 cursor-pointer opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(viewUser.email)} />
                                        </p>
                                        <p className="text-sm text-white flex items-center justify-between group">
                                            <span>{viewUser.phone || 'Telefon Yok'}</span>
                                            {viewUser.phone && <Copy className="w-3 h-3 cursor-pointer opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(viewUser.phone)} />}
                                        </p>
                                    </div>
                                </div>

                                {/* Sağ Kolon */}
                                <div className="space-y-4">
                                    <div className="bg-black/50 p-3 rounded border border-slate-800">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Firma Detayları</p>
                                        <p className="text-sm text-white mb-1">{viewUser.companyName || '-'}</p>
                                        <p className="text-xs text-slate-400">Vergi No: {viewUser.taxNumber || '-'}</p>
                                        <p className="text-xs text-slate-400">Vergi Dairesi: {viewUser.taxOffice || '-'}</p>
                                        <p className="text-xs text-slate-400 mt-2">Adres: {viewUser.address || '-'}</p>
                                    </div>
                                    <div className="bg-black/50 p-3 rounded border border-slate-800">
                                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Sistem Durumu</p>
                                        <p className="text-sm text-white mb-1">Kayıt: {viewUser.createdAt ? formatDate(viewUser.createdAt) : '-'}</p>
                                        <p className="text-sm text-green-400 font-bold">Lisans Bitiş: {viewUser.licenseEndsAt ? formatDate(viewUser.licenseEndsAt) : '-'}</p>
                                    </div>
                                </div>

                                {/* Ham Veri (Debugging için) */}
                                <div className="col-span-1 md:col-span-2 mt-4">
                                    <details className="text-xs text-slate-600 cursor-pointer">
                                        <summary>Ham Veriyi Göster (JSON)</summary>
                                        <pre className="mt-2 bg-black p-4 rounded text-[10px] overflow-auto max-h-40 border border-slate-800">
                                            {JSON.stringify(viewUser, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-800 bg-slate-900 sticky bottom-0 flex justify-end">
                                <button onClick={() => setViewUser(null)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-xs">KAPAT</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </RoleGuard>
    );
}