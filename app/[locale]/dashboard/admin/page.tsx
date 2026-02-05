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
    orderBy,
    limit,
    getDocs
} from 'firebase/firestore';

// 👇 PROJE İÇİ IMPORTLAR
import { auth, db } from '../../../../lib/firebase';
import RoleGuard from '../../../../components/auth/role-guard';

// 👇 DÜZELTME: Eksik ikonlar eklendi
import {
    ShieldAlert, Search, Trash2, Users, Save,
    LayoutDashboard, Megaphone, Wallet,
    X, Building2, Store, User,
    Briefcase, Activity, Clock, Moon, ArrowUpDown, AlertTriangle, CheckCircle2,
    ChevronDown, ChevronRight, Eye, Plus, Settings, Globe, Phone, MapPin
} from 'lucide-react';

export default function AdminPage() {
    // --- STATE YÖNETİMİ ---
    const [activeTab, setActiveTab] = useState('dashboard');
    const [users, setUsers] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Sıralama State'i
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    // İstatistikler
    const [stats, setStats] = useState({
        totalRevenue: 0,
        activeUsers: 0,
        expiredUsers: 0,
        corporateCount: 0,
        businessCount: 0,
        individualCount: 0,
        staffCount: 0,
        sleepyUsers: 0
    });

    const [currentUser, setCurrentUser] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, company, staff

    // Duyuru Sistemi
    const [broadcast, setBroadcast] = useState({
        message: '',
        isActive: false,
        type: 'info'
    });

    // 🔥 İLETİŞİM AYARLARI (YENİ)
    const [contactConfig, setContactConfig] = useState({
        whatsappTR: '',
        whatsappDE: '',
        addressTR: '',
        addressDE: ''
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
    const staffRoles = ['staff', 'personnel', 'employee', 'technical', 'technician', 'sales', 'accountant', 'satis', 'muhasebe', 'teknik'];

    const isStaff = (u: any) => {
        if (!u?.role) return false;
        return staffRoles.includes(u.role.toLowerCase());
    };

    const isBusinessOwner = (u: any) => {
        if (!u) return false;
        if (isStaff(u)) return false;
        return ['corporate', 'company', 'enterprise', 'business', 'esnaf', 'tradesman'].includes(u.accountType);
    };

    // 💤 GÜN HESAPLAYICI
    const getDaysSinceLogin = (lastLoginAt: any) => {
        if (!lastLoginAt) return -999;
        try {
            const date = lastLoginAt.toDate ? lastLoginAt.toDate() : new Date(lastLoginAt);
            if (isNaN(date.getTime())) return -999;
            const diff = new Date().getTime() - date.getTime();
            return Math.floor(diff / (1000 * 3600 * 24));
        } catch (e) {
            return -999;
        }
    };

    // --- VERİ ÇEKME ---
    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        setCurrentUser(user);

        // 1. Duyuru ve İletişim Ayarlarını Çek
        const fetchSettings = async () => {
            try {
                // Duyuru
                const broadcastRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'broadcast');
                const broadcastSnap = await getDoc(broadcastRef);
                if (broadcastSnap.exists()) setBroadcast(broadcastSnap.data() as any);

                // 🔥 İletişim (Contact)
                const contactRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'contact');
                const contactSnap = await getDoc(contactRef);
                if (contactSnap.exists()) setContactConfig(contactSnap.data() as any);

            } catch (e) { console.error("Ayar çekme hatası", e); }
        };
        fetchSettings();

        // 2. Kullanıcılar ve İstatistikler
        const q = query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory'));
        const unsubUsers = onSnapshot(q, (snapshot) => {
            const userList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsers(userList);

            // İstatistik Hesapla
            const active = userList.filter((u: any) => u.status === 'active').length;
            const staff = userList.filter((u: any) => isStaff(u)).length;
            const corporate = userList.filter((u: any) => ['corporate', 'company', 'enterprise'].includes(u.accountType) && !isStaff(u)).length;
            const business = userList.filter((u: any) => ['esnaf', 'business', 'tradesman'].includes(u.accountType) && !isStaff(u)).length;
            const individual = userList.filter((u: any) => (!u.accountType || u.accountType === 'individual') && !isStaff(u)).length;

            const sleepy = userList.filter((u: any) => {
                const days = getDaysSinceLogin(u.lastLoginAt);
                return days > 2;
            }).length;

            setStats(prev => ({
                ...prev,
                activeUsers: active,
                expiredUsers: userList.length - active,
                corporateCount: corporate,
                businessCount: business,
                individualCount: individual,
                staffCount: staff,
                sleepyUsers: sleepy
            }));
            setLoading(false);
        });

        // 3. Gelir (SaaS Income)
        const unsubIncome = onSnapshot(query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'saas_income')), (snapshot) => {
            let total = 0;
            snapshot.docs.forEach(d => total += Number(d.data().amount || 0));
            setStats(prev => ({ ...prev, totalRevenue: total }));
        });

        // 4. Loglar
        const unsubLogs = onSnapshot(query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_logs'), orderBy('createdAt', 'desc'), limit(20)), (snapshot) => {
            setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubUsers(); unsubIncome(); unsubLogs(); };
    }, []);

    // Kullanıcı Detay
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
    const logAction = async (action: string, details: string) => {
        try {
            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_logs'), {
                action, details, adminEmail: currentUser?.email || 'Unknown', createdAt: serverTimestamp()
            });
        } catch (e) { console.error("Log error", e); }
    };

    const toggleCompanyStaff = async (companyId: string) => {
        if (expandedCompanyId === companyId) { setExpandedCompanyId(null); setCompanyStaff([]); return; }
        setExpandedCompanyId(companyId); setLoadingStaff(true); setCompanyStaff([]);
        try {
            const staffRef = collection(db, 'artifacts', 'servis-360-live', 'users', companyId, 'staff');
            const staffSnap = await getDocs(staffRef);
            setCompanyStaff(staffSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error(error); } finally { setLoadingStaff(false); }
    };

    const saveBroadcast = async () => {
        try {
            const settingsRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'broadcast');
            await setDoc(settingsRef, {
                message: broadcast.message,
                isActive: broadcast.isActive,
                type: broadcast.type,
                updatedAt: serverTimestamp()
            }, { merge: true });
            await logAction('BROADCAST_UPDATE', `Duyuru: ${broadcast.message}`);
            alert("✅ Duyuru güncellendi.");
        } catch (error: any) {
            alert(`HATA: ${error.message}`);
        }
    };

    // 🔥 İLETİŞİM AYARLARINI KAYDET
    const saveContactSettings = async () => {
        try {
            const contactRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'contact');
            await setDoc(contactRef, contactConfig, { merge: true });
            await logAction('CONTACT_UPDATE', `İletişim bilgileri güncellendi.`);
            alert("✅ İletişim bilgileri başarıyla kaydedildi!");
        } catch (error: any) {
            alert(`HATA: ${error.message}`);
        }
    };

    const processTransaction = async (userId: string, userName: string, amount: number, months: number, description: string, refCode: string) => {
        const batchDate = serverTimestamp();
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'saas_income'), {
            amount: Number(amount),
            userId, userName, description, type: 'income', refCode, createdAt: batchDate
        });
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', userId, 'finance'), {
            amount: Number(amount),
            type: 'expense', category: 'Lisans', title: 'Servis360', description, date: batchDate, createdAt: batchDate
        });
        if (months > 0) {
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
        }
        await logAction('MANUAL_SALE', `${userName} -> $${amount}`);
    };

    const handleManualSale = async () => {
        if (!saleForm.amount) return;
        if (!confirm(`ONAY: ${saleTargetUser?.fullName} için $${saleForm.amount} tutarında işlem yapılsın mı?`)) return;
        await processTransaction(saleTargetUser.id, saleTargetUser.fullName, Number(saleForm.amount), Number(saleForm.months), saleForm.description, 'MANUEL');
        setShowSaleModal(false);
        alert("✅ Satış işlendi.");
    };

    const calculateLimits = (user: any, profile: any) => {
        let baseBranch = 1; let baseStaff = 1;
        if (['corporate', 'company', 'enterprise'].includes(user.accountType)) { baseBranch = 5; baseStaff = 50; }
        else if (['esnaf', 'business', 'tradesman'].includes(user.accountType)) { baseBranch = 1; baseStaff = 5; }
        const extraBranch = profile?.customBranchLimit || 0;
        const extraStaff = profile?.customStaffLimit || 0;
        return { branch: { base: baseBranch, extra: extraBranch, total: baseBranch + extraBranch }, staff: { base: baseStaff, extra: extraStaff, total: baseStaff + extraStaff } };
    };

    const handleBuyLimit = async (type: 'branch' | 'staff') => {
        if (!viewUser || !userProfileData) return;
        const priceStr = prompt(`Ek ${type === 'branch' ? 'Şube' : 'Personel'} için ücret ($):`, "800");
        if (priceStr === null) return;
        const price = Number(priceStr);
        if (isNaN(price)) return alert("Geçersiz sayı");

        const limits = calculateLimits(viewUser, userProfileData);
        const currentExtra = type === 'branch' ? limits.branch.extra : limits.staff.extra;
        const newExtra = currentExtra + 1;

        if (!confirm(`${viewUser.fullName} için Ek ${type} (+1) onaylıyor musunuz? Tutar: $${price}`)) return;

        try {
            const field = type === 'branch' ? 'customBranchLimit' : 'customStaffLimit';
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', viewUser.id, 'users', 'profile'), { [field]: newExtra });
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', viewUser.id), { [field]: newExtra });
            if (price > 0) {
                await processTransaction(viewUser.id, viewUser.fullName, price, 0, `Ek ${type} Satışı`, `${type.toUpperCase()}_UPGRADE`);
            } else {
                await logAction('FREE_UPGRADE', `${viewUser.fullName} -> Ücretsiz ek hak tanımlandı.`);
            }
            setUserProfileData({ ...userProfileData, [field]: newExtra });
            alert("✅ İşlem Başarılı");
        } catch (err: any) { alert(`Hata: ${err.message}`); }
    };

    const deleteUser = async (userId: string) => {
        const confirm1 = confirm("⚠️ DİKKAT: Kullanıcı verilerini silmek üzeresiniz. Bu işlem geri alınamaz.");
        if (!confirm1) return;

        const confirm2 = confirm("⚠️ GÜVENLİK UYARISI: Bu işlem sadece Veritabanı ve Profil verilerini siler.\n\nFirebase Authentication (Giriş) kaydı tarayıcı üzerinden silinemez. Kullanıcıyı Firebase Konsol'dan da manuel silmeniz gerekmektedir.\n\nDevam edilsin mi?");
        if (!confirm2) return;

        await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId));
        await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile'));
        await logAction('DELETE_USER', `ID: ${userId}`);
        alert("✅ Veriler silindi. Auth kaydını silmeyi unutmayın.");
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('tr-TR');
        return new Date(timestamp).toLocaleDateString('tr-TR');
    };

    // --- SIRALAMA VE FİLTRELEME ---
    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    let filteredUsers = users.filter(u => {
        const matchesSearch = u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;
        if (filterType === 'company') return !isStaff(u);
        if (filterType === 'staff') return isStaff(u);
        return true;
    });

    if (sortConfig) {
        filteredUsers.sort((a, b) => {
            let valA = a[sortConfig.key] || '';
            let valB = b[sortConfig.key] || '';

            // Tarih kontrolü
            if (sortConfig.key === 'lastLoginAt' || sortConfig.key === 'licenseEndsAt') {
                valA = valA?.toDate ? valA.toDate().getTime() : 0;
                valB = valB?.toDate ? valB.toDate().getTime() : 0;
            } else {
                valA = valA.toString().toLowerCase();
                valB = valB.toString().toLowerCase();
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    const getUserBadge = (u: any) => {
        if (isStaff(u)) return <span className="text-slate-300 bg-slate-800 px-2 py-1 rounded font-bold flex items-center gap-1 w-fit border border-slate-700"><Briefcase className="w-3 h-3" /> Personel</span>;
        else if (['corporate', 'company', 'enterprise'].includes(u.accountType)) return <span className="text-purple-400 bg-purple-900/20 px-2 py-1 rounded font-bold w-fit">Kurumsal</span>;
        else if (['business', 'esnaf', 'tradesman'].includes(u.accountType)) return <span className="text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded font-bold w-fit">Esnaf</span>;
        else return <span className="text-blue-400 bg-blue-900/20 px-2 py-1 rounded font-bold w-fit">Bireysel</span>;
    };

    return (
        <RoleGuard allowedRoles={['super_admin']}>
            <div className="min-h-screen bg-slate-950 text-slate-300 font-sans pb-32">
                {/* --- HEADER --- */}
                <div className="bg-slate-900 border-b border-slate-800 p-6 sticky top-0 z-30 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-blue-600" />
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight">SERVİS360 KOMUTA MERKEZİ</h1>
                            <p className="text-xs text-slate-500 font-mono">SİSTEM_VERSİYONU_V5.1 (PATCHED)</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Toplam Ciro</span>
                            <p className="text-2xl font-black text-green-400 font-mono">${stats.totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-800"></div>
                        <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Aktif Üye</span>
                            <p className="text-2xl font-black text-white font-mono">{stats.activeUsers}</p>
                        </div>
                    </div>
                </div>

                {/* --- NAVİGASYON --- */}
                <div className="border-b border-slate-800 bg-slate-900/50 px-6">
                    <div className="flex gap-6 overflow-x-auto">
                        <button onClick={() => setActiveTab('dashboard')} className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-white'}`}><LayoutDashboard className="w-4 h-4" /> Özet</button>
                        <button onClick={() => setActiveTab('users')} className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'users' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-white'}`}><Users className="w-4 h-4" /> Kullanıcılar</button>
                        <button onClick={() => setActiveTab('broadcast')} className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'broadcast' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-white'}`}><Megaphone className="w-4 h-4" /> Duyurular</button>
                        <button onClick={() => setActiveTab('logs')} className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-white'}`}><Activity className="w-4 h-4" /> Loglar</button>
                        {/* 🔥 YENİ TAB: AYARLAR */}
                        <button onClick={() => setActiveTab('settings')} className={`py-4 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'settings' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-white'}`}><Settings className="w-4 h-4" /> Ayarlar</button>
                    </div>
                </div>

                <div className="p-6 max-w-7xl mx-auto">
                    {/* --- TAB: DASHBOARD --- */}
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in">
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                <div className="flex justify-between mb-2"><User className="text-blue-500" /><span className="text-[10px] bg-slate-800 px-2 rounded">BİREYSEL</span></div>
                                <h3 className="text-2xl font-black text-white">{stats.individualCount}</h3>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                <div className="flex justify-between mb-2"><Store className="text-yellow-500" /><span className="text-[10px] bg-slate-800 px-2 rounded">ESNAF</span></div>
                                <h3 className="text-2xl font-black text-white">{stats.businessCount}</h3>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                                <div className="flex justify-between mb-2"><Building2 className="text-purple-500" /><span className="text-[10px] bg-slate-800 px-2 rounded">KURUMSAL</span></div>
                                <h3 className="text-2xl font-black text-white">{stats.corporateCount}</h3>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl bg-slate-800/30">
                                <div className="flex justify-between mb-2"><Briefcase className="text-slate-400" /><span className="text-[10px] bg-slate-800 px-2 rounded">PERSONEL</span></div>
                                <h3 className="text-2xl font-black text-slate-300">{stats.staffCount}</h3>
                                <p className="text-[10px] text-slate-500">Alt Kullanıcılar</p>
                            </div>
                            <div className="bg-slate-900 border border-red-900/30 p-4 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-2 opacity-10"><Moon className="w-12 h-12 text-red-500" /></div>
                                <div className="flex justify-between mb-2"><Clock className="text-red-500" /><span className="text-[10px] bg-red-900/20 text-red-400 px-2 rounded font-bold">UYUYANLAR</span></div>
                                <h3 className="text-2xl font-black text-white">{stats.sleepyUsers}</h3>
                                <p className="text-[10px] text-red-400">2+ Gündür girmeyen</p>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: USERS --- */}
                    {activeTab === 'users' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in">
                            <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-white">KULLANICI DİZİNİ</h3>
                                    <div className="flex bg-black rounded p-1 ml-4 border border-slate-700">
                                        <button onClick={() => setFilterType('all')} className={`px-3 py-1 text-xs font-bold rounded ${filterType === 'all' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>Tümü</button>
                                        <button onClick={() => setFilterType('company')} className={`px-3 py-1 text-xs font-bold rounded ${filterType === 'company' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>Sadece Şirketler</button>
                                        <button onClick={() => setFilterType('staff')} className={`px-3 py-1 text-xs font-bold rounded ${filterType === 'staff' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white'}`}>Sadece Personel</button>
                                    </div>
                                </div>
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
                                            <th onClick={() => requestSort('fullName')} className="p-4 cursor-pointer hover:text-white transition-colors"><div className="flex items-center gap-1">Kullanıcı <ArrowUpDown className="w-3 h-3" /></div></th>
                                            <th className="p-4">Tip / Paket</th>
                                            <th onClick={() => requestSort('licenseEndsAt')} className="p-4 cursor-pointer hover:text-white transition-colors"><div className="flex items-center gap-1">Lisans <ArrowUpDown className="w-3 h-3" /></div></th>
                                            <th className="p-4">Durum</th>
                                            <th onClick={() => requestSort('lastLoginAt')} className="p-4 cursor-pointer hover:text-white transition-colors"><div className="flex items-center gap-1">Son Görülme <ArrowUpDown className="w-3 h-3" /></div></th>
                                            <th className="p-4 text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {filteredUsers.map(u => {
                                            const daysOffline = getDaysSinceLogin(u.lastLoginAt);
                                            return (
                                                <>
                                                    <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                                                        <td className="p-4">
                                                            {isBusinessOwner(u) && (
                                                                <button onClick={() => toggleCompanyStaff(u.id)} className="p-1 hover:bg-slate-700 rounded text-blue-500">
                                                                    {expandedCompanyId === u.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="font-bold text-white flex items-center gap-2">{u.fullName}</div>
                                                            <div className="text-[10px] text-slate-500">{u.companyName || u.email}</div>
                                                        </td>
                                                        <td className="p-4">{getUserBadge(u)}</td>
                                                        <td className="p-4">{u.licenseEndsAt ? formatDate(u.licenseEndsAt) : '-'}</td>
                                                        <td className="p-4">{u.status === 'active' ? <span className="text-green-500 font-bold">Aktif</span> : <span className="text-red-500 font-bold">Pasif</span>}</td>
                                                        <td className="p-4">
                                                            {daysOffline === -999 ? (
                                                                <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1 w-fit cursor-help" title="Kullanıcı giriş yapıyor olabilir ancak DB'ye yazılmıyor. Login kodunu kontrol et.">
                                                                    <AlertTriangle className="w-3 h-3 text-yellow-500" /> Veri Yok
                                                                </span>
                                                            ) : daysOffline === -1 || daysOffline === 0 ? (
                                                                <span className="text-[10px] text-green-400 bg-green-900/20 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                                                                    <CheckCircle2 className="w-3 h-3" /> Online
                                                                </span>
                                                            ) : (
                                                                <span className="text-[10px] text-red-400 bg-red-900/20 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                                                                    <Moon className="w-3 h-3" /> {daysOffline} gün yok
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-right flex justify-end gap-2">
                                                            <button onClick={() => setViewUser(u)} className="p-2 hover:bg-slate-700 rounded text-blue-400"><Eye className="w-4 h-4" /></button>
                                                            <button onClick={() => { setSaleTargetUser(u); setShowSaleModal(true); }} className="p-2 hover:bg-slate-700 rounded text-yellow-500"><Wallet className="w-4 h-4" /></button>
                                                            <button onClick={() => deleteUser(u.id)} className="p-2 hover:bg-slate-700 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                        </td>
                                                    </tr>
                                                    {expandedCompanyId === u.id && (
                                                        <tr className="bg-slate-900/50 animate-in fade-in">
                                                            <td colSpan={7} className="p-4 pl-12 border-b border-slate-800">
                                                                <p className="text-xs font-bold text-slate-500 mb-2">FİRMA PERSONELİ</p>
                                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                                    {loadingStaff ? <span>Yükleniyor...</span> : companyStaff.map(s => (
                                                                        <div key={s.id} className="bg-black border border-slate-700 p-2 rounded flex items-center justify-between">
                                                                            <div>
                                                                                <div className="text-white text-xs font-bold">{s.fullName}</div>
                                                                                <div className="text-[10px] text-slate-500">{s.role}</div>
                                                                            </div>
                                                                            <div className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                                        </div>
                                                                    ))}
                                                                    {companyStaff.length === 0 && <span className="text-xs text-slate-600 italic">Personel yok.</span>}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: BROADCAST --- */}
                    {activeTab === 'broadcast' && (
                        <div className="max-w-2xl mx-auto animate-in fade-in">
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Megaphone className="w-5 h-5 text-yellow-500" /> GLOBAL DUYURU</h3>
                                <div className="bg-blue-900/20 p-4 rounded border border-blue-900/50 mb-4 text-xs text-blue-200">
                                    <p className="font-bold">💡 BİLGİ:</p>
                                    <p>Buradan yayınlanan duyuru <code>public/data/system_settings/broadcast</code> yoluna yazılır. Kullanıcı dashboard'unda bu veriyi okuyan bir Alert bileşeni olduğundan emin olun.</p>
                                </div>
                                <div className="space-y-4">
                                    <input value={broadcast.message} onChange={e => setBroadcast({ ...broadcast, message: e.target.value })} className="w-full bg-black border border-slate-700 text-white p-3 rounded outline-none" placeholder="Duyuru mesajı..." />
                                    <div className="grid grid-cols-2 gap-4">
                                        <select value={broadcast.type} onChange={e => setBroadcast({ ...broadcast, type: e.target.value })} className="bg-black border border-slate-700 text-white p-3 rounded outline-none"><option value="info">Mavi (Bilgi)</option><option value="warning">Sarı (Uyarı)</option><option value="error">Kırmızı (Kritik)</option></select>
                                        <button onClick={() => setBroadcast({ ...broadcast, isActive: !broadcast.isActive })} className={`rounded font-bold text-sm ${broadcast.isActive ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400'}`}>{broadcast.isActive ? 'YAYINDA' : 'GİZLİ'}</button>
                                    </div>
                                    <button onClick={saveBroadcast} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded flex justify-center gap-2"><Save className="w-4 h-4" /> KAYDET</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 🔥 TAB: AYARLAR (YENİ) */}
                    {activeTab === 'settings' && (
                        <div className="max-w-3xl mx-auto animate-in fade-in">
                            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-blue-500" /> BÖLGESEL AYARLAR & İLETİŞİM
                                </h3>

                                {/* Türkiye Ayarları */}
                                <div className="mb-8 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-2xl">🇹🇷</span>
                                        <h4 className="font-bold text-white">TÜRKİYE BÖLGESİ</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> WhatsApp Numarası (+90...)</label>
                                            <input
                                                value={contactConfig.whatsappTR}
                                                onChange={e => setContactConfig({ ...contactConfig, whatsappTR: e.target.value })}
                                                className="w-full bg-black border border-slate-700 text-white p-3 rounded outline-none focus:border-blue-500"
                                                placeholder="90555..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Adres (Görünen)</label>
                                            <input
                                                value={contactConfig.addressTR}
                                                onChange={e => setContactConfig({ ...contactConfig, addressTR: e.target.value })}
                                                className="w-full bg-black border border-slate-700 text-white p-3 rounded outline-none focus:border-blue-500"
                                                placeholder="Örn: Teknopark İstanbul, Pendik/İstanbul"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Almanya Ayarları */}
                                <div className="mb-8 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="text-2xl">🇩🇪</span>
                                        <h4 className="font-bold text-white">ALMANYA & GLOBAL</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> WhatsApp Numarası (+49...)</label>
                                            <input
                                                value={contactConfig.whatsappDE}
                                                onChange={e => setContactConfig({ ...contactConfig, whatsappDE: e.target.value })}
                                                className="w-full bg-black border border-slate-700 text-white p-3 rounded outline-none focus:border-blue-500"
                                                placeholder="4915..."
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Adres (Görünen)</label>
                                            <input
                                                value={contactConfig.addressDE}
                                                onChange={e => setContactConfig({ ...contactConfig, addressDE: e.target.value })}
                                                className="w-full bg-black border border-slate-700 text-white p-3 rounded outline-none focus:border-blue-500"
                                                placeholder="Örn: Friedrichstraße 123, 10117 Berlin"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button onClick={saveContactSettings} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl flex justify-center gap-2 transition-all transform hover:scale-[1.02]">
                                    <Save className="w-5 h-5" /> AYARLARI KAYDET
                                </button>
                            </div>
                        </div>
                    )}

                    {/* --- TAB: LOGS --- */}
                    {activeTab === 'logs' && (
                        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in">
                            <div className="p-4 border-b border-slate-800"><h3 className="font-bold text-white">SON SİSTEM LOGLARI</h3></div>
                            <table className="w-full text-left text-xs text-slate-400">
                                <thead className="bg-slate-950 text-slate-500 uppercase"><tr><th className="p-3">Zaman</th><th className="p-3">İşlem</th><th className="p-3">Detay</th><th className="p-3">Yapan</th></tr></thead>
                                <tbody className="divide-y divide-slate-800">
                                    {logs.map(log => (
                                        <tr key={log.id} className="hover:bg-slate-800/30">
                                            <td className="p-3 font-mono text-slate-500">{formatDate(log.createdAt)}</td>
                                            <td className="p-3 font-bold text-blue-400">{log.action}</td>
                                            <td className="p-3 text-white">{log.details}</td>
                                            <td className="p-3 text-slate-500">{log.adminEmail}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* MODAL: MANUEL SATIŞ */}
                {showSaleModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                        <div className="bg-slate-900 border border-yellow-600 p-6 rounded w-full max-w-sm shadow-2xl">
                            <h3 className="text-white font-bold mb-4">Manuel Satış Ekle</h3>
                            <p className="text-xs text-slate-400 mb-4 bg-black p-2 rounded">Kullanıcı: {saleTargetUser?.fullName}</p>
                            <input type="number" placeholder="Tutar ($)" className="w-full bg-black border border-slate-700 p-3 mb-2 text-white rounded" value={saleForm.amount} onChange={e => setSaleForm({ ...saleForm, amount: e.target.value })} />
                            <input type="number" placeholder="Süre (Ay)" className="w-full bg-black border border-slate-700 p-3 mb-2 text-white rounded" value={saleForm.months} onChange={e => setSaleForm({ ...saleForm, months: e.target.value })} />
                            <input type="text" placeholder="Açıklama" className="w-full bg-black border border-slate-700 p-3 mb-4 text-white rounded" value={saleForm.description} onChange={e => setSaleForm({ ...saleForm, description: e.target.value })} />
                            <div className="flex gap-2">
                                <button onClick={handleManualSale} className="flex-1 bg-yellow-600 text-black font-bold p-3 rounded">ONAYLA VE KAYDET</button>
                                <button onClick={() => setShowSaleModal(false)} className="flex-1 bg-slate-800 text-white p-3 rounded">İPTAL</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: KULLANICI DETAY */}
                {viewUser && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setViewUser(null)}>
                        <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900">
                                <h3 className="font-bold text-white flex gap-2"><User className="w-5 h-5 text-blue-500" /> {viewUser.fullName}</h3>
                                <button onClick={() => setViewUser(null)}><X className="text-slate-500 hover:text-white" /></button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/30 p-4 rounded border border-slate-800">
                                        <p className="text-xs text-slate-500 uppercase font-bold">PAKET</p>
                                        <p className="text-white font-bold">{getUserBadge(viewUser)}</p>
                                    </div>
                                    <div className="bg-black/30 p-4 rounded border border-slate-800">
                                        <p className="text-xs text-slate-500 uppercase font-bold">LİSANS BİTİŞ</p>
                                        <p className="text-white font-bold font-mono">{formatDate(viewUser.licenseEndsAt)}</p>
                                    </div>
                                </div>
                                {isBusinessOwner(viewUser) && userProfileData && (
                                    <div className="space-y-4">
                                        <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-white font-bold flex gap-2"><Store className="w-4 h-4" /> Şube Hakkı</span>
                                                <span className="text-green-400 font-bold text-lg">{calculateLimits(viewUser, userProfileData).branch.total}</span>
                                            </div>
                                            <button onClick={() => handleBuyLimit('branch')} className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold p-2 rounded flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Ek Şube Sat (Fiyat Belirle)</button>
                                        </div>
                                        <div className="bg-slate-800/50 p-4 rounded border border-slate-700">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-white font-bold flex gap-2"><Users className="w-4 h-4" /> Personel Hakkı</span>
                                                <span className="text-green-400 font-bold text-lg">{calculateLimits(viewUser, userProfileData).staff.total}</span>
                                            </div>
                                            <button onClick={() => handleBuyLimit('staff')} className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold p-2 rounded flex items-center justify-center gap-1"><Plus className="w-3 h-3" /> Ek Personel Sat (Fiyat Belirle)</button>
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