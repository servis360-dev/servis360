'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCurrencySettings } from '../../../../lib/format';
import { doc, onSnapshot, collection, getDocs, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import {
    ShieldCheck,
    Zap,
    Loader2,
    Store,
    Building2,
    User,
    Crown,
    Check,
    LayoutGrid,
    Users,
    ExternalLink,
    MessageCircle
} from 'lucide-react';

export default function SubscriptionView({ dict }: { dict: any }) {
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [supportPhone, setSupportPhone] = useState('905555555555');

    // Para birimi
    const params = useParams();
    const currentLocale = params?.locale as string || 'en';
    const currency = getCurrencySettings(currentLocale);

    const [usage, setUsage] = useState({ branchCount: 0, staffCount: 0 });

    const PRODUCT_LINKS: any = {
        individual: {
            monthly: 'https://servis-360.lemonsqueezy.com/checkout/buy/ff917ef3-5518-4bd8-aad3-d2df5f8aa6dd',
            sixMonth: 'https://servis-360.lemonsqueezy.com/checkout/buy/d677bf15-48b1-40ac-b33b-2dea05a8ed9c',
            yearly: 'https://servis-360.lemonsqueezy.com/checkout/buy/52e700c2-bcc0-4e6c-b52f-eeba351564f2'
        },
        business: {
            monthly: 'https://servis-360.lemonsqueezy.com/checkout/buy/d5cad434-ddcf-4f25-babe-50401d5e109b',
            sixMonth: 'https://servis-360.lemonsqueezy.com/checkout/buy/c31d399a-297e-4cac-80f9-d39a8319af3f',
            yearly: 'https://servis-360.lemonsqueezy.com/checkout/buy/dc092be5-29b1-4ad1-8231-b1b332d210f4'
        },
        corporate: {
            monthly: 'https://servis-360.lemonsqueezy.com/checkout/buy/385f680c-e693-485a-b562-82c01a01e08d',
            sixMonth: 'https://servis-360.lemonsqueezy.com/checkout/buy/c3d77ebf-585b-4160-a512-33dad9cfa57d',
            yearly: 'https://servis-360.lemonsqueezy.com/checkout/buy/0ab6675a-869e-475f-8962-0d28fd5938aa'
        },
        addons: {
            branch: 'https://servis-360.lemonsqueezy.com/checkout/buy/5e8767d4-a6a2-4abf-aa84-ca198afdebc0',
            staff: 'https://servis-360.lemonsqueezy.com/checkout/buy/df950796-5c65-4fd0-9931-f12d0f2c6265'
        }
    };

    // 🔥 Dinamik Fiyatlandırma
    const getPrices = () => {
        if (currentLocale === 'tr') {
            return {
                individual: { monthly: 350, sixMonth: 1800, yearly: 3200 },
                business: { monthly: 850, sixMonth: 4500, yearly: 8000 },
                corporate: { monthly: 1600, sixMonth: 9000, yearly: 16000 },
                addons: { branch: 2500, staff: 950 }
            };
        } else if (currentLocale === 'de') {
            return {
                individual: { monthly: 9.90, sixMonth: 54.90, yearly: 99.00 },
                business: { monthly: 24.90, sixMonth: 139.90, yearly: 249.00 },
                corporate: { monthly: 49.90, sixMonth: 279.90, yearly: 499.00 },
                addons: { branch: 79.00, staff: 29.00 }
            };
        } else {
            // Default USD
            return {
                individual: { monthly: 9.90, sixMonth: 54.90, yearly: 99.00 },
                business: { monthly: 24.90, sixMonth: 139.90, yearly: 249.00 },
                corporate: { monthly: 49.90, sixMonth: 279.90, yearly: 499.00 },
                addons: { branch: 79.00, staff: 29.00 }
            };
        }
    };

    const DISPLAY_PRICES = getPrices();

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            if (!user) return;
            const unsubUser = onSnapshot(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile'), (docSnap) => {
                if (docSnap.exists()) {
                    setUserData(docSnap.data());
                    fetchUsageStats(user.uid);
                    fetchSystemSettings();
                } else {
                    setLoading(false);
                }
            });
            return () => unsubUser();
        });
        return () => unsubscribe && unsubscribe();
    }, []);

    const fetchUsageStats = async (uid: string) => {
        try {
            const branchSnap = await getDocs(collection(db, 'artifacts', 'servis-360-live', 'users', uid, 'branches'));
            const staffSnap = await getDocs(collection(db, 'artifacts', 'servis-360-live', 'users', uid, 'staff'));
            setUsage({ branchCount: branchSnap.size, staffCount: staffSnap.size });
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchSystemSettings = async () => {
        try {
            const snap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'system_settings', 'config'));
            if (snap.exists()) {
                const data = snap.data();
                if (data.contact?.whatsapp) setSupportPhone(data.contact.whatsapp);
            }
        } catch (e) { console.error(e); }
    };

    const getCheckoutUrl = (baseUrl: string) => {
        if (!auth.currentUser || baseUrl === '#') return '#';
        const separator = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${separator}checkout[custom][user_id]=${auth.currentUser.uid}`;
    };

    const handleBuy = (url: string) => {
        if (!url || url === '#') {
            alert(dict.subscription.alert_maintenance);
            return;
        }
        const finalUrl = getCheckoutUrl(url);
        window.open(finalUrl, '_blank');
    };

    const openWhatsApp = () => {
        const cleanNumber = supportPhone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanNumber}?text=Merhaba, abonelik paketleri hakkında bilgi almak istiyorum.`, '_blank');
    };

    const getDaysLeft = () => {
        if (!userData?.licenseEndsAt) return 0;
        const diff = userData.licenseEndsAt.toDate().getTime() - new Date().getTime();
        const days = Math.ceil(diff / (1000 * 3600 * 24));
        return days > 0 ? days : 0;
    };

    const getLimits = () => {
        if (!userData) return { branchLimit: 1, staffLimit: 1 };
        let baseBranchLimit = 1;
        let baseStaffLimit = 1;
        if (['corporate', 'company'].includes(userData.accountType)) {
            baseBranchLimit = 5;
            baseStaffLimit = 50;
        } else if (['esnaf', 'business', 'tradesman'].includes(userData.accountType)) {
            baseBranchLimit = 1;
            baseStaffLimit = 5;
        }
        const extraBranch = userData.customBranchLimit || 0;
        const extraStaff = userData.customStaffLimit || 0;
        return { branchLimit: baseBranchLimit + extraBranch, staffLimit: baseStaffLimit + extraStaff };
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-950"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;

    const daysLeft = getDaysLeft();
    const { branchLimit, staffLimit } = getLimits();
    const branchPercent = Math.min((usage.branchCount / branchLimit) * 100, 100);
    const staffPercent = Math.min((usage.staffCount / staffLimit) * 100, 100);

    let accountTypeKey = 'individual';
    let typeLabel = dict.subscription.type_individual;
    let typeIcon = <User className="w-4 h-4 text-blue-400" />;

    if (['corporate', 'company'].includes(userData?.accountType)) {
        accountTypeKey = 'corporate';
        typeLabel = dict.subscription.type_corporate;
        typeIcon = <Building2 className="w-4 h-4 text-purple-400" />;
    } else if (['esnaf', 'business', 'tradesman'].includes(userData?.accountType)) {
        accountTypeKey = 'business';
        typeLabel = dict.subscription.type_business;
        typeIcon = <Store className="w-4 h-4 text-yellow-400" />;
    }

    // 🔥 DÜZELTME BURADA YAPILDI: "as any" ile TS hatası engellendi
    const currentPrices = DISPLAY_PRICES[accountTypeKey as keyof typeof DISPLAY_PRICES] as any;
    const currentLinks = PRODUCT_LINKS[accountTypeKey as keyof typeof PRODUCT_LINKS];

    // Ek Özellik Fiyatları (Addons)
    const addonPrices = DISPLAY_PRICES.addons as any;

    return (
        <div className="min-h-screen bg-slate-950 text-white font-sans relative overflow-hidden pb-24">
            <div className="absolute top-[-20%] left-[-10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>

            <button onClick={openWhatsApp} className="fixed bottom-6 left-6 z-50 flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-3 rounded-full shadow-lg shadow-green-600/30 transition-all hover:scale-105 active:scale-95 group">
                <MessageCircle className="w-6 h-6 fill-current" />
                <span className="font-bold text-sm hidden group-hover:inline-block transition-all duration-300">{dict.subscription.support_btn}</span>
            </button>

            <div className="max-w-6xl mx-auto px-6 pt-12 relative z-10">
                <div className="text-center mb-12 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/50 border border-slate-700 backdrop-blur-md text-xs font-medium text-slate-300">
                        {typeIcon} <span>{typeLabel}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400">
                        {dict.subscription.title}
                    </h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck className="w-24 h-24" /></div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">{dict.subscription.days_left}</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-black text-white">{daysLeft}</span>
                            <span className="text-sm font-medium text-slate-400">{dict.subscription.days_unit}</span>
                        </div>
                        {daysLeft <= 5 && <div className="mt-4 bg-red-500/20 text-red-400 text-xs font-bold px-3 py-1 rounded-full w-fit animate-pulse">{dict.subscription.renew_alert}</div>}
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><LayoutGrid className="w-24 h-24" /></div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">{dict.subscription.limit_branch}</p>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-3xl font-black text-white">{usage.branchCount}</span>
                            <span className="text-sm text-slate-500">/ {branchLimit}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className={`h-full transition-all ${branchPercent >= 100 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${branchPercent}%` }}></div>
                        </div>
                    </div>

                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative">
                        <div className="absolute top-0 right-0 p-4 opacity-10"><Users className="w-24 h-24" /></div>
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2">{dict.subscription.limit_staff}</p>
                        <div className="flex items-baseline gap-2 mb-3">
                            <span className="text-3xl font-black text-white">{usage.staffCount}</span>
                            <span className="text-sm text-slate-500">/ {staffLimit > 900 ? dict.subscription.infinity : staffLimit}</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div className={`h-full transition-all ${staffPercent >= 100 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${staffPercent}%` }}></div>
                        </div>
                    </div>
                </div>

                {accountTypeKey !== 'individual' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                        <div className="bg-slate-900/80 border border-slate-700 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-blue-500/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400"><Store className="w-6 h-6" /></div>
                                <div><h3 className="font-bold text-white text-lg">{dict.subscription.addon_branch_title}</h3><p className="text-xs text-slate-400">{dict.subscription.addon_branch_desc}</p></div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-white mb-2">{currency.symbol}{addonPrices.branch}</p>
                                <button onClick={() => handleBuy(PRODUCT_LINKS.addons.branch)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2">
                                    {dict.subscription.btn_buy} <ExternalLink className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                        <div className="bg-slate-900/80 border border-slate-700 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-orange-500/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400"><Users className="w-6 h-6" /></div>
                                <div><h3 className="font-bold text-white text-lg">{dict.subscription.addon_staff_title}</h3><p className="text-xs text-slate-400">{dict.subscription.addon_staff_desc}</p></div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-white mb-2">{currency.symbol}{addonPrices.staff}</p>
                                <button onClick={() => handleBuy(PRODUCT_LINKS.addons.staff)} className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2">
                                    {dict.subscription.btn_buy} <ExternalLink className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-500" /> {typeLabel} {dict.subscription.packages_title}</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-16">
                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 hover:border-slate-600 transition-all">
                        <h3 className="text-lg font-bold text-slate-200">{dict.subscription.plan_monthly}</h3>
                        <div className="flex items-baseline gap-1 my-4">
                            <span className="text-3xl font-bold text-white">{currency.symbol}{currentPrices.monthly}</span>
                            <span className="text-sm text-slate-500">{dict.subscription.unit_month}</span>
                        </div>
                        <button onClick={() => handleBuy(currentLinks.monthly)} className="w-full py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 hover:text-white transition-all">{dict.subscription.btn_buy}</button>
                    </div>

                    <div className="relative bg-gradient-to-b from-slate-800 to-black border border-blue-500/50 rounded-3xl p-8 transform md:-translate-y-4 shadow-2xl shadow-blue-900/20 order-first md:order-none">
                        <div className="absolute top-4 right-4 bg-blue-600 text-[10px] font-bold px-2 py-1 rounded text-white">{dict.subscription.badge_best}</div>
                        <h3 className="text-2xl font-bold text-white flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-400" /> {dict.subscription.plan_yearly}</h3>
                        <div className="flex items-baseline gap-1 my-4">
                            <span className="text-5xl font-black text-white">{currency.symbol}{currentPrices.yearly}</span>
                            <span className="text-sm text-slate-400">{dict.subscription.unit_year}</span>
                        </div>
                        <p className="text-green-400 text-xs font-bold mb-6">{dict.subscription.promo_yearly}</p>
                        <button onClick={() => handleBuy(currentLinks.yearly)} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all flex justify-center items-center gap-2">
                            {dict.subscription.btn_start_yearly} <Check className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 hover:border-slate-600 transition-all">
                        <h3 className="text-lg font-bold text-slate-200">{dict.subscription.plan_6month}</h3>
                        <div className="flex items-baseline gap-1 my-4">
                            <span className="text-3xl font-bold text-white">{currency.symbol}{currentPrices.sixMonth}</span>
                            <span className="text-sm text-slate-500">{dict.subscription.unit_6month}</span>
                        </div>
                        <button onClick={() => handleBuy(currentLinks.sixMonth)} className="w-full py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 hover:text-white transition-all">{dict.subscription.btn_buy}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}