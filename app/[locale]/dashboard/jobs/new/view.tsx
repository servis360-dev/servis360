'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Save,
    User,
    Smartphone,
    Wrench,
    Search,
    ArrowLeft,
    ScanLine,
    ShieldAlert,
    Store
} from 'lucide-react';
import Link from 'next/link';
import { useBranch } from '../../../../components/providers/branch-context';

export default function NewJobView({ dict }: { dict: any }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [targetUid, setTargetUid] = useState<string | null>(null);
    const [isLicenseValid, setIsLicenseValid] = useState(true);

    // Şube Context
    const { selectedBranch, branches } = useBranch();

    // Form Verileri
    const [formData, setFormData] = useState({
        customerName: '',
        phone: '',
        device: '',
        brand: '',
        serialNo: '',
        password: '',
        problem: '',
        accessories: [] as string[],
        priority: 'normal',
        estimatedPrice: '',
        branchId: ''
    });

    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    // Aksesuar seçeneklerini sözlükten alıyoruz (Key-Value)
    const accessoryKeys = ['charger', 'case', 'sim', 'sd', 'box'];

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                    const profileSnap = await getDoc(profileRef);

                    let ownerId = currentUser.uid;
                    if (profileSnap.exists()) {
                        const data = profileSnap.data();
                        if (data.ownerId && data.ownerId !== currentUser.uid) {
                            ownerId = data.ownerId;
                        }
                    }
                    setTargetUid(ownerId);

                    // Lisans Kontrolü
                    const ownerProfileRef = doc(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'users', 'profile');
                    const ownerSnap = await getDoc(ownerProfileRef);

                    if (ownerSnap.exists()) {
                        const ownerData = ownerSnap.data();
                        if (ownerData.role === 'admin' || ownerData.role === 'super_admin') {
                            setIsLicenseValid(true);
                        } else if (ownerData.licenseEndsAt) {
                            const now = new Date();
                            const endDate = ownerData.licenseEndsAt.toDate();
                            if (endDate < now) {
                                setIsLicenseValid(false);
                            }
                        }
                    }
                } catch (err) {
                    console.error("Auth Error:", err);
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    // Şube seçimi değişince formu güncelle (veya varsayılanı ata)
    useEffect(() => {
        if (selectedBranch) {
            setFormData(prev => ({ ...prev, branchId: selectedBranch }));
        }
    }, [selectedBranch]);

    const handleCustomerSearch = async (term: string) => {
        setFormData({ ...formData, customerName: term });
        if (term.length < 2) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        if (!targetUid) return;

        const q = query(
            collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'customers'),
            orderBy('name'),
            where('name', '>=', term),
            where('name', '<=', term + '\uf8ff'),
            limit(5)
        );

        const snap = await getDocs(q);
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSearchResults(results);
        setShowResults(true);
    };

    const selectCustomer = (customer: any) => {
        setFormData(prev => ({
            ...prev,
            customerName: customer.name,
            phone: customer.phone
        }));
        setShowResults(false);
    };

    const toggleAccessory = (accKey: string) => {
        // Veritabanına "Localized" isim yerine Key veya o anki dildeki karşılığını kaydedebiliriz.
        // Tutarlılık için o anki dildeki karşılığını (Value) kaydedelim, böylece fişte düzgün çıkar.
        const accLabel = dict.jobs.new.accessories[accKey];

        setFormData(prev => {
            if (prev.accessories.includes(accLabel)) {
                return { ...prev, accessories: prev.accessories.filter(a => a !== accLabel) };
            } else {
                return { ...prev, accessories: [...prev.accessories, accLabel] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLicenseValid) {
            alert(dict.jobs.new.license_error_desc);
            return;
        }

        if (!user || !targetUid) return;
        setLoading(true);

        try {
            let finalBranchId = formData.branchId || selectedBranch;
            if (branches.length > 0 && !finalBranchId) {
                finalBranchId = branches.find(b => b.isHeadquarters)?.id || branches[0]?.id;
            }
            const branchName = branches.find(b => b.id === finalBranchId)?.name || 'Merkez';

            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'jobs'), {
                customerName: formData.customerName, // Veri yapısında customerName kullanılıyor
                phone: formData.phone,
                device: formData.device,
                brand: formData.brand,
                serialNo: formData.serialNo,
                password: formData.password,
                problem: formData.problem,
                accessories: formData.accessories,
                priority: formData.priority,
                price: formData.estimatedPrice,
                branchId: finalBranchId,
                branchName: branchName,

                status: 'pending',
                paymentStatus: 'pending',

                createdBy: user.uid,
                createdAt: serverTimestamp()
            });

            // Müşteri kaydı yoksa oluşturma mantığı eklenebilir (Opsiyonel)

            router.push(`/dashboard/jobs`);
        } catch (error) {
            console.error(error);
            alert(dict.jobs.new.alert_error);
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto pb-20 animate-in fade-in">
            {!isLicenseValid && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 flex items-center gap-3 animate-pulse">
                    <ShieldAlert className="w-6 h-6" />
                    <div>
                        <h3 className="font-bold">{dict.jobs.new.license_error_title}</h3>
                        <p className="text-sm">{dict.jobs.new.license_error_desc}</p>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard/jobs" className="p-2 bg-white dark:bg-slate-800 rounded-lg border hover:bg-slate-50 transition-colors">
                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{dict.jobs.new.title}</h1>
                    <p className="text-sm text-slate-500">{dict.jobs.new.subtitle}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${!isLicenseValid ? 'opacity-50 pointer-events-none' : ''}`}>

                {/* SOL: Müşteri & Cihaz */}
                <div className="md:col-span-2 space-y-6">

                    {/* Müşteri Bilgileri */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" /> {dict.jobs.new.section_customer}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <label className="block text-xs font-bold text-slate-500 mb-1">{dict.jobs.new.section_customer}</label> {/* Müşteri Adı Label */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        required
                                        type="text"
                                        className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all"
                                        placeholder={dict.jobs.new.placeholder_search}
                                        value={formData.customerName}
                                        onChange={(e) => handleCustomerSearch(e.target.value)}
                                        onBlur={() => setTimeout(() => setShowResults(false), 200)}
                                    />
                                </div>
                                {showResults && searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl mt-1 z-10 overflow-hidden">
                                        {searchResults.map(customer => (
                                            <div
                                                key={customer.id}
                                                onClick={() => selectCustomer(customer)}
                                                className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b last:border-0 border-slate-100 dark:border-slate-700"
                                            >
                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{customer.name}</p>
                                                <p className="text-xs text-slate-500">{customer.phone}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{dict.jobs.new.label_phone}</label>
                                <input
                                    required
                                    type="tel"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500 transition-all"
                                    placeholder="0555..."
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Cihaz Bilgileri */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-purple-600" /> {dict.jobs.new.section_device}
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{dict.jobs.new.label_model}</label>
                                <input
                                    required
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 transition-all"
                                    placeholder={dict.jobs.new.placeholder_model}
                                    value={formData.device}
                                    onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{dict.jobs.new.label_brand}</label>
                                <input
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 transition-all"
                                    placeholder={dict.jobs.new.placeholder_brand}
                                    value={formData.brand}
                                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{dict.jobs.new.label_serial}</label>
                                <div className="relative">
                                    <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        className="w-full pl-9 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 transition-all font-mono text-sm"
                                        placeholder="Opsiyonel"
                                        value={formData.serialNo}
                                        onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">{dict.jobs.new.label_pass}</label>
                                <input
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 transition-all"
                                    placeholder={dict.jobs.new.placeholder_pass}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">{dict.jobs.new.label_problem}</label>
                            <textarea
                                required
                                rows={3}
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-purple-500 transition-all"
                                placeholder={dict.jobs.new.placeholder_problem}
                                value={formData.problem}
                                onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                {/* SAĞ: Durum & Kaydet */}
                <div className="space-y-6">

                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                            <Wrench className="w-5 h-5 text-orange-500" /> {dict.jobs.new.section_service}
                        </h3>

                        {/* ŞUBE SEÇİMİ */}
                        {branches.length > 0 && !selectedBranch && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 mb-4">
                                <label className="block text-xs font-bold mb-1 text-blue-700 dark:text-blue-300 uppercase">{dict.jobs.new.label_branch}</label>
                                <div className="relative">
                                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <select
                                        className="w-full pl-9 p-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg outline-none text-sm appearance-none"
                                        value={formData.branchId}
                                        onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                    >
                                        <option value="">{dict.jobs.new.option_hq}</option>
                                        {branches.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-2">{dict.jobs.new.label_accessories}</label>
                            <div className="flex flex-wrap gap-2">
                                {accessoryKeys.map(key => {
                                    const label = dict.jobs.new.accessories[key];
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => toggleAccessory(key)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${formData.accessories.includes(label)
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-slate-500 mb-2">{dict.jobs.new.label_priority}</label>
                            <select
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                            >
                                <option value="normal">{dict.jobs.new.priorities.normal}</option>
                                <option value="high">{dict.jobs.new.priorities.high}</option>
                                <option value="low">{dict.jobs.new.priorities.low}</option>
                            </select>
                        </div>

                        <div className="mb-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">{dict.jobs.new.label_price}</label>
                            <input
                                type="number"
                                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold"
                                placeholder="0.00"
                                value={formData.estimatedPrice}
                                onChange={(e) => setFormData({ ...formData, estimatedPrice: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !isLicenseValid}
                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-xl shadow-green-500/30 flex items-center justify-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? dict.jobs.new.btn_saving : <><Save className="w-5 h-5" /> {dict.jobs.new.btn_save}</>}
                    </button>

                </div>
            </form>
        </div>
    );
}