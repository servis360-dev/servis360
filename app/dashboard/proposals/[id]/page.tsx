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
    Building2,
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

                    // 2. Şirket Profilini (Logo, Adres vb.) Çek
                    const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile');
                    const profileSnap = await getDoc(profileRef);

                    if (docSnap.exists()) {
                        setProposal(docSnap.data());
                    } else {
                        alert("Teklif bulunamadı.");
                        router.push('/dashboard/proposals');
                    }

                    if (profileSnap.exists()) {
                        const data = profileSnap.data();
                        console.log("Şirket Profili:", data); // Debug için
                        setCompanyInfo(data);
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
        // Yazdırmadan önce kısa bir süre bekle (Resimlerin render olması için)
        setTimeout(() => {
            window.print();
        }, 300);
    };

    const formatDate = (dateVal: any) => {
        if (!dateVal) return new Date().toLocaleDateString('tr-TR');
        if (dateVal.toDate) return dateVal.toDate().toLocaleDateString('tr-TR');
        return new Date(dateVal).toLocaleDateString('tr-TR');
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-slate-500 bg-slate-50">Teklif yükleniyor...</div>;
    if (!proposal) return null;

    const kdvNote = proposal.taxRate === 0
        ? "Fiyatlarımızda KDV dahil değildir."
        : `Fiyatlarımıza %${proposal.taxRate} KDV dahildir.`;

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-8 print:p-0 print:m-0 print:bg-white print:overflow-visible">

            {/* YAZDIRMA AYARLARI (GELİŞMİŞ) */}
            <style type="text/css" media="print">
                {`
                    @page { 
                        size: A4; 
                        margin: 0mm; /* Kenar boşluklarını sıfırla */
                    }
                    body { 
                        background-color: white; 
                        margin: 0; 
                        padding: 0; 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important;
                    }
                    /* Sayfa Ölçeklendirme (Tek sayfaya sığdırmak için) */
                    .print-scale {
                        transform: scale(0.95); /* %95 Küçült */
                        transform-origin: top left;
                        width: 105% !important; /* Genişliği dengele */
                    }
                    /* Gereksiz elementleri gizle */
                    nav, header, aside, .sidebar, .no-print { display: none !important; }
                    
                    /* Gölge ve kenarlıkları kaldır */
                    .print-container { 
                        box-shadow: none !important; 
                        border: none !important;
                        margin: 0 !important;
                    }
                `}
            </style>

            {/* Üst Bar (Baskıda Gizlenir) */}
            <div className="max-w-[210mm] mx-auto mb-6 flex justify-between items-center no-print">
                <Link href="/dashboard/proposals" className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Listeye Dön
                </Link>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                    >
                        <Printer className="w-4 h-4" /> Yazdır
                    </button>
                </div>
            </div>

            {/* A4 Kağıt Formatı - Yazdırma Alanı */}
            <div className="print-container print-scale max-w-[210mm] mx-auto bg-white text-slate-900 shadow-2xl rounded-xl overflow-hidden flex flex-col relative min-h-[297mm]">

                {/* 1. HEADER (LOGO & ŞİRKET BİLGİLERİ) */}
                <div className="p-10 pb-6 flex justify-between items-start border-b border-slate-100 print:p-8">

                    {/* SOL TARAF: LOGO & ADRES */}
                    <div className="w-1/2 pr-4">
                        {/* Logo Gösterimi - Doğrudan img etiketi ve stil zorlaması */}
                        {companyInfo?.logoUrl ? (
                            <img
                                src={companyInfo.logoUrl}
                                alt="Firma Logosu"
                                className="h-24 w-auto object-contain mb-4 max-w-[200px] print:block"
                                style={{ display: 'block', visibility: 'visible' }}
                            />
                        ) : (
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-14 h-14 bg-slate-900 text-white flex items-center justify-center rounded-lg print:bg-slate-900 print:text-white">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none">
                                        {companyInfo?.companyName || 'FİRMA ADI'}
                                    </h1>
                                </div>
                            </div>
                        )}

                        {/* Şirket Adresi */}
                        <div className="text-xs text-slate-500 space-y-1 mt-2 print:text-slate-600">
                            <p className="font-bold text-slate-800 uppercase">{companyInfo?.companyName}</p>
                            {companyInfo?.address && <p className="max-w-[250px] leading-relaxed opacity-80">{companyInfo.address}</p>}
                            <div className="mt-2 pt-2 border-t border-slate-100 w-fit">
                                {companyInfo?.phone && <p>Tel: {companyInfo.phone}</p>}
                                {companyInfo?.email && <p>E-posta: {companyInfo.email}</p>}
                            </div>
                        </div>
                    </div>

                    {/* SAĞ TARAF: TEKLİF DETAYLARI */}
                    <div className="w-1/2 text-right">
                        <h2 className="text-4xl font-black text-slate-100 uppercase tracking-widest leading-none mb-4 print:text-slate-200">TEKLİF</h2>

                        <div className="inline-block text-left bg-slate-50 p-4 rounded-lg border border-slate-100 min-w-[180px] print:bg-white print:border print:border-slate-200">
                            <div className="mb-2 pb-2 border-b border-slate-200">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Teklif No</p>
                                <p className="font-mono font-bold text-lg text-blue-600 print:text-black">{proposal.proposalNo}</p>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between gap-4">
                                    <span className="text-xs text-slate-500">Tarih:</span>
                                    <span className="text-xs font-bold text-slate-700">{formatDate(proposal.createdAt)}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-xs text-slate-500">Geçerlilik:</span>
                                    <span className="text-xs font-bold text-slate-700">{formatDate(proposal.validUntil)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. MÜŞTERİ BİLGİSİ */}
                <div className="px-10 py-4 bg-slate-50/50 border-b border-slate-100 print:bg-transparent print:px-8">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">SAYIN</p>
                    <h3 className="text-lg font-bold text-slate-900">{proposal.customerName}</h3>
                    {proposal.customerPhone && (
                        <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-2">
                            <Phone className="w-3 h-3 text-slate-400" /> {proposal.customerPhone}
                        </p>
                    )}
                </div>

                {/* 3. HİZMET TABLOSU */}
                <div className="px-10 py-6 flex-1 print:px-8">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <th className="py-2 px-2 w-10">#</th>
                                <th className="py-2 px-2">Açıklama</th>
                                <th className="py-2 px-2 text-center w-20">Adet</th>
                                <th className="py-2 px-2 text-right w-28">Birim</th>
                                <th className="py-2 px-2 text-right w-28">Tutar</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700">
                            {proposal.items.map((item: any, index: number) => (
                                <tr key={index} className="border-b border-slate-50 last:border-0 print:border-slate-100">
                                    <td className="py-3 px-2 font-medium text-slate-400">{index + 1}</td>
                                    <td className="py-3 px-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="py-3 px-2 text-center">{item.quantity}</td>
                                    <td className="py-3 px-2 text-right">{Number(item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                    <td className="py-3 px-2 text-right font-bold">{(item.quantity * item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. TOPLAM VE NOTLAR */}
                <div className="p-10 bg-slate-50 flex flex-col gap-8 border-t border-slate-200 print:bg-transparent print:p-8 print:pt-4">

                    <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>Ara Toplam</span>
                                <span className="font-medium">{proposal.subtotal?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>KDV (%{proposal.taxRate})</span>
                                <span className="font-medium">{proposal.taxAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                            </div>
                            <div className="h-px bg-slate-300 my-2"></div>
                            <div className="flex justify-between items-end">
                                <span className="text-sm font-bold text-slate-900 uppercase">GENEL TOPLAM</span>
                                <span className="text-xl font-black text-blue-600 print:text-black">{proposal.total?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 items-end mt-auto">
                        {/* Sol: Notlar */}
                        <div>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">NOTLAR & KOŞULLAR</h4>
                            <ul className="text-[10px] text-slate-500 space-y-1 list-disc list-inside">
                                <li>Teklif geçerlilik tarihi: <span className="font-bold">{formatDate(proposal.validUntil)}</span></li>
                                <li>{kdvNote}</li>
                                {companyInfo?.bankAccount && <li>IBAN: {companyInfo.bankAccount}</li>}
                            </ul>
                        </div>

                        {/* Sağ: İmza */}
                        <div className="text-center">
                            <div className="h-16 border-b border-slate-300 w-32 mx-auto mb-1"></div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Kaşe / İmza</p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-10 py-3 bg-slate-900 text-white flex justify-between items-center text-[9px] opacity-90 print:bg-white print:text-slate-400 print:px-8">
                    <span>{companyInfo?.companyName}</span>
                    <span className="opacity-50">Servis360</span>
                </div>

            </div>
        </div>
    );
}