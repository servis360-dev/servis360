'use client';

import { useEffect, useState, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    Printer,
    ArrowLeft,
    Phone,
    Building2,
    Download,
    Loader2,
    Mail
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatMoney, getCurrencySettings } from '../../../../../lib/format';

export default function ProposalView({ dict, id, locale }: { dict: any, id: string, locale: string }) {
    const [proposal, setProposal] = useState<any>(null);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);

    // PDF referansı
    const invoiceRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    // Para birimi
    const currency = getCurrencySettings(locale);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const docRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'proposals', id);
                    const docSnap = await getDoc(docRef);

                    const profileRef = doc(db, 'artifacts', 'servis-360-live', 'users', user.uid, 'users', 'profile');
                    const profileSnap = await getDoc(profileRef);

                    if (docSnap.exists()) {
                        setProposal(docSnap.data());
                    } else {
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
    }, [id, router]);

    const handlePrint = () => {
        setTimeout(() => {
            window.print();
        }, 300);
    };

    const handleDownloadPDF = async () => {
        if (!invoiceRef.current) return;
        setDownloading(true);

        try {
            const element = invoiceRef.current;

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                windowWidth: 794,
                width: 794,
                height: 1123,
                scrollY: -window.scrollY
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Proposal-${proposal.proposalNo || 'Doc'}.pdf`);

        } catch (error) {
            console.error("PDF hatası:", error);
            alert(dict.common.error || "PDF Error");
        } finally {
            setDownloading(false);
        }
    };

    const formatDate = (dateVal: any) => {
        if (!dateVal) return new Date().toLocaleDateString(locale);
        if (dateVal.toDate) return dateVal.toDate().toLocaleDateString(locale);
        return new Date(dateVal).toLocaleDateString(locale);
    };

    if (loading) return <div className="flex h-screen items-center justify-center text-slate-500 bg-slate-50">{dict.common.loading}</div>;
    if (!proposal) return null;

    const kdvNote = proposal.taxRate === 0
        ? dict.proposals.view.text_vat_excluded
        : dict.proposals.view.text_vat_included.replace('{rate}', proposal.taxRate);

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-8 flex flex-col items-center gap-6 print:p-0 print:bg-white print:block">

            {/* Print CSS */}
            <style type="text/css" media="print">
                {`
                    @page { size: A4; margin: 0; }
                    body { background-color: white; }
                    nav, header, aside, .sidebar, .no-print { display: none !important; }
                    .print-area { 
                        transform: none !important; 
                        box-shadow: none !important;
                        margin: 0 !important;
                        page-break-after: always;
                    }
                `}
            </style>

            {/* Üst Bar (Butonlar) */}
            <div className="w-full max-w-[210mm] flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
                <Link href="/dashboard/proposals" className="flex items-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> {dict.proposals.view.btn_back}
                </Link>
                <div className="flex gap-3">
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                        <Printer className="w-4 h-4" /> {dict.proposals.view.btn_print}
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={downloading}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {downloading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> {dict.proposals.view.loading_pdf}</>
                        ) : (
                            <><Download className="w-4 h-4" /> {dict.proposals.view.btn_download}</>
                        )}
                    </button>
                </div>
            </div>

            {/* A4 KAĞIT ALANI */}
            <div className="overflow-auto w-full flex justify-center no-print-scroll">
                <div
                    ref={invoiceRef}
                    className="print-area bg-white text-slate-900 shadow-2xl flex flex-col relative"
                    style={{
                        width: '210mm',
                        minHeight: '297mm',
                        height: '297mm',
                        padding: '0',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* ÜST BAŞLIK (HEADER) */}
                    <div className="bg-[#1e293b] text-white p-8 h-48 flex justify-between items-start relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

                        {/* Sol: Logo ve Firma Adı */}
                        <div className="z-10 flex flex-col justify-center h-full">
                            {companyInfo?.logoUrl ? (
                                <img
                                    src={companyInfo.logoUrl}
                                    alt="Logo"
                                    className="h-16 w-auto object-contain mb-3 brightness-0 invert"
                                    style={{ objectPosition: 'left' }}
                                    crossOrigin="anonymous"
                                />
                            ) : (
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-white/20 flex items-center justify-center rounded-lg backdrop-blur-sm">
                                        <Building2 className="w-6 h-6 text-white" />
                                    </div>
                                    <h1 className="text-xl font-bold uppercase tracking-wider">{companyInfo?.companyName || 'FİRMA ADI'}</h1>
                                </div>
                            )}
                            <div className="text-xs text-slate-300 space-y-1 font-light max-w-[300px]">
                                <p>{companyInfo?.address}</p>
                                <div className="flex gap-4 mt-2">
                                    {companyInfo?.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {companyInfo.phone}</span>}
                                    {companyInfo?.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {companyInfo.email}</span>}
                                </div>
                            </div>
                        </div>

                        {/* Sağ: Büyük TEKLİF Yazısı */}
                        <div className="z-10 text-right h-full flex flex-col justify-between">
                            <h2 className="text-5xl font-black tracking-widest text-white/10 absolute right-4 top-4">{dict.proposals.view.header_proposal}</h2>
                            <div className="mt-auto">
                                <div className="bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/20 text-center min-w-[140px]">
                                    <p className="text-[10px] uppercase tracking-widest text-slate-300 mb-1">{dict.proposals.view.label_proposal_no}</p>
                                    <p className="text-xl font-bold font-mono">{proposal.proposalNo}</p>
                                </div>
                                <div className="mt-2 text-xs text-slate-300 flex flex-col items-end gap-1">
                                    <span>{dict.proposals.view.label_date}: <b>{formatDate(proposal.createdAt)}</b></span>
                                    <span>{dict.proposals.view.label_validity}: <b>{formatDate(proposal.validUntil)}</b></span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MÜŞTERİ BİLGİLERİ */}
                    <div className="px-10 py-8 grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-100 pb-1">{dict.proposals.view.label_dear}</p>
                            <h3 className="text-lg font-bold text-slate-900">{proposal.customerName}</h3>
                            {proposal.customerPhone && (
                                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-slate-400" /> {proposal.customerPhone}
                                </p>
                            )}
                            {proposal.customerEmail && (
                                <p className="text-sm text-slate-500 flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-slate-400" /> {proposal.customerEmail}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* TABLO */}
                    <div className="px-10 flex-1">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-y border-slate-200">
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-16 text-center">{dict.proposals.view.table_no}</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{dict.proposals.col_desc}</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-24">{dict.proposals.col_qty}</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-32">{dict.proposals.col_price}</th>
                                    <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right w-32">{dict.proposals.col_total}</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm text-slate-700">
                                {proposal.items.map((item: any, index: number) => (
                                    <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4 px-4 text-center font-medium text-slate-400">{index + 1}</td>
                                        <td className="py-4 px-4 font-bold text-slate-800">{item.description}</td>
                                        <td className="py-4 px-4 text-center">{item.quantity}</td>
                                        <td className="py-4 px-4 text-right tabular-nums">{formatMoney(item.unitPrice, locale)}</td>
                                        <td className="py-4 px-4 text-right font-bold tabular-nums text-slate-900">{formatMoney(item.quantity * item.unitPrice, locale)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ALT BİLGİ (TOPLAM & NOTLAR) */}
                    <div className="px-10 pb-10 pt-6 mt-auto">
                        <div className="flex justify-end mb-6">
                            <div className="w-72 bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <div className="flex justify-between text-sm text-slate-600 mb-2">
                                    <span>{dict.proposals.label_subtotal}</span>
                                    <span className="font-medium">{formatMoney(proposal.subtotal, locale)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-600 mb-3 border-b border-slate-200 pb-2">
                                    <span>{dict.proposals.label_tax_amount} (%{proposal.taxRate})</span>
                                    <span className="font-medium">{formatMoney(proposal.taxAmount, locale)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-base font-bold text-slate-900 uppercase">{dict.proposals.label_grand_total}</span>
                                    <span className="text-2xl font-black text-blue-900">{formatMoney(proposal.total, locale)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-8 border-t border-slate-200 pt-6">
                            <div className="text-xs text-slate-500 space-y-2">
                                <h4 className="font-bold text-slate-800 uppercase text-[10px] tracking-widest">{dict.proposals.view.title_terms}</h4>
                                <ul className="list-disc list-inside space-y-1 marker:text-blue-500">
                                    <li>{dict.proposals.view.text_validity.replace('{date}', formatDate(proposal.validUntil))}</li>
                                    <li>{kdvNote}</li>
                                    {companyInfo?.bankAccount && (
                                        <li className="font-medium bg-blue-50 text-blue-800 inline-block px-2 py-1 rounded mt-1">
                                            IBAN: {companyInfo.bankAccount}
                                        </li>
                                    )}
                                </ul>
                            </div>
                            <div className="flex flex-col items-end justify-end text-center">
                                <div className="mb-8">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{dict.proposals.view.label_approver}</p>
                                    <p className="font-bold text-slate-900">{companyInfo?.companyName || '---'}</p>
                                </div>
                                <div className="h-px bg-slate-300 w-40"></div>
                                <p className="text-[9px] text-slate-400 mt-1 uppercase">{dict.proposals.view.label_signature}</p>
                            </div>
                        </div>
                    </div>

                    <div className="h-3 bg-[#1e293b] w-full mt-auto"></div>
                </div>
            </div>
        </div>
    );
}