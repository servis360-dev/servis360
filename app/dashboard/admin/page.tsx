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
    ShieldAlert,
    Search,
    Terminal,
    Trash2,
    Users,
    Save,
    CreditCard,
    Phone,
    BellRing,
    RefreshCw,
    Wallet,
    BadgeCheck,
    X,
    TrendingUp
} from 'lucide-react';
import RoleGuard from '../../../components/auth/role-guard';

export default function AdminPage() {
    // --- STATE YÖNETİMİ ---
    const [users, setUsers] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, totalRevenue: 0 });
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Manuel Satış Modal State
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [saleTargetUser, setSaleTargetUser] = useState<any>(null);
    const [saleForm, setSaleForm] = useState({ amount: '', months: '12', description: 'Özel Lisans Satışı' });

    // PERSONEL & SENKRONİZASYON
    const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
    const [companyStaff, setCompanyStaff] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Sistem Ayarları
    const [systemSettings, setSystemSettings] = useState({
        iban: '',
        bankName: '',
        accountHolder: '',
        monthlyPrice: '',
        sixMonthPrice: '',
        yearlyPrice: ''
    });

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString('tr-TR', { hour12: false });
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 8));
    };

    // --- VERİ ÇEKME ---
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        setCurrentUser(user);
        addLog("SYSTEM_INIT: Admin root access granted.");

        // 1. Kullanıcı Listesi
        const qUsers = query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory'), orderBy('createdAt', 'desc'));
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
            const data = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                ip: d.data().ip || 'Kayıt Yok'
            }));
            setUsers(data);
            const active = data.filter((u: any) => u.status === 'active').length;

            // Basit istatistik güncellemesi
            setStats(prev => ({ ...prev, totalUsers: data.length, activeUsers: active }));
            setLoading(false);
        });

        // 2. Ödeme İstekleri
        const qRequests = query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
        const unsubRequests = onSnapshot(qRequests, (snapshot) => {
            setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 3. Toplam Gelir (SaaS Income) Hesabı
        const qIncome = query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'saas_income'));
        const unsubIncome = onSnapshot(qIncome, (snapshot) => {
            let total = 0;
            snapshot.docs.forEach(doc => { total += Number(doc.data().amount || 0); });
            setStats(prev => ({ ...prev, totalRevenue: total }));
        });

        // 4. Ayarlar
        getDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config')).then(snap => {
            if (snap.exists()) setSystemSettings(snap.data() as any);
        });

        return () => { unsubUsers(); unsubRequests(); unsubIncome(); };
    }, []);

    // --- FINANSAL İŞLEM MOTORU (GELİR/GİDER) ---
    const processTransaction = async (userId: string, userName: string, amount: number, months: number, description: string, refCode: string) => {
        const batchDate = serverTimestamp();

        // 1. ADMIN KASASINA EKLE (Gelir)
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'saas_income'), {
            amount: Number(amount),
            userId: userId,
            userName: userName,
            description: description,
            type: 'income',
            refCode: refCode,
            createdAt: batchDate
        });

        // 2. MÜŞTERİ KASASINA EKLE (Gider)
        // Müşterinin kendi "finance" koleksiyonuna gider olarak işliyoruz.
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', userId, 'finance'), {
            amount: Number(amount), // Gider olduğu için eksi de yapabilirsin ama genelde mutlak değer girilip type: expense seçilir
            type: 'expense', // Gider
            category: 'Abonelik / Lisans',
            title: 'Servis360 Lisans Yenileme',
            description: `${months} Aylık Paket (${description})`,
            date: batchDate,
            createdAt: batchDate
        });

        // 3. LİSANSI UZAT
        await extendLicense(userId, months);
    };

    // --- LİSANS UZATMA ---
    const extendLicense = async (userId: string, months: number) => {
        const userProfileRef = doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile');
        const userProfileSnap = await getDoc(userProfileRef);

        let currentEndDate = new Date();
        // Eğer mevcut lisansı varsa ve bitmemişse, onun üzerine ekle. Yoksa bugünden başla.
        if (userProfileSnap.exists() && userProfileSnap.data().licenseEndsAt) {
            const existingDate = userProfileSnap.data().licenseEndsAt.toDate();
            if (existingDate > new Date()) {
                currentEndDate = existingDate;
            }
        }

        const newEndDate = new Date(currentEndDate);
        newEndDate.setMonth(newEndDate.getMonth() + Number(months));

        const timestamp = Timestamp.fromDate(newEndDate);

        // Hem Profile hem Directory'ye yaz (Senkronizasyon bozulmasın)
        await updateDoc(userProfileRef, { licenseEndsAt: timestamp, status: 'active' });
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId), { licenseEndsAt: timestamp, status: 'active' });
    };

    // --- ONAY MEKANİZMASI ---
    const approvePayment = async (req: any) => {
        if (!confirm(`${req.userName} ödemesini ( ${req.amount} TL ) onaylıyor musun?\nBu işlem her iki tarafın kasasına işlenecek.`)) return;

        try {
            // Durumu güncelle
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests', req.id), { status: 'approved' });

            // Süreyi belirle
            let months = req.planName.includes('Yıllık') ? 12 : req.planName.includes('6 Aylık') ? 6 : 1;

            // Finansal İşlemi ve Lisansı Yap
            await processTransaction(req.userId, req.userName, req.amount, months, `Web Ödeme: ${req.planName}`, req.refCode);

            addLog(`PAYMENT_APPROVED: ${req.userName} - ${req.amount} TL`);
            alert("Ödeme onaylandı, lisans uzatıldı ve kasalara işlendi.");
        } catch (error) {
            console.error(error);
            alert("İşlem sırasında hata oluştu.");
        }
    };

    const rejectPayment = async (id: string) => {
        if (!confirm("Reddetmek istiyor musun?")) return;
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests', id), { status: 'rejected' });
    };

    // --- MANUEL SATIŞ EKLEME ---
    const openSaleModal = (user: any) => {
        setSaleTargetUser(user);
        setSaleForm({ amount: '', months: '12', description: 'Özel Lisans Anlaşması' });
        setShowSaleModal(true);
    };

    const handleManualSale = async () => {
        if (!saleForm.amount || !saleForm.months) return alert("Tutar ve süre giriniz.");

        try {
            await processTransaction(
                saleTargetUser.id,
                saleTargetUser.fullName || 'Bilinmeyen',
                Number(saleForm.amount),
                Number(saleForm.months),
                saleForm.description,
                `MANUEL-${Math.floor(Math.random() * 9999)}`
            );
            setShowSaleModal(false);
            alert("Manuel satış başarıyla eklendi! Kasa güncellendi.");
        } catch (error) {
            console.error(error);
            alert("Satış eklenirken hata oluştu.");
        }
    };

    // --- DİĞER FONKSİYONLAR (Aynen korundu) ---
    const syncDatabase = async () => {
        if (!confirm("Tüm kullanıcı verileri onarılacak. Devam?")) return;
        setIsSyncing(true);
        try {
            const directorySnapshot = await getDocs(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory'));
            let updatedCount = 0;
            for (const dirDoc of directorySnapshot.docs) {
                const uid = dirDoc.id;
                const profileSnap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'users', uid, 'users', 'profile'));
                if (profileSnap.exists()) {
                    const pd = profileSnap.data();
                    await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', uid), {
                        phone: pd.phone || '', fullName: pd.fullName || '', companyName: pd.companyName || '',
                        role: pd.role || 'user', accountType: pd.accountType || 'individual', updatedAt: serverTimestamp()
                    });
                    updatedCount++;
                }
            }
            alert(`Senkronizasyon tamam: ${updatedCount} kayıt.`);
        } catch (e) { console.error(e); } finally { setIsSyncing(false); }
    };

    const toggleStaffView = async (userId: string) => {
        if (expandedCompany === userId) { setExpandedCompany(null); return; }
        setExpandedCompany(userId); setLoadingStaff(true);
        try {
            const snap = await getDocs(collection(db, 'artifacts', 'servis-360-live', 'users', userId, 'staff'));
            setCompanyStaff(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { console.error(e); }
        setLoadingStaff(false);
    };

    const saveSettings = async () => {
        await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config'), systemSettings);
        alert("Ayarlar kaydedildi.");
    };

    const deleteUser = async (userId: string) => {
        if (userId === currentUser?.uid) return;
        if (confirm("DİKKAT: Kullanıcı tamamen silinecek!")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId));
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile'));
        }
    };

    const filteredUsers = users.filter(u =>
        u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm)
    );

    return (
        <RoleGuard allowedRoles={['admin']}>
            <div className="space-y-6 bg-slate-950 min-h-screen p-6 text-slate-300 font-mono text-sm selection:bg-green-900 selection:text-white relative">

                {/* MANUEL SATIŞ MODALI */}
                {showSaleModal && saleTargetUser && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-yellow-600/50 p-6 rounded-lg w-full max-w-md shadow-2xl">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <Wallet className="text-yellow-500" /> ÖZEL SATIŞ GİRİŞİ
                            </h3>
                            <div className="space-y-4">
                                <div className="p-3 bg-black/50 rounded border border-slate-700">
                                    <p className="text-xs text-slate-400">Müşteri</p>
                                    <p className="font-bold text-white">{saleTargetUser.fullName}</p>
                                    <p className="text-xs text-blue-400">{saleTargetUser.companyName}</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400">Tutar (TL)</label>
                                    <input
                                        type="number"
                                        value={saleForm.amount}
                                        onChange={e => setSaleForm({ ...saleForm, amount: e.target.value })}
                                        className="w-full bg-black border border-slate-600 text-white p-2 rounded focus:border-yellow-500 outline-none"
                                        placeholder="Örn: 2000"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400">Süre (Ay)</label>
                                    <input
                                        type="number"
                                        value={saleForm.months}
                                        onChange={e => setSaleForm({ ...saleForm, months: e.target.value })}
                                        className="w-full bg-black border border-slate-600 text-white p-2 rounded focus:border-yellow-500 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400">Açıklama (Dekont/Not)</label>
                                    <input
                                        type="text"
                                        value={saleForm.description}
                                        onChange={e => setSaleForm({ ...saleForm, description: e.target.value })}
                                        className="w-full bg-black border border-slate-600 text-white p-2 rounded focus:border-yellow-500 outline-none"
                                    />
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button onClick={() => setShowSaleModal(false)} className="flex-1 bg-slate-800 text-slate-300 py-2 rounded hover:bg-slate-700 font-bold">İPTAL</button>
                                    <button onClick={handleManualSale} className="flex-1 bg-yellow-600 text-black py-2 rounded hover:bg-yellow-500 font-bold">SATIŞI ONAYLA</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* HEADER & İSTATİSTİKLER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800 pb-6 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2"><span className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></span><span className="text-green-500 text-xs font-bold">ONLINE</span></div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3"><Terminal className="text-blue-500" /> ADMIN_CONSOLE</h1>
                        <p className="text-slate-500 text-xs mt-1">ROOT ACCESS GRANTED // ID: {currentUser?.uid}</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-slate-900 border border-green-900/50 p-3 rounded-lg flex flex-col items-end min-w-[150px]">
                            <span className="text-xs text-slate-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> TOPLAM SAAS GELİRİ</span>
                            <span className="text-2xl font-black text-green-400">{stats.totalRevenue.toLocaleString('tr-TR')} ₺</span>
                        </div>
                        <button
                            onClick={syncDatabase}
                            disabled={isSyncing}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-sm border border-slate-600 flex items-center gap-2 text-xs font-bold transition-all h-full"
                        >
                            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                            {isSyncing ? '...' : 'VERİLERİ ONAR'}
                        </button>
                    </div>
                </div>

                {/* BEKLEYEN ÖDEMELER */}
                {requests.length > 0 && (
                    <div className="bg-slate-900 border border-yellow-600/50 rounded-sm p-5 animate-in fade-in">
                        <h3 className="text-yellow-500 font-bold mb-4 flex items-center gap-2 text-lg"><BellRing className="w-5 h-5 animate-bounce" /> ONAY BEKLEYEN ÖDEMELER ({requests.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {requests.map(req => (
                                <div key={req.id} className="bg-black border border-slate-700 p-4 rounded-sm flex flex-col justify-between group hover:border-yellow-500/50 transition-all">
                                    <div>
                                        <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-white">{req.userName}</h4><span className="text-xs bg-yellow-900 text-yellow-500 px-2 py-1 rounded font-bold">{req.amount} ₺</span></div>
                                        <p className="text-xs text-slate-500 mb-1">{req.companyName} | {req.userPhone}</p>
                                        <p className="text-xs text-blue-400 mb-3">{req.planName} (REF: {req.refCode})</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => approvePayment(req)} className="flex-1 bg-green-900/30 text-green-500 border border-green-900 py-2 rounded text-xs font-bold hover:bg-green-900/50 flex items-center justify-center gap-1"><BadgeCheck className="w-3 h-3" /> ONAYLA</button>
                                        <button onClick={() => rejectPayment(req.id)} className="flex-1 bg-red-900/30 text-red-500 border border-red-900 py-2 rounded text-xs font-bold hover:bg-red-900/50 flex items-center justify-center gap-1"><X className="w-3 h-3" /> REDDET</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FİNANSAL AYARLAR */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-sm">
                    <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-500" /> FİYATLANDIRMA AYARLARI</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input value={systemSettings.monthlyPrice} onChange={(e) => setSystemSettings({ ...systemSettings, monthlyPrice: e.target.value })} className="bg-black border border-slate-700 text-white px-2 py-2 text-xs outline-none focus:border-blue-500" placeholder="Aylık Tutar" />
                        <input value={systemSettings.yearlyPrice} onChange={(e) => setSystemSettings({ ...systemSettings, yearlyPrice: e.target.value })} className="bg-black border border-slate-700 text-white px-2 py-2 text-xs outline-none focus:border-blue-500" placeholder="Yıllık Tutar" />
                        <input value={systemSettings.iban} onChange={(e) => setSystemSettings({ ...systemSettings, iban: e.target.value })} className="bg-black border border-slate-700 text-white px-2 py-2 text-xs outline-none focus:border-blue-500" placeholder="IBAN" />
                        <button onClick={saveSettings} className="bg-slate-800 hover:bg-blue-900/30 text-blue-500 border border-slate-700 px-2 py-2 text-xs font-bold flex items-center justify-center gap-2"><Save className="w-4 h-4" /> KAYDET</button>
                    </div>
                </div>

                {/* KULLANICI LİSTESİ */}
                <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
                    <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm"><Users className="w-4 h-4 text-slate-500" /> MÜŞTERİ VERİTABANI ({users.length})</h3>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1 rounded-sm"><Search className="w-3 h-3 text-slate-400" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Ara..." className="bg-transparent border-none text-xs text-white outline-none w-40" /></div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950 text-slate-500 text-xs border-b border-slate-800 uppercase"><th className="p-4">KİMLİK</th><th className="p-4">İLETİŞİM</th><th className="p-4">DURUM</th><th className="p-4 text-right">İŞLEMLER</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-xs">
                                {loading ? <tr><td colSpan={4} className="p-8 text-center text-slate-500">Veriler Yükleniyor...</td></tr> : filteredUsers.map((u) => (
                                    <>
                                        <tr key={u.id} className={`hover:bg-slate-800/50 transition-colors ${u.id === currentUser?.uid ? 'bg-blue-900/10' : ''}`}>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold ${u.role === 'admin' ? 'bg-red-900/20 text-red-500' : 'bg-slate-800 text-slate-400'}`}>{u.role === 'admin' ? <ShieldAlert className="w-4 h-4" /> : <Users className="w-4 h-4" />}</div>
                                                    <div><p className="font-bold text-slate-200">{u.companyName || 'İSİMSİZ'}</p><p className="text-slate-600 font-mono text-[10px]">{u.email}</p></div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {u.phone ? <a href={`tel:${u.phone}`} className="text-blue-400 hover:text-white flex items-center gap-2 font-mono"><Phone className="w-3 h-3" /> {u.phone}</a> : <span className="text-slate-600">-</span>}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-sm border ${u.status === 'active' ? 'bg-green-900/10 text-green-500 border-green-900/30' : 'bg-red-900/10 text-red-500 border-red-900/30'}`}>{u.status === 'active' ? 'AKTİF' : 'PASİF'}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {u.id !== currentUser?.uid && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* YENİ: MANUEL SATIŞ BUTONU */}
                                                        <button
                                                            onClick={() => openSaleModal(u)}
                                                            className="flex items-center gap-1 bg-yellow-900/20 text-yellow-500 border border-yellow-900/50 px-2 py-1.5 rounded-sm hover:bg-yellow-900/40 transition-colors font-bold"
                                                        >
                                                            <Wallet className="w-3 h-3" />
                                                            <span className="hidden md:inline">SATIŞ EKLE</span>
                                                        </button>

                                                        {u.accountType === 'corporate' && <button onClick={() => toggleStaffView(u.id)} className={`p-1.5 border rounded-sm ${expandedCompany === u.id ? 'bg-blue-600 text-white' : 'bg-slate-800 text-blue-400'}`} title="Personel"><Users className="w-3.5 h-3.5" /></button>}
                                                        <button onClick={() => deleteUser(u.id)} className="p-1.5 bg-slate-800 border border-slate-700 text-red-500 rounded-sm hover:bg-red-900/20"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        {expandedCompany === u.id && (
                                            <tr className="bg-slate-900/50 animate-in slide-in-from-top-2">
                                                <td colSpan={5} className="p-4 pl-12 border-b border-slate-800">
                                                    <div className="bg-black/50 border border-slate-800 rounded-sm p-4">
                                                        <h4 className="text-xs font-bold text-blue-400 mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> {u.companyName} - PERSONEL LİSTESİ</h4>
                                                        {loadingStaff ? <p className="text-slate-500">Yükleniyor...</p> : companyStaff.length === 0 ? <p className="text-slate-500">Personel yok.</p> : (
                                                            <table className="w-full text-left text-xs">
                                                                <thead><tr className="text-slate-500 border-b border-slate-800"><th className="pb-2">AD</th><th className="pb-2">TEL</th><th className="pb-2">ROL</th></tr></thead>
                                                                <tbody className="divide-y divide-slate-800/50">{companyStaff.map((s, i) => <tr key={i} className="text-slate-300"><td className="py-2">{s.fullName}</td><td className="py-2">{s.phone}</td><td className="py-2">{s.role}</td></tr>)}</tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}