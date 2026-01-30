'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
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
    User,
    PiggyBank,
    CreditCard,
    Bell
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
    const [accountType, setAccountType] = useState('business'); // individual, business, corporate
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);
    const [timeFilter, setTimeFilter] = useState<'week' | 'month'>('week');

    // İstatistikler
    const [stats, setStats] = useState({
        income: 0,
        expense: 0,
        profit: 0, // Bireyselde "Kalan" veya "Tasarruf"
        activeWork: 0, // İş/Sipariş sayısı
        completedWork: 0,
    });

    // Dinamik Sektör Ayarları (Sadece Ticari İçin)
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

                // Profil verisini çek (Hesap Türü ve İsim)
                const docRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setAccountType(data.accountType || 'business');
                    setUserName(data.fullName || 'Kullanıcı');

                    // Sektör Ayarı (Sadece Ticari ise)
                    if (data.accountType !== 'individual') {
                        configureSector(data.sectorType || 'technical_service');
                    }
                }

                // Dinleyicileri Başlat
                const listeners = setupRealtimeListeners(currentUser.uid, timeFilter);
                unsubTrans = listeners.unsubTrans;
                unsubJobs = listeners.unsubJobs; // Bireyselde bu boş dönecek, sorun yok.
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

        // 1. FİNANS DİNLEYİCİSİ (Herkes İçin Ortak)
        const qTrans = query(collection(db, userPath, 'finance'), orderBy('date', 'asc'));

        const unsubTrans = onSnapshot(qTrans, (snapshot) => {
            let inc = 0, exp = 0;
            const dailyMap = new Map();
            const now = new Date();

            // Tarih sınırını belirle
            const limitDate = new Date();
            if (filter === 'week') limitDate.setDate(now.getDate() - 7);
            else limitDate.setMonth(now.getMonth(), 1);

            // Grafik iskeleti
            if (filter === 'week') {
                for (let i = 6; i >= 0; i--) {
                    const d = new Date(); d.setDate(d.getDate() - i);
                    const k = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                    dailyMap.set(k, { name: k, Gelir: 0, Gider: 0 });
                }
            }

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const itemDate = data.date?.toDate ? data.date.toDate() : new Date(data.date);

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

            // Son Aktiviteleri güncelle
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

        // 2. İŞ DİNLEYİCİSİ (Sadece Ticari Hesaplar İçin)
        let unsubJobs = () => { };

        // Eğer hesap türü belli değilse veya business ise işleri dinle
        // (useEffect içinde accountType state'i hemen güncellenmeyebilir, varsayılan olarak dinleyelim, hata vermez)
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
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Üst Başlık ve Hoşgeldin */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {isIndividual ? '👋 Merhaba,' : <Activity className="text-blue-600 w-6 h-6" />}
                        {isIndividual ? userName : 'İşletme Özeti'}
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {isIndividual ? 'Bugün finansal durumun nasıl görünüyor?' : 'İşletmenizin anlık performans durumu.'}
                    </p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setTimeFilter('week')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${timeFilter === 'week' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Bu Hafta</button>
                    <button onClick={() => setTimeFilter('month')} className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${timeFilter === 'month' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Bu Ay</button>
                </div>
            </div>

            {/* KARTLAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* 1. Kart: Gelir / Maaş */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingUp className="w-24 h-24 text-green-600" /></div>
                    <p className="text-slate-500 text-xs font-bold uppercase">{isIndividual ? 'Toplam Gelir' : 'Toplam Ciro'}</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.income.toLocaleString()} ₺</h3>
                    <p className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Nakit Akışı</p>
                </div>

                {/* 2. Kart: Gider / Harcama */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><TrendingDown className="w-24 h-24 text-red-600" /></div>
                    <p className="text-slate-500 text-xs font-bold uppercase">{isIndividual ? 'Harcamalar' : 'Giderler'}</p>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1">{stats.expense.toLocaleString()} ₺</h3>
                    <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Çıkan Para</p>
                </div>

                {/* 3. Kart: Özet / İşler (Değişken) */}
                {isIndividual ? (
                    // BİREYSEL: Tasarruf Durumu
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-20"><PiggyBank className="w-24 h-24" /></div>
                        <p className="text-indigo-100 text-xs font-bold uppercase">Net Durum</p>
                        <h3 className="text-4xl font-black mb-2">{stats.profit.toLocaleString()} ₺</h3>
                        <p className="text-xs text-indigo-200 opacity-90">{stats.profit > 0 ? "Harika gidiyorsun! 👏" : "Bütçeyi aştın! ⚠️"}</p>
                    </div>
                ) : (
                    // TİCARİ: Aktif İşler
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between group cursor-pointer hover:border-blue-300 transition-colors" onClick={() => router.push(sectorConfig.path)}>
                        <div className="flex justify-between">
                            <div>
                                <p className="text-slate-500 text-xs font-bold uppercase">{sectorConfig.title}</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.activeWork}</h3>
                                    <span className="text-sm text-slate-500">{sectorConfig.unit}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors"><sectorConfig.icon className="w-6 h-6" /></div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <span className="text-xs text-slate-500"><span className="text-green-600 font-bold">{stats.completedWork}</span> tamamlandı</span>
                            <span className="text-blue-600 text-xs font-bold flex items-center gap-1">Yönet <ArrowRight className="w-3 h-3" /></span>
                        </div>
                    </div>
                )}
            </div>

            {/* GRAFİK VE LİSTE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Sol: Grafik */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-base font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                        <Calendar className="w-5 h-5 text-blue-500" /> {isIndividual ? 'Harcama Analizi' : 'Finansal Grafik'}
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} barSize={20}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={11} />
                                <YAxis axisLine={false} tickLine={false} fontSize={11} tickFormatter={(v) => `${v}₺`} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                                <Legend />
                                <Bar dataKey="Gelir" fill="#16a34a" radius={[4, 4, 0, 0]} name={isIndividual ? "Gelir" : "Ciro"} />
                                <Bar dataKey="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} name="Gider" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sağ: Son Aktiviteler */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-900 dark:text-white flex gap-2">
                            <Activity className="w-5 h-5 text-purple-500" /> Son Hareketler
                        </h3>
                        <Link href="/dashboard/finance" className="text-xs font-bold text-blue-600 hover:underline">Tümü</Link>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[340px]">
                        {loading ? (
                            <p className="text-center text-xs text-slate-500">Yükleniyor...</p>
                        ) : activities.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="bg-slate-100 dark:bg-slate-700 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
                                    <Bell className="w-6 h-6 text-slate-400" />
                                </div>
                                <p className="text-xs text-slate-500">Henüz bir hareket yok.</p>
                            </div>
                        ) : (
                            activities.map((item, idx) => (
                                <div key={idx} className="flex gap-4 group">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.type === 'plus' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                        }`}>
                                        {item.type === 'plus' ? <ArrowDownRight className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between">
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