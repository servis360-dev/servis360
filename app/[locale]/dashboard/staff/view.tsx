'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Users,
    UserPlus,
    Mail,
    Trash2,
    Briefcase,
    CheckCircle2,
    X,
    Loader2,
    Crown,
    Store,
    Phone
} from 'lucide-react';

// 🔥 dict (sözlük) prop olarak geliyor
export default function StaffView({ dict }: { dict: any }) {
    const [staff, setStaff] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: 'technical',
        phone: '',
        branchId: ''
    });

    useEffect(() => {
        let unsubSnap: () => void;
        let unsubBranches: () => void;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                const profileSnap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile'));
                if (profileSnap.exists()) {
                    setUserData(profileSnap.data());
                }

                const q = query(collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'staff'));
                unsubSnap = onSnapshot(q, (snapshot) => {
                    setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                    setLoading(false);
                });

                const qBranches = query(collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'branches'));
                unsubBranches = onSnapshot(qBranches, (snapshot) => {
                    setBranches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                });
            }
        });

        return () => {
            unsubscribe();
            if (unsubSnap) unsubSnap();
            if (unsubBranches) unsubBranches();
        };
    }, []);

    const getLimits = () => {
        if (!userData) return { base: 1, extra: 0, total: 1 };
        let baseLimit = 1;
        if (['corporate', 'company', 'enterprise'].includes(userData.accountType)) baseLimit = 50;
        else if (['esnaf', 'business', 'tradesman'].includes(userData.accountType)) baseLimit = 5;
        const extra = userData.customStaffLimit || 0;
        return { base: baseLimit, extra: extra, total: baseLimit + extra };
    };

    const limits = getLimits();
    const remaining = limits.total - staff.length;

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !userData) return;

        if (branches.length > 0 && !formData.branchId) {
            alert("Lütfen bir şube seçiniz."); // Burası opsiyonel çevrilebilir
            return;
        }

        if (staff.length >= limits.total) {
            alert(
                `⚠️ ${dict.staff.limit_reached}!\n\n` +
                `${dict.staff.limit_alert}`
            );
            return;
        }

        try {
            const selectedBranchName = branches.find(b => b.id === formData.branchId)?.name || 'Merkez';

            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'staff', formData.email), {
                ...formData,
                branchName: selectedBranchName,
                status: 'invited',
                invitedAt: serverTimestamp()
            });

            await setDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'invitations', formData.email), {
                email: formData.email,
                targetCompanyId: user.uid,
                targetCompanyName: userData.companyName || 'Şirket',
                targetSector: userData.sectorType || 'technical_service',
                assignedRole: formData.role,
                assignedBranchId: formData.branchId,
                invitedBy: userData.fullName,
                createdAt: serverTimestamp()
            });

            alert(`✅ ${dict.common.save}`);
            setShowModal(false);
            setFormData({ fullName: '', email: '', role: 'technical', phone: '', branchId: '' });

        } catch (error) {
            console.error(error);
            alert(dict.common.error);
        }
    };

    const handleDelete = async (email: string) => {
        if (confirm(dict.common.delete + "?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'staff', email));
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'invitations', email));
        }
    };

    // 🔥 Rol İsimlerini Sözlükten Çekiyoruz
    const getRoleName = (role: string) => {
        // dict.staff.roles içindeki keylere bakıyoruz
        const roles: any = dict.staff.roles;
        return roles[role] || role;
    };

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-600" /> {dict.staff.title}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">{dict.staff.subtitle}</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {userData && (
                        <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 w-full md:w-auto ${remaining <= 1 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
                            <Crown className="w-5 h-5" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{dict.staff.total_right}</p>
                                <div className="text-sm font-bold flex items-center gap-1">
                                    <span>{staff.length} / {limits.total}</span>
                                    {limits.extra > 0 && (
                                        <span className="text-[10px] bg-white/50 px-1.5 rounded-full ml-1 border border-current">
                                            +{limits.extra} {dict.staff.extra}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <button onClick={() => setShowModal(true)} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all active:scale-95">
                        <UserPlus className="w-5 h-5" /> <span className="hidden sm:inline">{dict.staff.add_new}</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-slate-500">{dict.staff.table_staff}</th>
                                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-slate-500">{dict.staff.table_contact}</th>
                                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-slate-500">{dict.staff.table_role}</th>
                                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-slate-500">{dict.staff.table_branch}</th>
                                <th className="p-4 font-semibold text-xs uppercase tracking-wider text-slate-500">{dict.common.status}</th>
                                <th className="p-4 text-right font-semibold text-xs uppercase tracking-wider text-slate-500">{dict.common.actions}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={6} className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />{dict.common.loading}</td></tr>
                            ) : staff.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                                                <Briefcase className="w-8 h-8 opacity-50" />
                                            </div>
                                            <p className="font-bold text-slate-600 dark:text-slate-300">Henüz personel yok</p>
                                            <p className="text-sm mt-1">Ekip arkadaşlarınızı davet ederek işleri paylaşın.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : staff.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                                                {p.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">{p.fullName}</div>
                                                <div className="text-xs text-slate-400">ID: {p.id.slice(0, 5)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-xs font-medium">
                                                <Mail className="w-3.5 h-3.5 text-slate-400" /> {p.email}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Phone className="w-3.5 h-3.5 text-slate-400" /> {p.phone || '-'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1 w-fit
                                            ${p.role === 'sales' ? 'bg-green-50 text-green-700 border-green-200' :
                                                p.role === 'accountant' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                    'bg-blue-50 text-blue-700 border-blue-200'}`}>
                                            {p.role === 'sales' && <Store className="w-3 h-3" />}
                                            {getRoleName(p.role)}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {p.branchName ? (
                                            <div className="flex items-center gap-1.5">
                                                <Store className="w-4 h-4 text-purple-500" />
                                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{p.branchName}</span>
                                            </div>
                                        ) : <span className="text-slate-400 text-xs">-</span>}
                                    </td>
                                    <td className="p-4">
                                        {p.status === 'active' ? (
                                            <span className="text-green-600 font-bold text-xs flex items-center gap-1 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full w-fit">
                                                <CheckCircle2 className="w-3 h-3" /> {dict.common.active}
                                            </span>
                                        ) : (
                                            <span className="text-amber-600 font-bold text-xs flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 px-2 py-1 rounded-full w-fit animate-pulse">
                                                <Loader2 className="w-3 h-3" /> {dict.common.loading}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                            title={dict.common.delete}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-0 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                                <UserPlus className="w-5 h-5 text-blue-600" /> {dict.staff.invite_modal_title}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                        </div>

                        <div className="p-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl mb-6 flex gap-3">
                                <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg h-fit">
                                    <Crown className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                                </div>
                                <div className="text-xs text-blue-900 dark:text-blue-200">
                                    <p className="font-bold mb-1">{dict.staff.limit_status}</p>
                                    {/* {remaining} değerini dinamik olarak metne gömüyoruz */}
                                    <p>{dict.staff.limit_desc.replace('{remaining}', remaining)}</p>
                                </div>
                            </div>

                            <form onSubmit={handleInvite} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">{dict.staff.form_name}</label>
                                    <input required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all font-medium" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} placeholder="Örn: Ahmet Yılmaz" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">{dict.staff.form_email}</label>
                                    <input required type="email" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all font-medium" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="ahmet@gmail.com" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{dict.staff.form_phone}</label>
                                        <input type="tel" className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all font-medium" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="0555..." />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{dict.staff.form_role}</label>
                                        <select className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all font-medium text-sm" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                            <option value="technical">{dict.staff.roles.technical}</option>
                                            <option value="sales">{dict.staff.roles.sales}</option>
                                            <option value="accountant">{dict.staff.roles.accountant}</option>
                                        </select>
                                    </div>
                                </div>

                                {branches.length > 0 && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">{dict.staff.form_branch}</label>
                                        <div className="relative">
                                            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <select required className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 appearance-none font-medium text-sm" value={formData.branchId} onChange={e => setFormData({ ...formData, branchId: e.target.value })}>
                                                <option value="">Şube Seçiniz...</option>
                                                {branches.map(b => (
                                                    <option key={b.id} value={b.id}>{b.name} {b.isHeadquarters ? '(Merkez)' : ''}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-4">
                                    <Mail className="w-5 h-5" /> {dict.staff.btn_invite}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}