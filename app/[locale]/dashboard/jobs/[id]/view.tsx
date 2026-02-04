'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Printer,
    MessageCircle,
    Trash2,
    Smartphone,
    User,
    Wrench,
    MapPin,
    Calendar,
    CreditCard
} from 'lucide-react';
import Link from 'next/link';
import { useBranch } from '../../../../components/providers/branch-context';
import { formatMoney, getCurrencySettings } from '../../../../lib/format';

export default function JobDetailView({ dict, id, locale }: { dict: any, id: string, locale: string }) {
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<any>({});
    const router = useRouter();
    const { branches } = useBranch();
    const currency = getCurrencySettings(locale);

    // Statü Renkleri (Sözlükten label'ları alacağız ama renkler sabit)
    const getStatusInfo = (status: string) => {
        const config: any = {
            pending: { label: dict.jobs.status.pending, color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
            in_progress: { label: dict.jobs.status.in_progress, color: 'bg-blue-100 text-blue-700 border-blue-200' },
            waiting_parts: { label: dict.jobs.status.waiting_parts, color: 'bg-orange-100 text-orange-700 border-orange-200' },
            completed: { label: dict.jobs.status.completed, color: 'bg-green-100 text-green-700 border-green-200' },
            cancelled: { label: dict.jobs.status.cancelled, color: 'bg-red-100 text-red-700 border-red-200' },
            delivered: { label: dict.jobs.status.delivered, color: 'bg-slate-100 text-slate-700 border-slate-200' }
        };
        return config[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
    };

    useEffect(() => {
        const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
            if (!user) return;

            const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile');
            const profileSnap = await getDoc(profileRef);
            let ownerId = user.uid;

            if (profileSnap.exists()) {
                const data = profileSnap.data();
                setSettings(data);
                if (data.ownerId && data.ownerId !== user.uid) {
                    ownerId = data.ownerId;
                }
            }

            const jobRef = doc(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'jobs', id);
            const unsub = onSnapshot(jobRef, (docSnap) => {
                if (docSnap.exists()) {
                    setJob({ id: docSnap.id, ...docSnap.data() });
                } else {
                    alert(dict.jobs.detail.alert_not_found);
                    router.push('/dashboard/jobs');
                }
                setLoading(false);
            }, (error) => {
                console.error("Hata:", error);
                setLoading(false);
            });

            return () => unsub();
        });

        return () => unsubscribeAuth();
    }, [id, router]);

    const handleStatusChange = async (newStatus: string) => {
        const user = auth.currentUser;
        if (!user || !job) return;

        // Owner ID bulma işlemi tekrarı (garanti olsun)
        const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile');
        const profileSnap = await getDoc(profileRef);
        let ownerId = user.uid;
        if (profileSnap.exists()) {
            const data = profileSnap.data();
            if (data.ownerId) ownerId = data.ownerId;
        }

        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'jobs', id), {
            status: newStatus
        });
    };

    const handleDelete = async () => {
        if (confirm(dict.jobs.detail.confirm_delete)) {
            const user = auth.currentUser;
            if (!user) return;

            const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile');
            const profileSnap = await getDoc(profileRef);
            let ownerId = user.uid;
            if (profileSnap.exists()) {
                const data = profileSnap.data();
                if (data.ownerId) ownerId = data.ownerId;
            }

            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'jobs', id));
            router.push('/dashboard/jobs');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const sendWhatsapp = () => {
        if (!job.phone) return;
        const customerName = job.customerName || job.customer || dict.jobs.detail.val_unnamed;
        let msg = '';

        if (job.status === 'completed') {
            msg = dict.jobs.detail.msg_whatsapp_ready
                .replace('{customer}', customerName)
                .replace('{device}', job.device)
                .replace('{price}', formatMoney(Number(job.price || 0), locale));
        } else {
            msg = dict.jobs.detail.msg_whatsapp_received
                .replace('{customer}', customerName)
                .replace('{device}', job.device)
                .replace('{id}', job.id.slice(0, 6).toUpperCase());
        }

        const phone = job.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    if (loading) return <div className="p-10 text-center flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
    if (!job) return null;

    const customerName = job.customerName || job.customer || dict.jobs.detail.val_unnamed;
    const currentStatus = getStatusInfo(job.status);
    const branchName = job.branchName || (job.branchId ? branches.find(b => b.id === job.branchId)?.name : null);

    return (
        <div className="max-w-5xl mx-auto pb-20 px-4 md:px-0">
            {/* YAZDIRMA STİLLERİ */}
            <style jsx global>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body * { visibility: hidden; }
                    #printable-area, #printable-area * { visibility: visible; }
                    #printable-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; color: black; }
                    .no-print { display: none !important; }
                }
            `}</style>

            {/* --- EKRAN GÖRÜNÜMÜ --- */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 no-print">
                <div className="flex items-center gap-3 w-full lg:w-auto">
                    <Link href="/dashboard/jobs" className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div className="flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">{dict.jobs.detail.title}</h1>
                            <span className="font-mono text-xs md:text-sm text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded w-fit">#{job.id.slice(0, 6).toUpperCase()}</span>
                        </div>
                        <div className="flex gap-2 mt-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold border ${currentStatus.color}`}>
                                {currentStatus.label}
                            </span>
                            {branchName && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-500 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                    {branchName}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-auto grid grid-cols-3 sm:flex gap-2">
                    <button onClick={sendWhatsapp} className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 active:scale-95 transition-all text-xs sm:text-sm">
                        <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" /> <span>{dict.jobs.detail.btn_whatsapp}</span>
                    </button>
                    <button onClick={handlePrint} className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 active:scale-95 transition-all text-xs sm:text-sm">
                        <Printer className="w-4 h-4 sm:w-5 sm:h-5" /> <span>{dict.jobs.detail.btn_print}</span>
                    </button>
                    <button onClick={handleDelete} className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-100 active:scale-95 transition-all text-xs sm:text-sm">
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" /> <span>{dict.jobs.detail.btn_delete}</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
                {/* SOL KOLON: Cihaz ve Müşteri */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Cihaz Bilgisi */}
                    <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                            <Smartphone className="w-5 h-5 text-purple-600" /> {dict.jobs.detail.section_device}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">{dict.jobs.detail.label_device}</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{job.device}</p>
                                <p className="text-sm text-slate-500">{job.brand}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">{dict.jobs.detail.label_serial}</p>
                                <p className="font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded w-fit text-sm">
                                    {job.serialNo || '-'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">{dict.jobs.detail.label_lock}</p>
                                <p className="font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded w-fit text-sm">
                                    {job.password || dict.jobs.detail.val_no_pass}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 font-bold uppercase mb-1">{dict.jobs.detail.label_accessories}</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    {job.accessories && job.accessories.length > 0 ? job.accessories.join(', ') : dict.jobs.detail.val_only_device}
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <p className="text-xs text-slate-400 font-bold uppercase mb-2">{dict.jobs.detail.label_problem}</p>
                            <p className="text-slate-700 dark:text-slate-300 bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30 text-sm md:text-base">
                                {job.problem}
                            </p>
                        </div>
                        <div className="mt-4">
                            <p className="text-xs text-slate-400 font-bold uppercase mb-2">{dict.jobs.detail.label_tech_note}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                                {job.note || dict.jobs.detail.val_no_note}
                            </p>
                        </div>
                    </div>

                    {/* Müşteri Bilgisi */}
                    <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-700">
                            <User className="w-5 h-5 text-blue-600" /> {dict.jobs.detail.section_customer}
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-xl font-bold text-blue-600 dark:text-blue-400">
                                {customerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{customerName}</p>
                                <a href={`tel:${job.phone}`} className="text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1">
                                    {job.phone}
                                </a>
                            </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                                <p className="text-xs text-slate-400 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> {dict.jobs.detail.label_reg_date}</p>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {job.createdAt?.toDate ? job.createdAt.toDate().toLocaleDateString(locale) : 'Bugün'}
                                </p>
                            </div>
                            {job.completedAt && (
                                <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-xl border border-green-100 dark:border-green-900/20">
                                    <p className="text-xs text-green-600 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> {dict.jobs.detail.label_comp_date}</p>
                                    <p className="text-sm font-bold text-green-700 dark:text-green-300">
                                        {job.completedAt.toDate().toLocaleDateString(locale)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* SAĞ KOLON: Yönetim Paneli */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-6">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-orange-500" /> {dict.jobs.detail.section_management}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">{dict.jobs.detail.label_update_status}</label>
                                <div className="relative">
                                    <select
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none appearance-none font-bold text-sm cursor-pointer hover:border-blue-400 transition-colors"
                                        value={job.status}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                    >
                                        <option value="pending">{dict.jobs.status.pending}</option>
                                        <option value="in_progress">{dict.jobs.status.in_progress}</option>
                                        <option value="waiting_parts">{dict.jobs.status.waiting_parts}</option>
                                        <option value="completed">{dict.jobs.status.completed}</option>
                                        <option value="cancelled">{dict.jobs.status.cancelled}</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">{dict.jobs.detail.label_fee_status}</label>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-slate-600 dark:text-slate-400">{dict.jobs.detail.label_service_fee}</span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">{formatMoney(Number(job.price || 0), locale)}</span>
                                </div>
                                {job.paymentStatus === 'paid' ? (
                                    <div className="w-full py-2 bg-green-100 text-green-700 rounded-lg text-center font-bold text-sm flex items-center justify-center gap-2">
                                        <CreditCard className="w-4 h-4" /> {dict.jobs.detail.status_paid}
                                    </div>
                                ) : (
                                    <div className="w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-lg text-center font-bold text-sm flex items-center justify-center gap-2">
                                        <CreditCard className="w-4 h-4" /> {dict.jobs.detail.status_pending}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- YAZDIRILACAK FİŞ ALANI --- */}
            <div id="printable-area" className="hidden print:block p-8 max-w-[80mm] mx-auto border bg-white text-black font-sans text-xs">
                {/* Fiş Başlığı */}
                <div className="text-center border-b pb-4 mb-4 border-black border-dashed">
                    <h2 className="text-xl font-bold uppercase">{settings.companyName || 'TEKNİK SERVİS'}</h2>
                    <p className="text-xs mt-1">{settings.address}</p>
                    <p className="text-xs">{settings.phone}</p>
                    <p className="text-xs mt-2 font-bold">{dict.jobs.detail.receipt_header}</p>
                    <p className="text-[10px]">{new Date().toLocaleString(locale)}</p>
                </div>

                {/* Müşteri & Cihaz */}
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                        <span className="font-bold">Müşteri:</span>
                        <span>{customerName}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">Telefon:</span>
                        <span>{job.phone}</span>
                    </div>
                    <div className="border-b border-black border-dashed my-2"></div>
                    <div className="flex justify-between">
                        <span className="font-bold">Cihaz:</span>
                        <span>{job.device}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">Marka:</span>
                        <span>{job.brand}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="font-bold">Seri No:</span>
                        <span>{job.serialNo || '-'}</span>
                    </div>
                </div>

                {/* Arıza */}
                <div className="border p-2 mb-4 border-black">
                    <p className="font-bold underline mb-1">{dict.jobs.detail.label_problem.toUpperCase()}:</p>
                    <p>{job.problem}</p>
                </div>

                {/* Aksesuarlar */}
                <div className="mb-4">
                    <p className="font-bold">{dict.jobs.detail.label_accessories.toUpperCase()}:</p>
                    <p>{job.accessories && job.accessories.length > 0 ? job.accessories.join(', ') : dict.jobs.detail.val_only_device}</p>
                </div>

                {/* Tahmini Fiyat */}
                {job.price && (
                    <div className="text-right text-lg font-bold border-t border-b border-black py-2 mb-4 border-dashed">
                        {dict.jobs.table_price}: {formatMoney(Number(job.price), locale)}
                    </div>
                )}

                {/* Barkod Alanı */}
                <div className="text-center mb-4">
                    <div className="border border-black p-2 inline-block">
                        <h1 className="text-2xl font-mono tracking-widest font-bold">#{job.id.slice(0, 6).toUpperCase()}</h1>
                    </div>
                    <p className="text-[10px] mt-1">{dict.jobs.detail.receipt_inquiry}</p>
                </div>

                {/* Alt Bilgi */}
                <div className="text-[8px] text-center text-slate-600 mt-4 border-t pt-2 border-black border-dashed">
                    <p>{dict.jobs.detail.receipt_disclaimer}</p>
                    <p className="mt-2 font-bold">{dict.jobs.detail.receipt_thanks}</p>
                </div>
            </div>
        </div>
    );
}