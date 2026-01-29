'use client';

import { useEffect, useState } from 'react';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy,
    where
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import {
    MessageSquare,
    Plus,
    Megaphone,
    AlertTriangle,
    Info,
    Trash2,
    User,
    Clock,
    CheckCircle2
} from 'lucide-react';

export default function CommunicationPage() {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Form Verileri
    const [newMessage, setNewMessage] = useState({
        title: '',
        content: '',
        type: 'general', // general, urgent, announcement
        targetBranch: 'all' // all, branch_id
    });

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        setCurrentUser(user);

        // Mesajları Dinle (Sadece bu firmanın mesajları)
        // Not: Gerçek projede 'public/announcements' (Admin duyuruları) ile birleştirilebilir.
        const q = query(
            collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'communication'),
            orderBy('createdAt', 'desc')
        );

        const unsub = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'communication'), {
            ...newMessage,
            authorName: user.displayName || user.email?.split('@')[0] || 'Anonim',
            authorId: user.uid,
            createdAt: serverTimestamp(),
            readBy: [] // Okuyanların listesi
        });

        setShowModal(false);
        setNewMessage({ title: '', content: '', type: 'general', targetBranch: 'all' });
    };

    const handleDelete = async (id: string) => {
        if (confirm("Bu mesajı silmek istediğinize emin misiniz?")) {
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', auth.currentUser!.uid, 'communication', id));
        }
    };

    // Mesaj Tipi İkonları ve Renkleri
    const getTypeStyles = (type: string) => {
        switch (type) {
            case 'urgent':
                return { icon: AlertTriangle, color: 'bg-red-100 text-red-600 border-red-200', label: 'ACİL DURUM' };
            case 'announcement':
                return { icon: Megaphone, color: 'bg-blue-100 text-blue-600 border-blue-200', label: 'DUYURU' };
            default:
                return { icon: Info, color: 'bg-slate-100 text-slate-600 border-slate-200', label: 'GENEL' };
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">İletişim Panosu</h1>
                    <p className="text-slate-500 dark:text-slate-400">Ekip içi duyurular ve haberleşme.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                >
                    <Plus className="w-5 h-5" /> Yeni Mesaj
                </button>
            </div>

            {/* Mesaj Akışı */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center text-slate-500 py-10">Mesajlar yükleniyor...</div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 border-dashed">
                        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Henüz bir mesaj veya duyuru yok.</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const style = getTypeStyles(msg.type);
                        const Icon = style.icon;

                        return (
                            <div key={msg.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all relative group">
                                <div className="flex items-start gap-4">
                                    {/* Sol İkon */}
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${style.color.split(' ')[0]} ${style.color.split(' ')[1]}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>

                                    {/* İçerik */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${style.color}`}>
                                                        {style.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleString('tr-TR') : 'Az önce'}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{msg.title}</h3>
                                            </div>

                                            {/* Silme Butonu (Sadece yazan silebilir veya Admin) */}
                                            {(currentUser?.uid === msg.authorId || currentUser?.role === 'admin') && (
                                                <button
                                                    onClick={() => handleDelete(msg.id)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        <p className="text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                                            {msg.content}
                                        </p>

                                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                            <div className="w-6 h-6 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">
                                                <User className="w-3 h-3" />
                                            </div>
                                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                                Gönderen: <span className="text-slate-700 dark:text-white">{msg.authorName}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Yeni Duyuru / Mesaj</h2>

                        <form onSubmit={handleSendMessage} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mesaj Tipi</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewMessage({ ...newMessage, type: 'general' })}
                                        className={`p-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${newMessage.type === 'general'
                                                ? 'bg-slate-100 border-slate-400 text-slate-800'
                                                : 'border-slate-200 text-slate-500'
                                            }`}
                                    >
                                        <Info className="w-4 h-4" /> Genel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewMessage({ ...newMessage, type: 'announcement' })}
                                        className={`p-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${newMessage.type === 'announcement'
                                                ? 'bg-blue-50 border-blue-500 text-blue-600'
                                                : 'border-slate-200 text-slate-500'
                                            }`}
                                    >
                                        <Megaphone className="w-4 h-4" /> Duyuru
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewMessage({ ...newMessage, type: 'urgent' })}
                                        className={`p-2 text-xs font-bold rounded-lg border transition-all flex flex-col items-center gap-1 ${newMessage.type === 'urgent'
                                                ? 'bg-red-50 border-red-500 text-red-600'
                                                : 'border-slate-200 text-slate-500'
                                            }`}
                                    >
                                        <AlertTriangle className="w-4 h-4" /> Acil
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Konu / Başlık</label>
                                <input
                                    required
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                    value={newMessage.title}
                                    onChange={e => setNewMessage({ ...newMessage, title: e.target.value })}
                                    placeholder="Örn: Hafta Sonu Mesaisi Hakkında"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Mesaj İçeriği</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                    value={newMessage.content}
                                    onChange={e => setNewMessage({ ...newMessage, content: e.target.value })}
                                    placeholder="Mesajınızı buraya yazın..."
                                />
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                                >
                                    Gönder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}