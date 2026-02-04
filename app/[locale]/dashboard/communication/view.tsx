'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    orderBy,
    getDoc
} from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    MessageSquare,
    Plus,
    Megaphone,
    AlertTriangle,
    Info,
    Trash2,
    User,
    Clock,
    StickyNote,
    Notebook,
    Pin,
    X
} from 'lucide-react';

export default function CommunicationView({ dict }: { dict: any }) {
    const [messages, setMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [accountType, setAccountType] = useState('business');
    const [userRole, setUserRole] = useState('patron');

    // Dil Ayarı
    const params = useParams();
    const currentLocale = params?.locale as string || 'en';

    // Form Verileri
    const [newMessage, setNewMessage] = useState({
        title: '',
        content: '',
        type: 'general', // general, urgent, announcement, note-yellow, note-blue, note-pink
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUser(user);

                // 1. Profil Bilgisini Çek (Hesap Tipi ve Rol İçin)
                try {
                    const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile');
                    const profileSnap = await getDoc(profileRef);
                    if (profileSnap.exists()) {
                        setAccountType(profileSnap.data().accountType || 'business');
                        setUserRole(profileSnap.data().role || 'patron');
                    }
                } catch (error) {
                    console.error("Profil hatası", error);
                }

                // 2. Mesajları Dinle
                const q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'communication'),
                    orderBy('createdAt', 'desc')
                );

                const unsubSnap = onSnapshot(q, (snapshot) => {
                    setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                    setLoading(false);
                });

                return () => unsubSnap();
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        // Bireyselse varsayılan not rengi sarı olsun
        let msgType = newMessage.type;
        if (accountType === 'individual' && !msgType.startsWith('note-')) {
            msgType = 'note-yellow';
        }

        await addDoc(collection(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'communication'), {
            ...newMessage,
            type: msgType,
            authorName: user.displayName || user.email?.split('@')[0] || 'Yönetici',
            authorId: user.uid,
            createdAt: serverTimestamp(),
        });

        setShowModal(false);
        setNewMessage({ title: '', content: '', type: 'general' });
    };

    const handleDelete = async (id: string) => {
        if (confirm(dict.communication.confirm_delete)) {
            const user = auth.currentUser;
            if (!user) return;
            await deleteDoc(doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'communication', id));
        }
    };

    // Mesaj/Not Stilleri (Label'lar sözlükten)
    const getTypeStyles = (type: string) => {
        switch (type) {
            // Kurumsal Stiller
            case 'urgent': return { icon: AlertTriangle, classes: 'bg-red-50 border-red-200 text-red-900', label: dict.communication.label_urgent, iconColor: 'text-red-600' };
            case 'announcement': return { icon: Megaphone, classes: 'bg-blue-50 border-blue-200 text-blue-900', label: dict.communication.label_announcement, iconColor: 'text-blue-600' };
            case 'general': return { icon: Info, classes: 'bg-white border-slate-200 text-slate-900', label: dict.communication.label_general, iconColor: 'text-slate-500' };

            // Bireysel Not Stilleri (Sticky Notes)
            case 'note-yellow': return { classes: 'bg-yellow-100 border-yellow-200 text-yellow-900 rotate-1', label: '' };
            case 'note-blue': return { classes: 'bg-cyan-100 border-cyan-200 text-cyan-900 -rotate-1', label: '' };
            case 'note-pink': return { classes: 'bg-pink-100 border-pink-200 text-pink-900 rotate-1', label: '' };
            default: return { icon: Info, classes: 'bg-white border-slate-200', label: '', iconColor: '' };
        }
    };

    // Kurumsal hesaplarda kimler mesaj atabilir?
    const canPost = accountType === 'individual' || ['admin', 'owner', 'patron', 'manager'].includes(userRole);

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-20 animate-in fade-in">
            {/* Üst Başlık */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        {accountType === 'individual' ? <Notebook className="w-8 h-8 text-yellow-500" /> : <Megaphone className="w-8 h-8 text-blue-600" />}
                        {accountType === 'individual' ? dict.communication.title_individual : dict.communication.title_corporate}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {accountType === 'individual'
                            ? dict.communication.subtitle_individual
                            : dict.communication.subtitle_corporate}
                    </p>
                </div>

                {canPost && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
                    >
                        <Plus className="w-5 h-5" /> {accountType === 'individual' ? dict.communication.btn_new_note : dict.communication.btn_new_announcement}
                    </button>
                )}
            </div>

            {/* İÇERİK ALANI */}
            {loading ? (
                <div className="text-center text-slate-500 py-10">{dict.communication.loading}</div>
            ) : messages.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                    {accountType === 'individual' ? <StickyNote className="w-12 h-12 text-slate-300 mx-auto mb-3" /> : <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />}
                    <p className="text-slate-500 font-medium">
                        {accountType === 'individual' ? dict.communication.empty_individual : dict.communication.empty_corporate}
                    </p>
                </div>
            ) : (
                // GÖRÜNÜM MODU SEÇİMİ (Bireysel vs Kurumsal)
                <div className={accountType === 'individual' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" : "space-y-4"}>

                    {messages.map((msg) => {
                        const style = getTypeStyles(msg.type);
                        const Icon = style.icon;

                        // --- BİREYSEL GÖRÜNÜM (STICKY NOTES) ---
                        if (accountType === 'individual') {
                            return (
                                <div key={msg.id} className={`p-6 rounded-xl shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg relative group ${style.classes} dark:opacity-90`}>
                                    <Pin className="w-4 h-4 absolute top-3 left-1/2 -translate-x-1/2 text-black/20" />
                                    <button
                                        onClick={() => handleDelete(msg.id)}
                                        className="absolute top-2 right-2 p-1.5 text-black/30 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <h3 className="font-bold text-lg mb-2 mt-2 leading-tight">{msg.title}</h3>
                                    <p className="text-sm opacity-90 whitespace-pre-wrap font-medium">{msg.content}</p>
                                    <span className="text-[10px] opacity-50 absolute bottom-3 right-3">
                                        {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleDateString(currentLocale) : '-'}
                                    </span>
                                </div>
                            );
                        }

                        // --- KURUMSAL GÖRÜNÜM (FEED LIST) ---
                        return (
                            <div key={msg.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-6 shadow-sm hover:shadow-md transition-all relative group ${style.classes.split(' ')[1]}`}> {/* Sadece border rengini al */}
                                <div className="flex items-start gap-5">
                                    {/* Sol İkon */}
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${style.classes.split(' ')[0]} ${style.iconColor?.replace('text-', 'bg-').replace('600', '100')}`}>
                                        {Icon && <Icon className={`w-6 h-6 ${style.iconColor}`} />}
                                    </div>

                                    {/* İçerik */}
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${style.classes}`}>
                                                        {style.label}
                                                    </span>
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleString(currentLocale) : dict.communication.just_now}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{msg.title}</h3>
                                            </div>

                                            {/* Silme Butonu (Sadece Yetkili veya Yazan) */}
                                            {(currentUser?.uid === msg.authorId || userRole === 'admin') && (
                                                <button
                                                    onClick={() => handleDelete(msg.id)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors p-2"
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
                                                {dict.communication.sender}: <span className="text-slate-900 dark:text-white font-bold">{msg.authorName}</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                {accountType === 'individual' ? dict.communication.modal_title_individual : dict.communication.modal_title_corporate}
                            </h2>
                            <button onClick={() => setShowModal(false)}><X className="text-slate-400 hover:text-slate-600" /></button>
                        </div>

                        <form onSubmit={handleSendMessage} className="space-y-4">

                            {/* TİP SEÇİMİ (Sadece Kurumsal veya Bireysel Rengi) */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    {accountType === 'individual' ? dict.communication.label_type_note : dict.communication.label_type_msg}
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {accountType === 'individual' ? (
                                        <>
                                            <button type="button" onClick={() => setNewMessage({ ...newMessage, type: 'note-yellow' })} className={`h-10 rounded-lg bg-yellow-200 border-2 ${newMessage.type === 'note-yellow' ? 'border-blue-500' : 'border-transparent'}`}></button>
                                            <button type="button" onClick={() => setNewMessage({ ...newMessage, type: 'note-blue' })} className={`h-10 rounded-lg bg-cyan-200 border-2 ${newMessage.type === 'note-blue' ? 'border-blue-500' : 'border-transparent'}`}></button>
                                            <button type="button" onClick={() => setNewMessage({ ...newMessage, type: 'note-pink' })} className={`h-10 rounded-lg bg-pink-200 border-2 ${newMessage.type === 'note-pink' ? 'border-blue-500' : 'border-transparent'}`}></button>
                                        </>
                                    ) : (
                                        <>
                                            <button type="button" onClick={() => setNewMessage({ ...newMessage, type: 'general' })} className={`p-2 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 ${newMessage.type === 'general' ? 'bg-slate-100 border-slate-400 text-slate-900' : 'border-slate-200 text-slate-500'}`}>
                                                <Info className="w-4 h-4" /> {dict.communication.type_general}
                                            </button>
                                            <button type="button" onClick={() => setNewMessage({ ...newMessage, type: 'announcement' })} className={`p-2 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 ${newMessage.type === 'announcement' ? 'bg-blue-50 border-blue-500 text-blue-600' : 'border-slate-200 text-slate-500'}`}>
                                                <Megaphone className="w-4 h-4" /> {dict.communication.type_announcement}
                                            </button>
                                            <button type="button" onClick={() => setNewMessage({ ...newMessage, type: 'urgent' })} className={`p-2 text-xs font-bold rounded-lg border flex flex-col items-center gap-1 ${newMessage.type === 'urgent' ? 'bg-red-50 border-red-500 text-red-600' : 'border-slate-200 text-slate-500'}`}>
                                                <AlertTriangle className="w-4 h-4" /> {dict.communication.type_urgent}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{dict.communication.label_title}</label>
                                <input
                                    required
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                    value={newMessage.title}
                                    onChange={e => setNewMessage({ ...newMessage, title: e.target.value })}
                                    placeholder={accountType === 'individual' ? dict.communication.placeholder_title_individual : dict.communication.placeholder_title_corporate}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{dict.communication.label_content}</label>
                                <textarea
                                    required
                                    rows={4}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-blue-500"
                                    value={newMessage.content}
                                    onChange={e => setNewMessage({ ...newMessage, content: e.target.value })}
                                    placeholder={dict.communication.placeholder_content}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 mt-4"
                            >
                                {accountType === 'individual' ? dict.communication.btn_post_note : dict.communication.btn_post_announcement}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}