'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ArrowLeft, Send, CheckCircle2, Lock, User, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function TicketChatPage({ params }: { params: { id: string } }) {
    const [messages, setMessages] = useState<any[]>([]);
    const [ticket, setTicket] = useState<any>(null);
    const [newMessage, setNewMessage] = useState('');
    const [user, setUser] = useState<any>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Admin mi?
                const profileSnap = await getDoc(doc(db, 'artifacts', 'servis-360-live', 'users', currentUser.uid, 'users', 'profile'));
                const isUserAdmin = profileSnap.exists() && profileSnap.data().role === 'admin';
                setIsAdmin(isUserAdmin);

                // Bilet Bilgisi
                const ticketRef = doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'tickets', params.id);
                onSnapshot(ticketRef, (doc) => setTicket(doc.data()));

                // Mesajlar
                const q = query(
                    collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'tickets', params.id, 'messages'),
                    orderBy('createdAt', 'asc')
                );
                onSnapshot(q, (snapshot) => {
                    setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
                    scrollToBottom();
                });
            }
        });
        return () => unsubscribe();
    }, [params.id]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await addDoc(collection(db, 'artifacts', 'servis-360-live', 'public', 'data', 'tickets', params.id, 'messages'), {
                text: newMessage,
                senderId: user.uid,
                senderName: user.displayName || user.email,
                isAdmin: isAdmin, // Mesajın adminden gelip gelmediği
                createdAt: serverTimestamp()
            });

            // Bileti Güncelle (Son mesaj ve durum)
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'tickets', params.id), {
                lastMessage: newMessage,
                updatedAt: serverTimestamp(),
                status: isAdmin ? 'answered' : 'open' // Admin yazarsa "cevaplandı", kullanıcı yazarsa "açık"
            });

            setNewMessage('');
        } catch (error) {
            console.error(error);
        }
    };

    const closeTicket = async () => {
        if (confirm('Bileti kapatmak istediğinize emin misiniz?')) {
            await updateDoc(doc(db, 'artifacts', 'servis-360-live', 'public', 'data', 'tickets', params.id), {
                status: 'closed'
            });
        }
    };

    if (!ticket) return <div className="p-8 text-center">Yükleniyor...</div>;

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">

            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/support" className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        <ArrowLeft className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h2 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {ticket.subject}
                            <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${ticket.status === 'open' ? 'bg-blue-100 text-blue-600' : ticket.status === 'closed' ? 'bg-slate-200 text-slate-500' : 'bg-green-100 text-green-600'}`}>
                                {ticket.status === 'open' ? 'Açık' : ticket.status === 'closed' ? 'Kapalı' : 'Cevaplandı'}
                            </span>
                        </h2>
                        <p className="text-xs text-slate-500">Talep No: #{params.id.substring(0, 6).toUpperCase()}</p>
                    </div>
                </div>
                {ticket.status !== 'closed' && (
                    <button onClick={closeTicket} className="text-xs font-bold text-slate-500 hover:text-red-500 border border-slate-300 hover:border-red-500 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Konuyu Kapat
                    </button>
                )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/30">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm relative ${msg.senderId === user.uid
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : msg.isAdmin
                                    ? 'bg-purple-600 text-white rounded-bl-none' // Admin mesajı farklı renk
                                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700'
                            }`}>
                            {/* İsim Başlığı */}
                            <p className={`text-[10px] font-bold mb-1 opacity-80 flex items-center gap-1 ${msg.senderId === user.uid ? 'text-blue-100' : msg.isAdmin ? 'text-purple-100' : 'text-slate-400'}`}>
                                {msg.isAdmin && <ShieldAlert className="w-3 h-3" />}
                                {msg.senderName}
                            </p>

                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                            <p className={`text-[10px] mt-2 text-right ${msg.senderId === user.uid ? 'text-blue-200' : 'text-slate-400'}`}>
                                {msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {ticket.status !== 'closed' ? (
                <form onSubmit={handleSend} className="p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                    <input
                        className="flex-1 bg-slate-100 dark:bg-slate-900 border-none rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="Mesajınızı yazın..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">
                        <Send className="w-5 h-5" />
                    </button>
                </form>
            ) : (
                <div className="p-4 text-center bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-medium">
                    Bu talep kapatılmıştır. Yeni bir talep oluşturabilirsiniz.
                </div>
            )}
        </div>
    );
}