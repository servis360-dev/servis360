'use client';

import { useEffect, useState } from 'react';
import { collection, query, getDocs, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { useBranch } from '../../../components/providers/branch-context';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    TrendingUp, TrendingDown, Wallet, Calendar, Filter, Download, PieChart as PieIcon, BarChart3, Loader2, Building2
} from 'lucide-react';

export default function ReportsPage() {
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);

    // 🔥 Şube ve Kullanıcı Bilgisi
    const { selectedBranch, branches } = useBranch();
    const [user, setUser] = useState<any>(null);

    // Filtreler
    const [dateRange, setDateRange] = useState('this_year'); // this_month, last_month, this_year

    // Hesaplanan Veriler
    const [stats, setStats] = useState({ income: 0, expense: 0, profit: 0, margin: 0 });
    const [chartData, setChartData] = useState<any[]>([]);
    const [pieData, setPieData] = useState<any[]>([]);
    const [comparisonData, setComparisonData] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const currentUser = auth.currentUser;
            if (!currentUser) return;
            setUser(currentUser);

            try {
                // 1. Hedef ID (Patron) Bul
                const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                const profileSnap = await getDoc(profileRef);
                let ownerId = currentUser.uid;
                if (profileSnap.exists()) {
                    const data = profileSnap.data();
                    if (data.ownerId && data.ownerId !== currentUser.uid) ownerId = data.ownerId;
                }

                // 2. Verileri Çek (Tarih Filtresi Uygulanabilir - Şimdilik hepsini çekip JS'de süzüyoruz)
                // Gerçek projedeki veri büyüklüğüne göre where('date', '>=', ...) eklenmeli.
                let q = query(collection(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'finance'), orderBy('date', 'asc'));

                // Eğer Şube Seçiliyse Filtrele
                if (selectedBranch) {
                    q = query(
                        collection(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'finance'),
                        where('branchId', '==', selectedBranch),
                        orderBy('date', 'asc')
                    );
                }

                const snapshot = await getDocs(q);
                const rawData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setTransactions(rawData);

                processData(rawData);

            } catch (error) {
                console.error("Rapor hatası:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedBranch, dateRange]); // Şube veya Tarih değişince yeniden çek

    const processData = (data: any[]) => {
        let totalInc = 0;
        let totalExp = 0;
        const categoryMap: any = {};
        const timeMap: any = {};
        const branchMap: any = {};

        // Tarih Sınırı Belirle
        const now = new Date();
        let startDate = new Date(now.getFullYear(), 0, 1); // Bu Yıl Başı

        if (dateRange === 'this_month') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        if (dateRange === 'last_month') startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        // Veriyi İşle
        data.forEach(t => {
            const tDate = t.date?.toDate ? t.date.toDate() : new Date(t.date);
            if (tDate < startDate) return; // Tarih dışındaysa atla

            const amount = Number(t.amount) || 0;

            // 1. Toplamlar
            if (t.type === 'income') totalInc += amount;
            else totalExp += amount;

            // 2. Kategori Analizi (Giderler için)
            if (t.type === 'expense') {
                const cat = t.category || 'Diğer';
                categoryMap[cat] = (categoryMap[cat] || 0) + amount;
            }

            // 3. Zaman Grafiği (Ay/Gün Bazlı)
            const dateKey = tDate.toLocaleDateString('tr-TR', { month: 'short', day: dateRange === 'this_year' ? undefined : 'numeric' });
            if (!timeMap[dateKey]) timeMap[dateKey] = { name: dateKey, Gelir: 0, Gider: 0 };

            if (t.type === 'income') timeMap[dateKey].Gelir += amount;
            else timeMap[dateKey].Gider += amount;

            // 4. Şube Kıyaslama (Eğer Tüm Şubeler seçiliyse)
            if (!selectedBranch) {
                const bName = t.branchName || 'Merkez';
                if (!branchMap[bName]) branchMap[bName] = { name: bName, Gelir: 0, Gider: 0, Net: 0 };

                if (t.type === 'income') {
                    branchMap[bName].Gelir += amount;
                    branchMap[bName].Net += amount;
                } else {
                    branchMap[bName].Gider += amount;
                    branchMap[bName].Net -= amount;
                }
            }
        });

        // State Güncelleme
        setStats({
            income: totalInc,
            expense: totalExp,
            profit: totalInc - totalExp,
            margin: totalInc > 0 ? ((totalInc - totalExp) / totalInc) * 100 : 0
        });

        setChartData(Object.values(timeMap));

        // Pie Chart Verisi
        const pieColors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#6366f1', '#a855f7'];
        setPieData(Object.keys(categoryMap).map((k, i) => ({
            name: k,
            value: categoryMap[k],
            color: pieColors[i % pieColors.length]
        })));

        // Branch Chart Verisi
        setComparisonData(Object.values(branchMap));
    };

    if (loading) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="space-y-8 pb-24">
            {/* BAŞLIK */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <BarChart3 className="w-6 h-6 text-blue-600" /> Gelişmiş Raporlar
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {selectedBranch
                            ? `${branches.find(b => b.id === selectedBranch)?.name} şubesi için detaylı analiz.`
                            : 'Tüm şubelerin karşılaştırmalı performans analizi.'}
                    </p>
                </div>

                <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    {[
                        { id: 'this_year', label: 'Bu Yıl' },
                        { id: 'this_month', label: 'Bu Ay' },
                        { id: 'last_month', label: 'Geçen Ay' }
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => setDateRange(opt.id)}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${dateRange === opt.id
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI KARTLARI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <KPICard title="Toplam Ciro" value={stats.income} icon={TrendingUp} color="text-green-600" />
                <KPICard title="Toplam Gider" value={stats.expense} icon={TrendingDown} color="text-red-600" />
                <KPICard title="Net Kâr" value={stats.profit} icon={Wallet} color={stats.profit >= 0 ? "text-blue-600" : "text-orange-600"} />
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
                    <p className="text-xs font-bold text-slate-400 uppercase">Kârlılık Oranı</p>
                    <h3 className={`text-2xl font-black mt-1 ${stats.margin >= 20 ? 'text-green-500' : stats.margin > 0 ? 'text-yellow-500' : 'text-red-500'}`}>
                        %{stats.margin.toFixed(1)}
                    </h3>
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-700">
                        <div className={`h-full ${stats.margin >= 20 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.max(0, Math.min(100, stats.margin))}%` }}></div>
                    </div>
                </div>
            </div>

            {/* GRAFİKLER BÖLÜMÜ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* SOL: Ana Grafik (Zaman veya Şube Kıyaslama) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        {selectedBranch ? <Calendar className="w-5 h-5 text-blue-500" /> : <Building2 className="w-5 h-5 text-purple-500" />}
                        {selectedBranch ? 'Zaman İçindeki Gelir/Gider Dengesi' : 'Şube Performans Karşılaştırması'}
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            {!selectedBranch ? (
                                // TÜM ŞUBELER: Şube Kıyaslama Grafiği
                                <BarChart data={comparisonData} barSize={30}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                                    <YAxis axisLine={false} tickLine={false} fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                                    <Legend />
                                    <Bar dataKey="Gelir" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            ) : (
                                // TEK ŞUBE: Zaman Çizelgesi
                                <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} minTickGap={20} />
                                    <YAxis axisLine={false} tickLine={false} fontSize={12} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                                    <Area type="monotone" dataKey="Gelir" stroke="#22c55e" fillOpacity={1} fill="url(#colorInc)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="Gider" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" strokeWidth={2} />
                                </AreaChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* SAĞ: Gider Pasta Grafiği */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                        <PieIcon className="w-5 h-5 text-orange-500" /> Gider Dağılımı
                    </h3>
                    <div className="flex-1 min-h-[250px] relative">
                        {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                                Veri yok.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}

function KPICard({ title, value, icon: Icon, color }: any) {
    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                <div className={`p-2 rounded-lg bg-slate-50 dark:bg-slate-900 ${color}`}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <h3 className={`text-2xl font-black ${color}`}>
                {value.toLocaleString()} ₺
            </h3>
        </div>
    );
}