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
    Building2,
    Download
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

            {/* YAZDIRMA STİLLERİ (Print CSS) */}
            <style type="text/css" media="print">
                {`
                    @page { size: A4; margin: 0; }
                    body { background-color: white; margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
                    /* Yazdırma sırasında dashboard elementlerini gizle */
                    nav, header, aside, .sidebar, .no-print { display: none !important; }
                    .print-container { 
                        box-shadow: none !important; 
                        margin: 0 !important; 
                        width: 100% !important;
                        max-width: none !important;
                        border-radius: 0 !important;
                        min-height: 100vh;
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

            {/* A4 Kağıt Formatı */}
            <div className="print-container max-w-[210mm] mx-auto bg-white text-slate-900 shadow-2xl rounded-xl overflow-hidden min-h-[297mm] flex flex-col relative">

                {/* 1. HEADER (LOGO & ŞİRKET BİLGİLERİ) */}
                <div className="p-12 pb-8 flex justify-between items-start border-b border-slate-100">

                    {/* SOL TARAF: LOGO & ADRES */}
                    <div className="w-1/2 pr-4">
                        {/* Logo */}
                        {companyInfo?.logoUrl ? (
                            <img
                                src={companyInfo.logoUrl}
                                alt="Firma Logosu"
                                className="h-24 w-auto object-contain mb-4 max-w-[200px]"
                            />
                        ) : (
                            // Logo yoksa Şık Bir İsim Kutusu
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-14 h-14 bg-slate-900 text-white flex items-center justify-center rounded-lg">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight leading-none">
                                        {companyInfo?.companyName || 'FİRMA ADI'}
                                    </h1>
                                    <p className="text-xs text-slate-500 font-medium mt-1">{companyInfo?.sector || 'Hizmet Sağlayıcı'}</p>
                                </div>
                            </div>
                        )}

                        {/* Şirket Adresi (Logonun Altında) */}
                        <div className="text-xs text-slate-500 space-y-1 mt-2">
                            <p className="font-bold text-slate-800 uppercase">{companyInfo?.companyName}</p>
                            {companyInfo?.address && <p className="max-w-[250px] leading-relaxed">{companyInfo.address}</p>}
                            <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-slate-100 w-fit">
                                {companyInfo?.phone && <p className="flex items-center gap-2"><Phone className="w-3 h-3" /> {companyInfo.phone}</p>}
                                {companyInfo?.email && <p className="flex items-center gap-2"><Mail className="w-3 h-3" /> {companyInfo.email}</p>}
                            </div>
                        </div>
                    </div>

                    {/* SAĞ TARAF: TEKLİF DETAYLARI */}
                    <div className="w-1/2 text-right">
                        <h2 className="text-4xl font-black text-slate-200 uppercase tracking-widest leading-none mb-4 print:text-slate-300">TEKLİF</h2>

                        <div className="inline-block text-left bg-slate-50 p-4 rounded-lg border border-slate-100 min-w-[200px]">
                            <div className="mb-2 pb-2 border-b border-slate-200">
                                <p className="text-[10px] uppercase font-bold text-slate-400">Teklif No</p>
                                <p className="font-mono font-bold text-lg text-blue-600">{proposal.proposalNo}</p>
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
                <div className="px-12 py-8 bg-slate-50/50 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">SAYIN</p>
                    <h3 className="text-xl font-bold text-slate-900">{proposal.customerName}</h3>
                    {proposal.customerPhone && (
                        <p className="text-sm text-slate-600 mt-1 flex items-center gap-2">
                            <Phone className="w-3 h-3 text-slate-400" /> {proposal.customerPhone}
                        </p>
                    )}
                </div>

                {/* 3. HİZMET TABLOSU */}
                <div className="px-12 py-8 flex-1">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-100">
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider w-12">#</th>
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Açıklama</th>
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-24">Miktar</th>
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-32">Birim Fiyat</th>
                                <th className="py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-32">Tutar</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700">
                            {proposal.items.map((item: any, index: number) => (
                                <tr key={index} className="border-b border-slate-50 last:border-0">
                                    <td className="py-4 px-2 font-medium text-slate-400">{index + 1}</td>
                                    <td className="py-4 px-2 font-bold text-slate-800">{item.description}</td>
                                    <td className="py-4 px-2 text-center">{item.quantity}</td>
                                    <td className="py-4 px-2 text-right">{Number(item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                    <td className="py-4 px-2 text-right font-bold">{(item.quantity * item.unitPrice).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 4. TOPLAM VE NOTLAR */}
                <div className="p-12 bg-slate-50 flex flex-col md:flex-row gap-12 border-t border-slate-200">

                    {/* Sol: Notlar */}
                    <div className="flex-1">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">NOTLAR & KOŞULLAR</h4>
                        <ul className="text-xs text-slate-500 space-y-1.5 list-disc list-inside marker:text-slate-300">
                            <li>Bu teklif <span className="font-bold text-slate-700">{formatDate(proposal.validUntil)}</span> tarihine kadar geçerlidir.</li>
                            <li>{kdvNote}</li>
                            <li>Ödeme iş tesliminde nakit veya havale yoluyla yapılacaktır.</li>
                            {companyInfo?.bankAccount && <li>IBAN: <span className="font-mono">{companyInfo.bankAccount}</span></li>}
                        </ul>

                        <div className="mt-8 pt-8 border-t border-slate-200 w-48">
                            <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-8">ONAY / İMZA</p>
                            <div className="h-0.5 bg-slate-300 w-full"></div>
                        </div>
                    </div>

                    {/* Sağ: Hesap Özeti */}
                    <div className="w-64 flex flex-col gap-2">
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>Ara Toplam</span>
                            <span className="font-medium">{proposal.subtotal?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                        </div>
                        <div className="flex justify-between text-sm text-slate-600">
                            <span>KDV (%{proposal.taxRate})</span>
                            <span className="font-medium">{proposal.taxAmount?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                        </div>
                        <div className="h-px bg-slate-200 my-2"></div>
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-bold text-slate-900 uppercase">GENEL TOPLAM</span>
                            <span className="text-2xl font-black text-blue-600">{proposal.total?.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺</span>
                        </div>
                    </div>
                </div>

                {/* Footer (Marka) */}
                <div className="px-12 py-4 bg-slate-900 text-white flex justify-between items-center text-[10px] opacity-90 print:opacity-100 print:bg-slate-900 print:text-white">
                    <span>{companyInfo?.companyName || 'Servis360'}</span>
                    <span className="opacity-50">Servis360 Altyapısı ile Oluşturulmuştur</span>
                </div>

            </div>
        </div>
    );
}