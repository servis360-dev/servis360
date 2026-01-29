'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import {
    Wallet,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Activity,
    Calendar,
    ArrowRight,
    Briefcase,
    Clock,
    ShoppingBag,
    Scissors,
    Car
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<'week' | 'month'>('week');

    // İstatistikler
    const [stats, setStats] = useState({
        income: 0,
        expense: 0,
        profit: 0,
        pendingJobs: 0,
        completedJobs: 0,
    });

    // Dinamik Sektör Ayarları
    const [sectorConfig, setSectorConfig] = useState({
        title: 'Aktif İşler',
        unit: 'adet',
        icon: Briefcase,
        completedText: 'iş tamamlandı',
        buttonText: 'Listeyi Aç'
    });

    const [chartData, setChartData] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        let unsubTrans: () => void;
        let unsubJobs: () => void;
        let unsubActivities: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/login');
            } else {
                setUser(currentUser);
                await fetchSectorConfig(currentUser.uid);

                const listeners = setupRealtimeListeners(currentUser.uid, timeFilter);
                unsubTrans = listeners.unsubTrans;
                unsubJobs = listeners.unsubJobs;
                unsubActivities = listeners.unsubActivities;
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubTrans) unsubTrans();
            if (unsubJobs) unsubJobs();
            if (unsubActivities) unsubActivities();
        };
    }, [router, timeFilter]);

    // Sektör Yapılandırması
    const fetchSectorConfig = async (uid: string) => {
        try {
            const docRef = doc(db, 'artifacts', 'servis-360-live', 'users', uid, 'users', 'profile');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const sector = docSnap.data().sectorType || 'technical_service';
                let config = { title: 'Aktif İşler', unit: 'adet', icon: Briefcase, completedText: 'iş tamamlandı', buttonText: 'İşleri Gör' };

                if (sector === 'retail_wholesale') config = { title: 'Bekleyen Siparişler', unit: 'sipariş', icon: ShoppingBag, completedText: 'sipariş teslim', buttonText: 'Siparişler' };
                else if (sector === 'beauty_health') config = { title: 'Yaklaşan Randevular', unit: 'randevu', icon: Scissors, completedText: 'hizmet bitti', buttonText: 'Randevular' };
                else if (sector === 'auto_rental') config = { title: 'Kiradaki Araçlar', unit: 'araç', icon: Car, completedText: 'araç döndü', buttonText: 'Filo Durumu' };

                setSectorConfig(config);
            }
        } catch (error) { console.error("Sektör bilgisi alınamadı", error); }
    };

    // Tarih Dönüştürücü (Hem String hem Timestamp destekler)
    const parseDate = (dateVal: any) => {
        if (!dateVal) return new Date();
        if (dateVal.toDate) return dateVal.toDate(); // Firestore Timestamp
        return new Date(dateVal); // String Date
    };

    const setupRealtimeListeners = (uid: string, filter: 'week' | 'month') => {
        const userPath = `artifacts/servis-360-live/users/${uid}`;

        // FİNANS DİNLEYİCİSİ (Koleksiyon adı: 'finance' olarak güncellendi)
        // Not: Tarih filtresini JavaScript tarafında yapacağız çünkü format karmaşası olabilir
        const qTrans = query(collection(db, userPath, 'finance'), orderBy('date', 'asc'));

        const unsubTrans = onSnapshot(qTrans, (snapshot) => {
            let inc = 0, exp = 0;
            const dailyMap = new Map();
            const now = new Date();

            // Tarih sınırını belirle
            const limitDate = new Date();
            if (filter === 'week') limitDate.setDate(now.getDate() - 7);
            else limitDate.setMonth(now.getMonth(), 1); // Ay başı

            // Grafik iskeletini oluştur
            if (filter === 'week') {
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(); d.setDate(d.getDate() - i);
                    const k = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                    dailyMap.set(k, { name: k, Gelir: 0, Gider: 0 });
                }
            } else {
                const d = new Date(limitDate);
                while (d <= now) {
                    const k = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                    dailyMap.set(k, { name: k, Gelir: 0, Gider: 0 });
                    d.setDate(d.getDate() + 1);
                }
            }

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const itemDate = parseDate(data.date);

                // Sadece filtrelenen tarih aralığını al
                if (itemDate >= limitDate) {
                    const val = Number(data.amount) || 0;
                    if (data.type === 'income') inc += val; else exp += val;

                    const dateKey = itemDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                    if (dailyMap.has(dateKey)) {
                        const current = dailyMap.get(dateKey);
                        if (data.type === 'income') current.Gelir += val; else current.Gider += val;
                    }
                }
            });

            setStats(prev => ({ ...prev, income: inc, expense: exp, profit: inc - exp }));
            setChartData(Array.from(dailyMap.values()));
        });

        // İŞ DİNLEYİCİSİ
        const qJobs = query(collection(db, userPath, 'jobs'), orderBy('createdAt', 'desc'));
        const unsubJobs = onSnapshot(qJobs, (snapshot) => {
            const pending = snapshot.docs.filter(d => ['pending', 'in_progress', 'waiting_parts'].includes(d.data().status)).length;
            const completed = snapshot.docs.filter(d => d.data().status === 'completed').length;
            setStats(prev => ({ ...prev, pendingJobs: pending, completedJobs: completed }));
        });

        // SON AKTİVİTELER (Hem işler hem finans)
        const qRecentJobs = query(collection(db, userPath, 'jobs'), orderBy('createdAt', 'desc'), limit(5));
        const qRecentTrans = query(collection(db, userPath, 'finance'), orderBy('date', 'desc'), limit(5));

        const unsubActivities = onSnapshot(qRecentJobs, (jobSnap) => {
            const jobs = jobSnap.docs.map(d => ({
                id: d.id, type: 'job',
                title: d.data().customer || 'Müşteri',
                subtitle: `${d.data().device} - ${d.data().status === 'completed' ? 'Tamamlandı' : 'İşlemde'}`,
                date: parseDate(d.data().createdAt),
                amount: d.data().price || 0
            }));

            getDocs(qRecentTrans).then(transSnap => {
                const trans = transSnap.docs.map(d => ({
                    id: d.id,
                    type: d.data().type === 'income' ? 'payment' : 'expense',
                    title: d.data().description || (d.data().type === 'income' ? 'Gelir' : 'Gider'),
                    subtitle: d.data().category || 'Genel',
                    date: parseDate(d.data().date),
                    amount: d.data().amount
                }));

                const combined = [...jobs, ...trans].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);
                setActivities(combined);
                setLoading(false);
            });
        });

        return { unsubTrans, unsubJobs, unsubActivities };
    };

    if (!user) return null;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Üst Başlık ve Filtre */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Activity className="text-blue-600 w-6 h-6" />
                        İşletme Özeti
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">İşletmenizin anlık durumu.</p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setTimeFilter('week')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${timeFilter === 'week' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Bu Hafta</button>
                    <button onClick={() => setTimeFilter('month')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${timeFilter === 'month' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Bu Ay</button>
                </div>
            </div>

            {/* KARTLAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between">
                        <div><p className="text-slate-500 text-xs font-bold uppercase">Toplam Ciro</p><h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.income.toLocaleString()} ₺</h3></div>
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl"><TrendingUp className="w-6 h-6" /></div>
                    </div>
                    <div className="mt-4 text-xs text-slate-500 flex gap-2"><span className="text-red-500 bg-red-50 px-2 py-1 rounded font-bold">-{stats.expense.toLocaleString()} ₺ Gider</span> düşüldü</div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-24 h-24" /></div>
                    <p className="text-blue-100 text-xs font-bold uppercase">Net Kâr (Kasa)</p>
                    <h3 className="text-4xl font-black mb-2">{stats.profit.toLocaleString()} ₺</h3>
                    <p className="text-xs text-blue-200 opacity-90">{stats.profit > 0 ? "Kârdayız! 🎉" : "Giderler yüksek! ⚠️"}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between">
                        <div><p className="text-slate-500 text-xs font-bold uppercase">{sectorConfig.title}</p><div className="flex items-baseline gap-2"><h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.pendingJobs}</h3><span className="text-sm text-slate-500">{sectorConfig.unit} bekliyor</span></div></div>
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><sectorConfig.icon className="w-6 h-6" /></div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <span className="text-xs text-slate-500"><span className="text-green-600 font-bold">{stats.completedJobs}</span> {sectorConfig.completedText}</span>
                        <button onClick={() => router.push('/dashboard/jobs')} className="text-blue-600 text-xs font-bold bg-blue-50 px-3 py-1.5 rounded-lg flex items-center gap-1">{sectorConfig.buttonText} <ArrowRight className="w-3 h-3" /></button>
                    </div>
                </div>
            </div>

            {/* GRAFİK VE LİSTE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white"><Calendar className="w-5 h-5 text-blue-500" /> Finansal Grafik</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barSize={20}><CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} /><XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} /><YAxis axisLine={false} tickLine={false} fontSize={11} tickFormatter={(v) => `${v}₺`} /><Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} /><Legend /><Bar dataKey="Gelir" fill="#16a34a" radius={[4, 4, 0, 0]} /><Bar dataKey="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} /></BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center"><h3 className="font-bold text-slate-900 dark:text-white flex gap-2"><Activity className="w-5 h-5 text-blue-500" /> Son Hareketler</h3></div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[340px]">
                        {loading ? <p className="text-center text-xs text-slate-500">Yükleniyor...</p> : activities.length === 0 ? <p className="text-center text-xs text-slate-500">Hareket yok.</p> : activities.map((item, idx) => (
                            <div key={idx} className="flex gap-4 group">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'job' ? 'bg-blue-100 text-blue-600' : item.type === 'payment' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{item.type === 'job' ? <Briefcase className="w-5 h-5" /> : item.type === 'payment' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}</div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex justify-between"><p className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.title}</p><span className="text-[10px] text-slate-400">{item.date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span></div>
                                    <p className="text-xs text-slate-500 truncate">{item.subtitle}</p>
                                    {item.amount > 0 && <p className={`text-xs font-bold mt-1 ${item.type === 'expense' ? 'text-red-600' : item.type === 'payment' ? 'text-green-600' : 'text-blue-600'}`}>{item.type === 'expense' ? '-' : '+'} {item.amount} ₺</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}