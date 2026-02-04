'use client';

import { useEffect, useState } from 'react';
import {
    collection,
    query,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    addDoc,
    Timestamp,
    getDoc,
    serverTimestamp,
    setDoc,
    where,
    getDocs,
    orderBy,
    limit
} from 'firebase/firestore';

// 👇 PROJE İÇİ IMPORTLAR
import { auth, db } from '../../../lib/firebase';
import RoleGuard from '../../../components/auth/role-guard';

import {
    ShieldAlert, Search, Trash2, Users, Save,
    LayoutDashboard, Megaphone, BellRing, Wallet,
    BadgeCheck, X, Building2, Store, User,
    Mail, Calendar, Eye, Phone, ChevronRight, ChevronDown, Plus, Briefcase, Activity, FileText
} from 'lucide-react';

export default function AdminPage() {
    // --- STATE YÖNETİMİ ---
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'users', 'broadcast', 'logs'
    const [users, setUsers] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]); // Manuel ödeme talepleri (hala varsa)
    const [logs, setLogs] = useState<any[]>([]); // Sistem logları
    const [loading, setLoading] = useState(true);

    // İstatistikler
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeUsers: 0,
        expiredUsers: 0,
        corporateCount: 0,
        businessCount: 0,
        individualCount: 0
    });

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Duyuru Sistemi
    const [broadcast, setBroadcast] = useState({
        message: '',
        isActive: false,
        type: 'info' // info, warning, error
    });

    // Personel Görüntüleme
    const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
    const [companyStaff, setCompanyStaff] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);

    // Modallar
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [saleTargetUser, setSaleTargetUser] = useState<any>(null);
    const [saleForm, setSaleForm] = useState({ amount: '', months: '12', description: 'Özel Satış' });

    const [viewUser, setViewUser] = useState<any>(null);
    const [userProfileData, setUserProfileData] = useState<any>(null);

    // --- YARDIMCI: Personel Rolleri ---
    const staffRoles = ['staff', 'personnel', 'employee', 'technical', 'technician', 'sales', 'accountant'];

    const isBusinessOwner = (u: any) => {
        if (!u) return false;
        const isCompanyType = ['corporate', 'business', 'esnaf', 'tradesman', 'company'].includes(u.accountType);
        const isStaffRole = staffRoles.includes(u.role);
        return isCompanyType && !isStaffRole;
    };

    // --- VERİ ÇEKME ---
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        setCurrentUser(user);

        // 1. Duyuru Ayarlarını Çek
        const fetchBroadcast = async () => {
            const docRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'broadcast');
            const snap = await getDoc(docRef);
            if (snap.exists()) setBroadcast(snap.data() as any);
        };
        fetchBroadcast();

        // 2. Kullanıcılar ve İstatistikler
        const q = query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory'));
        const unsubUsers = onSnapshot(q, (snapshot) => {
            const userList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsers(userList);

            // İstatistik Hesapla
            const active = userList.filter((u: any) => u.status === 'active').length;
            const corporate = userList.filter((u: any) => ['corporate', 'company', 'enterprise'].includes(u.accountType)).length;
            const business = userList.filter((u: any) => ['esnaf', 'business', 'tradesman'].includes(u.accountType)).length;

            setStats(prev => ({
                ...prev,
                activeUsers: active,
                expiredUsers: userList.length - active,
                corporateCount: corporate,
                businessCount: business,
                individualCount: userList.length - (corporate + business)
            }));
            setLoading(false);
        });

        // 3. Gelir
        const unsubIncome = onSnapshot(query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'saas_income')), (snapshot) => {
            let total = 0;
            snapshot.docs.forEach(d => total += Number(d.data().amount || 0));
            setStats(prev => ({ ...prev, totalRevenue: total }));
        });

        // 4. Son İşlem Logları (Son 20)
        const unsubLogs = onSnapshot(query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_logs'), orderBy('createdAt', 'desc'), limit(20)), (snapshot) => {
            setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubUsers(); unsubIncome(); unsubLogs(); };
    }, []);

    // Kullanıcı Detay Verisi
    useEffect(() => {
        if (viewUser) {
            const fetchProfile = async () => {
                const ref = doc(db, 'artifacts', 'servis-360-live', 'users', viewUser.id, 'users', 'profile');
                const snap = await getDoc(ref);
                if (snap.exists()) setUserProfileData(snap.data());
                else setUserProfileData({});
            };
            fetchProfile();
        } else {
            setUserProfileData(null);
        }
    }, [viewUser]);

    // --- FONKSİYONLAR ---

    // 1. Log Kaydetme Fonksiyonu
    const logAction = async (action: string, details: string) => {
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_logs'), {
            action,
            details,
            adminEmail: currentUser?.email || 'Unknown',
            createdAt: serverTimestamp()
        });
    };

    // 2. Firma Personeli Çek
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
            const staffRef = collection(db, 'artifacts', 'servis-360-live', 'users', companyId, 'staff');
            const staffSnap = await getDocs(staffRef);
            setCompanyStaff(staffSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error(error); } finally { setLoadingStaff(false); }
    };

    // 3. Duyuru Kaydet
    const saveBroadcast = async () => {
        try {
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'broadcast'), broadcast);
            await logAction('BROADCAST_UPDATE', `Duyuru güncellendi: ${broadcast.message}`);
            alert("✅ Duyuru yayınlandı/güncellendi!");
        } catch (error) { alert("Hata oluştu"); }
    };

    // 4. Manuel İşlem & Satış
    const processTransaction = async (userId: string, userName: string, amount: number, months: number, description: string, refCode: string) => {
        const batchDate = serverTimestamp();
        // Gelir Kaydı
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'saas_income'), {
            amount: Number(amount), userId, userName, description, type: 'income', refCode, createdAt: batchDate
        });
        // Kullanıcı Gider Kaydı
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', userId, 'finance'), {
            amount: Number(amount), type: 'expense', category: 'Lisans', title: 'Servis360', description, date: batchDate, createdAt: batchDate
        });

        // Süre Uzatma
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

        await logAction('MANUAL_SALE', `${userName} kullanıcısına ${amount}TL tutarında manuel satış yapıldı.`);
    };

    const handleManualSale = async () => {
        if (!saleForm.amount) return;
        await processTransaction(saleTargetUser.id, saleTargetUser.fullName, Number(saleForm.amount), Number(saleForm.months), saleForm.description, 'MANUEL');
        setShowSaleModal(false);
        alert("Satış eklendi.");
    };

    // Limit Hesaplayıcılar (Admin Görüntüleme için)
    const calculateLimits = (user: any, profile: any) => {
        let baseBranch = 1; let baseStaff = 1;
        if (['corporate', 'company', 'enterprise'].includes(user.accountType)) { baseBranch = 5; baseStaff = 50; }
        else if (['esnaf', 'business', 'tradesman'].includes(user.accountType)) { baseBranch = 1; baseStaff = 5; }

        const extraBranch = profile?.customBranchLimit || 0;
        const extraStaff = profile?.customStaffLimit || 0;
        return {
            branch: { base: baseBranch, extra: extraBranch, total: baseBranch + extraBranch },
            staff: { base: baseStaff, extra: extraStaff, total: baseStaff + extraStaff }
        };
    };

    const handleBuyLimit = async (type: 'branch' | 'staff') => {
        if (!viewUser || !userProfileData) return;
        const price = 800;
        const limits = calculateLimits(viewUser, userProfileData);
        const currentExtra = type === 'branch' ? limits.branch.extra : limits.staff.extra;
        const newExtra = currentExtra + 1;

        if (!confirm(`${viewUser.fullName} için Ek ${type === 'branch' ? 'Şube' : 'Personel'} Hakkı tanımlanacak (+1).\nÜcret: ${price} TL`)) return;

        try {
            const field = type === 'branch' ? 'customBranchLimit' : 'customStaffLimit';
            const logMsg = type === 'branch' ? 'Ek Şube (+1)' : 'Ek Personel (+1)';

            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', viewUser.id, 'users', 'profile'), { [field]: newExtra });
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', viewUser.id), { [field]: newExtra });

            await processTransaction(viewUser.id, viewUser.fullName, price, 0, `${logMsg} Satın Alımı`, `${type.toUpperCase()}_UPGRADE`);

            setUserProfileData({ ...userProfileData, [field]: newExtra });
            alert("İşlem Başarılı!");
        } catch (err) { alert("Hata"); }
    };

    const deleteUser = async (userId: string) => {
        if (confirm("Kullanıcı silinsin mi? (DİKKAT: Bu işlem geri alınamaz)")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId));
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile'));
            await logAction('DELETE_USER', `${userId} ID'li kullanıcı silindi.`);
            alert("Kullanıcı silindi.");
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('tr-TR');
        return new Date(timestamp).toLocaleDateString('tr-TR');
    };

    const filteredUsers = users.filter(u =>
        u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <RoleGuard allowedRoles={['super_admin']}>
            <div className="min-h-screen bg-slate-950 text-slate-300 font-sans pb-32">

                {/* --- HEADER --- */}
                <div className="bg-slate-900 border-b border-slate-800 p-6 sticky top-0 z-30 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-blue-600" />
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight">SERVİS360 KOMUTA MERKEZİ</h1>
                            <p className="text-xs text-slate-500 font-mono">SİSTEM_VERSİYONU_V3.0</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Toplam Ciro</span>
                            <p className="text-2xl font-black text-green-400 font-mono">{stats.totalRevenue.toLocaleString('tr-TR')} ₺</p>
                        </div>
                        <div className="w-px h-8 bg-slate-800"></div>
                        <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Aktif Üye</span>
                            <p className="text-2xl font-black text-white font-mono">{stats.activeUsers}</p>
                        </div>
                    </div>
                </div>

                {/* --- NAVİGASYON (TABS) --- */}
                <div className="border-b border-slate-800 bg-slate-900/50 px-6">
                    <div className="flex gap-6 overflow-x-auto">
                        <button onClick={() => setActiveTab('dashboard')} className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-white'}`}>
                            <LayoutDashboard className="w-4 h-4" /> Özet & Analiz
                        </button>
                        <button onClick={() => setActiveTab('users')} className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-white'}`}>
                            <Users className="w-4 h-4" /> Kullanıcılar
                        </button>
                        <button onClick={() => setActiveTab('broadcast')} className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'broadcast' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-white'}`}>
                            <Megaphone className="w-4 h-4" /> Duyurular
                        </button>
                        <button onClick={() => setActiveTab('logs')} className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-white'}`}>
                            <Activity className="w-4 h-4" /> Sistem Logları
                        </button>
                    </div>
                </div>

                <div className="p-6 max-w-7xl mx-auto">

                    {/* --- TAB 1: DASHBOARD (ÖZET) --- */}
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in">
                            {/* KARTLAR */}
                            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-blue-500/10 rounded-lg"><User className="w-6 h-6 text-blue-500" /></div>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">BİREYSEL</span>
                                </div>
                                <h3 className="text-3xl font-black text-white">{stats.individualCount}</h3>
                                <p className="text-xs text-slate-500 mt-1">Tekil kullanıcılar</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-yellow-500/10 rounded-lg"><Store className="w-6 h-6 text-yellow-500" /></div>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">ESNAF</span>
                                </div>
                                <h3 className="text-3xl font-black text-white">{stats.businessCount}</h3>
                                <p className="text-xs text-slate-500 mt-1">Küçük işletmeler</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-purple-500/10 rounded-lg"><Building2 className="w-6 h-6 text-purple-500" /></div>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">KURUMSAL</span>
                                </div>
                                <h3 className="text-3xl font-black text-white">{stats.corporateCount}</h3>
                                <p className="text-xs text-slate-500 mt-1">Büyük firmalar</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-2 bg-red-500/10 rounded-lg"><X className="w-6 h-6 text-red-500" /></div>
                                    <span className="text-xs font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded">PASİF</span>
                                </div>
                                <h3 className="text-3xl font-black text-white">{stats.expiredUsers}</h3>
                                <p className="text-xs text-slate-500 mt-1">Süresi dolanlar</p>
                            </div>

                            {/* Görsel Dağılım Çubuğu */}
                            <div className="col-span-1 md:col-span-2 lg:col-span-4 bg-slate-900 border border-slate-800 p-6 rounded-xl mt-4">
                                <h3 className="text-sm font-bold text-white mb-4">PAKET DAĞILIMI</h3>
                                <div className="flex h-6 w-full rounded-full overflow-hidden bg-slate-800">
                                    <div style={{ width: `${(stats.corporateCount / users.length) * 100}%` }} className="bg-purple-600 h-full"></div>
                                    <div style={{ width: `${(stats.businessCount / users.length) * 100}%` }} className="bg-yellow-500 h-full"></div>
                                    <div style={{ width: `${(stats.individualCount / users.length) * 100}%` }} className="bg-blue-500 h-full"></div>
                                </div>
                                <div className="flex gap-6 mt-4 text-xs font-bold">
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-600"></div> Kurumsal %{Math.round((stats.corporateCount / users.length) * 100)}</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Esnaf %{Math.round((stats.businessCount / users.length) * 100)}</div>
                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Bireysel %{Math.round((stats.individualCount / users.length) * 100)}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 2: KULLANICILAR (LİSTE) --- */}
                    {activeTab === 'users' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in">
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                                <h3 className="font-bold text-white">KULLANICI DİZİNİ</h3>
                                <div className="relative">
                                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                                    <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Ara..." className="bg-black border border-slate-700 text-white text-sm p-2 pl-9 rounded w-64 focus:border-blue-500 outline-none" />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs text-slate-400">
                                    <thead className="text-slate-500 bg-slate-950 uppercase border-b border-slate-800">
                                        <tr>
                                            <th className="p-4 w-8"></th>
                                            <th className="p-4">Kullanıcı</th>
                                            <th className="p-4">Paket</th>
                                            <th className="p-4">Lisans</th>
                                            <th className="p-4">Durum</th>
                                            <th className="p-4 text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {filteredUsers.map(u => (
                                            <>
                                                <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                                                    <td className="p-4">
                                                        {isBusinessOwner(u) && (
                                                            <button onClick={() => toggleCompanyStaff(u.id)} className="p-1 hover:bg-slate-700 rounded">
                                                                {expandedCompanyId === u.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                            </button>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-white">{u.fullName}</div>
                                                        <div className="text-[10px] text-slate-500">{u.companyName || u.email}</div>
                                                    </td>
                                                    <td className="p-4">
                                                        {['corporate', 'company'].includes(u.accountType) ? <span className="text-purple-400 bg-purple-900/20 px-2 py-1 rounded font-bold">Kurumsal</span> :
                                                            ['esnaf', 'business'].includes(u.accountType) ? <span className="text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded font-bold">Esnaf</span> :
                                                                <span className="text-blue-400 bg-blue-900/20 px-2 py-1 rounded font-bold">Bireysel</span>}
                                                    </td>
                                                    <td className="p-4">{u.licenseEndsAt ? formatDate(u.licenseEndsAt) : '-'}</td>
                                                    <td className="p-4">{u.status === 'active' ? <span className="text-green-500 font-bold">Aktif</span> : <span className="text-red-500 font-bold">Pasif</span>}</td>
                                                    <td className="p-4 text-right flex justify-end gap-2">
                                                        <button onClick={() => setViewUser(u)} className="p-2 hover:bg-slate-700 rounded text-blue-400"><Eye className="w-4 h-4" /></button>
                                                        <button onClick={() => { setSaleTargetUser(u); setShowSaleModal(true); }} className="p-2 hover:bg-slate-700 rounded text-yellow-500"><Wallet className="w-4 h-4" /></button>
                                                        <button onClick={() => deleteUser(u.id)} className="p-2 hover:bg-slate-700 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                    </td>
                                                </tr>
                                                {expandedCompanyId === u.id && (
                                                    <tr className="bg-slate-900/50">
                                                        <td colSpan={6} className="p-4 pl-12 border-b border-slate-800">
                                                            <p className="text-xs font-bold text-slate-500 mb-2">FİRMA PERSONELİ</p>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                                {loadingStaff ? <span>Yükleniyor...</span> : companyStaff.map(s => (
                                                                    <div key={s.id} className="bg-black border border-slate-700 p-2 rounded flex items-center justify-between">
                                                                        <span className="text-white text-xs">{s.fullName}</span>
                                                                        <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                                    </div>
                                                                ))}
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
                    )}

                    {/* --- TAB 3: BROADCAST (DUYURULAR) --- */}
                    {activeTab === 'broadcast' && (
                        <div className="max-w-2xl mx-auto animate-in fade-in">
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Megaphone className="w-5 h-5 text-yellow-500" /> GLOBAL DUYURU SİSTEMİ</h3>
                                <p className="text-sm text-slate-400 mb-6">Buraya yazdığınız mesaj, tüm kullanıcıların panelinde en üstte görünür.</p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 block mb-1">Duyuru Mesajı</label>
                                        <input
                                            value={broadcast.message}
                                            onChange={e => setBroadcast({ ...broadcast, message: e.target.value })}
                                            className="w-full bg-black border border-slate-700 text-white p-3 rounded focus:border-yellow-500 outline-none"
                                            placeholder="Örn: Bu gece 03:00'da bakım çalışması yapılacaktır."
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 block mb-1">Mesaj Tipi</label>
                                            <select
                                                value={broadcast.type}
                                                onChange={e => setBroadcast({ ...broadcast, type: e.target.value })}
                                                className="w-full bg-black border border-slate-700 text-white p-3 rounded outline-none"
                                            >
                                                <option value="info">Mavi (Bilgi)</option>
                                                <option value="warning">Sarı (Uyarı)</option>
                                                <option value="error">Kırmızı (Kritik)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 block mb-1">Durum</label>
                                            <button
                                                onClick={() => setBroadcast({ ...broadcast, isActive: !broadcast.isActive })}
                                                className={`w-full p-3 rounded font-bold text-sm transition-colors ${broadcast.isActive ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                                            >
                                                {broadcast.isActive ? 'AKTİF (YAYINDA)' : 'PASİF (GİZLİ)'}
                                            </button>
                                        </div>
                                    </div>
                                    <button onClick={saveBroadcast} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded mt-4 flex items-center justify-center gap-2">
                                        <Save className="w-4 h-4" /> AYARLARI KAYDET
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 4: LOGS (İŞLEM GEÇMİŞİ) --- */}
                    {activeTab === 'logs' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in">
                            <div className="p-4 border-b border-slate-800">
                                <h3 className="font-bold text-white flex items-center gap-2"><FileText className="w-4 h-4" /> SON SİSTEM LOGLARI (20)</h3>
                            </div>
                            <table className="w-full text-left text-xs text-slate-400">
                                <thead className="bg-slate-950 text-slate-500 uppercase">
                                    <tr>
                                        <th className="p-3">Zaman</th>
                                        <th className="p-3">İşlem</th>
                                        <th className="p-3">Detay</th>
                                        <th className="p-3">Yapan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-800/30">
                                            <td className="p-3 font-mono text-slate-500">{formatDate(log.createdAt)}</td>
                                            <td className="p-3 font-bold text-blue-400">{log.action}</td>
                                            <td className="p-3 text-white">{log.details}</td>
                                            <td className="p-3 text-slate-500">{log.adminEmail}</td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && <tr><td colSpan={4} className="p-6 text-center italic">Henüz log kaydı yok.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                </div>

                {/* --- MODALLAR (SATIŞ & DETAY) --- */}

                {/* Manuel Satış Modalı */}
                {showSaleModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-yellow-600 p-6 rounded w-full max-w-sm shadow-2xl">
                            <h3 className="text-white font-bold mb-4">Manuel Satış Ekle</h3>
                            <p className="text-xs text-slate-400 mb-4 bg-black p-2 rounded">Kullanıcı: {saleTargetUser?.fullName}</p>
                            <input type="number" placeholder="Tutar (TL)" className="w-full bg-black border border-slate-700 p-3 mb-2 text-white rounded" value={saleForm.amount} onChange={e => setSaleForm({ ...saleForm, amount: e.target.value })} />
                            <input type="number" placeholder="Süre (Ay)" className="w-full bg-black border border-slate-700 p-3 mb-2 text-white rounded" value={saleForm.months} onChange={e => setSaleForm({ ...saleForm, months: e.target.value })} />
                            <input type="text" placeholder="Açıklama" className="w-full bg-black border border-slate-700 p-3 mb-4 text-white rounded" value={saleForm.description} onChange={e => setSaleForm({ ...saleForm, description: e.target.value })} />
                            <div className="flex gap-2">
                                <button onClick={handleManualSale} className="flex-1 bg-yellow-600 text-black font-bold p-3 rounded">KAYDET</button>
                                <button onClick={() => setShowSaleModal(false)} className="flex-1 bg-slate-800 text-white p-3 rounded">İPTAL</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Kullanıcı Detay Modalı */}
                {viewUser && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setViewUser(null)}>
                        <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900">
                                <h3 className="font-bold text-white flex gap-2"><User className="w-5 h-5 text-blue-500" /> {viewUser.fullName}</h3>
                                <button onClick={() => setViewUser(null)}><X className="text-slate-500 hover:text-white" /></button>
                            </div>
                            <div className="p-6 space-y-6">
                                {/* Üst Bilgiler */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/30 p-4 rounded border border-slate-800">
                                        <p className="text-xs text-slate-500 uppercase font-bold">PAKET</p>
                                        <p className="text-white font-bold">{viewUser.accountType}</p>
                                    </div>
                                    <div className="bg-black/30 p-4 rounded border border-slate-800">
                                        <p className="text-xs text-slate-500 uppercase font-bold">LİSANS BİTİŞ</p>
                                        <p className="text-white font-bold font-mono">{formatDate(viewUser.licenseEndsAt)}</p>
                                    </div>
                                </div>

                                {/* Şube & Personel Yönetimi (Sadece İşletme Sahipleri İçin) */}
                                {isBusinessOwner(viewUser) && userProfileData && (
                                    <div className="space-y-4">
                                        <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-white font-bold flex gap-2"><Store className="w-4 h-4" /> Şube Hakkı</span>
                                                <span className="text-green-400 font-bold text-lg">
                                                    {calculateLimits(viewUser, userProfileData).branch.total}
                                                </span>
                                            </div>
                                            <button onClick={() => handleBuyLimit('branch')} className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold p-2 rounded flex items-center justify-center gap-1">
                                                <Plus className="w-3 h-3" /> Ek Şube Sat (800₺)
                                            </button>
                                        </div>

                                        <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-white font-bold flex gap-2"><Users className="w-4 h-4" /> Personel Hakkı</span>
                                                <span className="text-green-400 font-bold text-lg">
                                                    {calculateLimits(viewUser, userProfileData).staff.total}
                                                </span>
                                            </div>
                                            <button onClick={() => handleBuyLimit('staff')} className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold p-2 rounded flex items-center justify-center gap-1">
                                                <Plus className="w-3 h-3" /> Ek Personel Sat (800₺)
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </RoleGuard>
    );
}