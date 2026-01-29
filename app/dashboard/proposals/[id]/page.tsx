'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Printer,
    ArrowLeft,
    Download,
    Mail,
    Phone,
    MapPin,
    Globe
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

                    // 2. Firma (Kullanıcı) Bilgilerini Çek (Header için)
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
                        <Printer className="w-4 h-4" /> Yazdır / PDF
                    </button>
                </div>
            </div>

            {/* A4 Kağıt Görünümü */}
            <div className="max-w-[210mm] mx-auto bg-white text-slate-900 shadow-2xl print:shadow-none print:w-full rounded-xl overflow-hidden min-h-[297mm] flex flex-col">

                {/* 1. Header (Logo & Firma Bilgileri) */}
                <div className="p-12 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 print:bg-white">
                    <div>
                        {/* Logo Alanı (Varsa) */}
                        <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-3xl mb-4 print:text-black print:bg-transparent print:border print:border-black">
                            {companyInfo?.companyName?.charAt(0) || 'S'}
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">
                            {companyInfo?.companyName || 'FİRMA ADI'}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">{companyInfo?.sector || 'Teknik Servis Hizmetleri'}</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-black text-slate-200 uppercase tracking-widest print:text-slate-900">PROFORMA</h2>
                        <p className="text-sm font-bold text-slate-900 mt-2">NO: {proposal.proposalNo}</p>
                        <p className="text-sm text-slate-500">Tarih: {new Date(proposal.date).toLocaleDateString('tr-TR')}</p>
                    </div>
                </div>

                {/* 2. İletişim Bilgileri (Siz & Müşteri) */}
                <div className="p-12 grid grid-cols-2 gap-12">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Sayın / Firma</h3>
                        <p className="text-xl font-bold text-slate-900">{proposal.customerName}</p>
                        <p className="text-sm text-slate-600 mt-1">Müşteri/Firma Yetkilisi</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Sağlayıcı</h3>
                        <p className="font-bold text-slate-900">{companyInfo?.fullName}</p>
                        <div className="text-sm text-slate-600 mt-2 space-y-1">
                            {companyInfo?.phone && (
                                <p className="flex items-center justify-end gap-2">
                                    {companyInfo.phone} <Phone className="w-3 h-3" />
                                </p>
                            )}
                            {companyInfo?.email && (
                                <p className="flex items-center justify-end gap-2">
                                    {companyInfo.email} <Mail className="w-3 h-3" />
                                </p>
                            )}
                            {companyInfo?.address && (
                                <p className="flex items-center justify-end gap-2">
                                    {companyInfo.address} <MapPin className="w-3 h-3" />
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Tablo */}
                <div className="px-12 flex-1">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-slate-900 text-sm font-bold text-slate-900 uppercase">
                                <th className="py-3 w-12">#</th>
                                <th className="py-3">Hizmet / Ürün Açıklaması</th>
                                <th className="py-3 text-center">Miktar</th>
                                <th className="py-3 text-right">Birim Fiyat</th>
                                <th className="py-3 text-right">Toplam</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-600">
                            {proposal.items.map((item: any, index: number) => (
                                <tr key={index} className="border-b border-slate-100 last:border-0">
                                    <td className="py-4 font-medium">{index + 1}</td>
                                    <td className="py-4">
                                        <p className="font-bold text-slate-800">{item.description}</p>
                                    </td>
                                    <td className="py-4 text-center">{item.quantity}</td>
                                    <td className="py-4 text-right">{item.unitPrice.toLocaleString()} ₺</td>
                                    <td className="py-4 text-right font-bold text-slate-900">{item.total.toLocaleString()} ₺</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. Toplamlar */}
                <div className="p-12 flex justify-end">
                    <div className="w-64 space-y-3">
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Ara Toplam</span>
                            <span>{proposal.subtotal.toLocaleString()} ₺</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>KDV (%20)</span>
                            <span>{proposal.vat.toLocaleString()} ₺</span>
                        </div>
                        <div className="flex justify-between text-xl font-black text-slate-900 pt-4 border-t-2 border-slate-900">
                            <span>TOPLAM</span>
                            <span>{proposal.total.toLocaleString()} ₺</span>
                        </div>
                    </div>
                </div>

                {/* 5. Alt Notlar ve İmza */}
                <div className="p-12 bg-slate-50/50 print:bg-white mt-auto border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <h4 className="font-bold text-xs text-slate-900 uppercase mb-2">Notlar & Şartlar</h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {proposal.notes || 'Bu teklif 15 gün süreyle geçerlidir.'}
                            </p>
                        </div>
                        <div className="text-center mt-4">
                            <div className="h-16 mb-2 border-b border-slate-300 w-32 mx-auto"></div>
                            <p className="text-xs font-bold text-slate-900 uppercase">Yetkili İmza / Kaşe</p>
                        </div>
                    </div>
                    <div className="mt-8 pt-4 border-t border-slate-200 text-center">
                        <p className="text-[10px] text-slate-400 font-medium">
                            Bu belge <strong>Servis360</strong> bulut sistemleri üzerinde dijital olarak oluşturulmuştur.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}