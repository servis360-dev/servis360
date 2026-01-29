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
    MoreHorizontal,
    Calendar,
    ArrowRight,
    Briefcase,
    Clock,
    CheckCircle2,
    ShoppingBag,
    Scissors,
    Car,
    FileText
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
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/login');
            } else {
                setUser(currentUser);

                // 1. Önce Kullanıcının Sektörünü Öğren
                await fetchSectorConfig(currentUser.uid);

                // 2. Sonra Verileri Çek
                setupRealtimeListeners(currentUser.uid, timeFilter);
            }
        });
        return () => unsubscribeAuth();
    }, [router, timeFilter]);

    // Sektöre Göre Dil Ayarla
    const fetchSectorConfig = async (uid: string) => {
        try {
            const docRef = doc(db, 'artifacts', 'servis-360-live', 'users', uid, 'users', 'profile');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const sector = docSnap.data().sectorType || 'technical_service';

                let config = {
                    title: 'Aktif İşler',
                    unit: 'adet',
                    icon: Briefcase,
                    completedText: 'iş tamamlandı',
                    buttonText: 'İşleri Gör'
                };

                if (sector === 'retail_wholesale') {
                    config = { title: 'Bekleyen Siparişler', unit: 'sipariş', icon: ShoppingBag, completedText: 'sipariş teslim', buttonText: 'Siparişler' };
                } else if (sector === 'beauty_health') {
                    config = { title: 'Yaklaşan Randevular', unit: 'randevu', icon: Scissors, completedText: 'hizmet bitti', buttonText: 'Randevular' };
                } else if (sector === 'auto_rental') {
                    config = { title: 'Kiradaki Araçlar', unit: 'araç', icon: Car, completedText: 'araç döndü', buttonText: 'Filo Durumu' };
                }

                setSectorConfig(config);
            }
        } catch (error) {
            console.error("Sektör bilgisi alınamadı", error);
        }
    };

    const setupRealtimeListeners = (uid: string, filter: 'week' | 'month') => {
        const userPath = `artifacts/servis-360-live/users/${uid}`;

        const now = new Date();
        let startDateStr = '';

        if (filter === 'week') {
            const past = new Date();
            past.setDate(now.getDate() - 7);
            startDateStr = past.toISOString().split('T')[0];
        } else {
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            startDateStr = `${year}-${month}-01`;
        }

        // FİNANS DİNLEYİCİSİ
        const qTrans = query(
            collection(db, userPath, 'transactions'),
            where('date', '>=', startDateStr),
            orderBy('date', 'asc')
        );

        const unsubTrans = onSnapshot(qTrans, (snapshot) => {
            let inc = 0;
            let exp = 0;
            const dailyMap = new Map();

            // Grafik Boşluklarını Doldur
            if (filter === 'week') {
                for (let i = 6; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const dateKey = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                    dailyMap.set(dateKey, { name: dateKey, Gelir: 0, Gider: 0 });
                }
            } else {
                const today = new Date();
                const d = new Date(today.getFullYear(), today.getMonth(), 1);
                while (d <= today) {
                    const dateKey = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                    dailyMap.set(dateKey, { name: dateKey, Gelir: 0, Gider: 0 });
                    d.setDate(d.getDate() + 1);
                }
            }

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const val = parseFloat(data.amount) || 0;

                if (data.type === 'income') inc += val;
                else exp += val;

                if (data.date) {
                    const dateObj = new Date(data.date);
                    const dateKey = dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });

                    if (dailyMap.has(dateKey)) {
                        const current = dailyMap.get(dateKey);
                        if (data.type === 'income') current.Gelir += val;
                        else current.Gider += val;
                    }
                }
            });

            setStats(prev => ({ ...prev, income: inc, expense: exp, profit: inc - exp }));
            setChartData(Array.from(dailyMap.values()));
        });

        // İŞ DİNLEYİCİSİ
        const qJobs = query(collection(db, userPath, 'jobs'), orderBy('createdAt', 'desc'));
        const unsubJobs = onSnapshot(qJobs, (snapshot) => {
            const pending = snapshot.docs.filter(d => d.data().status === 'pending' || d.data().status === 'in_progress').length;
            const completed = snapshot.docs.filter(d => d.data().status === 'completed').length;
            setStats(prev => ({ ...prev, pendingJobs: pending, completedJobs: completed }));
        });

        // SON AKTİVİTELER
        const qRecentJobs = query(collection(db, userPath, 'jobs'), orderBy('createdAt', 'desc'), limit(5));
        const qRecentTrans = query(collection(db, userPath, 'transactions'), orderBy('createdAt', 'desc'), limit(5));

        const unsubActivities = onSnapshot(qRecentJobs, (jobSnap) => {
            const jobs = jobSnap.docs.map(d => ({
                id: d.id,
                type: 'job',
                title: d.data().customer || 'İsimsiz Müşteri',
                subtitle: `${d.data().device || 'Ürün'} - ${d.data().problem || 'İşlem'}`,
                date: d.data().createdAt?.toDate() || new Date(),
                amount: d.data().price || 0
            }));

            getDocs(qRecentTrans).then(transSnap => {
                const trans = transSnap.docs.map(d => ({
                    id: d.id,
                    type: d.data().type === 'income' ? 'payment' : 'expense',
                    title: d.data().description || (d.data().type === 'income' ? 'Gelir' : 'Gider'),
                    subtitle: d.data().category || 'Genel',
                    date: d.data().createdAt?.toDate() || new Date(d.data().date),
                    amount: d.data().amount
                }));

                const combined = [...jobs, ...trans].sort((a, b) => b.date - a.date).slice(0, 6);
                setActivities(combined);
                setLoading(false);
            });
        });

        return () => {
            unsubTrans();
            unsubJobs();
            unsubActivities();
        };
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
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Dükkanda ne var ne yok, bir bakışta gör.</p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setTimeFilter('week')}
                        className={`px-5 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${timeFilter === 'week'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-md transform scale-105'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Bu Hafta
                    </button>
                    <button
                        onClick={() => setTimeFilter('month')}
                        className={`px-5 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${timeFilter === 'month'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-md transform scale-105'
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        Bu Ay
                    </button>
                </div>
            </div>

            {/* Büyük Özet Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* 1. Kasa (Ciro) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:border-green-500/30 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                                Toplam Ciro ({timeFilter === 'week' ? 'Haftalık' : 'Aylık'})
                            </p>
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
                                {stats.income.toLocaleString()} <span className="text-lg text-slate-400 font-medium">₺</span>
                            </h3>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl text-green-600 dark:text-green-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2 text-xs">
                        <span className="text-red-500 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded">
                            -{stats.expense.toLocaleString()} ₺ Gider
                        </span>
                        <span className="text-slate-400">düşüldü</span>
                    </div>
                </div>

                {/* 2. Net Kâr */}
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden transform hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet className="w-24 h-24" />
                    </div>
                    <div className="relative z-10">
                        <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Cebine Kalan Para
                        </p>
                        <h3 className="text-4xl font-black mb-2">{stats.profit.toLocaleString()} ₺</h3>
                        <p className="text-xs text-blue-200 opacity-90 font-medium">
                            {stats.profit > 0 ? "Harika! Kâr ediyorsun. 🎉" : "Dikkat! Giderler geliri geçmiş. ⚠️"}
                        </p>
                    </div>
                </div>

                {/* 3. Sektöre Özel Kart (Dinamik) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between hover:border-orange-500/30 transition-all">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                                {sectorConfig.title}
                            </p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.pendingJobs}</h3>
                                <span className="text-sm text-slate-500 font-medium">{sectorConfig.unit} bekliyor</span>
                            </div>
                        </div>
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl text-orange-600 dark:text-orange-400">
                            <sectorConfig.icon className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                        <div className="text-xs text-slate-500 font-medium">
                            Toplam <span className="text-green-600 font-bold">{stats.completedJobs}</span> {sectorConfig.completedText}.
                        </div>
                        <button
                            onClick={() => router.push('/dashboard/jobs')}
                            className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:underline bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                            {sectorConfig.buttonText} <ArrowRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Alt Bölüm */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sol: Kazanç Grafiği */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-500" />
                                Kazanç Grafiği
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">İşletmenin {timeFilter === 'week' ? 'haftalık' : 'aylık'} performans analizi.</p>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.4} />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    tickFormatter={(val) => `${val}₺`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Legend
                                    verticalAlign="top"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span className="text-slate-600 dark:text-slate-300 text-xs font-bold ml-1">{value}</span>}
                                />
                                <Bar dataKey="Gelir" fill="#16a34a" radius={[4, 4, 0, 0]} name="Gelir" />
                                <Bar dataKey="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} name="Gider" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sağ: Ne Olup Bitti? */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-blue-500" /> Ne Oldu?
                        </h3>
                        <div className="text-xs text-slate-400 font-medium">Son Hareketler</div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-5 max-h-[340px]">
                        {loading ? (
                            <p className="text-xs text-slate-500 text-center py-10">Yükleniyor...</p>
                        ) : activities.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">Henüz hareket yok.</p>
                                <p className="text-xs text-slate-500 mt-1">İlk işinizi veya işleminizi ekleyin.</p>
                            </div>
                        ) : (
                            activities.map((item, idx) => (
                                <div key={item.id + idx} className="flex gap-4 group">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${item.type === 'job' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                            item.type === 'payment' ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' :
                                                'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        {item.type === 'job' ? <Briefcase className="w-5 h-5" /> :
                                            item.type === 'payment' ? <ArrowDownRight className="w-5 h-5" /> :
                                                <ArrowUpRight className="w-5 h-5" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">
                                                {item.title}
                                            </p>
                                            <p className="text-[10px] text-slate-400 whitespace-nowrap ml-2 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {item.date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            {item.subtitle}
                                        </p>

                                        {item.amount > 0 && (
                                            <p className={`text-xs font-bold mt-1 ${item.type === 'expense' ? 'text-red-600' :
                                                    item.type === 'payment' ? 'text-green-600' : 'text-blue-600'
                                                }`}>
                                                {item.type === 'expense' ? '-' : '+'} {item.amount.toLocaleString()} ₺
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}