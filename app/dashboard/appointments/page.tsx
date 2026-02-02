'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, getDoc, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Calendar as CalendarIcon,
    Plus,
    Clock,
    User,
    Phone,
    MessageCircle,
    Trash2,
    CheckCircle2,
    X,
    CalendarClock,
    Globe,
    Store
} from 'lucide-react';
// 🔥 ŞUBE BAĞLANTISI
import { useBranch } from '../../../components/providers/branch-context';

// Yaygın Alan Kodları Listesi
const COUNTRY_CODES = [
    { code: '+90', country: 'TR', label: 'Türkiye (+90)' },
    { code: '+49', country: 'DE', label: 'Almanya (+49)' },
    { code: '+31', country: 'NL', label: 'Hollanda (+31)' },
    { code: '+33', country: 'FR', label: 'Fransa (+33)' },
    { code: '+44', country: 'UK', label: 'İngiltere (+44)' },
    { code: '+1', country: 'US', label: 'ABD (+1)' },
    { code: '+994', country: 'AZ', label: 'Azerbaycan (+994)' },
];

export default function AppointmentsPage() {
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [targetUid, setTargetUid] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);

    // 🔥 Context'ten Şube Bilgisini Alıyoruz
    const { selectedBranch, branches } = useBranch();

    // Ayarlar
    const [settings, setSettings] = useState({
        duration: '60',
        template: 'Sayın müşterimiz, yarın saat {saat} için randevunuz bulunmaktadır. Bekliyoruz.'
    });

    // Form Verileri
    const [countryCode, setCountryCode] = useState('+90');
    const [formData, setFormData] = useState({
        customerName: '',
        phoneNumberBody: '',
        date: '',
        time: '',
        note: '',
        branchId: '' // 🔥 Randevunun Hangi Şubede Olduğu
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                try {
                    // 1. Profil Kontrolü
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

                    // 2. Ayarları Çek
                    const ownerProfileRef = doc(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'users', 'profile');
                    getDoc(ownerProfileRef).then((snap) => {
                        if (snap.exists()) {
                            const data = snap.data();
                            setSettings({
                                duration: data.appointmentDuration || '60',
                                template: data.whatsappTemplates?.appointmentReminder || settings.template
                            });
                        }
                    });

                    // 3. Randevuları Çek (Şube Filtresi ile)
                    let q = query(
                        collection(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'appointments')
                    );

                    // 🔥 EĞER ŞUBE SEÇİLİYSE FİLTRELE
                    if (selectedBranch) {
                        q = query(
                            collection(db, 'artifacts', 'servis-360-live', 'users', ownerId, 'appointments'),
                            where('branchId', '==', selectedBranch)
                        );
                    }

                    const unsubSnap = onSnapshot(q, (snapshot) => {
                        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                        // JS tarafında Tarih ve Saate göre sıralama
                        data.sort((a: any, b: any) => {
                            const dateA = new Date(`${a.date}T${a.time}`);
                            const dateB = new Date(`${b.date}T${b.time}`);
                            return dateA.getTime() - dateB.getTime();
                        });

                        setAppointments(data);
                        setLoading(false);
                    });
                    return () => unsubSnap();

                } catch (err) {
                    console.error("Veri çekme hatası", err);
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [selectedBranch]); // 🔥 Şube değişince yeniden çalış

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !targetUid) return;

        // Şube Belirleme
        let finalBranchId = formData.branchId || selectedBranch;

        if (branches.length > 0 && !finalBranchId) {
            finalBranchId = branches.find(b => b.isHeadquarters)?.id || branches[0]?.id;
        }

        const branchName = branches.find(b => b.id === finalBranchId)?.name || 'Merkez';
        const fullPhone = `${countryCode} ${formData.phoneNumberBody}`;

        try {
            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'appointments'), {
                customerName: formData.customerName,
                customerPhone: fullPhone,
                date: formData.date,
                time: formData.time,
                note: formData.note,
                status: 'pending',
                branchId: finalBranchId, // 🔥 Şube ID
                branchName: branchName, // 🔥 Şube Adı
                createdBy: user.uid,
                createdAt: serverTimestamp()
            });
            setShowModal(false);
            setFormData({ customerName: '', phoneNumberBody: '', date: '', time: '', note: '', branchId: '' });
            setCountryCode('+90');
        } catch (error) {
            console.error(error);
            alert("Randevu oluşturulamadı.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!targetUid) return;
        if (confirm("Randevuyu silmek istiyor musunuz?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'appointments', id));
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        if (!targetUid) return;
        await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'users', targetUid, 'appointments', id), {
            status: newStatus
        });
    };

    const sendReminder = (apt: any) => {
        if (!apt.customerPhone) {
            alert("Müşteri telefonu kayıtlı değil!");
            return;
        }
        let message = settings.template
            .replace('{saat}', apt.time)
            .replace('{tarih}', new Date(apt.date).toLocaleDateString('tr-TR'));

        let phone = apt.customerPhone.replace(/[^0-9]/g, '');
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const isToday = (dateString: string) => {
        const today = new Date().toISOString().split('T')[0];
        return dateString === today;
    };

    const openModal = () => {
        setFormData(prev => ({ ...prev, branchId: selectedBranch || '' }));
        setShowModal(true);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Başlık */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <CalendarClock className="w-6 h-6 text-blue-600" /> Randevu Takvimi
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        {selectedBranch
                            ? `${branches.find(b => b.id === selectedBranch)?.name} randevuları görüntüleniyor.`
                            : 'Tüm şubelerdeki randevular görüntüleniyor.'}
                    </p>
                </div>
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    <Plus className="w-5 h-5" /> Yeni Randevu
                </button>
            </div>

            {/* Liste */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <div className="col-span-full text-center py-10 text-slate-500">
                        <span className="inline-block w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mr-2"></span>
                        Yükleniyor...
                    </div>
                ) : appointments.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                        <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Randevu Yok</h3>
                        <p className="text-slate-500 text-sm">Takviminiz şu an boş görünüyor.</p>
                    </div>
                ) : (
                    appointments.map((apt) => {
                        const isPast = new Date(apt.date + 'T' + apt.time) < new Date();

                        return (
                            <div
                                key={apt.id}
                                className={`
                                    relative p-5 rounded-2xl border transition-all hover:shadow-md
                                    ${isToday(apt.date)
                                        ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
                                        : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'}
                                    ${isPast ? 'opacity-60 grayscale-[0.5]' : ''}
                                `}
                            >
                                {/* Şube Badge */}
                                {branches.length > 0 && !selectedBranch && (
                                    <div className="absolute top-4 right-4 text-[10px] font-bold text-slate-400 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-700 px-2 py-0.5 rounded flex items-center gap-1 z-10 shadow-sm">
                                        <Store className="w-3 h-3" /> {apt.branchName || 'Merkez'}
                                    </div>
                                )}

                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <CalendarIcon className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            {new Date(apt.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-300">
                                        <Clock className="w-3 h-3" />
                                        {apt.time}
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                        {apt.customerName}
                                    </h3>
                                    {apt.customerPhone && (
                                        <p className="text-sm text-slate-500 flex items-center gap-2 mt-1 font-mono">
                                            <Phone className="w-3 h-3" /> {apt.customerPhone}
                                        </p>
                                    )}
                                    {apt.note && (
                                        <p className="text-sm text-slate-500 mt-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg italic">
                                            "{apt.note}"
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        onClick={() => sendReminder(apt)}
                                        className="flex items-center gap-2 text-green-600 hover:text-green-700 font-bold text-xs bg-green-50 hover:bg-green-100 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        Hatırlat
                                    </button>

                                    <div className="flex gap-2">
                                        {apt.status !== 'completed' && (
                                            <button
                                                onClick={() => handleStatusUpdate(apt.id, 'completed')}
                                                title="Tamamlandı İşaretle"
                                                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            >
                                                <CheckCircle2 className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(apt.id)}
                                            title="Sil"
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* YENİ RANDEVU MODALI */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <CalendarClock className="w-6 h-6 text-blue-600" /> Yeni Randevu
                            </h2>
                            <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <form onSubmit={handleSave} className="space-y-4">

                            {/* 🔥 ŞUBE SEÇİMİ (Eğer "Tüm Şubeler" modundaysak) */}
                            {branches.length > 0 && !selectedBranch && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <label className="block text-xs font-bold mb-1 text-blue-700 dark:text-blue-300 uppercase">Şube Seçimi</label>
                                    <div className="relative">
                                        <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            className="w-full pl-9 p-2 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded-lg outline-none text-sm appearance-none"
                                            value={formData.branchId}
                                            onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                        >
                                            <option value="">Merkez (Varsayılan)</option>
                                            {branches.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1">Müşteri Adı</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input required className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" placeholder="Ad Soyad" value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} />
                                </div>
                            </div>

                            {/* ÜLKE KODU VE TELEFON */}
                            <div>
                                <label className="block text-sm font-medium mb-1">Telefon</label>
                                <div className="flex gap-2">
                                    <div className="relative w-1/3">
                                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <select
                                            className="w-full pl-9 pr-2 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm appearance-none cursor-pointer"
                                            value={countryCode}
                                            onChange={(e) => setCountryCode(e.target.value)}
                                        >
                                            {COUNTRY_CODES.map(c => (
                                                <option key={c.code} value={c.code}>{c.code}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="relative flex-1">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="tel"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none"
                                            placeholder="5XX..."
                                            value={formData.phoneNumberBody}
                                            onChange={e => setFormData({ ...formData, phoneNumberBody: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tarih</label>
                                    <input type="date" required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Saat</label>
                                    <input type="time" required className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" value={formData.time} onChange={e => setFormData({ ...formData, time: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Not / İşlem</label>
                                <textarea rows={2} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none" placeholder="Örn: Ekran değişimi..." value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} />
                            </div>

                            <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 mt-2">
                                <Plus className="w-5 h-5" /> Randevu Oluştur
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}