'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Activity,
    Calendar,
    ArrowRight,
    Briefcase,
    ShoppingBag,
    Scissors,
    Car,
    Bell,
    ArrowDownRight,
    ArrowUpRight,
    Clock,
    PiggyBank, // Net Kasa İkonu
    Building2
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
import Link from 'next/link';

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null);
    const [accountType, setAccountType] = useState('business');
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<'week' | 'month'>('week');

    // İstatistikler
    const [stats, setStats] = useState({
        periodIncome: 0,   // Seçili dönem geliri
        periodExpense: 0,  // Seçili dönem gideri
        netBalance: 0,     // TOPLAM NET KASA (Tüm zamanlar)
        activeWork: 0,
        completedWork: 0,
    });

    const [sectorConfig, setSectorConfig] = useState({
        title: 'Aktif İşler',
        unit: 'adet',
        icon: Briefcase,
        path: '/dashboard/jobs'
    });

    const [chartData, setChartData] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const router = useRouter();

    useEffect(() => {
        let unsubTrans: () => void;
        let unsubJobs: () => void;

        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push('/login');
            } else {
                setUser(currentUser);
                const docRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setAccountType(data.accountType || 'business');
                    setUserName(data.fullName || 'Kullanıcı');
                    if (data.accountType !== 'individual') {
                        configureSector(data.sectorType || 'technical_service');
                    }
                }

                const listeners = setupRealtimeListeners(currentUser.uid, timeFilter);
                unsubTrans = listeners.unsubTrans;
                unsubJobs = listeners.unsubJobs;
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubTrans) unsubTrans();
            if (unsubJobs) unsubJobs();
        };
    }, [router, timeFilter]);

    const configureSector = (sector: string) => {
        let config = { title: 'Aktif İşler', unit: 'adet', icon: Briefcase, path: '/dashboard/jobs' };
        if (sector === 'retail_wholesale') config = { title: 'Bekleyen Sipariş', unit: 'sipariş', icon: ShoppingBag, path: '/dashboard/jobs' };
        else if (sector === 'beauty_health') config = { title: 'Randevular', unit: 'randevu', icon: Scissors, path: '/dashboard/appointments' };
        else if (sector === 'auto_rental') config = { title: 'Kiradaki Araçlar', unit: 'araç', icon: Car, path: '/dashboard/jobs' };
        setSectorConfig(config);
    };

    const setupRealtimeListeners = (uid: string, filter: 'week' | 'month') => {
        const userPath = `artifacts/servis-360-live/users/${uid}`;

        // 1. FİNANS DİNLEYİCİSİ
        const qTrans = query(collection(db, userPath, 'finance'), orderBy('date', 'asc'));

        const unsubTrans = onSnapshot(qTrans, (snapshot) => {
            let periodInc = 0, periodExp = 0;
            let totalInc = 0, totalExp = 0; // Tüm zamanlar için

            const dailyMap = new Map();
            const now = new Date();

            // Tarih Sınırı (Son 7 Gün veya Son 30 Gün)
            const limitDate = new Date();
            const daysToLookBack = filter === 'week' ? 7 : 30;
            limitDate.setDate(now.getDate() - daysToLookBack);

            // Grafik iskeletini oluştur (Boş günler 0 görünsün diye)
            for (let i = daysToLookBack - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const k = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                dailyMap.set(k, { name: k, Gelir: 0, Gider: 0 });
            }

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const itemDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);
                const val = Number(data.amount) || 0;

                // 1. TOPLAM NET KASA HESABI (Tarih farketmeksizin)
                if (data.type === 'income') totalInc += val;
                else totalExp += val;

                // 2. DÖNEMSEL HESAP (Filtreye göre)
                if (itemDate >= limitDate) {
                    if (data.type === 'income') periodInc += val;
                    else periodExp += val;

                    // Grafiğe ekle
                    const dateKey = itemDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                    if (dailyMap.has(dateKey)) {
                        const current = dailyMap.get(dateKey);
                        if (data.type === 'income') current.Gelir += val;
                        else current.Gider += val;
                    }
                }
            });

            setStats(prev => ({
                ...prev,
                periodIncome: periodInc,
                periodExpense: periodExp,
                netBalance: totalInc - totalExp // Net Kasa
            }));

            setChartData(Array.from(dailyMap.values()));

            // Son Hareketler
            const recentTrans = snapshot.docs.reverse().slice(0, 5).map(d => ({
                id: d.id,
                type: d.data().type === 'income' ? 'plus' : 'minus',
                title: d.data().description || (d.data().type === 'income' ? 'Gelir' : 'Gider'),
                subtitle: d.data().category || 'Genel',
                amount: d.data().amount,
                date: d.data().date?.toDate ? d.data().date.toDate() : new Date(d.data().date)
            }));
            setActivities(recentTrans);
            setLoading(false);
        });

        // 2. İŞ DİNLEYİCİSİ
        let unsubJobs = () => { };
        const qJobs = query(collection(db, userPath, 'jobs'));
        unsubJobs = onSnapshot(qJobs, (snapshot) => {
            const pending = snapshot.docs.filter(d => ['pending', 'in_progress', 'waiting_parts'].includes(d.data().status)).length;
            const completed = snapshot.docs.filter(d => d.data().status === 'completed').length;
            setStats(prev => ({ ...prev, activeWork: pending, completedWork: completed }));
        });

        return { unsubTrans, unsubJobs };
    };

    if (!user) return null;

    const isIndividual = accountType === 'individual';

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-24">
            {/* BAŞLIK VE FİLTRE */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {isIndividual ? '👋 Merhaba,' : <Building2 className="text-blue-600 w-6 h-6" />}
                        {isIndividual ? userName : (userName || 'İşletme Özeti')}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {isIndividual ? 'Finansal durumun ve servis taleplerin.' : 'İşletmenizin anlık performans durumu.'}
                    </p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto">
                    <button onClick={() => setTimeFilter('week')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${timeFilter === 'week' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Bu Hafta</button>
                    <button onClick={() => setTimeFilter('month')} className={`flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all ${timeFilter === 'month' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Son 30 Gün</button>
                </div>
            </div>

            {/* KARTLAR - MOBİL UYUMLU GRID (1 kolon -> 2 kolon -> 4 kolon) */}
            <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* 1. Dönemsel Gelir */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp className="w-20 h-20 text-green-600" /></div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{timeFilter === 'week' ? 'Bu Hafta' : 'Son 30 Gün'} Gelir</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.periodIncome.toLocaleString()} ₺</h3>
                    <p className="text-[10px] text-green-600 font-bold mt-2 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Ciro</p>
                </div>

                {/* 2. Dönemsel Gider */}
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingDown className="w-20 h-20 text-red-600" /></div>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{timeFilter === 'week' ? 'Bu Hafta' : 'Son 30 Gün'} Gider</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.periodExpense.toLocaleString()} ₺</h3>
                    <p className="text-[10px] text-red-500 font-bold mt-2 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Harcama</p>
                </div>

                {/* 3. NET KASA (TOPLAM) */}
                <div className={`p-5 rounded-2xl shadow-lg relative overflow-hidden group text-white ${stats.netBalance >= 0 ? 'bg-gradient-to-br from-blue-600 to-indigo-700' : 'bg-gradient-to-br from-red-600 to-orange-700'}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-20"><PiggyBank className="w-20 h-20 text-white" /></div>
                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-wider">NET KASA (TOPLAM)</p>
                    <h3 className="text-2xl font-black mt-1">{stats.netBalance.toLocaleString()} ₺</h3>
                    <p className="text-[10px] text-white/90 font-bold mt-2 opacity-80">
                        {stats.netBalance >= 0 ? "Güvendesiniz 👍" : "Açık Var! ⚠️"}
                    </p>
                </div>

                {/* 4. Aktif İşler / Bireysel Durum */}
                {isIndividual ? (
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-blue-400 transition-all" onClick={() => router.push('/dashboard/jobs')}>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Servis Durumu</p>
                        <div className="flex items-baseline gap-2 mt-1">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.activeWork}</h3>
                            <span className="text-xs text-slate-500">cihaz serviste</span>
                        </div>
                        <p className="text-[10px] text-blue-600 font-bold mt-2 flex items-center gap-1">Detaylar <ArrowRight className="w-3 h-3" /></p>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-blue-400 transition-all" onClick={() => router.push(sectorConfig.path)}>
                        <div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">{sectorConfig.title}</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">{stats.activeWork}</h3>
                                <span className="text-xs text-slate-500">{sectorConfig.unit}</span>
                            </div>
                        </div>
                        <div className="absolute top-5 right-5 p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors"><sectorConfig.icon className="w-5 h-5" /></div>
                        <p className="text-[10px] text-blue-600 font-bold mt-2 flex items-center gap-1">Yönet <ArrowRight className="w-3 h-3" /></p>
                    </div>
                )}
            </div>

            {/* GRAFİK VE AKTİVİTE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sol: Grafik */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                        <Calendar className="w-5 h-5 text-blue-500" /> {isIndividual ? 'Harcama Analizi' : 'Finansal Grafik'}
                    </h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} minTickGap={10} />
                                <YAxis axisLine={false} tickLine={false} fontSize={10} tickFormatter={(v) => `${v}₺`} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="Gelir" fill="#16a34a" radius={[4, 4, 0, 0]} name={isIndividual ? "Gelir" : "Ciro"} />
                                <Bar dataKey="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} name="Gider" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sağ: Son Aktiviteler */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full max-h-[400px]">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-white flex gap-2 text-sm">
                            <Activity className="w-5 h-5 text-purple-500" /> Son Hareketler
                        </h3>
                        <Link href="/dashboard/finance" className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-wider">Tümü</Link>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {loading ? (
                            <p className="text-center text-xs text-slate-500 mt-10">Yükleniyor...</p>
                        ) : activities.length === 0 ? (
                            <div className="text-center py-10">
                                <div className="bg-slate-100 dark:bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <Bell className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-xs text-slate-500">Henüz bir hareket yok.</p>
                            </div>
                        ) : (
                            activities.map((item, idx) => (
                                <div key={idx} className="flex gap-3 group">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'plus' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                        }`}>
                                        {item.type === 'plus' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start">
                                            <p className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[120px]">
                                                {item.title}
                                            </p>
                                            <p className="text-[10px] text-slate-400 whitespace-nowrap ml-2 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                <Clock className="w-3 h-3" />
                                                {item.date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
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