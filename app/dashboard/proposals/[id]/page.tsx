'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Printer,
    ArrowLeft,
    Phone,
    Mail,
    MapPin,
    Building2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ProposalViewPage({ params }: { params: { id: string } }) {
    const [proposal, setProposal] = useState<any>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // 1. Teklif Verisini Çek
                    const docRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'proposals', params.id);
                    const docSnap = await getDoc(docRef);

                    // 2. Firma (Kullanıcı) Bilgilerini Çek (Header ve Logo için)
                    const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile');
                    const profileSnap = await getDoc(profileRef);

                    if (docSnap.exists()) {
                        setProposal(docSnap.data());
                    } else {
                        alert("Teklif bulunamadı.");
                        router.push('/dashboard/proposals');
                    }

                    if (profileSnap.exists()) {
                        setCompanyInfo(profileSnap.data());
                    }
                } catch (error) {
                    console.error("Hata:", error);
                } finally {
                    setLoading(false);
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [params.id, router]);

    const handlePrint = () => {
        window.print();
    };

    // Tarih Formatlayıcı
    const formatDate = (dateVal: any) => {
        if (!dateVal) return new Date().toLocaleDateString('tr-TR');
        if (dateVal.toDate) return dateVal.toDate().toLocaleDateString('tr-TR');
        return new Date(dateVal).toLocaleDateString('tr-TR');
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-slate-500">Teklif yükleniyor...</div>;
    if (!proposal) return null;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-8 print:p-0 print:bg-white">

            {/* Üst Bar (Yazdırma butonları vs. - Baskıda GİZLENİR) */}
            <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center print:hidden">
                <Link href="/dashboard/proposals" className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Listeye Dön
                </Link>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                    >
                        <Printer className="w-4 h-4" /> Yazdır / PDF İndir
                    </button>
                </div>
            </div>

            {/* A4 Kağıt Görünümü */}
            <div className="max-w-[210mm] mx-auto bg-white text-slate-900 shadow-2xl print:shadow-none print:w-full rounded-xl overflow-hidden min-h-[297mm] flex flex-col relative">

                {/* Arka Plan Deseni (Hafif Şıklık Katmak İçin) */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none print:hidden"></div>

                {/* 1. Header (Logo & Firma Bilgileri) */}
                <div className="p-10 border-b-2 border-slate-100 flex justify-between items-start">
                    <div className="flex flex-col justify-center">
                        {/* LOGO MANTIĞI: Varsa Logo, Yoksa İsim Baş Harfi */}
                        {companyInfo?.logoUrl ? (
                            <img
                                src={companyInfo.logoUrl}
                                alt="Firma Logosu"
                                className="h-20 w-auto object-contain mb-4"
                            />
                        ) : (
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-3xl print:border print:border-slate-900 print:text-black print:bg-transparent">
                                    {companyInfo?.companyName?.charAt(0) || <Building2 />}
                                </div>
                                <div className="flex flex-col">
                                    <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight leading-none">
                                        {companyInfo?.companyName || 'FİRMA ADI'}
                                    </h1>
                                    <p className="text-sm text-slate-500 mt-1 font-medium">{companyInfo?.sector || 'Teknik Servis Hizmetleri'}</p>
                                </div>
                            </div>
                        )}

                        {/* Logo varsa ismi altına yazmak istemezsen burayı silebilirsin, ama resmi görünür */}
                        {companyInfo?.logoUrl && (
                            <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">
                                {companyInfo?.companyName}
                            </h1>
                        )}
                    </div>

                    <div className="text-right">
                        <h2 className="text-5xl font-black text-slate-100 uppercase tracking-widest print:text-slate-200">TEKLİF</h2>
                        <div className="mt-4 space-y-1">
                            <p className="text-sm font-bold text-slate-900">TEKLİF NO: <span className="font-mono text-blue-600 print:text-black">{proposal.proposalNo}</span></p>
                            <p className="text-sm text-slate-500">Tarih: {formatDate(proposal.createdAt)}</p>
                            <p className="text-sm text-slate-500">Geçerlilik: {formatDate(proposal.validUntil) || 'Belirtilmedi'}</p>
                        </div>
                    </div>
                </div>

                {/* 2. İletişim Bilgileri (Siz & Müşteri) */}
                <div className="p-10 grid grid-cols-2 gap-12">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider border-b pb-1">SAYIN / MÜŞTERİ</h3>
                        <p className="text-lg font-bold text-slate-900">{proposal.customerName}</p>
                        <p className="text-sm text-slate-600 mt-1">{proposal.customerPhone || 'Telefon Belirtilmedi'}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 tracking-wider border-b pb-1">SAĞLAYICI / YETKİLİ</h3>
                        <p className="font-bold text-slate-900 text-lg">{companyInfo?.fullName || 'Firma Yetkilisi'}</p>
                        <div className="text-sm text-slate-600 mt-2 space-y-1 flex flex-col items-end">
                            {companyInfo?.phone && (
                                <p className="flex items-center gap-2">
                                    {companyInfo.phone} <Phone className="w-3 h-3" />
                                </p>
                            )}
                            {companyInfo?.email && (
                                <p className="flex items-center gap-2">
                                    {companyInfo.email} <Mail className="w-3 h-3" />
                                </p>
                            )}
                            {companyInfo?.address && (
                                <p className="flex items-center gap-2 text-right max-w-[200px]">
                                    {companyInfo.address} <MapPin className="w-3 h-3 shrink-0" />
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Tablo */}
                <div className="px-10 flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 print:bg-slate-100 border-y border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wider">
                                <th className="py-3 px-4 w-12 text-center">#</th>
                                <th className="py-3 px-4">Hizmet / Ürün Açıklaması</th>
                                <th className="py-3 px-4 text-center">Adet</th>
                                <th className="py-3 px-4 text-right">Birim Fiyat</th>
                                <th className="py-3 px-4 text-right">Toplam</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-600">
                            {proposal.items.map((item: any, index: number) => (
                                <tr key={index} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                    <td className="py-4 px-4 text-center font-medium text-slate-400">{index + 1}</td>
                                    <td className="py-4 px-4">
                                        <p className="font-bold text-slate-800">{item.description}</p>
                                    </td>
                                    <td className="py-4 px-4 text-center">{item.quantity}</td>
                                    <td className="py-4 px-4 text-right">{Number(item.unitPrice).toLocaleString()} ₺</td>
                                    <td className="py-4 px-4 text-right font-bold text-slate-900">
                                        {(item.quantity * item.unitPrice).toLocaleString()} ₺
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. Toplamlar */}
                <div className="p-10 flex justify-end">
                    <div className="w-72 space-y-3 bg-slate-50 p-6 rounded-xl print:bg-transparent print:p-0">
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Ara Toplam</span>
                            <span className="font-medium">{proposal.subtotal?.toLocaleString()} ₺</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>KDV (%{proposal.taxRate || 20})</span>
                            <span className="font-medium">{proposal.taxAmount?.toLocaleString()} ₺</span>
                        </div>
                        <div className="flex justify-between text-xl font-black text-slate-900 pt-4 border-t-2 border-slate-900 items-end">
                            <span className="text-sm uppercase tracking-wider">GENEL TOPLAM</span>
                            <span className="text-blue-700 print:text-black">{proposal.total?.toLocaleString()} ₺</span>
                        </div>
                    </div>
                </div>

                {/* 5. Alt Notlar ve İmza */}
                <div className="p-10 mt-auto border-t border-slate-100 bg-slate-50/30 print:bg-white">
                    <div className="grid grid-cols-2 gap-12 items-end">
                        <div>
                            <h4 className="font-bold text-[10px] text-slate-400 uppercase mb-2">NOTLAR & ŞARTLAR</h4>
                            <div className="text-xs text-slate-500 leading-relaxed bg-white p-3 rounded-lg border border-slate-100 print:border-none print:p-0">
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Bu teklif belirtilen tarihe kadar geçerlidir.</li>
                                    <li>Fiyatlarımıza KDV dahildir.</li>
                                    <li>Ödeme, iş tesliminde nakit veya havale ile yapılacaktır.</li>
                                </ul>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="h-20 mb-2 border-b border-slate-300 w-40 mx-auto"></div>
                            <p className="text-xs font-bold text-slate-900 uppercase">Kaşe / İmza</p>
                        </div>
                    </div>

                    <div className="mt-8 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <p>servis360.com ile oluşturuldu</p>
                        <p>Sayfa 1 / 1</p>
                    </div>
                </div>

            </div>
        </div>
    );
}