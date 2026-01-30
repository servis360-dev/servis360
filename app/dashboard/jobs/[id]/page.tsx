'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot, updateDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Printer,
    MessageCircle,
    Trash2,
    Save,
    CheckCircle2,
    Clock,
    Smartphone,
    User,
    Wrench,
    QrCode
} from 'lucide-react';
import Link from 'next/link';

export default function JobDetailPage({ params }: { params: { id: string } }) {
    const [job, setJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<any>({});
    const router = useRouter();

    // Statü Renkleri
    const statusConfig: any = {
        pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
        in_progress: { label: 'İşlemde', color: 'bg-blue-100 text-blue-700 border-blue-200' },
        waiting_parts: { label: 'Parça Bekliyor', color: 'bg-orange-100 text-orange-700 border-orange-200' },
        completed: { label: 'Tamamlandı', color: 'bg-green-100 text-green-700 border-green-200' },
        cancelled: { label: 'İptal', color: 'bg-red-100 text-red-700 border-red-200' }
    };

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;

        // 1. İş Detayını Dinle
        const unsub = onSnapshot(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', params.id), (doc) => {
            if (doc.exists()) {
                setJob({ id: doc.id, ...doc.data() });
            } else {
                alert("İş bulunamadı!");
                router.push('/dashboard/jobs');
            }
            setLoading(false);
        });

        // 2. Firma Ayarlarını Çek (Fiş Başlığı İçin)
        const fetchSettings = async () => {
            const profileSnap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'));
            if (profileSnap.exists()) {
                setSettings(profileSnap.data());
            }
        };
        fetchSettings();

        return () => unsub();
    }, [params.id, router]);

    const handleStatusChange = async (newStatus: string) => {
        const user = auth.currentUser;
        if (!user) return;
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', params.id), {
            status: newStatus
        });
    };

    const handleDelete = async () => {
        if (confirm("Bu kaydı kalıcı olarak silmek istiyor musunuz?")) {
            const user = auth.currentUser;
            if (!user) return;
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'jobs', params.id));
            router.push('/dashboard/jobs');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const sendWhatsapp = () => {
        if (!job.phone) return;

        let msg = '';
        if (job.status === 'completed') {
            msg = `Sayın ${job.customer}, ${job.device} cihazınızın işlemleri tamamlanmıştır. Teslim alabilirsiniz. Ücret: ${job.price} TL.`;
        } else {
            msg = `Sayın ${job.customer}, ${job.device} cihazınız servisimize kabul edilmiştir. İşlem durumunu buradan takip edebilirsiniz. Takip No: ${job.id.slice(0, 6).toUpperCase()}`;
        }

        const phone = job.phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    if (loading) return <div className="p-10 text-center">Yükleniyor...</div>;
    if (!job) return null;

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* YAZDIRMA STİLLERİ (Sadece Yazdırırken Çalışır) */}
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/jobs" className="p-2 bg-white dark:bg-slate-800 rounded-lg border hover:bg-slate-50 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Servis Kaydı</h1>
                            <span className="font-mono text-sm text-slate-400">#{job.id.slice(0, 6).toUpperCase()}</span>
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border mt-1 ${statusConfig[job.status]?.color}`}>
                            {statusConfig[job.status]?.label}
                        </span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={sendWhatsapp} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
                        <Printer className="w-4 h-4" /> Yazdır
                    </button>
                    <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-200">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
                {/* Sol Taraf: Detaylar */}
                <div className="md:col-span-2 space-y-6">
                    {/* Cihaz Bilgisi */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-purple-600" /> Cihaz Bilgileri
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Cihaz</p>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{job.device}</p>
                                <p className="text-sm text-slate-500">{job.brand}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Seri No / IMEI</p>
                                <p className="font-mono text-slate-700 dark:text-slate-300">{job.serialNo || '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Şifre / Desen</p>
                                <p className="font-mono bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded inline-block">
                                    {job.password || 'Yok'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Teslim Alınanlar</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    {job.accessories && job.accessories.length > 0 ? job.accessories.join(', ') : 'Sadece Cihaz'}
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <p className="text-xs text-slate-500 font-bold uppercase mb-2">Arıza / Şikayet</p>
                            <p className="text-slate-700 dark:text-slate-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                                {job.problem}
                            </p>
                        </div>
                    </div>

                    {/* Müşteri Bilgisi */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" /> Müşteri Bilgileri
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center text-xl font-bold text-slate-500">
                                {job.customer.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-900 dark:text-white">{job.customer}</p>
                                <p className="text-slate-500">{job.phone}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sağ Taraf: Yönetim */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-orange-500" /> İşlem Durumu
                        </h3>

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-500">Durumu Güncelle</label>
                            <select
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                value={job.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                            >
                                <option value="pending">🟡 Bekliyor</option>
                                <option value="in_progress">🔵 İşlemde (Serviste)</option>
                                <option value="waiting_parts">🟠 Parça Bekliyor</option>
                                <option value="completed">🟢 Tamamlandı (Hazır)</option>
                                <option value="cancelled">🔴 İptal / İade</option>
                            </select>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
                                <label className="text-sm font-medium text-slate-500">Ücret (Tahmini/Net)</label>
                                <div className="text-3xl font-bold text-slate-900 dark:text-white mt-1">
                                    {job.price} ₺
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* --- YAZDIRILACAK FİŞ ALANI (GİZLİ) --- */}
            <div id="printable-area" className="hidden print:block p-8 max-w-[80mm] mx-auto border bg-white text-black font-sans text-xs">
                {/* Fiş Başlığı */}
                <div className="text-center border-b pb-4 mb-4 border-black border-dashed">
                    <h2 className="text-xl font-bold uppercase">{settings.companyName || 'TEKNİK SERVİS'}</h2>
                    <p className="text-xs mt-1">{settings.address || 'Adres Bilgisi Girilmedi'}</p>
                    <p className="text-xs">{settings.phone || ''}</p>
                    <p className="text-xs mt-2 font-bold">SERVİS KABUL FİŞİ</p>
                    <p className="text-[10px]">{new Date().toLocaleString('tr-TR')}</p>
                </div>

                {/* Müşteri & Cihaz */}
                <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                        <span className="font-bold">Müşteri:</span>
                        <span>{job.customer}</span>
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
                    <div className="flex justify-between">
                        <span className="font-bold">Şifre:</span>
                        <span>{job.password || '-'}</span>
                    </div>
                </div>

                {/* Arıza */}
                <div className="border p-2 mb-4 border-black">
                    <p className="font-bold underline mb-1">ŞİKAYET / ARIZA:</p>
                    <p>{job.problem}</p>
                </div>

                {/* Aksesuarlar */}
                <div className="mb-4">
                    <p className="font-bold">TESLİM ALINANLAR:</p>
                    <p>{job.accessories && job.accessories.length > 0 ? job.accessories.join(', ') : 'YOK'}</p>
                </div>

                {/* Tahmini Fiyat */}
                {job.price && (
                    <div className="text-right text-lg font-bold border-t border-b border-black py-2 mb-4 border-dashed">
                        TUTAR: {job.price} TL
                    </div>
                )}

                {/* Barkod Alanı (Görsel) */}
                <div className="text-center mb-4">
                    <div className="border border-black p-2 inline-block">
                        <h1 className="text-2xl font-mono tracking-widest font-bold">#{job.id.slice(0, 6).toUpperCase()}</h1>
                    </div>
                    <p className="text-[10px] mt-1">Sorgulama Kodu</p>
                </div>

                {/* Alt Bilgi */}
                <div className="text-[8px] text-center text-slate-600 mt-4 border-t pt-2 border-black border-dashed">
                    <p>Teslim tarihinden itibaren 3 ay içinde alınmayan cihazlardan firmamız sorumlu değildir. Sıvı temaslı cihazlarda garanti verilmez.</p>
                    <p className="mt-2 font-bold">BİZİ TERCİH ETTİĞİNİZ İÇİN TEŞEKKÜRLER</p>
                    <p>www.servis360.com</p>
                </div>
            </div>
        </div>
    );
}