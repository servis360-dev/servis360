'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowRight } from 'lucide-react';
import {
    Plus,
    MessageCircle,
    CheckCircle2,
    Clock
} from 'lucide-react';
import Link from 'next/link';

export default function SupportView({ dict, locale }: { dict: any, locale: string }) {
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // 1. Önce kullanıcının rolünü öğren
                const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile');
                const profileSnap = await getDoc(profileRef);
                const isUserAdmin = profileSnap.exists() && profileSnap.data().role === 'admin';
                setIsAdmin(isUserAdmin);

                // 2. Rolüne göre sorgu oluştur
                let q;
                const ticketsRef = collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'tickets');

                if (isUserAdmin) {
                    // Admin ise: HEPSİNİ getir (Tarihe göre sıralı)
                    q = query(ticketsRef, orderBy('updatedAt', 'desc'));
                } else {
                    // Normal kullanıcı ise: Sadece KENDİ açtıklarını getir
                    q = query(ticketsRef, where('userId', '==', currentUser.uid), orderBy('updatedAt', 'desc'));
                }

                const unsubSnap = onSnapshot(q, (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    setTickets(data);
                    setLoading(false);
                });
                return () => unsubSnap();
            }
        });
        return () => unsubscribe();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><Clock className="w-3 h-3" /> {dict.support.detail.status_open}</span>;
            case 'answered': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {dict.support.detail.status_answered}</span>;
            case 'closed': return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {dict.support.detail.status_closed}</span>;
            default: return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-bold">{dict.support.status_unknown}</span>;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-500 font-bold';
            case 'medium': return 'text-orange-500 font-medium';
            default: return 'text-slate-500';
        }
    };

    const getPriorityLabel = (priority: string) => {
        switch (priority) {
            case 'high': return dict.support.priorities_label.high;
            case 'medium': return dict.support.priorities_label.medium;
            default: return dict.support.priorities_label.low;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{dict.support.title}</h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {isAdmin ? dict.support.subtitle_admin : dict.support.subtitle_user}
                    </p>
                </div>
                <Link href="/dashboard/support/new">
                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                        <Plus className="w-5 h-5" /> {dict.support.btn_new}
                    </button>
                </Link>
            </div>

            {/* Liste */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-500">{dict.common.loading}</div>
                ) : tickets.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                            <MessageCircle className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">{dict.support.empty_title}</h3>
                        <p className="text-slate-500 text-sm mt-1 mb-6">{dict.support.empty_desc}</p>
                        <Link href="/dashboard/support/new">
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">{dict.support.btn_new}</button>
                        </Link>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {tickets.map((t) => (
                            <Link href={`/dashboard/support/${t.id}`} key={t.id} className="block hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${t.status === 'open' || t.status === 'answered' ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                {t.subject}
                                                {isAdmin && <span className="text-xs font-normal text-slate-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">@{t.userName}</span>}
                                            </h4>
                                            <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">{t.lastMessage}</p>
                                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                                                <span>{t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000).toLocaleDateString(locale) : '-'}</span>
                                                <span className={getPriorityColor(t.priority)}>{getPriorityLabel(t.priority)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {getStatusBadge(t.status)}
                                        <div className="hidden md:block text-slate-300">
                                            <ArrowRight className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}