'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    Smartphone,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Trash2
} from 'lucide-react';
import Link from 'next/link';

// Türkçe Durum Etiketleri ve Renkleri
const statusConfig: any = {
    pending: { label: 'Bekliyor', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    in_progress: { label: 'İşlemde', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    waiting_parts: { label: 'Parça Bekliyor', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    completed: { label: 'Tamamlandı', color: 'text-green-600 bg-green-50 border-green-200' },
    cancelled: { label: 'İptal', color: 'text-red-600 bg-red-50 border-red-200' }
};

export default function JobsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Kullanıcının kendi işlerini dinle (Real-time)
                const q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'jobs'),
                    orderBy('createdAt', 'desc')
                );

                const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
                    const jobsData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    }));
                    setJobs(jobsData);
                    setLoading(false);
                });

                return () => unsubscribeSnapshot();
            } else {
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // Durum Güncelleme Fonksiyonu
    const updateStatus = async (jobId: string, newStatus: string) => {
        if (!user) return;
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', jobId), {
            status: newStatus
        });
    };

    // Silme Fonksiyonu
    const handleDelete = async (jobId: string) => {
        if (!user) return;
        if (confirm("Bu kaydı silmek istediğinize emin misiniz?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', jobId));
        }
    }

    // Arama Filtresi
    const filteredJobs = jobs.filter(job =>
        job.customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.device?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Üst Başlık ve Aksiyonlar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">İş Emirleri</h1>
                    <p className="text-slate-500 dark:text-slate-400">Tüm servis kayıtlarını buradan yönetebilirsiniz.</p>
                </div>
                <Link href="/dashboard/jobs/new">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                        <Plus className="w-5 h-5" />
                        Yeni İş Ekle
                    </button>
                </Link>
            </div>

            {/* Arama ve Filtreleme */}
            <div className="flex gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Müşteri adı, cihaz veya takip no ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filtrele</span>
                </button>
            </div>

            {/* İş Listesi (Tablo) */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white">Müşteri / Cihaz</th>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white">Durum</th>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white">Tarih</th>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white">Ücret</th>
                                <th className="p-4 font-semibold text-slate-900 dark:text-white text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Yükleniyor...</td></tr>
                            ) : filteredJobs.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-500">Kayıt bulunamadı.</td></tr>
                            ) : (
                                filteredJobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                    <Smartphone className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white">{job.customer}</p>
                                                    <p className="text-xs text-slate-500">{job.device} - {job.problem}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusConfig[job.status]?.color || 'bg-slate-100'}`}>
                                                {statusConfig[job.status]?.label === 'Bekliyor' && <Clock className="w-3 h-3" />}
                                                {statusConfig[job.status]?.label === 'Tamamlandı' && <CheckCircle2 className="w-3 h-3" />}
                                                {statusConfig[job.status]?.label || job.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className="block text-slate-700 dark:text-slate-300">{new Date(job.createdAt?.seconds * 1000).toLocaleDateString('tr-TR')}</span>
                                            <span className="text-xs text-slate-400">{new Date(job.createdAt?.seconds * 1000).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </td>
                                        <td className="p-4 font-bold text-slate-900 dark:text-white">
                                            {job.price ? `${job.price} ₺` : '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <select
                                                    value={job.status}
                                                    onChange={(e) => updateStatus(job.id, e.target.value)}
                                                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs p-1.5 outline-none focus:border-blue-500"
                                                >
                                                    <option value="pending">Bekliyor</option>
                                                    <option value="in_progress">İşlemde</option>
                                                    <option value="waiting_parts">Parça Bekliyor</option>
                                                    <option value="completed">Tamamlandı</option>
                                                    <option value="cancelled">İptal</option>
                                                </select>
                                                <button
                                                    onClick={() => handleDelete(job.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}