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
    getDocs // <-- EKLENDİ
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import {
    ShieldAlert,
    Search,
    Activity,
    Server,
    Lock,
    Trash2,
    Terminal,
    Globe,
    Wifi,
    Cpu,
    Database,
    UserCog,
    Calendar,
    Megaphone,
    Download,
    CreditCard,
    Save,
    Banknote,
    Phone,
    CheckCircle2,
    XCircle,
    BellRing,
    Loader2,
    FileText,
    Users, // <-- EKLENDİ
    Briefcase, // <-- EKLENDİ
    Mail // <-- EKLENDİ
} from 'lucide-react';
import RoleGuard from '../../../components/auth/role-guard';

export default function AdminPage() {
    // --- STATE YÖNETİMİ ---
    const [users, setUsers] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, revenue: 0, systemLoad: '0%' });
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // PERSONEL GÖRÜNTÜLEME STATE'LERİ (YENİ)
    const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
    const [companyStaff, setCompanyStaff] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);

    // Sistem Ayarları
    const [systemSettings, setSystemSettings] = useState({
        iban: '',
        bankName: '',
        accountHolder: '',
        monthlyPrice: '',
        sixMonthPrice: '',
        yearlyPrice: ''
    });

    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    // --- YARDIMCI FONKSİYONLAR ---
    const getRandomIP = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 255)}`;

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

        const qUsers = query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory'), orderBy('createdAt', 'desc'));
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
            const data = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                ip: d.data().ip || getRandomIP(),
                location: 'TR/Istanbul'
            }));
            setUsers(data);
            const active = data.filter((u: any) => u.status === 'active').length;
            setStats(prev => ({ ...prev, totalUsers: data.length, activeUsers: active, systemLoad: `${Math.floor(Math.random() * 30) + 10}%` }));
            setLoading(false);
            addLog("DATABASE: User registry synced.");
        });

        const qRequests = query(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'));
        const unsubRequests = onSnapshot(qRequests, (snapshot) => {
            setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        getDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config')).then(snap => {
            if (snap.exists()) setSystemSettings(snap.data() as any);
        });

        return () => { unsubUsers(); unsubRequests(); };
    }, []);

    // --- PERSONEL ÇEKME FONKSİYONU (YENİ) ---
    const toggleStaffView = async (userId: string) => {
        if (expandedCompany === userId) {
            setExpandedCompany(null);
            setCompanyStaff([]);
            return;
        }

        setExpandedCompany(userId);
        setLoadingStaff(true);
        addLog(`QUERY: Fetching staff list for ${userId.substring(0, 6)}...`);

        try {
            const staffRef = collection(db, 'artifacts', 'servis-360-live', 'users', userId, 'staff');
            const snapshot = await getDocs(staffRef);
            const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCompanyStaff(staffData);
            addLog(`SUCCESS: ${staffData.length} staff members found.`);
        } catch (error) {
            console.error(error);
            addLog("ERROR: Failed to fetch staff.");
        } finally {
            setLoadingStaff(false);
        }
    };

    // --- DİĞER FONKSİYONLAR (AYARLAR, ÖDEME, VS.) ---
    const saveSettings = async () => {
        await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config'), systemSettings);
        alert("Sistem ayarları güncellendi.");
    };

    const sendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastMsg.trim()) return;
        setIsBroadcasting(true);
        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'announcements'), {
            message: broadcastMsg, type: 'system_alert', active: true, createdAt: serverTimestamp(), createdBy: currentUser.uid
        });
        setBroadcastMsg('');
        setIsBroadcasting(false);
        alert("Duyuru yayınlandı.");
    };

    const approvePayment = async (req: any) => {
        if (!confirm(`${req.userName} ödemesini onaylıyor musun?`)) return;
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests', req.id), { status: 'approved' });
        let months = req.planName.includes('Yıllık') ? 12 : req.planName.includes('6 Aylık') ? 6 : 1;
        await extendLicense(req.userId, months);
        alert("Ödeme onaylandı.");
    };

    const rejectPayment = async (id: string) => {
        if (!confirm("Reddetmek istiyor musun?")) return;
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'payment_requests', id), { status: 'rejected' });
    };

    const extendLicense = async (userId: string, months: number) => {
        const userProfileRef = doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile');
        const userProfileSnap = await getDoc(userProfileRef);
        let currentEndDate = new Date();
        if (userProfileSnap.exists() && userProfileSnap.data().licenseEndsAt) {
            currentEndDate = userProfileSnap.data().licenseEndsAt.toDate();
        }
        const baseDate = currentEndDate < new Date() ? new Date() : currentEndDate;
        const newEndDate = new Date(baseDate);
        newEndDate.setMonth(newEndDate.getMonth() + months);
        const timestamp = Timestamp.fromDate(newEndDate);

        await updateDoc(userProfileRef, { licenseEndsAt: timestamp, status: 'active' });
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId), { licenseEndsAt: timestamp, status: 'active' });
    };

    const toggleStatus = async (userId: string, currentStatus: string) => {
        if (userId === currentUser?.uid) return;
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId), { status: newStatus });
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile'), { status: newStatus });
    };

    const deleteUser = async (userId: string) => {
        if (userId === currentUser?.uid) return;
        if (confirm("Kullanıcı silinecek. Emin misin?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId));
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile'));
        }
    };

    const exportDatabase = () => {
        const jsonString = JSON.stringify(users, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SERVIS360_DB.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredUsers = users.filter(u =>
        u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm)
    );

    return (
        <RoleGuard allowedRoles={['admin']}>
            <div className="space-y-6 bg-slate-950 min-h-screen p-6 text-slate-300 font-mono text-sm selection:bg-green-900 selection:text-white">

                {/* HEADER */}
                <div className="flex justify-between items-end border-b border-slate-800 pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2"><span className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></span><span className="text-green-500 text-xs font-bold">ONLINE</span></div>
                        <h1 className="text-3xl font-black text-white flex items-center gap-3"><Terminal className="text-blue-500" /> ADMIN_CONSOLE_V5</h1>
                    </div>
                </div>

                {/* ÖDEME BİLDİRİMLERİ */}
                {requests.length > 0 && (
                    <div className="bg-slate-900 border border-yellow-600/50 rounded-sm p-5 animate-in fade-in">
                        <h3 className="text-yellow-500 font-bold mb-4 flex items-center gap-2 text-lg"><BellRing className="w-5 h-5 animate-bounce" /> BEKLEYEN ÖDEMELER ({requests.length})</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {requests.map(req => (
                                <div key={req.id} className="bg-black border border-slate-700 p-4 rounded-sm flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2"><h4 className="font-bold text-white">{req.userName}</h4><span className="text-xs bg-yellow-900 text-yellow-500 px-2 py-1 rounded">{req.amount} ₺</span></div>
                                        <p className="text-xs text-slate-500 mb-1">{req.companyName} | {req.userPhone}</p>
                                        <p className="text-xs text-blue-400 mb-3">{req.planName} (REF: {req.refCode})</p>
                                    </div>
                                    <div className="flex gap-2"><button onClick={() => approvePayment(req)} className="flex-1 bg-green-900/30 text-green-500 border border-green-900 py-1 rounded text-xs font-bold">ONAYLA</button><button onClick={() => rejectPayment(req.id)} className="flex-1 bg-red-900/30 text-red-500 border border-red-900 py-1 rounded text-xs font-bold">REDDET</button></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* FİNANSAL AYARLAR */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-sm">
                    <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-yellow-500" /> SYSTEM CONFIG</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input value={systemSettings.monthlyPrice} onChange={(e) => setSystemSettings({ ...systemSettings, monthlyPrice: e.target.value })} className="bg-black border border-slate-700 text-white px-2 py-2 text-xs outline-none focus:border-yellow-500" placeholder="Aylık" />
                        <input value={systemSettings.yearlyPrice} onChange={(e) => setSystemSettings({ ...systemSettings, yearlyPrice: e.target.value })} className="bg-black border border-slate-700 text-white px-2 py-2 text-xs outline-none focus:border-yellow-500" placeholder="Yıllık" />
                        <input value={systemSettings.iban} onChange={(e) => setSystemSettings({ ...systemSettings, iban: e.target.value })} className="bg-black border border-slate-700 text-white px-2 py-2 text-xs outline-none focus:border-yellow-500" placeholder="IBAN" />
                        <button onClick={saveSettings} className="bg-slate-800 hover:bg-yellow-900/30 text-yellow-500 border border-slate-700 px-2 py-2 text-xs font-bold flex items-center justify-center gap-2"><Save className="w-4 h-4" /> SAVE</button>
                    </div>
                </div>

                {/* KULLANICI VE PERSONEL LİSTESİ */}
                <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
                    <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm"><Database className="w-4 h-4 text-slate-500" /> USER_DATABASE ({users.length})</h3>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1 rounded-sm"><Search className="w-3 h-3 text-slate-400" /><input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." className="bg-transparent border-none text-xs text-white outline-none w-40" /></div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950 text-slate-500 text-xs border-b border-slate-800 uppercase"><th className="p-4">Identity</th><th className="p-4">Contact</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-xs">
                                {loading ? <tr><td colSpan={4} className="p-8 text-center">LOADING...</td></tr> : filteredUsers.map((u) => (
                                    <>
                                        {/* ANA KULLANICI SATIRI */}
                                        <tr key={u.id} className={`hover:bg-slate-800/50 ${u.id === currentUser?.uid ? 'bg-blue-900/10' : ''}`}>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold ${u.role === 'admin' ? 'bg-red-900/20 text-red-500' : 'bg-slate-800 text-slate-400'}`}>{u.role === 'admin' ? <ShieldAlert className="w-4 h-4" /> : <UserCog className="w-4 h-4" />}</div>
                                                    <div><p className="font-bold text-slate-200">{u.companyName || 'UNKNOWN'}</p><p className="text-slate-600 font-mono text-[10px]">{u.email}</p></div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {u.phone ? <a href={`tel:${u.phone}`} className="text-blue-400 hover:text-white flex items-center gap-2 font-mono"><Phone className="w-3 h-3" /> {u.phone}</a> : <span className="text-slate-600">NO PHONE</span>}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-sm border ${u.status === 'active' ? 'bg-green-900/10 text-green-500 border-green-900/30' : 'bg-red-900/10 text-red-500 border-red-900/30'}`}>{u.status === 'active' ? 'ONLINE' : 'OFFLINE'}</span>
                                            </td>
                                            <td className="p-4 text-right">
                                                {u.id !== currentUser?.uid && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        {/* PERSONEL BUTONU (YENİ) */}
                                                        {u.accountType === 'corporate' && (
                                                            <button
                                                                onClick={() => toggleStaffView(u.id)}
                                                                className={`p-1.5 border rounded-sm transition-colors ${expandedCompany === u.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-blue-400'}`}
                                                                title="Personel Görüntüle"
                                                            >
                                                                <Users className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}

                                                        {/* Lisans */}
                                                        <div className="relative">
                                                            <button onClick={() => setSelectedUser(selectedUser === u.id ? null : u.id)} className="p-1.5 bg-slate-800 border border-slate-700 text-blue-400 rounded-sm"><Calendar className="w-3.5 h-3.5" /></button>
                                                            {selectedUser === u.id && (
                                                                <div className="absolute right-0 top-8 w-32 bg-slate-900 border border-slate-700 shadow-xl z-50 p-1">
                                                                    <button onClick={() => extendLicense(u.id, 1)} className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-xs text-white">+ 1 Ay</button>
                                                                    <button onClick={() => extendLicense(u.id, 12)} className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-xs text-white">+ 1 Yıl</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={() => toggleStatus(u.id, u.status)} className="p-1.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-sm">{u.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}</button>
                                                        <button onClick={() => deleteUser(u.id)} className="p-1.5 bg-slate-800 border border-slate-700 text-red-500 rounded-sm"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>

                                        {/* PERSONEL DETAY SATIRI (Sadece Kurumsal ve Tıklanınca Açılır) */}
                                        {expandedCompany === u.id && (
                                            <tr className="bg-slate-900/50">
                                                <td colSpan={5} className="p-4 pl-12 border-b border-slate-800">
                                                    <div className="bg-black/50 border border-slate-800 rounded-sm p-4">
                                                        <h4 className="text-xs font-bold text-blue-400 mb-3 flex items-center gap-2">
                                                            <Users className="w-4 h-4" /> {u.companyName} - PERSONEL LİSTESİ
                                                        </h4>

                                                        {loadingStaff ? (
                                                            <div className="flex items-center gap-2 text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Veriler çekiliyor...</div>
                                                        ) : companyStaff.length === 0 ? (
                                                            <p className="text-slate-500 italic">Bu firmaya ait kayıtlı personel bulunamadı.</p>
                                                        ) : (
                                                            <table className="w-full text-left text-xs">
                                                                <thead>
                                                                    <tr className="text-slate-500 border-b border-slate-800">
                                                                        <th className="pb-2">AD SOYAD</th>
                                                                        <th className="pb-2">E-POSTA</th>
                                                                        <th className="pb-2">TELEFON</th>
                                                                        <th className="pb-2">GÖREVİ</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-800/50">
                                                                    {companyStaff.map((staff, idx) => (
                                                                        <tr key={idx} className="text-slate-300">
                                                                            <td className="py-2 font-bold">{staff.fullName}</td>
                                                                            <td className="py-2 font-mono text-slate-400 flex items-center gap-2"><Mail className="w-3 h-3" /> {staff.email}</td>
                                                                            <td className="py-2 font-mono text-slate-400"><a href={`tel:${staff.phone}`} className="hover:text-blue-400">{staff.phone}</a></td>
                                                                            <td className="py-2">
                                                                                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] border border-slate-700 flex items-center gap-1 w-fit">
                                                                                    <Briefcase className="w-3 h-3 text-yellow-500" />
                                                                                    {staff.role === 'technical' ? 'Tekniker' : staff.role === 'sales' ? 'Satış' : staff.role === 'accountant' ? 'Muhasebe' : staff.role}
                                                                                </span>
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
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