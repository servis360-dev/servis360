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
    setDoc
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
    AlertTriangle,
    CreditCard,
    Save
} from 'lucide-react';
import RoleGuard from '../../../components/auth/role-guard';

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalUsers: 0, activeUsers: 0, mrr: 0 });
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    // Sistem Ayarları State'i (GÜNCELLENDİ: Paket Fiyatları)
    const [systemSettings, setSystemSettings] = useState({
        iban: '',
        bankName: '',
        monthlyPrice: '',
        sixMonthPrice: '', // Yeni
        yearlyPrice: ''    // Yeni
    });

    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const getRandomIP = () => `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 255)}`;

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString('tr-TR', { hour12: false });
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
    };

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        setCurrentUser(user);
        addLog("SYSTEM_INIT: Admin access granted.");

        // Kullanıcıları Getir
        const q = query(
            collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory'),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            let data = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data(),
                ip: d.data().ip || getRandomIP(),
                location: d.data().location || 'Istanbul, TR'
            }));

            data = data.sort((a, b) => {
                if (a.id === user.uid) return -1;
                if (b.id === user.uid) return 1;
                return 0;
            });

            setUsers(data);

            const active = data.filter((u: any) => u.status === 'active').length;
            setStats({
                totalUsers: data.length,
                activeUsers: active,
                systemLoad: `${Math.floor(Math.random() * 30) + 10}%`
            });

            setLoading(false);
            addLog("DATA_SYNC: User list updated successfully.");
        });

        // Sistem Ayarlarını Getir
        const fetchSettings = async () => {
            const docRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config');
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                setSystemSettings(snap.data() as any);
            }
        };
        fetchSettings();

        return () => unsub();
    }, []);

    // Ayarları Kaydet
    const saveSettings = async () => {
        try {
            addLog("CONFIG: Updating system parameters...");
            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config'), systemSettings);
            addLog("SUCCESS: Configuration saved.");
            alert("Ayarlar güncellendi.");
        } catch (error) {
            console.error(error);
            addLog("ERROR: Config update failed.");
        }
    };

    const sendBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!broadcastMsg.trim()) return;

        setIsBroadcasting(true);
        addLog("PROTOCOL: Initiating global broadcast sequence...");

        try {
            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'announcements'), {
                message: broadcastMsg,
                type: 'system_alert',
                active: true,
                createdAt: serverTimestamp(),
                createdBy: currentUser.uid
            });

            addLog(`BROADCAST_SENT: "${broadcastMsg}" to ALL nodes.`);
            setBroadcastMsg('');
            alert("Duyuru gönderildi.");
        } catch (error) {
            console.error(error);
            addLog("ERROR: Broadcast transmission failed.");
        } finally {
            setIsBroadcasting(false);
        }
    };

    const exportDatabase = () => {
        addLog("COMMAND: Exporting user database to local storage...");
        const jsonString = JSON.stringify(users, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SERVIS360_USER_DUMP_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        addLog("SUCCESS: Data extraction complete.");
    };

    const extendLicense = async (userId: string, months: number) => {
        try {
            addLog(`COMMAND: Extending license for USER_${userId.substring(0, 5)}...`);
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

            await updateDoc(userProfileRef, { licenseEndsAt: timestamp });
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId), {
                licenseEndsAt: timestamp
            });

            addLog(`SUCCESS: License extended by ${months} months.`);
            setSelectedUser(null);
        } catch (error) {
            console.error(error);
            addLog(`ERROR: License extension failed.`);
        }
    };

    const toggleStatus = async (userId: string, currentStatus: string) => {
        if (userId === currentUser?.uid) {
            alert("SİSTEM UYARISI: Root yetkisine sahip yönetici hesabı dondurulamaz.");
            return;
        }
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        if (confirm(`Kullanıcı durumu değiştirilsin mi?`)) {
            addLog(`COMMAND: Changing status to ${newStatus.toUpperCase()}...`);
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId), { status: newStatus });
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile'), { status: newStatus });
        }
    };

    const deleteUser = async (userId: string) => {
        if (userId === currentUser?.uid) {
            alert("KRİTİK HATA: Yönetici hesabı silinemez.");
            return;
        }
        if (confirm("DİKKAT: Veriler kalıcı olarak silinecek.")) {
            addLog(`COMMAND: PURGING USER_${userId.substring(0, 5)}...`);
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'user_directory', userId));
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', userId, 'users', 'profile'));
            addLog("SUCCESS: User purged from database.");
        }
    };

    return (
        <RoleGuard allowedRoles={['admin']}>
            <div className="space-y-6 bg-slate-950 min-h-screen p-6 text-slate-300 font-mono text-sm">

                {/* HUD */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-800 pb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></span>
                            <span className="text-green-500 text-xs tracking-widest font-bold">SYSTEM ONLINE</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter flex items-center gap-3">
                            <Terminal className="text-blue-500" /> ADMIN_CONSOLE_V2
                        </h1>
                        <p className="text-slate-500 text-xs mt-1">ROOT ACCESS GRANTED // ID: {currentUser?.uid}</p>
                    </div>
                    <div className="flex gap-4 text-xs font-bold font-mono">
                        <div className="text-right">
                            <span className="text-slate-500 block">SERVER TIME</span>
                            <span className="text-blue-400">{new Date().toLocaleTimeString()}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-slate-500 block">LATENCY</span>
                            <span className="text-green-400">24ms</span>
                        </div>
                    </div>
                </div>

                {/* INFO GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-sm border-l-2 border-blue-500">
                        <div className="flex justify-between items-start">
                            <div><p className="text-xs text-blue-500 mb-1">TOTAL_NODES</p><h3 className="text-2xl font-bold text-white">{stats.totalUsers}</h3></div>
                            <Server className="w-5 h-5 text-slate-700" />
                        </div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-sm border-l-2 border-green-500">
                        <div className="flex justify-between items-start">
                            <div><p className="text-xs text-green-500 mb-1">ACTIVE_LICENSES</p><h3 className="text-2xl font-bold text-white">{stats.activeUsers}</h3></div>
                            <ShieldAlert className="w-5 h-5 text-slate-700" />
                        </div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-sm border-l-2 border-purple-500">
                        <div className="flex justify-between items-start">
                            <div><p className="text-xs text-purple-500 mb-1">CPU_LOAD</p><h3 className="text-2xl font-bold text-white">{stats.systemLoad}</h3></div>
                            <Cpu className="w-5 h-5 text-slate-700" />
                        </div>
                    </div>
                    <div className="lg:col-span-1 bg-black p-3 rounded-sm border border-slate-800 font-mono text-xs overflow-hidden h-24 lg:h-auto flex flex-col justify-end">
                        {logs.map((log, i) => (<p key={i} className="text-green-500/80 truncate"><span className="mr-2 opacity-50">{'>'}</span>{log}</p>))}
                    </div>
                </div>

                {/* SYSTEM CONFIGURATION PANEL (NEW) */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-sm">
                    <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-yellow-500" /> FINANCIAL CONFIGURATION
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <div className="lg:col-span-1">
                            <label className="text-[10px] text-slate-500 block mb-1">MONTHLY (1 AY)</label>
                            <input
                                value={systemSettings.monthlyPrice}
                                onChange={(e) => setSystemSettings({ ...systemSettings, monthlyPrice: e.target.value })}
                                className="w-full bg-black border border-slate-700 text-white px-2 py-1.5 text-xs focus:border-yellow-500 outline-none"
                                placeholder="499"
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="text-[10px] text-slate-500 block mb-1">SEMI-ANNUAL (6 AY)</label>
                            <input
                                value={systemSettings.sixMonthPrice}
                                onChange={(e) => setSystemSettings({ ...systemSettings, sixMonthPrice: e.target.value })}
                                className="w-full bg-black border border-slate-700 text-white px-2 py-1.5 text-xs focus:border-yellow-500 outline-none"
                                placeholder="2750"
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="text-[10px] text-slate-500 block mb-1">ANNUAL (1 YIL)</label>
                            <input
                                value={systemSettings.yearlyPrice}
                                onChange={(e) => setSystemSettings({ ...systemSettings, yearlyPrice: e.target.value })}
                                className="w-full bg-black border border-slate-700 text-white px-2 py-1.5 text-xs focus:border-yellow-500 outline-none"
                                placeholder="4990"
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="text-[10px] text-slate-500 block mb-1">BANK NAME</label>
                            <input
                                value={systemSettings.bankName}
                                onChange={(e) => setSystemSettings({ ...systemSettings, bankName: e.target.value })}
                                className="w-full bg-black border border-slate-700 text-white px-2 py-1.5 text-xs focus:border-yellow-500 outline-none"
                                placeholder="Ziraat"
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="text-[10px] text-slate-500 block mb-1">IBAN ADDRESS</label>
                            <input
                                value={systemSettings.iban}
                                onChange={(e) => setSystemSettings({ ...systemSettings, iban: e.target.value })}
                                className="w-full bg-black border border-slate-700 text-white px-2 py-1.5 text-xs focus:border-yellow-500 outline-none"
                                placeholder="TR..."
                            />
                        </div>
                        <div className="lg:col-span-1">
                            <label className="text-[10px] text-slate-500 block mb-1">ACTION</label>
                            <button
                                onClick={saveSettings}
                                className="w-full bg-slate-800 hover:bg-yellow-900/30 text-yellow-500 border border-slate-700 hover:border-yellow-500 px-2 py-1.5 text-xs font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <Save className="w-3 h-3" /> SAVE
                            </button>
                        </div>
                    </div>
                </div>

                {/* BROADCAST & DATA OPS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-sm">
                        <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
                            <Megaphone className="w-4 h-4 text-orange-500" /> GLOBAL BROADCAST SYSTEM
                        </h3>
                        <form onSubmit={sendBroadcast} className="flex gap-2">
                            <input
                                type="text"
                                value={broadcastMsg}
                                onChange={(e) => setBroadcastMsg(e.target.value)}
                                placeholder="Enter system announcement..."
                                className="flex-1 bg-black border border-slate-700 text-white px-3 py-2 text-xs focus:border-orange-500 outline-none transition-colors"
                            />
                            <button
                                disabled={isBroadcasting}
                                className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 text-xs font-bold uppercase tracking-wide flex items-center gap-1 disabled:opacity-50"
                            >
                                {isBroadcasting ? 'SENDING...' : 'TRANSMIT'}
                            </button>
                        </form>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-bold text-white mb-1 flex items-center gap-2">
                                <Database className="w-4 h-4 text-blue-500" /> DATA EXTRACTION
                            </h3>
                            <p className="text-[10px] text-slate-500">Download full user registry JSON dump.</p>
                        </div>
                        <button
                            onClick={exportDatabase}
                            className="bg-slate-800 border border-slate-700 hover:border-blue-500 text-blue-400 px-4 py-3 text-xs font-bold flex items-center gap-2 transition-all"
                        >
                            <Download className="w-4 h-4" /> EXPORT .JSON
                        </button>
                    </div>
                </div>

                {/* USER DATABASE TABLE */}
                <div className="bg-slate-900 border border-slate-800 rounded-sm overflow-hidden">
                    <div className="p-3 bg-slate-950 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                            <Database className="w-4 h-4 text-slate-500" /> USER_DATABASE
                        </h3>
                        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3 py-1 rounded-sm">
                            <Search className="w-3 h-3 text-slate-400" />
                            <input placeholder="Search query..." className="bg-transparent border-none text-xs text-white outline-none w-40 placeholder-slate-600" />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-950 text-slate-500 text-xs border-b border-slate-800 uppercase tracking-wider">
                                    <th className="p-4 font-normal">Identity</th>
                                    <th className="p-4 font-normal">Network / IP</th>
                                    <th className="p-4 font-normal">License Status</th>
                                    <th className="p-4 font-normal">Expires In</th>
                                    <th className="p-4 font-normal text-right">Root Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50 text-xs">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-500">INITIALIZING DATABASE...</td></tr>
                                ) : (
                                    users.map((u) => (
                                        <tr key={u.id} className={`hover:bg-slate-800/50 transition-colors ${u.id === currentUser?.uid ? 'bg-blue-900/10' : ''}`}>
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded flex items-center justify-center font-bold ${u.role === 'admin' ? 'bg-red-900/20 text-red-500 border border-red-900/50' : 'bg-slate-800 text-slate-400'}`}>
                                                        {u.role === 'admin' ? <ShieldAlert className="w-4 h-4" /> : <UserCog className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-200">
                                                            {u.companyName || 'UNKNOWN_CORP'}
                                                            {u.id === currentUser?.uid && <span className="ml-2 text-[10px] bg-blue-600 text-white px-1 rounded font-normal">YOU</span>}
                                                        </p>
                                                        <p className="text-slate-600 font-mono">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono text-slate-400">
                                                <div className="flex items-center gap-2"><Globe className="w-3 h-3 text-slate-600" />{u.ip}</div>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-600 mt-1"><Wifi className="w-3 h-3" />{u.location}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm border ${u.status === 'active' ? 'bg-green-900/10 text-green-500 border-green-900/30' : 'bg-red-900/10 text-red-500 border-red-900/30'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
                                                    {u.status === 'active' ? 'ONLINE' : 'OFFLINE'}
                                                </span>
                                            </td>
                                            <td className="p-4 font-mono">
                                                {u.licenseEndsAt ? (
                                                    <span className={`${new Date(u.licenseEndsAt.seconds * 1000) < new Date() ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                                        {new Date(u.licenseEndsAt.seconds * 1000).toLocaleDateString('tr-TR')}
                                                    </span>
                                                ) : <span className="text-slate-600">NO_DATA</span>}
                                            </td>
                                            <td className="p-4 text-right">
                                                {u.id === currentUser?.uid ? (
                                                    <span className="text-slate-600 italic text-[10px]">[PROTECTED]</span>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <div className="relative">
                                                            <button onClick={() => setSelectedUser(selectedUser === u.id ? null : u.id)} className="p-1.5 bg-slate-800 border border-slate-700 text-blue-400 hover:bg-slate-700 rounded-sm" title="Extend License">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                            </button>
                                                            {selectedUser === u.id && (
                                                                <div className="absolute right-0 top-8 w-32 bg-slate-900 border border-slate-700 shadow-xl z-50 rounded-sm flex flex-col p-1">
                                                                    <button onClick={() => extendLicense(u.id, 1)} className="text-left px-2 py-1.5 hover:bg-slate-800 text-xs text-white">+ 1 Ay</button>
                                                                    <button onClick={() => extendLicense(u.id, 3)} className="text-left px-2 py-1.5 hover:bg-slate-800 text-xs text-white">+ 3 Ay</button>
                                                                    <button onClick={() => extendLicense(u.id, 12)} className="text-left px-2 py-1.5 hover:bg-slate-800 text-xs text-white">+ 1 Yıl</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button onClick={() => toggleStatus(u.id, u.status)} className={`p-1.5 border rounded-sm transition-colors ${u.status === 'active' ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-green-900/20 border-green-900 text-green-500'}`} title="Toggle Status">
                                                            {u.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Activity className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <button onClick={() => deleteUser(u.id)} className="p-1.5 bg-slate-800 border border-slate-700 text-red-500 hover:bg-red-900/20 hover:border-red-900 rounded-sm" title="Purge User">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </RoleGuard>
    );
}