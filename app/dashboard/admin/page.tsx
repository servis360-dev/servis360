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

// 👇 PROJE İÇİ IMPORTLAR
import { auth, db } from '../../../lib/firebase';
import RoleGuard from '../../../components/auth/role-guard';

import {
    ShieldAlert, Search, Trash2, Users, Save,
    CreditCard, Phone, BellRing, RefreshCw, Wallet,
    BadgeCheck, X, TrendingUp, Building2, Store, User,
    Mail, Calendar, Eye, Copy, CheckCircle2, ChevronRight, ChevronDown, UserPlus,
    AlertTriangle, MoreVertical, Plus, Briefcase
} from 'lucide-react';

export default function AdminPage() {
    // --- STATE YÖNETİMİ ---
    const [users, setUsers] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalRevenue: 0, activeUsers: 0, expiredUsers: 0 });
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [permissionError, setPermissionError] = useState(false);

    // Personel Görüntüleme (Hiyerarşi)
    const [expandedCompanyId, setExpandedCompanyId] = useState<string | null>(null);
    const [companyStaff, setCompanyStaff] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);

    // Modallar
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [saleTargetUser, setSaleTargetUser] = useState<any>(null);
    const [saleForm, setSaleForm] = useState({ amount: '', months: '12', description: 'Özel Satış' });

    const [viewUser, setViewUser] = useState<any>(null); // Detay Modalı için
    const [userProfileData, setUserProfileData] = useState<any>(null); // Detaydaki kullanıcının canlı profili

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

    // --- YARDIMCI: Personel Rolleri Listesi ---
    const staffRoles = [
        'staff', 'personnel', 'employee',
        'technical', 'technician', 'teknik',
        'sales', 'satis', 'kasa',
        'accountant', 'accounting', 'muhasebe'
    ];

    // --- YARDIMCI: Gerçek İşletme Sahibi Kontrolü ---
    // (Personeller de 'corporate' tipinde olabilir ama onlar işletme sahibi değildir)
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

        // 1. Ayarları Çek
        const fetchSettings = async () => {
            try {
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
            } catch (err) {
                console.error("Ayar çekme hatası:", err);
            }
        };
        fetchSettings();

        // 2. Kullanıcılar
        const q = query(
            collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory')
        );

        const unsubUsers = onSnapshot(q, (snapshot) => {
            const userList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setUsers(userList);

            const active = userList.filter((u: any) => u.status === 'active').length;
            setStats(prev => ({ ...prev, activeUsers: active, expiredUsers: userList.length - active }));
            setLoading(false);
            setPermissionError(false);
            setErrorMsg('');
        }, (error) => {
            console.error("Kullanıcıları çekerken hata:", error);
            if (error.code === 'permission-denied') {
                setPermissionError(true);
            } else {
                setErrorMsg("Veri çekme hatası: " + error.message);
            }
            setLoading(false);
        });

        // 3. Ödemeler
        const unsubRequests = onSnapshot(query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests'), where('status', '==', 'pending')), (snapshot) => {
            setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (error) => {
            console.warn("Ödeme istekleri çekilemedi:", error);
        });

        // 4. Gelir
        const unsubIncome = onSnapshot(query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'saas_income')), (snapshot) => {
            let total = 0;
            snapshot.docs.forEach(d => total += Number(d.data().amount || 0));
            setStats(prev => ({ ...prev, totalRevenue: total }));
        }, (error) => {
            console.warn("Gelir verisi çekilemedi:", error);
        });

        return () => { unsubUsers(); unsubRequests(); unsubIncome(); };
    }, []);

    // Kullanıcı detay modalı açıldığında güncel profili çek
    useEffect(() => {
        if (viewUser) {
            const fetchProfile = async () => {
                try {
                    const ref = doc(db, 'artifacts', 'servis-360-live', 'users', viewUser.id, 'users', 'profile');
                    const snap = await getDoc(ref);
                    if (snap.exists()) setUserProfileData(snap.data());
                    else setUserProfileData({});
                } catch (err) {
                    console.error("Profil detay hatası", err);
                }
            };
            fetchProfile();
        } else {
            setUserProfileData(null);
        }
    }, [viewUser]);

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

    const copyToClipboard = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        alert(`Kopyalandı: ${text}`);
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('tr-TR');
        return new Date(timestamp).toLocaleDateString('tr-TR');
    };

    const saveSettings = async () => {
        try {
            const cleanSettings = JSON.parse(JSON.stringify(settings));
            await setDoc(
                doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config'),
                cleanSettings,
                { merge: true }
            );
            alert("✅ Ayarlar güncellendi!");
        } catch (error: any) {
            console.error("Kaydetme hatası:", error);
            alert(`Hata: ${error.message}`);
        }
    };

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

    // Şube Hakkı Satın Alma / Artırma İşlemi
    const handleBuyBranch = async () => {
        if (!viewUser || !userProfileData) return;
        const price = 800; // Ek şube ücreti

        // Mevcut limiti belirle (Özel limit varsa o, yoksa varsayılan)
        const defaultLimit = (['corporate', 'company'].includes(viewUser.accountType) || viewUser.role === 'corporate') ? 5 : 1;
        const currentCustom = userProfileData.customBranchLimit || 0;
        const currentEffective = currentCustom > 0 ? currentCustom : defaultLimit;

        const newLimit = currentEffective + 1;

        if (!confirm(`${viewUser.fullName} kullanıcısına 1 Ek Şube Hakkı tanımlanacak.\nÜcret: ${price} TL\nYeni Limit: ${newLimit}\nOnaylıyor musunuz?`)) return;

        try {
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', viewUser.id, 'users', 'profile'), { customBranchLimit: newLimit });
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', viewUser.id), { customBranchLimit: newLimit });
            await processTransaction(viewUser.id, viewUser.fullName, price, 0, 'Ek Şube Hakkı Satın Alımı (+1)', 'BRANCH_UPGRADE');
            setUserProfileData({ ...userProfileData, customBranchLimit: newLimit });
            alert("İşlem Başarılı! Şube hakkı artırıldı.");
        } catch (err) {
            console.error(err);
            alert("Hata oluştu.");
        }
    };

    // Manuel Şube Limit Güncelleme
    const handleUpdateBranchLimit = async (val: number) => {
        if (!confirm(`Şube limiti manuel olarak ${val} yapılacak. Emin misiniz?`)) return;
        try {
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', viewUser.id, 'users', 'profile'), { customBranchLimit: Number(val) });
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', viewUser.id), { customBranchLimit: Number(val) });
            setUserProfileData({ ...userProfileData, customBranchLimit: Number(val) });
            alert("Limit güncellendi.");
        } catch (err) {
            console.error(err);
            alert("Hata oluştu.");
        }
    };

    // --- YENİ: PERSONEL LİMİTİ YÖNETİMİ ---
    const handleBuyStaffLimit = async () => {
        if (!viewUser || !userProfileData) return;
        const price = 800; // Ek personel ücreti

        // Mevcut limiti belirle (Esnaf için 5, Kurumsal için teorik 999)
        const isEsnaf = ['esnaf', 'business', 'tradesman'].includes(viewUser.accountType);
        const defaultLimit = isEsnaf ? 5 : 999;

        const currentCustom = userProfileData.customStaffLimit || 0;
        const currentEffective = currentCustom > 0 ? currentCustom : defaultLimit;

        const newLimit = currentEffective + 1;

        if (!confirm(`${viewUser.fullName} kullanıcısına 1 Ek Personel Hakkı tanımlanacak.\nÜcret: ${price} TL\nYeni Limit: ${newLimit}\nOnaylıyor musunuz?`)) return;

        try {
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', viewUser.id, 'users', 'profile'), { customStaffLimit: newLimit });
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', viewUser.id), { customStaffLimit: newLimit });
            await processTransaction(viewUser.id, viewUser.fullName, price, 0, 'Ek Personel Hakkı Satın Alımı (+1)', 'STAFF_UPGRADE');
            setUserProfileData({ ...userProfileData, customStaffLimit: newLimit });
            alert("İşlem Başarılı! Personel limiti artırıldı.");
        } catch (err) {
            console.error(err);
            alert("Hata oluştu.");
        }
    };

    const handleUpdateStaffLimit = async (val: number) => {
        if (!confirm(`Personel limiti manuel olarak ${val} yapılacak. Emin misiniz?`)) return;
        try {
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', viewUser.id, 'users', 'profile'), { customStaffLimit: Number(val) });
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', viewUser.id), { customStaffLimit: Number(val) });
            setUserProfileData({ ...userProfileData, customStaffLimit: Number(val) });
            alert("Limit güncellendi.");
        } catch (err) {
            console.error(err);
            alert("Hata oluştu.");
        }
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
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile'));
            alert("Kullanıcı silindi.");
        }
    };

    const PricingInput = ({ label, value, onChange }: any) => (
        <div className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-500 uppercase">{label}</span>
            <div className="flex items-center bg-black border border-slate-700 rounded px-2">
                <span className="text-slate-500 text-xs">₺</span>
                <input type="number" value={value || 0} onChange={e => onChange(Number(e.target.value))} className="w-full bg-transparent text-white text-xs p-2 outline-none" />
            </div>
        </div>
    );

    const filteredUsers = users.filter(u =>
        u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 🔥 GÖRSEL YARDIMCI: ROZE ALIMI
    const getUserBadge = (u: any) => {
        if (staffRoles.includes(u.role)) {
            return <span className="text-slate-300 bg-slate-800 px-2 py-1 rounded font-bold flex items-center gap-1"><Briefcase className="w-3 h-3" /> Personel</span>;
        } else if (['corporate', 'company'].includes(u.accountType)) {
            return <span className="text-purple-400 bg-purple-900/20 px-2 py-1 rounded font-bold">Kurumsal</span>;
        } else if (['business', 'esnaf'].includes(u.accountType)) {
            return <span className="text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded font-bold">Esnaf</span>;
        } else {
            return <span className="text-blue-400 bg-blue-900/20 px-2 py-1 rounded font-bold">Bireysel</span>;
        }
    };

    return (
        <RoleGuard allowedRoles={['super_admin']}>
            <div className="space-y-6 bg-slate-950 min-h-screen p-4 md:p-6 text-slate-300 font-mono text-sm relative pb-32">

                {/* HEADER (MOBİL UYUMLU) */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800 pb-4 gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-white flex items-center gap-2"><ShieldAlert className="text-red-600" /> ADMIN_PANEL_V2</h1>
                        <p className="text-xs text-slate-500">SİSTEM YÖNETİCİSİ</p>
                    </div>
                    {/* STATS KARTLARI (MOBİLDE GRID, MASAÜSTÜNDE FLEX) */}
                    <div className="grid grid-cols-2 md:flex gap-4 md:gap-6 w-full md:w-auto text-left md:text-right">
                        <div className="bg-slate-900 md:bg-transparent p-3 md:p-0 rounded border md:border-none border-slate-800">
                            <span className="text-[10px] text-slate-500 block">AKTİF/PASİF</span>
                            <p className="text-lg md:text-xl font-bold text-white">
                                <span className="text-green-500">{stats.activeUsers}</span> / <span className="text-red-500">{stats.expiredUsers}</span>
                            </p>
                        </div>
                        <div className="bg-slate-900 md:bg-transparent p-3 md:p-0 rounded border md:border-none border-slate-800">
                            <span className="text-[10px] text-slate-500 block">TOPLAM GELİR</span>
                            <p className="text-lg md:text-2xl font-bold text-green-400">{stats.totalRevenue.toLocaleString()} ₺</p>
                        </div>
                    </div>
                </div>

                {/* HATA MESAJLARI */}
                {permissionError && (
                    <div className="bg-red-900/10 border border-red-800 p-4 rounded-lg mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle className="w-6 h-6 text-red-500" />
                            <h2 className="text-lg font-bold text-red-500">Yetki Hatası</h2>
                        </div>
                        <p className="text-slate-400 text-xs">Firebase Firestore Rules ayarlarını kontrol edin.</p>
                    </div>
                )}

                {/* 1. BANKA VE FİYATLANDIRMA (MOBİL İÇİN GRID DÜZENLEMESİ) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* BANKA BİLGİLERİ */}
                    <div className="lg:col-span-4 bg-slate-900 border border-slate-800 p-4 rounded-sm">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-blue-500" /> BANKA</h3>
                        <div className="space-y-3">
                            <input value={settings.bank.bankName || ''} onChange={e => setSettings({ ...settings, bank: { ...settings.bank, bankName: e.target.value } })} placeholder="Banka Adı" className="w-full bg-black border border-slate-700 p-3 text-white text-xs rounded-sm" />
                            <input value={settings.bank.accountHolder || ''} onChange={e => setSettings({ ...settings, bank: { ...settings.bank, accountHolder: e.target.value } })} placeholder="Alıcı Adı Soyadı" className="w-full bg-black border border-slate-700 p-3 text-white text-xs rounded-sm" />
                            <input value={settings.bank.iban || ''} onChange={e => setSettings({ ...settings, bank: { ...settings.bank, iban: e.target.value } })} placeholder="TRXX..." className="w-full bg-black border border-slate-700 p-3 text-white text-xs rounded-sm font-mono text-yellow-500" />
                        </div>
                    </div>

                    {/* FİYAT MATRİSİ */}
                    <div className="lg:col-span-8 bg-slate-900 border border-slate-800 p-4 rounded-sm">
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Wallet className="w-4 h-4 text-green-500" /> FİYATLAR</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4">
                            <div className="space-y-3 sm:border-r border-slate-800 sm:pr-2 pb-4 sm:pb-0 border-b sm:border-b-0">
                                <p className="text-xs font-bold text-blue-400 flex items-center gap-1"><User className="w-3 h-3" /> BİREYSEL</p>
                                <PricingInput label="1 Ay" value={settings.pricing.individual.monthly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, individual: { ...s.pricing.individual, monthly: v } } }))} />
                                <PricingInput label="6 Ay" value={settings.pricing.individual.sixMonth} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, individual: { ...s.pricing.individual, sixMonth: v } } }))} />
                                <PricingInput label="1 Yıl" value={settings.pricing.individual.yearly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, individual: { ...s.pricing.individual, yearly: v } } }))} />
                            </div>
                            <div className="space-y-3 sm:border-r border-slate-800 sm:pr-2 pb-4 sm:pb-0 border-b sm:border-b-0">
                                <p className="text-xs font-bold text-yellow-400 flex items-center gap-1"><Store className="w-3 h-3" /> ESNAF</p>
                                <PricingInput label="1 Ay" value={settings.pricing.business.monthly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, business: { ...s.pricing.business, monthly: v } } }))} />
                                <PricingInput label="6 Ay" value={settings.pricing.business.sixMonth} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, business: { ...s.pricing.business, sixMonth: v } } }))} />
                                <PricingInput label="1 Yıl" value={settings.pricing.business.yearly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, business: { ...s.pricing.business, yearly: v } } }))} />
                            </div>
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-purple-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> KURUMSAL</p>
                                <PricingInput label="1 Ay" value={settings.pricing.corporate.monthly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, corporate: { ...s.pricing.corporate, monthly: v } } }))} />
                                <PricingInput label="6 Ay" value={settings.pricing.corporate.sixMonth} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, corporate: { ...s.pricing.corporate, sixMonth: v } } }))} />
                                <PricingInput label="1 Yıl" value={settings.pricing.corporate.yearly} onChange={(v: any) => setSettings(s => ({ ...s, pricing: { ...s.pricing, corporate: { ...s.pricing.corporate, yearly: v } } }))} />
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={saveSettings} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-transform">
                    <Save className="w-5 h-5" /> AYARLARI GÜNCELLE
                </button>

                {/* ÖDEME ONAYLARI */}
                {requests.length > 0 && (
                    <div className="bg-slate-900 border border-yellow-600/50 p-4 rounded-sm animate-pulse">
                        <h3 className="text-yellow-500 font-bold mb-4 flex items-center gap-2"><BellRing className="w-4 h-4" /> BEKLEYEN ÖDEMELER</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {requests.map(req => (
                                <div key={req.id} className="bg-black border border-slate-700 p-4 rounded-sm flex flex-col gap-3">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-white text-lg">{req.userName}</span>
                                        <span className="text-yellow-500 font-bold text-xl">{req.amount} ₺</span>
                                    </div>
                                    <p className="text-xs text-slate-500">{req.planName} • {req.companyName}</p>
                                    <div className="grid grid-cols-2 gap-3 mt-1">
                                        <button onClick={() => approvePayment(req)} className="bg-green-600 text-white p-3 rounded text-sm font-bold">ONAYLA</button>
                                        <button onClick={() => updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests', req.id), { status: 'rejected' })} className="bg-red-600 text-white p-3 rounded text-sm font-bold">RED</button>
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
                            <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-500" />
                            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="İsim, Firma, Mail ara..." className="bg-black border border-slate-700 text-white text-sm p-3 pl-9 rounded w-full md:w-64 focus:border-blue-500 outline-none transition-colors" />
                        </div>
                    </div>

                    {users.length === 0 && !loading && (
                        <div className="p-8 text-center text-slate-500">Kullanıcı bulunamadı.</div>
                    )}

                    {/* 🔥 MOBİL KART GÖRÜNÜMÜ */}
                    <div className="md:hidden space-y-4 p-4">
                        {filteredUsers.map(u => (
                            <div key={u.id} className="bg-black border border-slate-800 rounded-lg p-4 shadow-sm relative overflow-hidden">
                                {u.status !== 'active' && <div className="absolute top-0 left-0 w-1 h-full bg-red-600"></div>}

                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className="text-white font-bold text-lg">{u.fullName}</h4>
                                        <p className="text-xs text-slate-400">{u.companyName || 'Bireysel Hesap'}</p>
                                    </div>
                                    {u.status === 'active' ?
                                        <BadgeCheck className="text-green-500 w-5 h-5" /> :
                                        <X className="text-red-500 w-5 h-5" />
                                    }
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-4">
                                    <div className="bg-slate-900 p-2 rounded flex flex-col gap-1">
                                        <span className="font-bold text-slate-400">PAKET</span>
                                        {getUserBadge(u)}
                                    </div>
                                    <div className="bg-slate-900 p-2 rounded flex flex-col gap-1">
                                        <span className="font-bold text-slate-400">LİSANS</span>
                                        <span className={!u.licenseEndsAt ? 'text-red-500' : 'text-white'}>
                                            {u.licenseEndsAt ? formatDate(u.licenseEndsAt) : 'Yok'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 mb-4">
                                    <div onClick={() => copyToClipboard(u.email)} className="flex items-center gap-2 p-2 rounded bg-slate-900/50 hover:bg-slate-800 active:bg-slate-700 cursor-pointer transition-colors">
                                        <Mail className="w-4 h-4 text-blue-500" />
                                        <span className="text-xs text-slate-300 truncate">{u.email}</span>
                                    </div>
                                    <div onClick={() => copyToClipboard(u.phone)} className="flex items-center gap-2 p-2 rounded bg-slate-900/50 hover:bg-slate-800 active:bg-slate-700 cursor-pointer transition-colors">
                                        <Phone className="w-4 h-4 text-green-500" />
                                        <span className="text-xs text-slate-300">{u.phone || '-'}</span>
                                    </div>
                                </div>

                                {/* Alt Aksiyonlar */}
                                <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                                    {isBusinessOwner(u) && (
                                        <button
                                            onClick={() => toggleCompanyStaff(u.id)}
                                            className="text-xs font-bold text-slate-400 flex items-center gap-1 bg-slate-900 px-3 py-2 rounded"
                                        >
                                            <Users className="w-3 h-3" />
                                            {expandedCompanyId === u.id ? 'Gizle' : 'Personel'}
                                        </button>
                                    )}

                                    <div className="flex gap-2 ml-auto">
                                        <button onClick={() => setViewUser(u)} className="p-2 bg-blue-900/20 text-blue-500 rounded"><Eye className="w-4 h-4" /></button>
                                        <button onClick={() => { setSaleTargetUser(u); setShowSaleModal(true); }} className="p-2 bg-yellow-900/20 text-yellow-500 rounded"><Wallet className="w-4 h-4" /></button>
                                        <button onClick={() => deleteUser(u.id)} className="p-2 bg-red-900/20 text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                {expandedCompanyId === u.id && (
                                    <div className="mt-3 bg-slate-900 p-3 rounded animate-in slide-in-from-top-2">
                                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">PERSONEL LİSTESİ</p>
                                        {loadingStaff ? <div className="text-xs text-slate-500">Yükleniyor...</div> :
                                            companyStaff.length === 0 ? <div className="text-xs text-slate-500 italic">Kayıt yok.</div> :
                                                <div className="space-y-2">
                                                    {companyStaff.map(s => (
                                                        <div key={s.id} className="flex justify-between items-center text-xs bg-black p-2 rounded border border-slate-800">
                                                            <span className="text-white">{s.fullName}</span>
                                                            <span className="text-slate-500">{s.role}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                        }
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* 🔥 MASAÜSTÜ TABLO GÖRÜNÜMÜ */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-400">
                            <thead className="text-slate-500 bg-slate-950 uppercase border-b border-slate-800">
                                <tr>
                                    <th className="p-3 w-8"></th>
                                    <th className="p-3">Kullanıcı / Firma</th>
                                    <th className="p-3">İletişim</th>
                                    <th className="p-3">Paket</th>
                                    <th className="p-3">Lisans</th>
                                    <th className="p-3">Durum</th>
                                    <th className="p-3 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {filteredUsers.map(u => (
                                    <>
                                        <tr key={u.id} className={`hover:bg-slate-800/50 transition-colors ${expandedCompanyId === u.id ? 'bg-slate-800/30' : ''}`}>
                                            <td className="p-3">
                                                {isBusinessOwner(u) && (
                                                    <button onClick={() => toggleCompanyStaff(u.id)} className="p-1 hover:bg-slate-700 rounded transition-all">
                                                        {expandedCompanyId === u.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="p-3">
                                                <p className="text-white font-bold">{u.fullName}</p>
                                                <p className="text-[10px] text-slate-500">{u.companyName || '-'}</p>
                                            </td>
                                            <td className="p-3 space-y-1">
                                                <div className="flex items-center gap-1 group cursor-pointer" onClick={() => copyToClipboard(u.email)}><Mail className="w-3 h-3" /> {u.email}</div>
                                                <div className="flex items-center gap-1 group cursor-pointer" onClick={() => copyToClipboard(u.phone)}><Phone className="w-3 h-3" /> {u.phone || '-'}</div>
                                            </td>
                                            <td className="p-3">
                                                {getUserBadge(u)}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {u.licenseEndsAt ? formatDate(u.licenseEndsAt) : <span className="text-red-500">Yok</span>}
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                {u.status === 'active' ? <span className="text-green-500 flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> Aktif</span> : <span className="text-red-500 flex items-center gap-1"><X className="w-3 h-3" /> Pasif</span>}
                                            </td>
                                            <td className="p-3 text-right">
                                                {u.id !== currentUser?.uid && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => setViewUser(u)} className="p-1.5 hover:bg-slate-700 rounded text-blue-400"><Eye className="w-4 h-4" /></button>
                                                        <button onClick={() => { setSaleTargetUser(u); setShowSaleModal(true); }} className="p-1.5 hover:bg-slate-700 rounded text-yellow-500"><Wallet className="w-4 h-4" /></button>
                                                        <button onClick={() => deleteUser(u.id)} className="p-1.5 hover:bg-slate-700 rounded text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                        {expandedCompanyId === u.id && (
                                            <tr className="bg-slate-900/50">
                                                <td colSpan={7} className="p-4 pl-12 border-b border-slate-800 shadow-inner">
                                                    <div className="flex items-center gap-2 mb-3 text-slate-400">
                                                        <Users className="w-4 h-4" />
                                                        <span className="text-xs font-bold uppercase tracking-wider">{u.companyName} PERSONEL LİSTESİ</span>
                                                    </div>
                                                    {loadingStaff ? <div className="text-xs text-slate-500">Yükleniyor...</div> :
                                                        companyStaff.length > 0 ? (
                                                            <div className="grid grid-cols-3 gap-3">
                                                                {companyStaff.map((staff) => (
                                                                    <div key={staff.id} className="flex items-center justify-between bg-black border border-slate-700 p-3 rounded-md">
                                                                        <div>
                                                                            <div className="flex items-center gap-2">
                                                                                <User className="w-3 h-3 text-blue-500" />
                                                                                <span className="text-white font-bold text-xs">{staff.fullName}</span>
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-500 mt-1">{staff.email}</div>
                                                                        </div>
                                                                        <div className={`w-2 h-2 rounded-full ${staff.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : <div className="text-xs text-slate-500 italic">Personel yok.</div>}
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
                        <div className="bg-slate-900 border border-yellow-600 p-6 rounded w-full max-w-sm shadow-2xl">
                            <h3 className="text-white font-bold mb-4 text-lg">Özel Satış Ekle</h3>
                            <p className="text-slate-400 mb-6 text-sm bg-black/40 p-2 rounded border border-slate-800">
                                Müşteri: <span className="text-white font-bold">{saleTargetUser?.fullName}</span>
                            </p>

                            <label className="text-xs text-slate-500 font-bold mb-1 block">Tutar (TL)</label>
                            <input type="number" className="w-full bg-black border border-slate-700 p-3 mb-4 text-white rounded focus:border-yellow-500 outline-none text-lg font-bold" value={saleForm.amount} onChange={e => setSaleForm({ ...saleForm, amount: e.target.value })} autoFocus />

                            <label className="text-xs text-slate-500 font-bold mb-1 block">Süre (Ay)</label>
                            <input type="number" className="w-full bg-black border border-slate-700 p-3 mb-4 text-white rounded focus:border-yellow-500 outline-none" value={saleForm.months} onChange={e => setSaleForm({ ...saleForm, months: e.target.value })} />

                            <label className="text-xs text-slate-500 font-bold mb-1 block">Açıklama</label>
                            <input type="text" className="w-full bg-black border border-slate-700 p-3 mb-6 text-white rounded focus:border-yellow-500 outline-none" value={saleForm.description} onChange={e => setSaleForm({ ...saleForm, description: e.target.value })} />

                            <div className="flex gap-3">
                                <button onClick={handleManualSale} className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-black font-bold p-3 rounded transition-colors">KAYDET</button>
                                <button onClick={() => setShowSaleModal(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-3 rounded transition-colors">İptal</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL: KULLANICI DETAY */}
                {viewUser && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setViewUser(null)}>
                        <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="p-4 border-b border-slate-800 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <User className="w-5 h-5 text-blue-500" />
                                    {viewUser.fullName}
                                </h3>
                                <button onClick={() => setViewUser(null)} className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sol Kolon */}
                                <div className="space-y-4">
                                    <div className="bg-black/40 p-4 rounded border border-slate-800">
                                        <p className="text-[10px] text-blue-500 uppercase font-bold mb-2">HESAP</p>
                                        <div className="space-y-2">
                                            <p className="text-sm text-slate-300 flex justify-between"><span>Rol:</span> <span className="text-white font-bold">{viewUser.role || 'Standart'}</span></p>
                                            <p className="text-sm text-slate-300 flex justify-between"><span>Tip:</span> <span className="text-white font-bold">{viewUser.accountType}</span></p>
                                        </div>
                                    </div>

                                    {/* ŞUBE YÖNETİMİ PANELİ (Sadece Gerçek İşletme Sahipleri Görür) */}
                                    {isBusinessOwner(viewUser) && userProfileData && (
                                        <div className="bg-black/40 p-4 rounded border border-slate-800 animate-pulse-slow">
                                            <p className="text-[10px] text-purple-500 uppercase font-bold mb-2 flex items-center gap-2">
                                                <Store className="w-3 h-3" /> ŞUBE YÖNETİMİ
                                            </p>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded">
                                                    <span className="text-xs text-slate-400">Şube Limiti</span>
                                                    <span className="text-white font-bold text-lg">
                                                        {userProfileData.customBranchLimit || (['corporate', 'company'].includes(viewUser.accountType) ? 5 : 1)}
                                                    </span>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleBuyBranch}
                                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white p-2 rounded text-xs font-bold flex items-center justify-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" /> Ek Hak Sat (800₺)
                                                    </button>
                                                </div>

                                                <div className="pt-2 border-t border-slate-800">
                                                    <p className="text-[10px] text-slate-500 mb-1">Manuel Limit Ayarla</p>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            placeholder="Limit"
                                                            className="w-16 bg-slate-900 text-white text-xs p-1 rounded border border-slate-700 text-center"
                                                            onChange={(e) => {
                                                                if (e.target.value) handleUpdateBranchLimit(Number(e.target.value));
                                                            }}
                                                        />
                                                        <span className="text-[10px] text-slate-600 self-center">← Değiştir</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* YENİ PERSONEL YÖNETİMİ PANELİ (Sadece Gerçek İşletme Sahipleri Görür) */}
                                    {isBusinessOwner(viewUser) && userProfileData && (
                                        <div className="bg-black/40 p-4 rounded border border-slate-800 animate-pulse-slow mt-4">
                                            <p className="text-[10px] text-blue-500 uppercase font-bold mb-2 flex items-center gap-2">
                                                <Users className="w-3 h-3" /> PERSONEL YÖNETİMİ
                                            </p>
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center bg-slate-900/50 p-2 rounded">
                                                    <span className="text-xs text-slate-400">Personel Limiti</span>
                                                    <span className="text-white font-bold text-lg">
                                                        {userProfileData.customStaffLimit || (['corporate', 'company'].includes(viewUser.accountType) ? 'Sınırsız' : 5)}
                                                    </span>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleBuyStaffLimit}
                                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white p-2 rounded text-xs font-bold flex items-center justify-center gap-1"
                                                    >
                                                        <Plus className="w-3 h-3" /> Ek Hak Sat (800₺)
                                                    </button>
                                                </div>

                                                <div className="pt-2 border-t border-slate-800">
                                                    <p className="text-[10px] text-slate-500 mb-1">Manuel Limit Ayarla</p>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            placeholder="Limit"
                                                            className="w-16 bg-slate-900 text-white text-xs p-1 rounded border border-slate-700 text-center"
                                                            onChange={(e) => {
                                                                if (e.target.value) handleUpdateStaffLimit(Number(e.target.value));
                                                            }}
                                                        />
                                                        <span className="text-[10px] text-slate-600 self-center">← Değiştir</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Sağ Kolon */}
                                <div className="space-y-4">
                                    <div className="bg-black/40 p-4 rounded border border-slate-800">
                                        <p className="text-[10px] text-yellow-500 uppercase font-bold mb-2">FİRMA</p>
                                        <p className="text-lg font-bold text-white mb-1">{viewUser.companyName || '-'}</p>
                                        <p className="text-xs text-slate-400">{viewUser.address || 'Adres Girilmemiş'}</p>
                                        <div className="mt-3 pt-3 border-t border-slate-800 flex justify-between text-xs text-slate-500">
                                            <span>VN: {viewUser.taxNumber || '-'}</span>
                                            <span>VD: {viewUser.taxOffice || '-'}</span>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 p-4 rounded border border-slate-800">
                                        <p className="text-[10px] text-red-500 uppercase font-bold mb-2">DURUM</p>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm text-slate-400">Lisans Bitiş</span>
                                            <span className="text-white font-mono font-bold">{viewUser.licenseEndsAt ? formatDate(viewUser.licenseEndsAt) : '-'}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-slate-400">Kayıt Tarihi</span>
                                            <span className="text-white font-mono">{viewUser.createdAt ? formatDate(viewUser.createdAt) : '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border-t border-slate-800 bg-slate-900 sticky bottom-0 flex justify-end">
                                <button onClick={() => setViewUser(null)} className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm transition-colors">KAPAT</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </RoleGuard>
    );
}